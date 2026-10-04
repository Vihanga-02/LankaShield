import type {
  HazardReportStatus,
  HazardType,
  LocationSource,
  MobileRole,
  Severity,
  SyncSource,
  VerificationOutcome,
} from '../enums';
import type { GeoPoint, IsoDateString } from './common';
import type { District } from '../constants/districts';

export interface GeoLocation extends GeoPoint {
  address?: string;
  source: LocationSource;
}

/** Copy of the latest verification decision, written in the same batch so mobile can show it. */
export interface LatestDecisionSummary {
  decisionId: string;
  outcome: VerificationOutcome;
  remarks: string;
  decidedAt: IsoDateString;
}

/** `hazardReports/{reportId}` — `reportId` is generated on the client and reused on offline retry. */
export interface HazardReport {
  reportId: string;
  reporterId: string;
  reporterRole: MobileRole;
  hazardType: HazardType;
  severity: Severity;
  title: string;
  description: string;
  location: GeoLocation;
  evidenceUrls: string[];
  status: HazardReportStatus;
  district: District;
  /** Set by the Duty Officer during verification; links the report to a disaster event for UC04. */
  disasterEventId?: string;
  latestDecision?: LatestDecisionSummary;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  clientCreatedAt: IsoDateString;
  syncSource: SyncSource;
}

/** A single piece of evidence, tracked locally before upload and by URL afterwards. */
export interface EvidenceItem {
  evidenceId: string;
  reportId: string;
  localUri?: string;
  storagePath?: string;
  downloadUrl?: string;
  mimeType: string;
  sizeBytes: number;
}
