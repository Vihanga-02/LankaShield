import MenuOutlined from '@mui/icons-material/MenuOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Suspense, useState } from 'react';
import { Outlet } from 'react-router';

import { NotificationRetry } from '../../features/notifications/NotificationRetry';
import { CONTENT_PADDING } from '../../theme/theme';
import { LoadingState } from '../feedback/LoadingState';
import { MapsProvider } from '../maps/MapsProvider';
import { Sidebar } from './Sidebar';

const DRAWER_WIDTH = 260;

const drawerPaper = {
  width: DRAWER_WIDTH,
  boxSizing: 'border-box',
  borderRight: 1,
  borderColor: 'divider',
} as const;

/** Sidebar + content shell for every signed-in page. */
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <NotificationRetry />
      <Box component="aside" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Small screens: temporary drawer opened from the top bar. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': drawerPaper }}>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        {/* Desktop: permanent white sidebar with a light border (§5.5). */}
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': drawerPaper }}>
          <Sidebar />
        </Drawer>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ display: { md: 'none' }, borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton
              edge="start"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}>
              <MenuOutlined />
            </IconButton>
            <Typography variant="subtitle1" color="primary" sx={{ ml: 1 }}>
              LankaShield
            </Typography>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: CONTENT_PADDING, maxWidth: 1400 }}>
          <MapsProvider>
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </MapsProvider>
        </Box>
      </Box>
    </Box>
  );
}
