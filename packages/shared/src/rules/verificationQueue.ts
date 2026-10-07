import type { HazardReportStatus } from '../enums';
import type { HazardReport } from '../models';

/** Status filter on the verification queue: one reviewed status, or every submitted report. */
export type VerificationQueueStatusFilter =
  'PENDING_VERIFICATION' | 'VERIFIED' | 'ESCALATED' | 'REJECTED' | 'ALL';

/** Report statuses for a queue filter. "All" covers submitted reports, not drafts or pending sync. */
export function verificationQueueStatuses(
  status: VerificationQueueStatusFilter,
): HazardReportStatus[] {
  return status === 'ALL'
    ? ['PENDING_VERIFICATION', 'VERIFIED', 'ESCALATED', 'REJECTED']
    : [status];
}

/** Returns reports newest first without changing the source array. */
export function sortReportsNewestFirst<T extends Pick<HazardReport, 'createdAt'>>(
  reports: readonly T[],
): T[] {
  return [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
