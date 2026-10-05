import { colors, spacing } from '@lankashield/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';

/** Labelled form block with its validation message underneath. */
export function FormSection({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="titleSmall">{label}</Text>
      {hint ? (
        <Text variant="bodySmall" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
      {error ? (
        <HelperText type="error" visible padding="none">
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  hint: { color: colors.textSecondary },
  body: { marginTop: spacing.xs },
});
