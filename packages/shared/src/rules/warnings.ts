import type { District } from '../constants/districts';
import { HAZARD_TYPE_LABELS } from '../constants/labels';
import type { Severity } from '../enums';
import type { AlertLevel, AppUser, HazardReport, Warning, WarningRequest } from '../models';
import { isMobileRole } from './roles';

/** Active citizens and volunteers whose home district is `district`: the warning's recipients. */
export function warningRecipients<T extends Pick<AppUser, 'role' | 'active' | 'district'>>(
  users: readonly T[],
  district: District,
): T[] {
  return users.filter((u) => isMobileRole(u.role) && u.active && u.district === district);
}

/** Active citizens and volunteers with no home district: they cannot be reached by any warning. */
export function usersWithoutDistrict(
  users: readonly Pick<AppUser, 'role' | 'active' | 'district'>[],
): number {
  return users.filter((u) => isMobileRole(u.role) && u.active && !u.district).length;
}

/** One notification per warning and recipient, so sending again never duplicates it. */
export function warningNotificationId(warningId: string, uid: string): string {
  return `${warningId}_${uid}`;
}

/** Recipients that do not have the warning yet (for completing an interrupted send). */
export function missingRecipients<T extends Pick<AppUser, 'uid'>>(
  recipients: readonly T[],
  alreadyNotified: ReadonlySet<string>,
): T[] {
  return recipients.filter((u) => !alreadyNotified.has(u.uid));
}

/** Analytics alert level (`eventAlerts.level`) for a warning severity. */
export function alertLevelFor(severity: Severity): AlertLevel {
  if (severity === 'EXTREME' || severity === 'HIGH') return 'HIGH';
  return severity === 'MODERATE' ? 'MEDIUM' : 'ADVISORY';
}

export function warningExpiry(issuedAt: Date, durationHours: number): string {
  return new Date(issuedAt.getTime() + durationHours * 3_600_000).toISOString();
}

export function isWarningActive(warning: Pick<Warning, 'expiresAt'>, now: string): boolean {
  return warning.expiresAt > now;
}

/** A pre-filled warning for an escalated report's request; the officer edits it before sending. */
export function draftFromRequest(
  request: Pick<WarningRequest, 'hazardType' | 'severity' | 'affectedDistrict'>,
  report?: Pick<HazardReport, 'title' | 'description'> | null,
): { title: string; message: string; severity: Severity; district: District } {
  const hazard = HAZARD_TYPE_LABELS[request.hazardType];
  return {
    title: `${hazard} warning: ${request.affectedDistrict}`,
    message: report
      ? `${report.title.trim().replace(/[.!?]+$/, '')}. ${report.description.trim()} Follow official instructions and move to safety if advised.`
      : `A ${request.severity.toLowerCase()} ${hazard.toLowerCase()} risk has been reported in ${request.affectedDistrict}. Follow official instructions and move to safety if advised.`,
    severity: request.severity,
    district: request.affectedDistrict,
  };
}
