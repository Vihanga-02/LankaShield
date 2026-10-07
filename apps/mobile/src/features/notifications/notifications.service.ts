import {
  COLLECTIONS,
  deliveredNotifications,
  newUnreadNotifications,
  type NotificationRecord,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { useNotificationsStore } from '@/store/notificationsStore';

/**
 * Listens to the signed-in user's delivered notifications (§10.5) and keeps the store up to date.
 * Notifications that arrive while the app is open are offered as a banner; the first snapshot is
 * not, so existing notifications do not pop up at sign-in. Returns the unsubscribe function.
 */
export function startNotificationsListener(uid: string): () => void {
  const store = useNotificationsStore.getState();
  store.setLoading();
  let knownIds: Set<string> | null = null;

  // Filtered and sorted on the device, so the query needs no composite index.
  const q = query(
    collection(db, COLLECTIONS.notifications).withConverter(converters.notifications),
    where('recipientId', '==', uid),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = deliveredNotifications(snap.docs.map((d) => d.data()));
      const fresh = knownIds ? newUnreadNotifications(knownIds, items) : [];
      knownIds = new Set(items.map((n) => n.notificationId));
      useNotificationsStore.getState().setItems(items, fresh[0] ?? null);
    },
    (error) => useNotificationsStore.getState().setError(error),
  );
}

/** Marks notifications read. Best effort: the live listener shows the result. */
export async function markNotificationsRead(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) batch.update(doc(db, COLLECTIONS.notifications, id), { read: true });
  await batch.commit();
}

export function markAllRead(notifications: readonly NotificationRecord[]): Promise<void> {
  return markNotificationsRead(notifications.filter((n) => !n.read).map((n) => n.notificationId));
}
