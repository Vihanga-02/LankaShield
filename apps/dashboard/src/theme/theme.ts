import { colors, layout, radius } from '@lankashield/shared';
import { createTheme } from '@mui/material/styles';

/** Material UI theme built from the shared colour tokens (§5.1–5.2). */
export const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      dark: colors.primaryHover,
      light: colors.coralAccent,
      contrastText: colors.surface,
    },
    success: { main: colors.success, light: colors.successSoft, contrastText: colors.surface },
    warning: { main: colors.warning, light: colors.warningSoft, contrastText: colors.surface },
    error: { main: colors.danger, contrastText: colors.surface },
    info: { main: colors.info, contrastText: colors.surface },
    background: { default: colors.background, paper: colors.surface },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.disabled,
    },
    divider: colors.border,
  },
  shape: { borderRadius: radius.input },
  typography: {
    fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 44 } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: radius.card } },
    },
    MuiPaper: {
      styleOverrides: { outlined: { borderColor: colors.border } },
    },
    MuiTableCell: {
      styleOverrides: { head: { backgroundColor: colors.surfaceMuted, fontWeight: 600 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.input,
          '&.Mui-selected': {
            backgroundColor: colors.primarySoft,
            color: colors.primary,
            '& .MuiListItemIcon-root': { color: colors.primary },
          },
          '&.Mui-selected:hover': { backgroundColor: colors.primarySoft },
        },
      },
    },
  },
});

export const CONTENT_PADDING = layout.webContentPadding / 8; // theme spacing units
