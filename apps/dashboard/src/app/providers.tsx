import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useEffect, type ReactNode } from 'react';

import { subscribeToAuth } from '../features/auth/auth.service';
import { theme } from '../theme/theme';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => subscribeToAuth(), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
