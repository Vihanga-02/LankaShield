import {
  AppError,
  COLLECTIONS,
  isMobileRole,
  USER_ROLE_LABELS,
  type AppUser,
  type LoginInput,
  type RegisterInput,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

import { clearCachedProfile, readCachedProfile, writeCachedProfile } from './profileCache';

const userDoc = (uid: string) => doc(db, COLLECTIONS.users, uid).withConverter(converters.users);

/** The auth listener loads the profile and updates the store once Firebase signs in. */
export async function signInUser({ email, password }: LoginInput): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

/** Creates the Firebase account and the `users/{uid}` profile; removes the account if the profile write fails. */
export async function registerUser(input: RegisterInput): Promise<void> {
  const store = useAuthStore.getState();
  store.setRegistering(true);
  try {
    const { user } = await createUserWithEmailAndPassword(auth, input.email, input.password);
    const profile: AppUser = {
      uid: user.uid,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone || undefined,
      role: input.role,
      active: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(userDoc(user.uid), profile);
    } catch (err) {
      await user.delete().catch(() => undefined);
      throw err;
    }
    await writeCachedProfile(profile);
    store.setSignedIn(profile);
  } finally {
    store.setRegistering(false);
  }
}

export async function signOutUser(notice?: string): Promise<void> {
  await clearCachedProfile();
  await signOut(auth);
  // Queued reports stay in SQLite and sync when their owner signs in again (Phase 6).
  useOfflineQueueStore.getState().setItems([]);
  useAuthStore.getState().setSignedOut(notice);
}

/** Server profile first; the cached copy when the device is offline. */
async function loadProfile(user: User): Promise<AppUser | null> {
  try {
    const snap = await getDoc(userDoc(user.uid));
    const profile = snap.exists() ? snap.data() : null;
    if (profile) await writeCachedProfile(profile);
    return profile;
  } catch (err) {
    const cached = await readCachedProfile(user.uid);
    if (cached) return cached;
    throw err;
  }
}

async function handleAuthUser(user: User | null): Promise<void> {
  const store = useAuthStore.getState();
  if (!user) {
    // Keep a notice set by a forced sign-out.
    if (store.status !== 'signedOut') store.setSignedOut();
    return;
  }
  if (store.registering) return;

  try {
    const profile = await loadProfile(user);
    if (!profile) {
      await signOutUser(
        'Your account profile could not be found. Register again or contact support.',
      );
    } else if (!isMobileRole(profile.role)) {
      await signOutUser(
        `${USER_ROLE_LABELS[profile.role]} accounts use the LankaShield officer web dashboard.`,
      );
    } else if (!profile.active) {
      await signOutUser('This account has been deactivated.');
    } else {
      store.setSignedIn(profile);
    }
  } catch {
    await signOutUser(
      new AppError('NETWORK_ERROR').message + ' Sign in again when you are online.',
    );
  }
}

/** Subscribes to Firebase Auth for the lifetime of the app. Returns the unsubscribe function. */
export function subscribeToAuth(): () => void {
  return onAuthStateChanged(auth, (user) => void handleAuthUser(user));
}
