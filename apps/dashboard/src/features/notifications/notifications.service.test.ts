import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  data: new Map<string, Record<string, unknown>>(),
  nextId: 0,
  failCommit: false,
  failDelivery: false,
  deliveryCommits: 0,
  failDeliveryAt: 0,
  onSnapshot: vi.fn(() => () => {}),
}));

vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'officer-1' } } }));
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  const ref = (path: string) => ({
    path,
    id: path.split('/').at(-1),
    withConverter() {
      return this;
    },
  });
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ref(name),
    doc: (parent: { path?: string }, name?: string, id?: string) =>
      ref(parent.path ? `${parent.path}/${++fake.nextId}` : `${name}/${id}`),
    serverTimestamp: () => new Date().toISOString(),
    getDocs: async () => ({
      docs: [...fake.data.entries()]
        .filter(([path]) => path.startsWith('users/'))
        .map(([, value]) => ({ data: () => value })),
    }),
    where: (field: string, op: string, value: unknown) => ({ field, op, value }),
    query: (reference: unknown, constraint: unknown) => ({ reference, constraint }),
    onSnapshot: fake.onSnapshot,
    runTransaction: async (_db: unknown, action: (tx: unknown) => Promise<unknown>) => {
      const pending: (() => void)[] = [];
      let delivers = false;
      const result = await action({
        get: async (reference: { path: string }) => ({
          exists: () => fake.data.has(reference.path),
          data: () => fake.data.get(reference.path),
        }),
        set: (reference: { path: string }, value: Record<string, unknown>) => {
          delivers ||= reference.path.startsWith('notifications/');
          pending.push(() => {
            fake.data.set(reference.path, value);
          });
        },
        update: (reference: { path: string }, value: Record<string, unknown>) =>
          pending.push(() => {
            fake.data.set(reference.path, { ...fake.data.get(reference.path), ...value });
          }),
      });
      if (delivers && ++fake.deliveryCommits === fake.failDeliveryAt)
        throw new Error('Partial delivery failure');
      if (fake.failDelivery && delivers) throw new Error('Delivery service unavailable');
      if (fake.failCommit) throw new Error('Database unavailable');
      pending.forEach((commit) => commit());
      return result;
    },
  };
});

import {
  createStakeholderNotification,
  sendStakeholderNotification,
} from './notifications.service';

beforeEach(() => {
  fake.data.clear();
  fake.failCommit = false;
  fake.failDelivery = false;
  fake.deliveryCommits = 0;
  fake.failDeliveryAt = 0;
  vi.stubGlobal('navigator', { onLine: true });
  fake.data.set('users/officer-1', { uid: 'officer-1', role: 'DUTY_OFFICER', active: true });
  fake.data.set('users/police-1', {
    uid: 'police-1',
    role: 'VOLUNTEER',
    active: true,
    district: 'Ampara',
    stakeholderGroups: ['POLICE', 'FIRE_RESCUE'],
  });
  fake.data.set('hazardReports/report-1', { status: 'VERIFIED' });
  fake.data.set('warningRequests/warning-1', { deliveryStatus: 'PENDING' });
  fake.data.set('stakeholderNotifications/notice-1', {
    notificationId: 'notice-1',
    reportId: 'report-1',
    warningRequestId: 'warning-1',
    stakeholders: ['POLICE', 'FIRE_RESCUE'],
    district: 'Ampara',
    title: 'Verified fire',
    message: 'Take action',
    deliveryStatus: 'PENDING',
    sendRequested: false,
    attemptCount: 0,
  });
});
const outbox = () => fake.data.get('stakeholderNotifications/notice-1')!;
const inboxes = () => [...fake.data.keys()].filter((path) => path.startsWith('notifications/'));

