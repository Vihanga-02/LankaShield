import type { DashboardRole } from '@lankashield/shared';
import { Outlet } from 'react-router';

import { NoAccessPage } from '../../pages/NoAccessPage';
import { useAuthStore } from '../../store/authStore';

/** Renders the page only for the listed roles; others see a no-access message. */
export function RequireRole({ roles }: { roles: readonly DashboardRole[] }) {
  const role = useAuthStore((s) => s.user?.role);
  return role && roles.includes(role) ? <Outlet /> : <NoAccessPage />;
}
