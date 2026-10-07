import { describe, expect, it } from 'vitest';

import type { NotificationRecord } from '../models';
import {
  activeWarnings,
  countUnread,
  deliveredNotifications,
  deliverySummary,
  newUnreadNotifications,
  notificationReportId,
  unreadResultIdsForReport,
} from './notifications';

function notification(id: string, overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    notificationId: id,
    recipientId: 'citizen',
    type: 'VERIFICATION_RESULT',
    title: 'Your hazard report was verified',
    body: 'Flood near the bridge',
    relatedEntityId: 'LS-1',
    read: false,
    deliveryStatus: 'SENT',
    createdAt: '2026-10-05T10:00:00.000Z',
    ...overrides,
  };
}

describe('notification rules', () => {
  const list = [
    notification('old-result', { read: true, createdAt: '2026-10-01T10:00:00.000Z' }),
    notification('new-result', { createdAt: '2026-10-06T10:00:00.000Z', relatedEntityId: 'LS-2' }),
    notification('warning', {
      type: 'WARNING',
      relatedEntityId: 'WR-1',
      createdAt: '2026-10-04T10:00:00.000Z',
    }),
    notification('read-warning', { type: 'WARNING', read: true }),
    notification('pending', { deliveryStatus: 'PENDING' }),
    notification('failed', { deliveryStatus: 'FAILED' }),
  ];

  it('shows only delivered notifications on mobile, newest first', () => {
    expect(deliveredNotifications(list).map((n) => n.notificationId)).toEqual([
      'new-result',
      'read-warning',
      'warning',
      'old-result',
    ]);
  });

  it('counts unread notifications', () => {
    expect(countUnread(deliveredNotifications(list))).toBe(2);
    expect(countUnread([])).toBe(0);
  });

  it('treats unread warnings as active warnings', () => {
    expect(activeWarnings(list).map((n) => n.notificationId)).toEqual(['warning']);
  });

  it('links only verification results to a report', () => {
    expect(notificationReportId(list[1])).toBe('LS-2');
    expect(notificationReportId(list[2])).toBeUndefined();
  });

  it('finds unread results for a report', () => {
    expect(unreadResultIdsForReport(list, 'LS-2')).toEqual(['new-result']);
    expect(unreadResultIdsForReport(list, 'LS-1')).toEqual(['pending', 'failed']);
  });

  it('finds notifications that arrived after the known set, unread only', () => {
    const known = new Set(['old-result', 'warning']);
    expect(newUnreadNotifications(known, list).map((n) => n.notificationId)).toEqual([
      'new-result',
      'pending',
      'failed',
    ]);
  });

  it('summarises delivery states', () => {
    expect(deliverySummary(list)).toEqual({ SENT: 4, PENDING: 1, FAILED: 1 });
  });
});
