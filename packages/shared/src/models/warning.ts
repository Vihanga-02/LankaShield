import type { District } from '../constants/districts';
import type { HazardType, Severity } from '../enums';
import type { IsoDateString } from './common';

/**
 * `warnings/{warningId}` — an official warning sent to the citizens and volunteers whose home
 * district matches (D49). Each recipient gets a `WARNING` notification with the ID
 * `{warningId}_{uid}`, so a resend never duplicates one.
 */
export interface Warning {
  warningId: string;
  title: string;
  message: string;
  severity: Severity;
  district: District;
  hazardType?: HazardType;
  /** Links the warning to a disaster event, so analytics counts it as an alert. */
  disasterEventId?: string;
  /** Set when the warning answers a request created by an escalated report. */
  warningRequestId?: string;
  sourceReportId?: string;
  issuedBy: string;
  issuedByName: string;
  issuedAt: IsoDateString;
  expiresAt: IsoDateString;
  /** People targeted when the warning was sent (home district matched). */
  recipientCount: number;
  /** Notifications actually written; lower than `recipientCount` after an interrupted send. */
  deliveredCount: number;
}
