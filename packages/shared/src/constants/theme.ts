/** Colour tokens (development plan §5.1), shared by the mobile and web themes. */
export const colors = {
  primary: '#C9364F',
  primaryHover: '#A92840',
  coralAccent: '#F37174',
  primarySoft: '#FDE8E9',
  success: '#14986C',
  successSoft: '#DDEFE8',
  warning: '#E96B23',
  warningSoft: '#FFF1E6',
  danger: '#DC3545',
  info: '#3478F6',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#111827',
  textSecondary: '#64748B',
  disabled: '#CBD5E1',
} as const;

export type ColorToken = keyof typeof colors;

/** Spacing scale in px / dp (§5.2). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  card: 12,
  input: 8,
} as const;

export const layout = {
  mobilePagePadding: 16,
  webContentPadding: 24,
  buttonHeight: 48,
} as const;

export const fontFamily = 'Inter';
