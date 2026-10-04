// Each enum is a readonly tuple plus a derived union type, so the values can be
// iterated (dropdowns, Zod `z.enum`) without TypeScript `enum` syntax.

export const USER_ROLES = [
  'CITIZEN',
  'VOLUNTEER',
  'DUTY_OFFICER',
  'DISTRICT_OFFICER',
  'DMC_ANALYST',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles that use the mobile application. */
export const MOBILE_ROLES = ['CITIZEN', 'VOLUNTEER'] as const satisfies readonly UserRole[];
export type MobileRole = (typeof MOBILE_ROLES)[number];

/** Roles that use the officer web dashboard. */
export const DASHBOARD_ROLES = [
  'DUTY_OFFICER',
  'DISTRICT_OFFICER',
  'DMC_ANALYST',
] as const satisfies readonly UserRole[];
export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

export const HAZARD_TYPES = ['FLOOD', 'LANDSLIDE', 'CYCLONE', 'DROUGHT', 'FIRE', 'OTHER'] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

export const SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'EXTREME'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const HAZARD_REPORT_STATUSES = [
  'DRAFT',
  'PENDING_SYNC',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'ESCALATED',
] as const;
export type HazardReportStatus = (typeof HAZARD_REPORT_STATUSES)[number];

export const VERIFICATION_OUTCOMES = ['VERIFIED_INFO', 'REJECTED', 'VERIFIED_ESCALATED'] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

export const SHELTER_STATUSES = ['AVAILABLE', 'NEARLY_FULL', 'FULL', 'CLOSED'] as const;
export type ShelterStatus = (typeof SHELTER_STATUSES)[number];

export const SYNC_STATUSES = ['LOCAL', 'PENDING', 'SYNCING', 'SYNCED', 'FAILED'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const DISASTER_REPORT_STATUSES = ['PROVISIONAL', 'FINAL'] as const;
export type DisasterReportStatus = (typeof DISASTER_REPORT_STATUSES)[number];

export const DISASTER_EVENT_STATUSES = ['ACTIVE', 'COMPLETED'] as const;
export type DisasterEventStatus = (typeof DISASTER_EVENT_STATUSES)[number];

export const WARNING_REQUEST_STATUSES = ['PENDING_ASSESSMENT', 'APPROVED', 'DECLINED'] as const;
export type WarningRequestStatus = (typeof WARNING_REQUEST_STATUSES)[number];

export const ALLOCATION_STATUSES = ['CONFIRMED', 'CANCELLED'] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export const DELIVERY_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const NOTIFICATION_TYPES = ['VERIFICATION_RESULT', 'WARNING', 'SYSTEM'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const LOCATION_SOURCES = ['GPS', 'MANUAL'] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export const SYNC_SOURCES = ['ONLINE', 'OFFLINE_QUEUE'] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];
