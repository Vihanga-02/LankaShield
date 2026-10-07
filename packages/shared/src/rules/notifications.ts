import type { DeliveryStatus, NotificationType } from '../enums';
import type { NotificationRecord } from '../models';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  VERIFICATION_RESULT: 'Verification result',
  WARNING: 'Warning',
  SYSTEM: 'System',
};

/** Returns notifications newest first without changing the source array. */
export function sortNotificationsNewestFirst<T extends Pick<NotificationRecord, 'createdAt'>>(
  notifications: readonly T[],
): T[] {
  return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Notifications that reached the recipient's app (§10.5). PENDING and FAILED deliveries are listed
 * for the Duty Officer instead, and appear on mobile once a retry marks them SENT (D43).
 */
export function deliveredNotifications(
  notifications: readonly NotificationRecord[],
): NotificationRecord[] {
  return sortNotificationsNewestFirst(notifications.filter((n) => n.deliveryStatus === 'SENT'));
}

export function countUnread(notifications: readonly NotificationRecord[]): number {
  return notifications.filter((n) => !n.read).length;
}

/** Unread warnings, newest first: the Home screen's "Active warnings". */
export function activeWarnings(
  notifications: readonly NotificationRecord[],
  limit = 3,
): NotificationRecord[] {
  return sortNotificationsNewestFirst(
    notifications.filter((n) => n.type === 'WARNING' && !n.read),
  ).slice(0, limit);
}

/** The hazard report a notification is about, when it has one (verification results). */
export function notificationReportId(notification: NotificationRecord): string | undefined {
  return notification.type === 'VERIFICATION_RESULT' ? notification.relatedEntityId : undefined;
}

/** Unread verification results for one report, so opening the report can mark them read. */
export function unreadResultIdsForReport(
  notifications: readonly NotificationRecord[],
  reportId: string,
): string[] {
  return notifications
    .filter((n) => !n.read && notificationReportId(n) === reportId)
    .map((n) => n.notificationId);
}

/**
 * Notifications that arrived after `knownIds` was taken and are still unread, newest first —
 * used to show a banner while the app is open, without alerting for the initial list.
 */
export function newUnreadNotifications(
  knownIds: ReadonlySet<string>,
  notifications: readonly NotificationRecord[],
): NotificationRecord[] {
  return sortNotificationsNewestFirst(
    notifications.filter((n) => !n.read && !knownIds.has(n.notificationId)),
  );
}

export function deliverySummary(
  notifications: readonly Pick<NotificationRecord, 'deliveryStatus'>[],
): Record<DeliveryStatus, number> {
  const summary: Record<DeliveryStatus, number> = { SENT: 0, PENDING: 0, FAILED: 0 };
  for (const n of notifications) summary[n.deliveryStatus] += 1;
  return summary;
}
