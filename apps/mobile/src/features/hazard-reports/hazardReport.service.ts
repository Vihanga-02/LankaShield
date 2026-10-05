import {
  COLLECTIONS,
  evidenceIdFor,
  type AppUser,
  type HazardReport,
  type HazardReportInput,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import * as Network from 'expo-network';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { saveForLater } from '@/features/offline-sync/queue';
import { db } from '@/services/firebase';
import { uploadEvidence } from '@/services/uploads';
import { isNetworkError } from '@/utils/errors';
import { withTimeout } from '@/utils/withTimeout';

import { buildHazardReport, type BuildHazardReportArgs } from './hazardReport.mapper';

const WRITE_TIMEOUT_MS = 30_000;

const reportsCollection = () =>
  collection(db, COLLECTIONS.hazardReports).withConverter(converters.hazardReports);
const reportRef = (reportId: string) =>
  doc(db, COLLECTIONS.hazardReports, reportId).withConverter(converters.hazardReports);

export type SubmitProgress =
  | { step: 'checking' }
  | { step: 'uploading'; current: number; total: number }
  | { step: 'saving' }
  | { step: 'queueing' };

/** `submitted` — the report is in Firestore. `queued` — saved on this device as Pending Sync. */
export type SubmitOutcome = 'submitted' | 'queued';

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!state.isConnected && state.isInternetReachable !== false;
}

/** reporterId of an existing report, or null — lets a retry detect an earlier success. */
export async function findReporterId(reportId: string): Promise<string | null> {
  const snap = await withTimeout(getDoc(reportRef(reportId)), WRITE_TIMEOUT_MS);
  return snap.exists() ? snap.data().reporterId : null;
}

/** Creates `hazardReports/{reportId}`; resolves only once the server confirms the write. */
export async function writeReport(args: BuildHazardReportArgs): Promise<void> {
  await withTimeout(
    setDoc(reportRef(args.reportId), buildHazardReport(args)),
    WRITE_TIMEOUT_MS,
    'Saving the report took too long. Check your connection and retry — it will not be duplicated.',
  );
}

interface SubmitArgs {
  reportId: string;
  input: HazardReportInput;
  reporter: Pick<AppUser, 'uid' | 'role'>;
  clientCreatedAt: string;
  onProgress?: (progress: SubmitProgress) => void;
}

/**
 * UC01 submission. Online: upload evidence, then create the report with the client-generated ID.
 * Offline, or if the connection drops part-way, the same report (same ID) is saved to the offline
 * queue instead and synced later. Non-network errors are thrown so the form can show them.
 */
export async function submitHazardReport(args: SubmitArgs): Promise<SubmitOutcome> {
  const { reportId, input, reporter, clientCreatedAt, onProgress } = args;
  const queue = async () => {
    onProgress?.({ step: 'queueing' });
    await saveForLater({ reportId, input, reporter, clientCreatedAt });
    return 'queued' as const;
  };

  onProgress?.({ step: 'checking' });
  if (!(await isOnline())) return queue();

  try {
    // A previous attempt may have reached Firestore before its confirmation was lost.
    if ((await findReporterId(reportId)) !== null) return 'submitted';

    const evidenceUrls: string[] = [];
    for (const [index, item] of input.evidence.entries()) {
      onProgress?.({ step: 'uploading', current: index + 1, total: input.evidence.length });
      evidenceUrls.push(
        await uploadEvidence(reportId, evidenceIdFor(index), item.uri, item.mimeType),
      );
    }

    onProgress?.({ step: 'saving' });
    await writeReport({
      reportId,
      input,
      reporter,
      evidenceUrls,
      clientCreatedAt,
      syncSource: 'ONLINE',
    });
    return 'submitted';
  } catch (err) {
    if (isNetworkError(err)) return queue();
    throw err;
  }
}

const newestFirst = (a: HazardReport, b: HazardReport) => b.createdAt.localeCompare(a.createdAt);

/** Live list of the signed-in user's reports, newest first. */
export function subscribeToMyReports(
  reporterId: string,
  onData: (reports: HazardReport[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  // Sorted on the device so the query needs no composite index.
  const q = query(reportsCollection(), where('reporterId', '==', reporterId));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data()).sort(newestFirst)), onError);
}

/** Live single report for the details and submission-result screens. */
export function subscribeToReport(
  reportId: string,
  onData: (report: HazardReport | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    reportRef(reportId),
    (snap) => onData(snap.exists() ? snap.data() : null),
    onError,
  );
}
