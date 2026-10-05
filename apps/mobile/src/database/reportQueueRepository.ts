import type {
  EvidenceInput,
  HazardReportInput,
  OfflineQueueStore,
  QueuedReport,
  SyncStatus,
} from '@lankashield/shared';

import { getDatabase } from './sqlite';

interface OfflineReportRow {
  report_id: string;
  payload_json: string;
  evidence_json: string;
  sync_status: SyncStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/** Everything about the report except the evidence, which is stored in `evidence_json`. */
interface Payload {
  input: Omit<HazardReportInput, 'evidence'>;
  reporter: QueuedReport['reporter'];
  clientCreatedAt: string;
}

function toQueuedReport(row: OfflineReportRow): QueuedReport {
  const payload = JSON.parse(row.payload_json) as Payload;
  const evidence = JSON.parse(row.evidence_json) as EvidenceInput[];
  return {
    reportId: row.report_id,
    input: { ...payload.input, evidence },
    reporter: payload.reporter,
    clientCreatedAt: payload.clientCreatedAt,
    syncStatus: row.sync_status,
    retryCount: row.retry_count,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const now = () => new Date().toISOString();

/** SQLite-backed `offline_reports` queue. */
export const reportQueueRepository = {
  /** Saves (or re-saves) a validated report as PENDING, keeping its tracking ID. */
  async enqueue(report: Pick<QueuedReport, 'reportId' | 'input' | 'reporter' | 'clientCreatedAt'>) {
    const db = await getDatabase();
    const { evidence, ...input } = report.input;
    const payload: Payload = {
      input,
      reporter: report.reporter,
      clientCreatedAt: report.clientCreatedAt,
    };
    const timestamp = now();
    await db.runAsync(
      `INSERT INTO offline_reports
         (report_id, payload_json, evidence_json, sync_status, retry_count, last_error, created_at, updated_at)
       VALUES (?, ?, ?, 'PENDING', 0, NULL, ?, ?)
       ON CONFLICT(report_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         evidence_json = excluded.evidence_json,
         sync_status = 'PENDING',
         updated_at = excluded.updated_at`,
      report.reportId,
      JSON.stringify(payload),
      JSON.stringify(evidence),
      timestamp,
      timestamp,
    );
  },

  async listUnsynced(): Promise<QueuedReport[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<OfflineReportRow>(
      `SELECT * FROM offline_reports WHERE sync_status != 'SYNCED' ORDER BY created_at ASC`,
    );
    return rows.map(toQueuedReport);
  },

  async listForUser(uid: string): Promise<QueuedReport[]> {
    return (await this.listUnsynced()).filter((r) => r.reporter.uid === uid);
  },

  async markSyncing(reportId: string) {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE offline_reports SET sync_status = 'SYNCING', updated_at = ? WHERE report_id = ?`,
      now(),
      reportId,
    );
  },

  async markFailed(reportId: string, error: string) {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE offline_reports
         SET sync_status = 'FAILED', retry_count = retry_count + 1, last_error = ?, updated_at = ?
       WHERE report_id = ?`,
      error,
      now(),
      reportId,
    );
  },

  async remove(reportId: string) {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM offline_reports WHERE report_id = ?`, reportId);
  },
};

// The repository is the device implementation of the shared sync engine's queue interface.
reportQueueRepository satisfies OfflineQueueStore;
