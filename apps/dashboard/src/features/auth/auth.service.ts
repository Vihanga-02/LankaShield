import {
  COLLECTIONS,
  isDashboardRole,
  toErrorMessage,
  USER_ROLE_LABELS,
  type LoginInput,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';

/** The auth listener loads the profile, checks the role and updates the store. */
export async function signInOfficer({ email, password }: LoginInput): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutOfficer(notice?: string): Promise<void> {
  await signOut(auth);
  useAuthStore.getState().setSignedOut(notice);
}

async function handleAuthUser(user: User | null, isCurrent: () => boolean): Promise<void> {
  const store = useAuthStore.getState();
  if (!user) {
    // Keep a notice set by a forced sign-out.
    if (store.status !== 'signedOut') store.setSignedOut();
    return;
  }

  try {
    const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid).withConverter(converters.users));
    if (!isCurrent()) return;
    const profile = snap.exists() ? snap.data() : null;

    if (!profile) {
      await signOutOfficer('No LankaShield profile exists for this account.');
    } else if (!isDashboardRole(profile.role)) {
      await signOutOfficer(
        `${USER_ROLE_LABELS[profile.role]} accounts use the LankaShield mobile app.`,
      );
    } else if (!profile.active) {
      await signOutOfficer('This account has been deactivated.');
    } else {
      store.setSignedIn({ ...profile, role: profile.role });
    }
  } catch (err) {
    if (!isCurrent()) return;
    await signOutOfficer(toErrorMessage(err));
  }
}

/** Subscribes to Firebase Auth for the lifetime of the app. Returns the unsubscribe function. */
export function subscribeToAuth(): () => void {
  let generation = 0;
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    const current = ++generation;
    void handleAuthUser(user, () => generation === current).catch((error) => {
      if (generation === current) useAuthStore.getState().setSignedOut(toErrorMessage(error));
    });
  });
  return () => { generation++; unsubscribe(); };
}
