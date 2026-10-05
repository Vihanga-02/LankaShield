import type { QueuedReport } from '@lankashield/shared';

import { reportQueueRepository } from '@/database/reportQueueRepository';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

import { persistEvidence, removePersistedEvidence } from './offlineEvidence';

type NewQueuedReport = Pick<QueuedReport, 'reportId' | 'input' | 'reporter' | 'clientCreatedAt'>;

/** Reloads the signed-in user's queued reports into the UI store. */
export async function refreshQueue(uid: string): Promise<void> {
  useOfflineQueueStore.getState().setItems(await reportQueueRepository.listForUser(uid));
}

/** Saves a validated report on the device as Pending Sync, keeping its tracking ID. */
export async function saveForLater(report: NewQueuedReport): Promise<void> {
  const evidence = await persistEvidence(report.reportId, report.input.evidence);
  await reportQueueRepository.enqueue({ ...report, input: { ...report.input, evidence } });
  await refreshQueue(report.reporter.uid);
}

/** Deletes a queued report that cannot be sent (e.g. its photos were removed from the device). */
export async function discardQueuedReport(reportId: string, uid: string): Promise<void> {
  await reportQueueRepository.remove(reportId);
  removePersistedEvidence(reportId);
  await refreshQueue(uid);
}
