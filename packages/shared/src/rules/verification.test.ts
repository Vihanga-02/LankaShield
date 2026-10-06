import { describe, expect, it } from 'vitest';

import { HAZARD_REPORT_STATUSES } from '../enums';
import {
  assertCanReceiveDecision,
  canReceiveDecision,
  createsWarningRequest,
  isVerifiedStatus,
  OUTCOME_TO_REPORT_STATUS,
  remarksRequired,
} from './verification';

describe('verification transitions', () => {
  it('maps each outcome to its report status', () => {
    expect(OUTCOME_TO_REPORT_STATUS).toEqual({
      VERIFIED_INFO: 'VERIFIED',
      REJECTED: 'REJECTED',
      VERIFIED_ESCALATED: 'VERIFIED',
    });
  });

  it('only accepts a decision for a pending report', () => {
    const accepted = HAZARD_REPORT_STATUSES.filter(canReceiveDecision);
    expect(accepted).toEqual(['PENDING_VERIFICATION']);
  });

  it('blocks a second decision with ALREADY_VERIFIED', () => {
    for (const status of ['VERIFIED', 'REJECTED', 'ESCALATED'] as const) {
      expect(() => assertCanReceiveDecision(status)).toThrowError(
        expect.objectContaining({ code: 'ALREADY_VERIFIED' }),
      );
    }
  });

  it('reports a missing report with REPORT_NOT_FOUND', () => {
    expect(() => assertCanReceiveDecision(undefined)).toThrowError(
      expect.objectContaining({ code: 'REPORT_NOT_FOUND' }),
    );
  });

  it('passes for a pending report', () => {
    expect(() => assertCanReceiveDecision('PENDING_VERIFICATION')).not.toThrow();
  });
});

describe('outcome rules', () => {
  it('requires remarks only for rejection', () => {
    expect(remarksRequired('REJECTED')).toBe(true);
    expect(remarksRequired('VERIFIED_INFO')).toBe(false);
    expect(remarksRequired('VERIFIED_ESCALATED')).toBe(false);
  });

  it('creates a warning request only for escalation', () => {
    expect(createsWarningRequest('VERIFIED_ESCALATED')).toBe(true);
    expect(createsWarningRequest('VERIFIED_INFO')).toBe(false);
    expect(createsWarningRequest('REJECTED')).toBe(false);
  });

  it('counts VERIFIED and ESCALATED as verified', () => {
    const verified = HAZARD_REPORT_STATUSES.filter(isVerifiedStatus);
    expect(verified).toEqual(['VERIFIED', 'ESCALATED']);
  });
});
