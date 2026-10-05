import {
  evidenceIdFor,
  syncOfflineReports,
  type OfflineQueueStore,
  type ReportGateway,
  type SyncSummary,
} from '@lankashield/shared';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { reportQueueRepository } from '@/database/reportQueueRepository';
import {
  findReporterId,
  isOnline,
  writeReport,
} from '@/features/hazard-reports/hazardReport.service';
import { uploadEvidence } from '@/services/uploads';
import { useAuthStore } from '@/store/authStore';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

import { removePersistedEvidence } from './offlineEvidence';
import { refreshQueue } from './queue';

export type SyncOutcome =
  { status: 'offline' } | { status: 'nothing-to-sync' } | { status: 'done'; summary: SyncSummary };

const gateway: ReportGateway = {
  findReporterId,
  uploadEvidence: (reportId, index, evidence) =>
    uploadEvidence(reportId, evidenceIdFor(index), evidence.uri, evidence.mimeType),
  createReport: (row, evidenceUrls) =>
    writeReport({
      reportId: row.reportId,
      input: row.input,
      reporter: row.reporter,
      evidenceUrls,
      clientCreatedAt: row.clientCreatedAt,
      syncSource: 'OFFLINE_QUEUE',
    }),
};

/** Queue store that also refreshes the UI after every state change (Syncing, Failed, removed). */
function trackedStore(uid: string): OfflineQueueStore {
  const refresh = () => refreshQueue(uid);
  return {
    listUnsynced: () => reportQueueRepository.listUnsynced(),
    markSyncing: async (id) => {
      await reportQueueRepository.markSyncing(id);
      await refresh();
    },
    markFailed: async (id, error) => {
      await reportQueueRepository.markFailed(id, error);
      await refresh();
    },
    remove: async (id) => {
      await reportQueueRepository.remove(id);
      removePersistedEvidence(id);
      await refresh();
    },
  };
}

let running: Promise<SyncOutcome> | null = null;

/**
 * Sends the signed-in user's queued reports. Only one sync runs at a time; calling it while a sync
 * is in progress returns the same promise, so a reconnect and a tap on "Sync now" cannot race.
 */
export function syncNow(): Promise<SyncOutcome> {
  running ??= (async (): Promise<SyncOutcome> => {
    const uid = useAuthStore.getState().user?.uid;
    if (!uid) return { status: 'nothing-to-sync' };

    const queue = useOfflineQueueStore.getState();
    await refreshQueue(uid);
    if (useOfflineQueueStore.getState().items.length === 0) return { status: 'nothing-to-sync' };
    if (!(await isOnline())) return { status: 'offline' };

    queue.setSyncing(true);
    try {
      const summary = await syncOfflineReports(trackedStore(uid), gateway, uid, queue.setProgress);
      return { status: 'done', summary };
    } finally {
      queue.setSyncing(false);
      await refreshQueue(uid);
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * Syncs now, whenever the connection comes back and whenever the app returns to the foreground.
 * Returns a cleanup function; call it from the signed-in layout.
 */
export function startAutoSync(): () => void {
  const network = Network.addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void syncNow();
  });
  const appState = AppState.addEventListener('change', (next) => {
    if (next === 'active') void syncNow();
  });
  void syncNow();
  return () => {
    network.remove();
    appState.remove();
  };
}
