import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
};

const mockFirestore = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  doc: vi.fn((...args: unknown[]) => ({
    id: typeof args[2] === 'string' ? args[2] : 'mock-generated-id',
    withConverter: vi.fn().mockReturnThis(),
    path: args.join('/'),
  })),
  collection: vi.fn((_db: unknown, name: string) => ({
    withConverter: vi.fn().mockReturnThis(),
    name,
  })),
  query: vi.fn((...args: unknown[]) => ({ args })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  onSnapshot: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('firebase/firestore', () => mockFirestore);

import type { Firestore } from 'firebase/firestore';
import { createVerificationService } from './verification.service';
const { recordWarningDeliveryResult, submitVerificationDecision, subscribeToReportsByStatus } =
  createVerificationService({} as Firestore);

const officer = {
  uid: 'officer-123',
  fullName: 'Ruwan Jayasinghe',
};

const sampleReport = {
  reportId: 'LS-20261005-MWXJ7E',
  reporterId: 'reporter-456',
  hazardType: 'LANDSLIDE',
  severity: 'MODERATE',
  district: 'Ratnapura',
  title: 'Soil slipping near village',
  description: 'Wet soil and rocks',
  status: 'PENDING_VERIFICATION',
  evidenceUrls: [],
  createdAt: '2026-10-05T10:55:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFirestore.runTransaction.mockImplementation(
    async (_db: unknown, cb: (tx: typeof mockTx) => unknown) => {
      return cb(mockTx);
    },
  );
});

describe('submitVerificationDecision', () => {
  it('records "Verify information": updates report status to VERIFIED and saves audit fields', async () => {
    mockTx.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => sampleReport,
    });

    const result = await submitVerificationDecision({
      reportId: sampleReport.reportId,
      officer,
      input: {
        outcome: 'VERIFIED_INFO',
        remarks: 'Confirmed with local responder',
        disasterEventId: 'event-789',
      },
    });

    expect(result.decisionId).toBeDefined();

    // Verify report document update
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'VERIFIED',
        disasterEventId: 'event-789',
        latestDecision: expect.objectContaining({
          officerId: 'officer-123',
          officerName: 'Ruwan Jayasinghe',
          outcome: 'VERIFIED_INFO',
          remarks: 'Confirmed with local responder',
        }),
      }),
    );

    // Verify decision document audit write
    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        reportId: sampleReport.reportId,
        officerId: 'officer-123',
        officerName: 'Ruwan Jayasinghe',
        outcome: 'VERIFIED_INFO',
        remarks: 'Confirmed with local responder',
        disasterEventId: 'event-789',
      }),
    );
  });

  it('records "Verify and escalate": updates report status to VERIFIED and creates Warning Pending record', async () => {
    mockTx.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => sampleReport,
    });

    const result = await submitVerificationDecision({
      reportId: sampleReport.reportId,
      officer,
      input: {
        outcome: 'VERIFIED_ESCALATED',
        remarks: 'Immediate warning required for low-lying areas',
      },
    });

    expect(result.decisionId).toBeDefined();

    // Report status itself is VERIFIED
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'VERIFIED',
        latestDecision: expect.objectContaining({
          outcome: 'VERIFIED_ESCALATED',
          officerName: 'Ruwan Jayasinghe',
        }),
      }),
    );

    // Warning request is created with PENDING deliveryStatus
    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sourceReportId: sampleReport.reportId,
        requestedBy: 'officer-123',
        affectedDistrict: 'Ratnapura',
        status: 'PENDING_ASSESSMENT',
        deliveryStatus: 'PENDING',
      }),
    );
  });

  it('records "Reject report": updates report status to REJECTED with rejection reason and audit info', async () => {
    mockTx.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => sampleReport,
    });

    const result = await submitVerificationDecision({
      reportId: sampleReport.reportId,
      officer,
      input: {
        outcome: 'REJECTED',
        remarks: 'Duplicate submission of existing reported incident',
      },
    });

    expect(result.decisionId).toBeDefined();

    // Report status updated to REJECTED
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'REJECTED',
        latestDecision: expect.objectContaining({
          outcome: 'REJECTED',
          officerName: 'Ruwan Jayasinghe',
          remarks: 'Duplicate submission of existing reported incident',
        }),
      }),
    );
  });

  it('blocks decision on already verified or rejected report', async () => {
    mockTx.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...sampleReport, status: 'VERIFIED' }),
    });

    await expect(
      submitVerificationDecision({
        reportId: sampleReport.reportId,
        officer,
        input: { outcome: 'VERIFIED_INFO', remarks: '' },
      }),
    ).rejects.toThrow();
  });
});

describe('subscribeToReportsByStatus', () => {
  it('queries all reports when status is ALL', () => {
    subscribeToReportsByStatus('ALL', vi.fn(), vi.fn());
    expect(mockFirestore.where).toHaveBeenCalledWith('status', 'in', [
      'PENDING_VERIFICATION',
      'VERIFIED',
      'REJECTED',
      'ESCALATED',
    ]);
  });

  it('queries verified reports including escalated when status is VERIFIED', () => {
    subscribeToReportsByStatus('VERIFIED', vi.fn(), vi.fn());
    expect(mockFirestore.where).toHaveBeenCalledWith('status', 'in', ['VERIFIED', 'ESCALATED']);
  });

  it('queries pending reports when status is PENDING_VERIFICATION', () => {
    subscribeToReportsByStatus('PENDING_VERIFICATION', vi.fn(), vi.fn());
    expect(mockFirestore.where).toHaveBeenCalledWith('status', 'in', ['PENDING_VERIFICATION']);
  });

  it('queries rejected reports when status is REJECTED', () => {
    subscribeToReportsByStatus('REJECTED', vi.fn(), vi.fn());
    expect(mockFirestore.where).toHaveBeenCalledWith('status', 'in', ['REJECTED']);
  });
});

describe('recordWarningDeliveryResult', () => {
  it('updates deliveryStatus to SENT or FAILED', async () => {
    mockTx.get.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ warningRequestId: 'warn-1', deliveryStatus: 'PENDING' }),
    });

    await recordWarningDeliveryResult('warn-1', 'SENT');
    expect(mockTx.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deliveryStatus: 'SENT' }),
    );
  });
});
