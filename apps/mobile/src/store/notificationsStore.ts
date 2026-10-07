import type { NotificationRecord } from '@lankashield/shared';
import { create } from 'zustand';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface NotificationsState {
  status: Status;
  /** The signed-in user's delivered notifications, newest first. */
  items: NotificationRecord[];
  error: unknown;
  /** The newest notification that arrived while the app was open, for the in-app banner. */
  fresh: NotificationRecord | null;
  /** Bumped by `retry` so the tabs layout subscribes again after an error. */
  attempt: number;
  setLoading: () => void;
  setItems: (items: NotificationRecord[], fresh: NotificationRecord | null) => void;
  setError: (error: unknown) => void;
  dismissFresh: () => void;
  retry: () => void;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  status: 'idle',
  items: [],
  error: null,
  fresh: null,
  attempt: 0,
  setLoading: () => set({ status: 'loading', error: null }),
  setItems: (items, fresh) =>
    set((s) => ({ status: 'success', items, error: null, fresh: fresh ?? s.fresh })),
  setError: (error) => set({ status: 'error', error }),
  dismissFresh: () => set({ fresh: null }),
  retry: () => set((s) => ({ status: 'loading', attempt: s.attempt + 1 })),
  reset: () => set({ status: 'idle', items: [], error: null, fresh: null }),
}));
