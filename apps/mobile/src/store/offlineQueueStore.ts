import type { QueuedReport, SyncProgress } from '@lankashield/shared';
import { create } from 'zustand';

interface OfflineQueueState {
  /** The signed-in user's reports that exist only on this device. */
  items: QueuedReport[];
  syncing: boolean;
  progress: SyncProgress | null;
  setItems: (items: QueuedReport[]) => void;
  setSyncing: (syncing: boolean) => void;
  setProgress: (progress: SyncProgress | null) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set) => ({
  items: [],
  syncing: false,
  progress: null,
  setItems: (items) => set({ items }),
  setSyncing: (syncing) => set(syncing ? { syncing } : { syncing, progress: null }),
  setProgress: (progress) => set({ progress }),
}));
