import type { DeliveryStatus, HazardType } from '../enums';
import type { District } from '../constants/districts';
import type { IsoDateString } from './common';

export const STAKEHOLDERS = [
  'CITIZEN',
  'VOLUNTEER',
  'DUTY_OFFICER',
  'DISTRICT_OFFICER',
  'DMC_ANALYST',
] as const;
export type Stakeholder = (typeof STAKEHOLDERS)[number];
export const STAKEHOLDER_LABELS: Record<string, string> = {
  CITIZEN: 'Citizen',
  VOLUNTEER: 'Volunteer',
  DUTY_OFFICER: 'Duty Officer',
  DISTRICT_OFFICER: 'District Officer',
  DMC_ANALYST: 'Analyst',
  DMC_OFFICERS: 'DMC Officers (legacy)',
  DISTRICT_OFFICERS: 'District Officers (legacy)',
  EMERGENCY_RESPONSE: 'Emergency Response Teams (legacy)',
  POLICE: 'Police (legacy)',
  FIRE_RESCUE: 'Fire & Rescue (legacy)',
  MEDICAL: 'Medical (legacy)',
  SHELTER_MANAGEMENT: 'Shelter Management (legacy)',
  GOVERNMENT: 'Government (legacy)',
  AFFECTED_CITIZENS: 'Affected Citizens (legacy)',
};
/** Durable outbox. SENT means committed to every resolved recipient's in-app inbox. */
export interface StakeholderNotification {
  notificationId: string;
  reportId: string;
  reportTitle: string;
  hazardType: HazardType;
  district: District;
  warningRequestId: string;
  stakeholders: Stakeholder[];
  title: string;
  message: string;
  createdBy: string;
  officerName: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  deliveryStatus: DeliveryStatus;
  sendRequested: boolean;
  attemptCount: number;
  lastAttemptAt?: IsoDateString;
  attemptId?: string;
  lastError?: string;
  recipientIds?: string[];
  deliveredRecipientIds?: string[];
}
