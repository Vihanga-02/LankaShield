import { COLLECTIONS, resolveStakeholderRecipients, canSendStakeholderNotifications } from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { NOTIFICATION_RETRY_DELAY_MS, DELIVERY_CHUNK_SIZE } from './notificationPolicy';
const reference = (id: string) => doc(db, COLLECTIONS.stakeholderNotifications, id).withConverter(converters.stakeholderNotifications);
/** Claim a durable attempt, then atomically deliver inbox records and update delivery status.
 * Stable document IDs and the attempt token make retries and competing tabs idempotent.
 */
export async function sendStakeholderNotification(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to send notifications.');
  if (!navigator.onLine)
    throw new Error('You are offline. The notification is saved; retry when connected.');
  const ref = reference(id);
  const attemptId = crypto.randomUUID();
  const notification = await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    const officer = await tx.get(doc(db, COLLECTIONS.users, uid).withConverter(converters.users));
    if (
      !officer.exists() || !canSendStakeholderNotifications(officer.data())
    )
      throw new Error('Only active Duty Officers and DMC Analysts can send notifications.');
    if (!snapshot.exists()) throw new Error('Notification not found.');
    const record = snapshot.data();
    if (record.deliveryStatus === 'SENT') return null;
    if (
      record.deliveryStatus === 'PENDING' &&
      record.lastAttemptAt &&
      Date.now() - Date.parse(record.lastAttemptAt) < NOTIFICATION_RETRY_DELAY_MS
    )
      return null;
    tx.update(ref, {
      sendRequested: true,
      deliveryStatus: 'PENDING',
      attemptId,
      attemptCount: record.attemptCount + 1,
      lastAttemptAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastError: '',
    });
    tx.update(doc(db, COLLECTIONS.warningRequests, record.warningRequestId), {
      deliveryStatus: 'PENDING',
      updatedAt: serverTimestamp(),
    });
    return record;
  });
  if (!notification) return;
  try {
    let recipientIds = notification.recipientIds;
    if (!recipientIds) {
      const users = await getDocs(
        collection(db, COLLECTIONS.users).withConverter(converters.users),
      );
      recipientIds = resolveStakeholderRecipients(
        notification,
        users.docs.map((d) => d.data()),
      );
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        if (snapshot.exists() && snapshot.data().attemptId === attemptId)
          tx.update(ref, { recipientIds });
      });
    }
    const audience = recipientIds;
    // Bounded chunks support larger audiences. Committed recipient IDs survive partial failures.
    for (let offset = 0; offset < recipientIds.length; offset += DELIVERY_CHUNK_SIZE) {
      const chunk = recipientIds.slice(offset, offset + DELIVERY_CHUNK_SIZE);
      const owned = await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        if (
          !snapshot.exists() ||
          snapshot.data().attemptId !== attemptId ||
          snapshot.data().deliveryStatus === 'SENT'
        )
          return false;
        const delivered = new Set(snapshot.data().deliveredRecipientIds ?? []);
        for (const recipientId of chunk) {
          if (delivered.has(recipientId)) continue;
          const notificationId = id + '_' + recipientId;
          tx.set(
            doc(db, COLLECTIONS.notifications, notificationId).withConverter(
              converters.notifications,
            ),
            {
              notificationId,
              recipientId,
              type: 'WARNING',
              title: notification.title,
              body: notification.message,
              relatedEntityId: notification.reportId,
              read: false,
              deliveryStatus: 'SENT',
              createdAt: serverTimestamp(),
            },
          );
          delivered.add(recipientId);
        }
        const complete = audience.every((uid) => delivered.has(uid));
        tx.update(ref, {
          deliveryStatus: complete ? 'SENT' : 'PENDING',
          deliveredRecipientIds: [...delivered],
          updatedAt: serverTimestamp(),
          lastError: '',
        });
        if (complete)
          tx.update(doc(db, COLLECTIONS.warningRequests, notification.warningRequestId), {
            deliveryStatus: 'SENT',
            updatedAt: serverTimestamp(),
          });
        return true;
      });
      if (!owned) return;
    }
  } catch (error) {
    // If connectivity prevents recording failure, the persisted PENDING attempt remains retryable.
    try {
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        if (
          !snapshot.exists() ||
          snapshot.data().attemptId !== attemptId ||
          snapshot.data().deliveryStatus === 'SENT'
        )
          return;
        tx.update(ref, {
          deliveryStatus: 'FAILED',
          lastError: error instanceof Error ? error.message : 'Delivery failed.',
          updatedAt: serverTimestamp(),
        });
        tx.update(doc(db, COLLECTIONS.warningRequests, notification.warningRequestId), {
          deliveryStatus: 'FAILED',
          updatedAt: serverTimestamp(),
        });
      });
    } catch {
      /* Durable pending record is retained for retry. */
    }
    throw error;
  }
}

