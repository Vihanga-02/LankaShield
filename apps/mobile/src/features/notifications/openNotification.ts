import { notificationReportId, type NotificationRecord } from '@lankashield/shared';
import { router } from 'expo-router';

import { markNotificationsRead } from './notifications.service';

/**
 * Marks the notification read and opens its report (verification results). Warnings have no
 * screen of their own; `fallback` decides what happens then (e.g. open the Notifications tab).
 */
export function openNotification(notification: NotificationRecord, fallback?: () => void): void {
  if (!notification.read) void markNotificationsRead([notification.notificationId]).catch(() => {});
  const reportId = notificationReportId(notification);
  if (reportId) router.push({ pathname: '/report-details/[id]', params: { id: reportId } });
  else fallback?.();
}
