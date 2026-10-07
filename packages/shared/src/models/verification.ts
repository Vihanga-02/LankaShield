import type {
  DeliveryStatus,
  HazardType,
  Severity,
  VerificationOutcome,
  WarningRequestStatus,
} from '../enums';
import type { IsoDateString } from './common';
import type { District } from '../constants/districts';

/** `verificationDecisions/{decisionId}` — the auditable record of an officer decision. */
export interface VerificationDecision {
  decisionId: string;
  reportId: string;
  officerId: string;
  officerName?: string;
  outcome: VerificationOutcome;
  remarks: string;
  disasterEventId?: string;
  decidedAt: IsoDateString;
  notificationStatus: DeliveryStatus;
}

/** `warningRequests/{warningRequestId}` — created only for the VERIFIED_ESCALATED outcome. */
export interface WarningRequest {
  warningRequestId: string;
  sourceReportId: string;
  requestedBy: string;
  hazardType: HazardType;
  severity: Severity;
  affectedDistrict: District;
  status: WarningRequestStatus;
  createdAt: IsoDateString;
}
