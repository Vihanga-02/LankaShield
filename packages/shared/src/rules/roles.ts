import {
  DASHBOARD_ROLES,
  MOBILE_ROLES,
  type DashboardRole,
  type MobileRole,
  type UserRole,
} from '../enums';

export function isMobileRole(role: UserRole): role is MobileRole {
  return (MOBILE_ROLES as readonly UserRole[]).includes(role);
}

export function isDashboardRole(role: UserRole): role is DashboardRole {
  return (DASHBOARD_ROLES as readonly UserRole[]).includes(role);
}

/** Shared sender policy for forms, background retries, and persisted delivery operations. */
export function canSendStakeholderNotifications(user: { role: UserRole; active: boolean } | null | undefined): boolean {
  return !!user?.active && (user.role === 'DUTY_OFFICER' || user.role === 'DMC_ANALYST');
}
