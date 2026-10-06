import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  data: new Map<string, Record<string, unknown>>(),
  nextId: 0,
  failCommit: false,
  onSnapshot: vi.fn(() => () => {}),
}));

vi.mock('../../services/firebase', () => ({ db: {} }));
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
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    where: (field: string, op: string, value: unknown) => ({ field, op, value }),
    query: (reference: unknown, constraint: unknown) => ({ reference, constraint }),
    onSnapshot: fake.onSnapshot,
    runTransaction: async (_db: unknown, action: (tx: unknown) => Promise<unknown>) => {
      const pending: (() => void)[] = [];
      const result = await action({
        get: async (reference: { path: string }) => ({
          exists: () => fake.data.has(reference.path),
          data: () => fake.data.get(reference.path),
        }),
        set: (reference: { path: string }, value: Record<string, unknown>) =>
          pending.push(() => {
            fake.data.set(reference.path, value);
          }),
        update: (reference: { path: string }, value: Record<string, unknown>) =>
          pending.push(() => {
            fake.data.set(reference.path, { ...fake.data.get(reference.path), ...value });
          }),
      });
      if (fake.failCommit) throw new Error('Database unavailable');
      pending.forEach((commit) => commit());
      return result;
    },
  };
});

import {
  recordWarningDeliveryResult,
  submitVerificationDecision,
  subscribeToReportsByStatus,
} from './verification.service';

const officer = { uid: 'officer-1', fullName: 'Duty Officer' };
const submit = (
  outcome: 'VERIFIED_INFO' | 'VERIFIED_ESCALATED' | 'REJECTED',
  remarks = 'Checked evidence',
) =>
  submitVerificationDecision({
    reportId: 'report-1',
    officer,
    input: {
      outcome,
      remarks,
      ...(outcome === 'VERIFIED_ESCALATED'
        ? {
            stakeholderNotification: {
              stakeholders: ['CITIZEN'] as ['CITIZEN'],
              title: 'Flood warning',
              message: 'Verified flooding',
            },
          }
        : {}),
    },
  });
const records = (collection: string) =>
  [...fake.data.entries()]
    .filter(([path]) => path.startsWith(`${collection}/`))
    .map(([, data]) => data);

beforeEach(() => {
  fake.data.clear();
  fake.nextId = 0;
  fake.failCommit = false;
  fake.onSnapshot.mockClear();
  fake.data.set('hazardReports/report-1', {
    status: 'PENDING_VERIFICATION',
    reporterId: 'citizen-1',
    title: 'Flood',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    district: 'Ratnapura',
  });
});

describe('persisted verification decisions', () => {
  it.each([
    ['VERIFIED_INFO', 'VERIFIED'],
    ['VERIFIED_ESCALATED', 'VERIFIED'],
    ['REJECTED', 'REJECTED'],
  ] as const)(
    '%s commits report status and the officer audit together',
    async (outcome, status) => {
      const { decisionId } = await submit(outcome);
      expect(fake.data.get('hazardReports/report-1')).toMatchObject({
        status,
        latestDecision: {
          decisionId,
          outcome,
          officerId: officer.uid,
          officerName: officer.fullName,
          remarks: 'Checked evidence',
          decidedAt: 'SERVER_TIMESTAMP',
        },
      });
      expect(records('verificationDecisions')).toEqual([
        expect.objectContaining({
          decisionId,
          outcome,
          officerId: officer.uid,
          remarks: 'Checked evidence',
          decidedAt: 'SERVER_TIMESTAMP',
        }),
      ]);
      expect(records('warningRequests')).toHaveLength(outcome === 'VERIFIED_ESCALATED' ? 1 : 0);
      await expect(submit(outcome)).rejects.toMatchObject({ code: 'ALREADY_VERIFIED' });
    },
  );

  it('does not confuse the reporter notification with warning delivery', async () => {
    await submit('VERIFIED_ESCALATED');
    expect(records('notifications')[0]).toMatchObject({
      type: 'VERIFICATION_RESULT',
      deliveryStatus: 'SENT',
    });
    expect(records('warningRequests')[0]).toMatchObject({
      status: 'PENDING_ASSESSMENT',
      deliveryStatus: 'PENDING',
    });
    const id = records('warningRequests')[0].warningRequestId as string;
    await recordWarningDeliveryResult(id, 'FAILED');
    expect(records('warningRequests')[0].deliveryStatus).toBe('FAILED');
    await recordWarningDeliveryResult(id, 'SENT');
    await recordWarningDeliveryResult(id, 'FAILED');
    expect(records('warningRequests')[0].deliveryStatus).toBe('SENT');
    expect(fake.data.get('hazardReports/report-1')?.status).toBe('VERIFIED');
  });

  it('rejects an empty rejection reason before writing', async () => {
    await expect(submit('REJECTED', '  ')).rejects.toThrow();
    expect(fake.data.size).toBe(1);
  });

  it('does not leave partial decisions when the transaction fails', async () => {
    fake.failCommit = true;
    await expect(submit('VERIFIED_ESCALATED')).rejects.toThrow('Database unavailable');
    expect(fake.data.size).toBe(1);
    expect(fake.data.get('hazardReports/report-1')?.status).toBe('PENDING_VERIFICATION');
  });

  it.each([
    ['PENDING_VERIFICATION', ['PENDING_VERIFICATION']],
    ['VERIFIED', ['VERIFIED', 'ESCALATED']],
    ['REJECTED', ['REJECTED']],
    ['ALL', ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'ESCALATED']],
  ] as const)('subscribes to persisted statuses for %s', (status, values) => {
    subscribeToReportsByStatus(
      status,
      () => {},
      () => {},
    );
    expect(fake.onSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        constraint: { field: 'status', op: 'in', value: values },
      }),
      expect.any(Function),
      expect.any(Function),
    );
  });
});

it('saves selected stakeholders and editable content atomically with escalation', async () => {
  await submit('VERIFIED_ESCALATED');
  expect(records('stakeholderNotifications')).toEqual([
    expect.objectContaining({
      stakeholders: ['CITIZEN'],
      title: 'Flood warning',
      message: 'Verified flooding',
      createdBy: 'officer-1',
      reportId: 'report-1',
      deliveryStatus: 'PENDING',
      sendRequested: false,
      attemptCount: 0,
    }),
  ]);
});
