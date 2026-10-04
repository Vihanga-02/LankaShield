import type { AppUser, DashboardRole } from '@lankashield/shared';
import { create } from 'zustand';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

/** A signed-in dashboard user always has an officer or analyst role. */
export type OfficerUser = AppUser & { role: DashboardRole };

interface AuthState {
  status: AuthStatus;
  user: OfficerUser | null;
  /** Shown on the login page after a forced sign-out, e.g. a citizen account on the dashboard. */
  notice: string | null;
  setSignedIn: (user: OfficerUser) => void;
  setSignedOut: (notice?: string) => void;
  clearNotice: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'initializing',
  user: null,
  notice: null,
  setSignedIn: (user) => set({ status: 'signedIn', user, notice: null }),
  setSignedOut: (notice) => set({ status: 'signedOut', user: null, notice: notice ?? null }),
  clearNotice: () => set({ notice: null }),
}));
