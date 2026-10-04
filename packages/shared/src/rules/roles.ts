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
