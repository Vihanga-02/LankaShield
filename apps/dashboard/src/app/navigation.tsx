import type { DashboardRole } from '@lankashield/shared';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import HolidayVillageOutlined from '@mui/icons-material/HolidayVillageOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import type { ReactElement } from 'react';

export interface NavItem {
  path: string;
  label: string;
  icon: ReactElement;
  /** Roles that may open this page (route guard and sidebar both use this). */
  roles: readonly DashboardRole[];
}

const ALL: readonly DashboardRole[] = ['DUTY_OFFICER', 'DISTRICT_OFFICER', 'DMC_ANALYST'];

/** Sidebar order follows §5.5. Each role sees only its own use case (UC02, UC03, UC04). */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Overview', icon: <DashboardOutlined />, roles: ALL },
  {
    path: '/verification',
    label: 'Verification Queue',
    icon: <FactCheckOutlined />,
    roles: ['DUTY_OFFICER'],
  },
  {
    path: '/shelters',
    label: 'Shelters',
    icon: <HolidayVillageOutlined />,
    roles: ['DISTRICT_OFFICER'],
  },
  {
    path: '/analytics',
    label: 'Disaster Analytics',
    icon: <InsightsOutlined />,
    roles: ['DMC_ANALYST'],
  },
  {
    path: '/notifications',
    label: 'Notifications',
    icon: <NotificationsOutlined />,
    roles: ['DUTY_OFFICER'],
  },
  { path: '/profile', label: 'Profile', icon: <AccountCircleOutlined />, roles: ALL },
];

export function rolesFor(path: string): readonly DashboardRole[] {
  return NAV_ITEMS.find((item) => item.path === path)?.roles ?? ALL;
}
