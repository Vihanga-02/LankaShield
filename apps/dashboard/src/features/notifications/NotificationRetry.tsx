import { NOTIFICATION_RETRY_DELAY_MS } from './notificationPolicy';
import { useEffect } from 'react';
import { canSendStakeholderNotifications, type StakeholderNotification } from '@lankashield/shared';
import { useAuthStore } from '../../store/authStore';
import { sendStakeholderNotification, subscribeToOutbox } from './notifications.service';

/** Retry only notifications explicitly sent before, while an officer session is open. */
export function NotificationRetry() {
  const user = useAuthStore((state) => state.user);
  useEffect(() => {
    if (!canSendStakeholderNotifications(user)) return;
    let records: StakeholderNotification[] = [];
    let active = true;
    let running = false;
    const retry = async () => {
      if (running || !navigator.onLine) return;
      running = true;
      try {
        for (const record of records) {
          if (!active) break;
          if (!record.sendRequested || record.deliveryStatus === 'SENT') continue;
          if (record.lastAttemptAt && Date.now() - Date.parse(record.lastAttemptAt) < NOTIFICATION_RETRY_DELAY_MS)
            continue;
          try {
            await sendStakeholderNotification(record.notificationId);
          } catch {
            /* Persisted status and errors appear in the outbox. */
          }
        }
      } finally {
        running = false;
      }
    };
    const unsubscribe = subscribeToOutbox(
      (data) => {
        records = data;
        void retry();
      },
      () => {},
    );
    const interval = window.setInterval(() => void retry(), NOTIFICATION_RETRY_DELAY_MS);
    window.addEventListener('online', retry);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener('online', retry);
    };
  }, [user]);
  return null;
}
