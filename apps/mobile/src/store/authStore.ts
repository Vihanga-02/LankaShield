import type { AppUser } from '@lankashield/shared';
import { create } from 'zustand';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: AppUser | null;
  /** Shown on the login screen after a forced sign-out, e.g. an officer account on mobile. */
  notice: string | null;
  /** True while registration writes the profile, so the auth listener does not race it. */
  registering: boolean;
  setSignedIn: (user: AppUser) => void;
  setSignedOut: (notice?: string) => void;
  setRegistering: (registering: boolean) => void;
  clearNotice: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'initializing',
  user: null,
  notice: null,
  registering: false,
  setSignedIn: (user) => set({ status: 'signedIn', user, notice: null }),
  setSignedOut: (notice) => set({ status: 'signedOut', user: null, notice: notice ?? null }),
  setRegistering: (registering) => set({ registering }),
  clearNotice: () => set({ notice: null }),
}));
