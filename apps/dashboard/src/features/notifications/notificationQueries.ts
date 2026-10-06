import { COLLECTIONS, type StakeholderNotification, type NotificationRecord, type HazardReport } from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
const outbox = () =>
  collection(db, COLLECTIONS.stakeholderNotifications).withConverter(
    converters.stakeholderNotifications,
  );
export function subscribeToOutbox(
  onData: (records: StakeholderNotification[]) => void,
  onError: (error: unknown) => void,
  reportId?: string,
) {
  return onSnapshot(
    reportId ? query(outbox(), where('reportId', '==', reportId)) : outbox(),
    (snap) =>
      onData(snap.docs.map((d) => d.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    onError,
  );
}
export function subscribeToInbox(
  uid: string,
  onData: (records: NotificationRecord[]) => void,
  onError: (error: unknown) => void,
) {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.notifications).withConverter(converters.notifications),
      where('recipientId', '==', uid),
    ),
    (snap) =>
      onData(snap.docs.map((d) => d.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    onError,
  );
}

export async function listNotifiableReports(): Promise<HazardReport[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.hazardReports).withConverter(converters.hazardReports),
      where('status', 'in', ['VERIFIED', 'ESCALATED']),
    ),
  );
  return snap.docs.map((d) => d.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

