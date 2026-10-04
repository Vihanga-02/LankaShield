import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppUser } from '@lankashield/shared';

// The last loaded profile, so a restored session still works when the app starts offline.
const KEY = 'lankashield.profile';

export async function readCachedProfile(uid: string): Promise<AppUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const profile = raw ? (JSON.parse(raw) as AppUser) : null;
    return profile?.uid === uid ? profile : null;
  } catch {
    return null;
  }
}

export async function writeCachedProfile(profile: AppUser): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch(() => undefined);
}

export async function clearCachedProfile(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
