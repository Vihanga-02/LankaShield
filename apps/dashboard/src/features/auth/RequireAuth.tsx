import { Navigate, Outlet, useLocation } from 'react-router';

import { FullPageLoader } from '../../components/feedback/FullPageLoader';
import { useAuthStore } from '../../store/authStore';

/** Waits for session restore, then sends signed-out visitors to the login page. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'initializing') return <FullPageLoader message="Restoring your session…" />;
  if (status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
