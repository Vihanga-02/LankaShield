import { COLLECTIONS } from '../constants/firestore';
import type { DisasterEventStatus, DisasterReportStatus } from '../enums';
import type {
  DisasterEvent,
  EmergencyShelter,
  HazardReport,
  IsoDateString,
  MetricKey,
  NotificationRecord,
  ReportFilters,
  ReportMetric,
  ResponseMetrics,
  ShelterAllocation,
} from '../models';
import { isVerifiedStatus } from './verification';

export const METRIC_KEYS = [
  'reportsReceived',
  'verifiedReports',
  'citizensReached',
  'shelterOccupancy',
  'allocatedEvacuees',
] as const satisfies readonly MetricKey[];

export const METRIC_LABELS: Record<MetricKey, string> = {
  reportsReceived: 'Hazard reports received',
  verifiedReports: 'Verified reports',
  citizensReached: 'Citizens reached',
  // Shelters keep no occupancy history, so this is today's figure for the event district.
  shelterOccupancy: 'Current shelter occupancy',
  allocatedEvacuees: 'Evacuees allocated',
};

const METRIC_SOURCES: Record<MetricKey, string> = {
  reportsReceived: COLLECTIONS.hazardReports,
  verifiedReports: COLLECTIONS.hazardReports,
  citizensReached: COLLECTIONS.notifications,
  shelterOccupancy: COLLECTIONS.shelters,
  allocatedEvacuees: COLLECTIONS.shelterAllocations,
};

/** Data loaded for one analytics run. `null` means that source failed to load. */
export interface AnalyticsInput {
  event: DisasterEvent;
  filters?: ReportFilters;
  /** Hazard reports in the event district (needed to find unreviewed reports as well). */
  reports: readonly HazardReport[] | null;
  shelters: readonly EmergencyShelter[] | null;
  allocations: readonly ShelterAllocation[] | null;
  notifications: readonly NotificationRecord[] | null;
  now: IsoDateString;
}

export interface AnalyticsResult {
  metrics: ReportMetric[];
  /** Values to store in `responseReports.metrics`; unavailable metrics are stored as 0 and listed in `missingMetrics`. */
  values: ResponseMetrics;
  missingMetrics: MetricKey[];
  /** Pending reports in the event district and time window that no officer has reviewed yet. */
  unreviewedReports: number;
  /** Reports linked to the event after filters; the source for charts. */
  eventReports: HazardReport[];
  status: DisasterReportStatus;
}

/** FINAL only for a completed event with every metric complete (§14). */
export function decideReportStatus(
  eventStatus: DisasterEventStatus,
  missingMetrics: readonly MetricKey[],
): DisasterReportStatus {
  return eventStatus === 'COMPLETED' && missingMetrics.length === 0 ? 'FINAL' : 'PROVISIONAL';
}

// Date filters are calendar days (YYYY-MM-DD) compared against the UTC date of `createdAt`.
function withinDateFilters(createdAt: IsoDateString, filters: ReportFilters | undefined): boolean {
  const day = createdAt.slice(0, 10);
  if (filters?.from && day < filters.from) return false;
  if (filters?.to && day > filters.to) return false;
  return true;
}

function withinEventWindow(createdAt: IsoDateString, event: DisasterEvent, now: IsoDateString) {
  const time = Date.parse(createdAt);
  return time >= Date.parse(event.startedAt) && time <= Date.parse(event.endedAt ?? now);
}

export function calculateResponseMetrics(input: AnalyticsInput): AnalyticsResult {
  const { event, filters, reports, shelters, allocations, notifications, now } = input;
  const district = filters?.district ?? event.district;

  const eventReports = (reports ?? []).filter(
    (r) =>
      r.disasterEventId === event.eventId &&
      (!filters?.district || r.district === filters.district) &&
      withinDateFilters(r.createdAt, filters),
  );

  const unreviewedReports = (reports ?? []).filter(
    (r) =>
      r.status === 'PENDING_VERIFICATION' &&
      r.district === event.district &&
      withinEventWindow(r.createdAt, event, now),
  ).length;

  const eventReportIds = new Set(eventReports.map((r) => r.reportId));

  const values: Record<MetricKey, number | null> = {
    reportsReceived: reports ? eventReports.length : null,
    verifiedReports: reports ? eventReports.filter((r) => isVerifiedStatus(r.status)).length : null,
    citizensReached:
      reports && notifications
        ? new Set(
            notifications
              .filter(
                (n) =>
                  n.deliveryStatus === 'SENT' &&
                  n.relatedEntityId !== undefined &&
                  eventReportIds.has(n.relatedEntityId),
              )
              .map((n) => n.recipientId),
          ).size
        : null,
    shelterOccupancy: shelters
      ? shelters
          .filter((s) => s.district === district)
          .reduce((sum, s) => sum + s.currentOccupancy, 0)
      : null,
    allocatedEvacuees: allocations
      ? allocations
          .filter((a) => a.status === 'CONFIRMED' && a.disasterEventId === event.eventId)
          .reduce((sum, a) => sum + a.evacueeCount, 0)
      : null,
  };

  // Unreviewed reports make the report counts incomplete even though a value can be shown.
  const incompleteCounts = unreviewedReports > 0;
  const isComplete = (key: MetricKey) =>
    values[key] !== null &&
    !(incompleteCounts && (key === 'reportsReceived' || key === 'verifiedReports'));

  const metrics: ReportMetric[] = METRIC_KEYS.map((key) => ({
    key,
    value: values[key],
    sourceCollection: METRIC_SOURCES[key],
    calculatedAt: now,
    complete: isComplete(key),
  }));
  const missingMetrics = metrics.filter((m) => !m.complete).map((m) => m.key);

  return {
    metrics,
    values: {
      reportsReceived: values.reportsReceived ?? 0,
      verifiedReports: values.verifiedReports ?? 0,
      citizensReached: values.citizensReached ?? 0,
      shelterOccupancy: values.shelterOccupancy ?? 0,
      allocatedEvacuees: values.allocatedEvacuees ?? 0,
    },
    missingMetrics,
    unreviewedReports,
    eventReports,
    status: decideReportStatus(event.status, missingMetrics),
  };
}
