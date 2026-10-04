import { colors, radius } from '@lankashield/shared';
import { configureFonts, MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const INTER_FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// Each weight is a separate font family, so fontWeight stays '400' to avoid synthetic bold.
const family = (fontFamily: string) => ({ fontFamily, fontWeight: '400' as const });

const fonts = configureFonts({
  config: {
    displayLarge: family(INTER_FONTS.bold),
    displayMedium: family(INTER_FONTS.bold),
    displaySmall: family(INTER_FONTS.bold),
    headlineLarge: family(INTER_FONTS.bold),
    headlineMedium: family(INTER_FONTS.bold),
    headlineSmall: family(INTER_FONTS.semiBold),
    titleLarge: family(INTER_FONTS.semiBold),
    titleMedium: family(INTER_FONTS.semiBold),
    titleSmall: family(INTER_FONTS.semiBold),
    labelLarge: family(INTER_FONTS.medium),
    labelMedium: family(INTER_FONTS.medium),
    labelSmall: family(INTER_FONTS.medium),
    bodyLarge: family(INTER_FONTS.regular),
    bodyMedium: family(INTER_FONTS.regular),
    bodySmall: family(INTER_FONTS.regular),
  },
});

/** React Native Paper theme built from the shared colour tokens (§5.1). */
export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: radius.input / 4,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.surface,
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: colors.primaryHover,
    secondary: colors.textSecondary,
    secondaryContainer: colors.primarySoft,
    onSecondaryContainer: colors.primaryHover,
    background: colors.background,
    onBackground: colors.textPrimary,
    surface: colors.surface,
    onSurface: colors.textPrimary,
    surfaceVariant: colors.surfaceMuted,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.border,
    error: colors.danger,
    surfaceDisabled: colors.disabled,
  },
};