describe('stakeholder in-app delivery', () => {
  it('delivers once to overlapping stakeholder groups and persists SENT', async () => {
    await sendStakeholderNotification('notice-1');
    expect(inboxes()).toHaveLength(1);
    expect(outbox()).toMatchObject({
      deliveryStatus: 'SENT',
      attemptCount: 1,
      recipientIds: ['police-1'],
      sendRequested: true,
    });
    expect(outbox().lastAttemptAt).toBeTruthy();
    expect(fake.data.get('warningRequests/warning-1')?.deliveryStatus).toBe('SENT');
    await sendStakeholderNotification('notice-1');
    expect(inboxes()).toHaveLength(1);
    expect(outbox().attemptCount).toBe(1);
  });
  it('preserves content and verification after failure, then retries successfully', async () => {
    fake.failDelivery = true;
    await expect(sendStakeholderNotification('notice-1')).rejects.toThrow(
      'Delivery service unavailable',
    );
    expect(outbox()).toMatchObject({
      deliveryStatus: 'FAILED',
      message: 'Take action',
      stakeholders: ['POLICE', 'FIRE_RESCUE'],
      attemptCount: 1,
    });
    expect(fake.data.get('hazardReports/report-1')?.status).toBe('VERIFIED');
    expect(inboxes()).toHaveLength(0);
    fake.failDelivery = false;
    await sendStakeholderNotification('notice-1');
    expect(outbox()).toMatchObject({ deliveryStatus: 'SENT', attemptCount: 2, lastError: '' });
    expect(inboxes()).toHaveLength(1);
  });
  it('fails visibly when any selected stakeholder group has no recipients', async () => {
    fake.data.delete('users/police-1');
    await expect(sendStakeholderNotification('notice-1')).rejects.toThrow(
      'No registered recipients',
    );
    expect(outbox().deliveryStatus).toBe('FAILED');
    expect(inboxes()).toHaveLength(0);
  });
  it('retains an offline notification without claiming delivery', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await expect(sendStakeholderNotification('notice-1')).rejects.toThrow('offline');
    expect(outbox().deliveryStatus).toBe('PENDING');
    expect(inboxes()).toHaveLength(0);
  });
  it('does not steal a recent pending attempt', async () => {
    Object.assign(outbox(), {
      sendRequested: true,
      lastAttemptAt: new Date().toISOString(),
      attemptCount: 1,
    });
    await sendStakeholderNotification('notice-1');
    expect(outbox().attemptCount).toBe(1);
    expect(inboxes()).toHaveLength(0);
  });
  it('recovers a stale attempt after reopening the app', async () => {
    Object.assign(outbox(), {
      sendRequested: true,
      lastAttemptAt: new Date(Date.now() - 120000).toISOString(),
      attemptCount: 1,
    });
    await sendStakeholderNotification('notice-1');
    expect(outbox()).toMatchObject({ deliveryStatus: 'SENT', attemptCount: 2 });
  });
  it('rejects sending by a non-duty officer', async () => {
    fake.data.set('users/officer-1', { role: 'DISTRICT_OFFICER', active: true });
    await expect(sendStakeholderNotification('notice-1')).rejects.toThrow(
      'Only active Duty Officers',
    );
    expect(outbox().attemptCount).toBe(0);
  });
});

it('resumes partial delivery without resetting already received inbox records', async () => {
  for (let i = 0; i < 205; i++)
    fake.data.set('users/recipient-' + i, {
      uid: 'recipient-' + i,
      role: 'VOLUNTEER',
      active: true,
      district: 'Ampara',
      stakeholderGroups: ['POLICE'],
    });
  fake.failDeliveryAt = 2;
  await expect(sendStakeholderNotification('notice-1')).rejects.toThrow('Partial delivery failure');
  expect(inboxes()).toHaveLength(200);
  const deliveredPath = inboxes()[0];
  fake.data.get(deliveredPath)!.read = true;
  fake.failDeliveryAt = 0;
  await sendStakeholderNotification('notice-1');
  expect(inboxes()).toHaveLength(206);
  expect(fake.data.get(deliveredPath)!.read).toBe(true);
  expect(outbox().deliveryStatus).toBe('SENT');
});
it('excludes inactive and other-district recipients', async () => {
  fake.data.set('users/inactive', {
    uid: 'inactive',
    active: false,
    district: 'Ampara',
    stakeholderGroups: ['POLICE'],
  });
  fake.data.set('users/elsewhere', {
    uid: 'elsewhere',
    active: true,
    district: 'Colombo',
    stakeholderGroups: ['POLICE'],
  });
  await sendStakeholderNotification('notice-1');
  expect(outbox().recipientIds).toEqual(['police-1']);
});

it.each(['DUTY_OFFICER', 'DMC_ANALYST'])(
  'allows %s to create and send to all five role inboxes',
  async (role) => {
    fake.data.set('users/officer-1', { uid: 'officer-1', role, active: true, fullName: 'Sender' });
    fake.data.set('hazardReports/report-1', {
      status: 'VERIFIED',
      title: 'Fire hazard',
      hazardType: 'FIRE',
      severity: 'HIGH',
      district: 'Ampara',
    });
    const roles = [
      'CITIZEN',
      'VOLUNTEER',
      'DUTY_OFFICER',
      'DISTRICT_OFFICER',
      'DMC_ANALYST',
    ] as const;
    for (const recipientRole of roles)
      fake.data.set('users/' + recipientRole, {
        uid: recipientRole,
        role: recipientRole,
        active: true,
        district: 'Colombo',
      });
    const id = await createStakeholderNotification('report-1', {
      stakeholders: [...roles],
      title: 'Fire',
      message: 'Verified fire information',
    });
    expect(fake.data.get('stakeholderNotifications/' + id)).toMatchObject({
      deliveryStatus: 'PENDING',
      createdBy: 'officer-1',
      stakeholders: [...roles],
    });
    await sendStakeholderNotification(id);
    for (const recipientRole of roles)
      expect(fake.data.get('notifications/' + id + '_' + recipientRole)).toMatchObject({
        recipientId: recipientRole,
        title: 'Fire',
        body: 'Verified fire information',
        deliveryStatus: 'SENT',
      });
    expect(fake.data.get('hazardReports/report-1')?.status).toBe('VERIFIED');
  },
);
it('does not allow District Officers to compose notifications', async () => {
  fake.data.set('users/officer-1', { role: 'DISTRICT_OFFICER', active: true });
  await expect(
    createStakeholderNotification('report-1', {
      stakeholders: ['CITIZEN'],
      title: 'Fire',
      message: 'Verified',
    }),
  ).rejects.toThrow('Only active Duty Officers and DMC Analysts');
});
