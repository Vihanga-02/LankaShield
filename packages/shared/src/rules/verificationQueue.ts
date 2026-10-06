import type { HazardReportStatus } from '../enums';
import type { HazardReport } from '../models';

export type VerificationQueueStatusFilter =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ALL';

/** Legacy escalated reports remain visible in the verified queue. */
export function verificationQueueStatuses(
  status: VerificationQueueStatusFilter,
): HazardReportStatus[] {
  return status === 'ALL'
    ? ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'ESCALATED']
    : status === 'VERIFIED'
      ? ['VERIFIED', 'ESCALATED']
      : [status];
}

/** Returns reports newest first without changing the source array. */
export function sortReportsNewestFirst<T extends Pick<HazardReport, 'createdAt'>>(
  reports: readonly T[],
): T[] {
  return [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
