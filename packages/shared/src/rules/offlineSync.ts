import { toErrorMessage } from '../constants/errorMessages';
import type { SyncStatus } from '../enums';
import type { AppUser, IsoDateString } from '../models';
import type { EvidenceInput, HazardReportInput } from '../schemas/hazardReport.schema';

/** A hazard report saved on the device while offline (one row of `offline_reports`). */
export interface QueuedReport {
  reportId: string;
  input: HazardReportInput;
  reporter: Pick<AppUser, 'uid' | 'role'>;
  clientCreatedAt: IsoDateString;
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/** Local queue operations (SQLite on the device, an in-memory fake in tests). */
export interface OfflineQueueStore {
  /** Rows not yet synced (PENDING, FAILED, or SYNCING left over from a crash), oldest first. */
  listUnsynced(): Promise<QueuedReport[]>;
  markSyncing(reportId: string): Promise<void>;
  /** Saves the error, increments retryCount and sets FAILED. */
  markFailed(reportId: string, error: string): Promise<void>;
  /** Called only after Firestore confirms the report exists. */
  remove(reportId: string): Promise<void>;
}

/** Remote operations (Firebase Storage + Firestore). */
export interface ReportGateway {
  /** The existing report's reporterId, or null if no report has this ID. */
  findReporterId(reportId: string): Promise<string | null>;
  uploadEvidence(reportId: string, index: number, evidence: EvidenceInput): Promise<string>;
  createReport(report: QueuedReport, evidenceUrls: string[]): Promise<void>;
}

export interface SyncProgress {
  reportId: string;
  index: number;
  total: number;
}

export interface SyncSummary {
  synced: string[];
  failed: { reportId: string; error: string }[];
}

/**
 * Sends queued reports to Firebase in creation order (development plan §13.1).
 *
 * Idempotent: every report keeps its original ID, and a report that already exists in Firestore
 * (a previous attempt succeeded but the confirmation was lost) is not written again. Only the
 * signed-in user's rows are synced.
 */
export async function syncOfflineReports(
  store: OfflineQueueStore,
  gateway: ReportGateway,
  currentUserId: string,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncSummary> {
  const rows = (await store.listUnsynced()).filter((r) => r.reporter.uid === currentUserId);
  const summary: SyncSummary = { synced: [], failed: [] };

  for (const [index, row] of rows.entries()) {
    onProgress?.({ reportId: row.reportId, index, total: rows.length });
    try {
      await store.markSyncing(row.reportId);

      const existingReporter = await gateway.findReporterId(row.reportId);
      if (existingReporter !== null) {
        if (existingReporter !== row.reporter.uid) {
          throw new Error('Another report already uses this tracking ID.');
        }
        await store.remove(row.reportId);
        summary.synced.push(row.reportId);
        continue;
      }

      const evidenceUrls: string[] = [];
      for (const [i, evidence] of row.input.evidence.entries()) {
        evidenceUrls.push(await gateway.uploadEvidence(row.reportId, i, evidence));
      }
      await gateway.createReport(row, evidenceUrls);
      await store.remove(row.reportId);
      summary.synced.push(row.reportId);
    } catch (err) {
      const error = toErrorMessage(err);
      await store.markFailed(row.reportId, error);
      summary.failed.push({ reportId: row.reportId, error });
    }
  }
  return summary;
}
