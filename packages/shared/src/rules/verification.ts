import { AppError } from '../constants/errors';
import type { HazardReportStatus, VerificationOutcome } from '../enums';

/** Report status written for each verification outcome (UC02). */
export const OUTCOME_TO_REPORT_STATUS: Record<VerificationOutcome, HazardReportStatus> = {
  VERIFIED_INFO: 'VERIFIED',
  REJECTED: 'REJECTED',
  VERIFIED_ESCALATED: 'ESCALATED',
};

/** Only reports waiting for review can receive a decision; this blocks a second decision. */
export function canReceiveDecision(status: HazardReportStatus): boolean {
  return status === 'PENDING_VERIFICATION';
}

/**
 * Validates the transition for a report re-read just before the verification batch.
 *
 * @throws AppError REPORT_NOT_FOUND when the report no longer exists
 * @throws AppError ALREADY_VERIFIED when the report is not pending verification
 */
export function assertCanReceiveDecision(status: HazardReportStatus | undefined): void {
  if (status === undefined) throw new AppError('REPORT_NOT_FOUND');
  if (!canReceiveDecision(status)) throw new AppError('ALREADY_VERIFIED');
}

export function remarksRequired(outcome: VerificationOutcome): boolean {
  return outcome === 'REJECTED';
}

export function createsWarningRequest(outcome: VerificationOutcome): boolean {
  return outcome === 'VERIFIED_ESCALATED';
}

/** Statuses counted as verified in analytics (§14). */
export function isVerifiedStatus(status: HazardReportStatus): boolean {
  return status === 'VERIFIED' || status === 'ESCALATED';
}
