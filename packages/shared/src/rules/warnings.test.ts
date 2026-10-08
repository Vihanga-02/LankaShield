import { describe, expect, it } from 'vitest';

import type { AppUser, NotificationRecord } from '../models';
import { declineWarningRequestSchema, warningInputSchema } from '../schemas/warning.schema';
import { activeWarnings } from './notifications';
import {
  alertLevelFor,
  draftFromRequest,
  isWarningActive,
  missingRecipients,
  usersWithoutDistrict,
  warningExpiry,
  warningNotificationId,
  warningRecipients,
} from './warnings';

function user(uid: string, overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid,
    fullName: uid,
    email: `${uid}@example.com`,
    role: 'CITIZEN',
    district: 'Ratnapura',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const users = [
  user('citizen'),
  user('volunteer', { role: 'VOLUNTEER' }),
  user('elsewhere', { district: 'Kalutara' }),
  user('no-district', { district: undefined }),
  user('inactive', { active: false }),
  user('officer', { role: 'DISTRICT_OFFICER' }),
];

describe('warning recipients', () => {
  it('targets active citizens and volunteers whose home district matches', () => {
    expect(warningRecipients(users, 'Ratnapura').map((u) => u.uid)).toEqual([
      'citizen',
      'volunteer',
    ]);
    expect(warningRecipients(users, 'Kalutara').map((u) => u.uid)).toEqual(['elsewhere']);
    expect(warningRecipients(users, 'Jaffna')).toEqual([]);
  });

  it('counts active mobile users who cannot be reached because they have no district', () => {
    expect(usersWithoutDistrict(users)).toBe(1);
  });

  it('uses one notification ID per warning and recipient, and finds who is still missing', () => {
    expect(warningNotificationId('W1', 'citizen')).toBe('W1_citizen');
    expect(
      missingRecipients(warningRecipients(users, 'Ratnapura'), new Set(['citizen'])).map(
        (u) => u.uid,
      ),
    ).toEqual(['volunteer']);
  });
});

describe('warning details', () => {
  it('maps severity to the analytics alert level', () => {
    expect(alertLevelFor('EXTREME')).toBe('HIGH');
    expect(alertLevelFor('HIGH')).toBe('HIGH');
    expect(alertLevelFor('MODERATE')).toBe('MEDIUM');
    expect(alertLevelFor('LOW')).toBe('ADVISORY');
  });

  it('expires after the chosen number of hours', () => {
    const expiresAt = warningExpiry(new Date('2026-10-08T00:00:00.000Z'), 24);
    expect(expiresAt).toBe('2026-10-09T00:00:00.000Z');
    expect(isWarningActive({ expiresAt }, '2026-10-08T23:59:00.000Z')).toBe(true);
    expect(isWarningActive({ expiresAt }, '2026-10-09T00:00:00.000Z')).toBe(false);
  });

  it('drafts a warning from an escalated report', () => {
    const draft = draftFromRequest(
      { hazardType: 'FLOOD', severity: 'HIGH', affectedDistrict: 'Ratnapura' },
      { title: 'Kalu Ganga rising', description: 'River rose one metre in two hours.' },
    );
    expect(draft.title).toBe('Flood warning: Ratnapura');
    expect(draft.message).toContain('Kalu Ganga rising. River rose one metre in two hours.');
    expect(draft).toMatchObject({ severity: 'HIGH', district: 'Ratnapura' });
    expect(
      draftFromRequest(
        { hazardType: 'OTHER', severity: 'HIGH', affectedDistrict: 'Kandy' },
        { title: 'Rock fell on the railway line.', description: 'The train derailed.' },
      ).message,
    ).toContain('Rock fell on the railway line. The train derailed.');
    expect(
      draftFromRequest({
        hazardType: 'LANDSLIDE',
        severity: 'MODERATE',
        affectedDistrict: 'Kalutara',
      }).message,
    ).toContain('moderate landslide risk');
  });
});

describe('active warnings on mobile', () => {
  const now = '2026-10-08T12:00:00.000Z';
  const warning = (id: string, overrides: Partial<NotificationRecord>): NotificationRecord => ({
    notificationId: id,
    recipientId: 'citizen',
    type: 'WARNING',
    title: 'Flood warning',
    body: 'Move to higher ground',
    read: false,
    deliveryStatus: 'SENT',
    createdAt: '2026-10-08T10:00:00.000Z',
    ...overrides,
  });

  it('keeps an unexpired warning active after it is read, and drops expired ones', () => {
    const list = [
      warning('read-active', { read: true, expiresAt: '2026-10-09T00:00:00.000Z' }),
      warning('expired', { expiresAt: '2026-10-08T11:00:00.000Z' }),
      warning('legacy-unread', {}),
      warning('legacy-read', { read: true }),
    ];
    expect(activeWarnings(list, 3, now).map((n) => n.notificationId)).toEqual([
      'read-active',
      'legacy-unread',
    ]);
  });
});

describe('warning schemas', () => {
  const valid = {
    district: 'Ratnapura',
    severity: 'HIGH',
    title: 'Flood warning: Ratnapura',
    message: 'Kalu Ganga is rising. Move to higher ground.',
    durationHours: 24,
  };

  it('accepts a complete warning and reports invalid fields', () => {
    expect(warningInputSchema.safeParse(valid).success).toBe(true);
    const result = warningInputSchema.safeParse({
      ...valid,
      title: 'Hi',
      message: 'Short',
      district: '',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual([
      'district',
      'message',
      'title',
    ]);
    expect(warningInputSchema.safeParse({ ...valid, durationHours: 200 }).success).toBe(false);
  });

  it('requires a reason to decline a request', () => {
    expect(declineWarningRequestSchema.safeParse({ reason: 'no' }).success).toBe(false);
    expect(
      declineWarningRequestSchema.safeParse({ reason: 'Already covered by W-12' }).success,
    ).toBe(true);
  });
});
