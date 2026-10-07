import type { DisasterEventStatus, DisasterReportStatus, HazardType } from '../enums';
import type { IsoDateString } from './common';
import type { District } from '../constants/districts';

/** `disasterEvents/{eventId}` */
export interface DisasterEvent {
  eventId: string;
  name: string;
  hazardType: HazardType;
  district: District;
  status: DisasterEventStatus;
  startedAt: IsoDateString;
  endedAt?: IsoDateString;
}

export interface ReportFilters {
  district?: District;
  from?: IsoDateString;
  to?: IsoDateString;
}

export interface ResponseMetrics {
  alertsIssued: number;
  citizensReached: number;
  sheltersActivated: number;
  resourcesDistributed: number;
}

export type MetricKey = keyof ResponseMetrics;

/** A calculated metric with its provenance (development plan §14). */
export interface ReportMetric {
  key: MetricKey;
  value: number | null;
  sourceCollection: string;
  calculatedAt: IsoDateString;
  complete: boolean;
}

/** Record of an authorised (mocked) share with a donor organisation. */
export interface ReportShare {
  organisation: string;
  sharedBy: string;
  sharedAt: IsoDateString;
}

/** `responseReports/{responseReportId}` */
export interface DisasterResponseReport {
  responseReportId: string;
  eventId: string;
  generatedBy: string;
  status: DisasterReportStatus;
  filters: ReportFilters;
  metrics: ResponseMetrics;
  missingMetrics: MetricKey[];
  generatedAt: IsoDateString;
  exportedUrl?: string;
  shares?: ReportShare[];
}

export type AlertLevel = 'HIGH' | 'MEDIUM' | 'ADVISORY';

/** `eventAlerts/{alertId}` — an official warning issued during a disaster event. */
export interface EventAlert {
  alertId: string;
  disasterEventId: string;
  level: AlertLevel;
  district: District;
  issuedAt: IsoDateString;
  acknowledged: boolean;
}

/** `citizenReach/{reachId}` — final unique alert reach for one GS division. */
export interface CitizenReachRecord {
  reachId: string;
  disasterEventId: string;
  district: District;
  gsDivision: string;
  citizensReached: number;
  recordedAt: IsoDateString;
}

/** `shelterOccupancyHistory/{snapshotId}` — historical event occupancy, not today's value. */
export interface ShelterOccupancySnapshot {
  snapshotId: string;
  disasterEventId: string;
  shelterId: string;
  district: District;
  occupancy: number;
  capacity: number;
  recordedAt: IsoDateString;
}

export type ReliefResourceCategory =
  | 'FOOD_PACK'
  | 'WATER_KIT'
  | 'MEDICAL_KIT'
  | 'HYGIENE_KIT'
  | 'BLANKET'
  | 'OTHER';

/** `resourceDistributions/{distributionId}` — relief issued for an event destination district. */
export interface ResourceDistribution {
  distributionId: string;
  disasterEventId: string;
  district: District;
  category: ReliefResourceCategory;
  quantity: number;
  distributedAt: IsoDateString;
}
