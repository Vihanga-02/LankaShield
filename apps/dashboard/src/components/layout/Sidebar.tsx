import { USER_ROLE_LABELS } from '@lankashield/shared';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import { NAV_ITEMS } from '../../app/navigation';
import { signOutOfficer } from '../../features/auth/auth.service';
import { useAuthStore } from '../../store/authStore';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  const onSignOut = async () => {
    setSigningOut(true);
    await signOutOfficer().finally(() => setSigningOut(false));
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <ShieldOutlined fontSize="small" />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" color="primary" sx={{ lineHeight: 1.2 }}>
            LankaShield
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Officer dashboard
          </Typography>
        </Box>
      </Box>

      <List component="nav" aria-label="Main navigation" sx={{ px: 1.5, flex: 1 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            selected={isActive(item.path)}
            onClick={onNavigate}
            sx={{ mb: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {user.fullName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {USER_ROLE_LABELS[user.role]}
          {user.district ? ` · ${user.district}` : ''}
        </Typography>
        <ListItemButton
          onClick={onSignOut}
          disabled={signingOut}
          sx={{ mt: 1, color: 'error.main' }}>
          <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
            <LogoutOutlined />
          </ListItemIcon>
          <ListItemText primary={signingOut ? 'Signing out…' : 'Logout'} />
        </ListItemButton>
      </Box>
    </Box>
  );
}
