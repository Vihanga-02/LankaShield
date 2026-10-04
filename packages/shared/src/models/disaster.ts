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
  reportsReceived: number;
  verifiedReports: number;
  citizensReached: number;
  shelterOccupancy: number;
  allocatedEvacuees: number;
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
