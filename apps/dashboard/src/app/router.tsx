import { createBrowserRouter } from 'react-router';

import { AppLayout } from '../components/layout/AppLayout';
import { RequireAuth } from '../features/auth/RequireAuth';
import { RequireRole } from '../features/auth/RequireRole';
import { rolesFor } from './navigation';

// Pages are loaded on demand so each use case ships in its own chunk.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
});

const guarded = (path: string, load: () => Promise<{ default: React.ComponentType }>) => ({
  element: <RequireRole roles={rolesFor(path)} />,
  children: [{ path, lazy: page(load) }],
});

export const router = createBrowserRouter([
  { path: '/login', lazy: page(() => import('../features/auth/LoginPage')) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          guarded('/', () => import('../pages/OverviewPage')),
          guarded('/verification', () => import('../pages/VerificationQueuePage')),
          guarded('/verification/:reportId', () => import('../pages/ReportReviewPage')),
          guarded('/shelters', () => import('../pages/SheltersPage')),
          guarded('/warnings', () => import('../pages/WarningsPage')),
          guarded('/analytics', () => import('../pages/AnalyticsPage')),
          guarded('/analytics/:eventId', () => import('../pages/AnalyticsReportPage')),
          guarded('/notifications', () => import('../pages/NotificationsPage')),
          guarded('/profile', () => import('../pages/ProfilePage')),
          { path: '*', lazy: page(() => import('../pages/NotFoundPage')) },
        ],
      },
    ],
  },
]);
