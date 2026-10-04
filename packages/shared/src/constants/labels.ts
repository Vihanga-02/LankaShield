import type { HazardType, Severity, UserRole } from '../enums';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  CITIZEN: 'Citizen',
  VOLUNTEER: 'Community Volunteer',
  DUTY_OFFICER: 'Duty Officer',
  DISTRICT_OFFICER: 'District Officer',
  DMC_ANALYST: 'DMC Analyst',
};

export const HAZARD_TYPE_LABELS: Record<HazardType, string> = {
  FLOOD: 'Flood',
  LANDSLIDE: 'Landslide',
  CYCLONE: 'Cyclone',
  DROUGHT: 'Drought',
  FIRE: 'Fire',
  OTHER: 'Other',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  EXTREME: 'Extreme',
};
