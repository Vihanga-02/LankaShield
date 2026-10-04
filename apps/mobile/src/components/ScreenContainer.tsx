import { colors, layout, spacing } from '@lankashield/shared';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (forms, long content). */
  scroll?: boolean;
  /** Tab screens sit above the tab bar, so they only need the top inset. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

export function ScreenContainer({
  children,
  scroll = false,
  edges = ['top'],
  contentStyle,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.mobilePagePadding,
    gap: spacing.lg,
  },
  fill: {
    flex: 1,
  },
});
