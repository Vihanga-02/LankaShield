import {
  AppError,
  COLLECTIONS,
  sortNotificationsNewestFirst,
  type AppUser,
  type NotificationRecord,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../../services/firebase';

const notificationRef = (id: string) =>
  doc(db, COLLECTIONS.notifications, id).withConverter(converters.notifications);

/** Live list of every notification, newest first. Filtered in the browser (campus-scale data). */
export function subscribeToNotifications(
  onData: (notifications: NotificationRecord[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.notifications).withConverter(converters.notifications),
    (snap) => onData(sortNotificationsNewestFirst(snap.docs.map((d) => d.data()))),
    onError,
  );
}

/** Recipient profiles by uid, for names and roles in the delivery list. Missing users are left out. */
export async function loadRecipients(uids: readonly string[]): Promise<Map<string, AppUser>> {
  const unique = [...new Set(uids)];
  const snaps = await Promise.all(
    unique.map((uid) => getDoc(doc(db, COLLECTIONS.users, uid).withConverter(converters.users))),
  );
  return new Map(snaps.filter((s) => s.exists()).map((s) => [s.id, s.data()]));
}

/**
 * Retries a PENDING or FAILED delivery (Phase 10). The in-app record is the delivery channel, so a
 * retry marks it SENT — it then appears in the recipient's app — and, for a verification result,
 * also marks the decision's `notificationStatus` SENT. Runs as a transaction so two officers
 * retrying the same item write once.
 */
export async function retryDelivery(notificationId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(notificationRef(notificationId));
    if (!snap.exists())
      throw new AppError('VALIDATION_FAILED', 'This notification no longer exists.');
    const notification = snap.data();
    if (notification.deliveryStatus === 'SENT') return;

    // All reads happen before the writes, as Firestore transactions require.
    let decisionId: string | undefined;
    if (notification.type === 'VERIFICATION_RESULT' && notification.relatedEntityId) {
      const report = await tx.get(
        doc(db, COLLECTIONS.hazardReports, notification.relatedEntityId).withConverter(
          converters.hazardReports,
        ),
      );
      decisionId = report.exists() ? report.data().latestDecision?.decisionId : undefined;
    }

    tx.update(notificationRef(notificationId), { deliveryStatus: 'SENT' });
    if (decisionId) {
      tx.update(doc(db, COLLECTIONS.verificationDecisions, decisionId), {
        notificationStatus: 'SENT',
      });
    }
  });
}
