import { colors, spacing } from '@lankashield/shared';
import { StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';

import type { IconName } from '../hazardIcons';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

/** Single-choice chip group (hazard type, severity, list filters). */
export function OptionChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={option.value}
            icon={option.icon}
            selected={selected}
            showSelectedCheck={false}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            style={[styles.chip, selected && styles.selected]}
            textStyle={selected ? styles.selectedText : undefined}>
            {option.label}
          </Chip>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  selectedText: { color: colors.primary },
});
