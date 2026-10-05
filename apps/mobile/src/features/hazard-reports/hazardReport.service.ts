import {
  AppError,
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

import { db } from '@/services/firebase';
import { uploadEvidence } from '@/services/uploads';
import { withTimeout } from '@/utils/withTimeout';

import { buildHazardReport } from './hazardReport.mapper';

const WRITE_TIMEOUT_MS = 30_000;

const reportsCollection = () =>
  collection(db, COLLECTIONS.hazardReports).withConverter(converters.hazardReports);
const reportRef = (reportId: string) =>
  doc(db, COLLECTIONS.hazardReports, reportId).withConverter(converters.hazardReports);

export type SubmitProgress =
  { step: 'checking' } | { step: 'uploading'; current: number; total: number } | { step: 'saving' };

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!state.isConnected && state.isInternetReachable !== false;
}

interface SubmitArgs {
  reportId: string;
  input: HazardReportInput;
  reporter: Pick<AppUser, 'uid' | 'role'>;
  clientCreatedAt: string;
  onProgress?: (progress: SubmitProgress) => void;
}

/**
 * UC01 online submission: upload evidence, then create `hazardReports/{reportId}` with the
 * client-generated ID. Safe to retry with the same ID — an existing report is never overwritten.
 */
export async function submitHazardReport({
  reportId,
  input,
  reporter,
  clientCreatedAt,
  onProgress,
}: SubmitArgs): Promise<void> {
  onProgress?.({ step: 'checking' });
  if (!(await isOnline())) {
    throw new AppError(
      'NETWORK_ERROR',
      "You're offline. Connect to the internet and submit again.",
    );
  }

  // A previous attempt may have reached Firestore before its confirmation was lost.
  const existing = await withTimeout(getDoc(reportRef(reportId)), WRITE_TIMEOUT_MS);
  if (existing.exists()) return;

  const evidenceUrls: string[] = [];
  for (const [index, item] of input.evidence.entries()) {
    onProgress?.({ step: 'uploading', current: index + 1, total: input.evidence.length });
    evidenceUrls.push(
      await uploadEvidence(reportId, evidenceIdFor(index), item.uri, item.mimeType),
    );
  }

  onProgress?.({ step: 'saving' });
  await withTimeout(
    setDoc(
      reportRef(reportId),
      buildHazardReport({
        reportId,
        input,
        reporter,
        evidenceUrls,
        clientCreatedAt,
        syncSource: 'ONLINE',
      }),
    ),
    WRITE_TIMEOUT_MS,
    'Saving the report took too long. Check your connection and retry — it will not be duplicated.',
  );
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
