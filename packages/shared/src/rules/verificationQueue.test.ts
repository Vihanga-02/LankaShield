import { describe, expect, it } from 'vitest';

import { sortReportsNewestFirst, verificationQueueStatuses } from './verificationQueue';

describe('verification queue rules', () => {
  it('includes legacy escalated reports in the verified queue', () => {
    expect(verificationQueueStatuses('VERIFIED')).toEqual(['VERIFIED', 'ESCALATED']);
  });

  it('includes submitted reports in the all queue, excluding drafts and pending sync', () => {
    expect(verificationQueueStatuses('ALL')).toEqual([
      'PENDING_VERIFICATION',
      'VERIFIED',
      'REJECTED',
      'ESCALATED',
    ]);
  });

  it('keeps pending and rejected queues separate', () => {
    expect(verificationQueueStatuses('PENDING_VERIFICATION')).toEqual(['PENDING_VERIFICATION']);
    expect(verificationQueueStatuses('REJECTED')).toEqual(['REJECTED']);
  });

  it('sorts newest first without mutating the input, preserving equal-date order', () => {
    const older = { reportId: 'older', createdAt: '2026-10-05T10:00:00.000Z' };
    const newer = { reportId: 'newer', createdAt: '2026-10-06T10:00:00.000Z' };
    const tied = { reportId: 'tied', createdAt: newer.createdAt };
    const reports = Object.freeze([older, newer, tied]);

    expect(sortReportsNewestFirst(reports)).toEqual([newer, tied, older]);
    expect(reports).toEqual([older, newer, tied]);
    expect(sortReportsNewestFirst([])).toEqual([]);
  });
});
