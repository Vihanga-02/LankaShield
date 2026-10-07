import { COLLECTIONS } from '../constants/firestore';
import type { DisasterEventStatus, DisasterReportStatus } from '../enums';
import type {
  CitizenReachRecord,
  DisasterEvent,
  EventAlert,
  HazardReport,
  IsoDateString,
  MetricKey,
  ReportFilters,
  ReportMetric,
  ResourceDistribution,
  ResponseMetrics,
  ShelterOccupancySnapshot,
} from '../models';

export const METRIC_KEYS = [
  'alertsIssued',
  'citizensReached',
  'sheltersActivated',
  'resourcesDistributed',
] as const satisfies readonly MetricKey[];

export const METRIC_LABELS: Record<MetricKey, string> = {
  alertsIssued: 'Alerts issued',
  citizensReached: 'Citizens reached',
  sheltersActivated: 'Shelters activated',
  resourcesDistributed: 'Resources distributed',
};

const METRIC_SOURCES: Record<MetricKey, string> = {
  alertsIssued: COLLECTIONS.eventAlerts,
  citizensReached: COLLECTIONS.citizenReach,
  sheltersActivated: COLLECTIONS.shelterOccupancyHistory,
  resourcesDistributed: COLLECTIONS.resourceDistributions,
};

export interface AnalyticsInput {
  event: DisasterEvent;
  filters?: ReportFilters;
  reports: readonly HazardReport[] | null;
  alerts: readonly EventAlert[] | null;
  citizenReach: readonly CitizenReachRecord[] | null;
  occupancySnapshots: readonly ShelterOccupancySnapshot[] | null;
  resourceDistributions: readonly ResourceDistribution[] | null;
  now: IsoDateString;
}

export interface AnalyticsResult {
  metrics: ReportMetric[];
  values: ResponseMetrics;
  missingMetrics: MetricKey[];
  unreviewedReports: number;
  eventReports: HazardReport[];
  alerts: EventAlert[];
  citizenReach: CitizenReachRecord[];
  occupancySnapshots: ShelterOccupancySnapshot[];
  resourceDistributions: ResourceDistribution[];
  status: DisasterReportStatus;
}

export function decideReportStatus(
  eventStatus: DisasterEventStatus,
  missingMetrics: readonly MetricKey[],
): DisasterReportStatus {
  return eventStatus === 'COMPLETED' && missingMetrics.length === 0 ? 'FINAL' : 'PROVISIONAL';
}

function withinDateFilters(date: IsoDateString, filters: ReportFilters | undefined): boolean {
  const day = date.slice(0, 10);
  if (filters?.from && day < filters.from) return false;
  if (filters?.to && day > filters.to) return false;
  return true;
}

const matchesDistrict = (district: string, filters?: ReportFilters) =>
  !filters?.district || district === filters.district;

function withinEventWindow(createdAt: IsoDateString, event: DisasterEvent, now: IsoDateString) {
  const time = Date.parse(createdAt);
  return time >= Date.parse(event.startedAt) && time <= Date.parse(event.endedAt ?? now);
}

export function calculateResponseMetrics(input: AnalyticsInput): AnalyticsResult {
  const {
    event,
    filters,
    reports,
    alerts,
    citizenReach,
    occupancySnapshots,
    resourceDistributions,
    now,
  } = input;
  const eventReports = (reports ?? []).filter(
    (r) =>
      r.disasterEventId === event.eventId &&
      matchesDistrict(r.district, filters) &&
      withinDateFilters(r.createdAt, filters),
  );
  const filteredAlerts = (alerts ?? []).filter(
    (a) => matchesDistrict(a.district, filters) && withinDateFilters(a.issuedAt, filters),
  );
  const filteredReach = (citizenReach ?? []).filter(
    (r) => matchesDistrict(r.district, filters) && withinDateFilters(r.recordedAt, filters),
  );
  const filteredOccupancy = (occupancySnapshots ?? []).filter(
    (s) => matchesDistrict(s.district, filters) && withinDateFilters(s.recordedAt, filters),
  );
  const filteredResources = (resourceDistributions ?? []).filter(
    (r) => matchesDistrict(r.district, filters) && withinDateFilters(r.distributedAt, filters),
  );

  const values: Record<MetricKey, number | null> = {
    alertsIssued: alerts ? filteredAlerts.length : null,
    citizensReached: citizenReach
      ? filteredReach.reduce((sum, row) => sum + row.citizensReached, 0)
      : null,
    sheltersActivated: occupancySnapshots
      ? new Set(filteredOccupancy.map((row) => row.shelterId)).size
      : null,
    resourcesDistributed: resourceDistributions
      ? filteredResources.reduce((sum, row) => sum + row.quantity, 0)
      : null,
  };
  const metrics: ReportMetric[] = METRIC_KEYS.map((key) => ({
    key,
    value: values[key],
    sourceCollection: METRIC_SOURCES[key],
    calculatedAt: now,
    complete: values[key] !== null,
  }));
  const missingMetrics = metrics.filter((m) => !m.complete).map((m) => m.key);
  const unreviewedReports = (reports ?? []).filter(
    (r) =>
      r.status === 'PENDING_VERIFICATION' &&
      r.district === event.district &&
      withinEventWindow(r.createdAt, event, now),
  ).length;

  return {
    metrics,
    values: {
      alertsIssued: values.alertsIssued ?? 0,
      citizensReached: values.citizensReached ?? 0,
      sheltersActivated: values.sheltersActivated ?? 0,
      resourcesDistributed: values.resourcesDistributed ?? 0,
    },
    missingMetrics,
    unreviewedReports,
    eventReports,
    alerts: filteredAlerts,
    citizenReach: filteredReach,
    occupancySnapshots: filteredOccupancy,
    resourceDistributions: filteredResources,
    status: decideReportStatus(event.status, missingMetrics),
  };
}
