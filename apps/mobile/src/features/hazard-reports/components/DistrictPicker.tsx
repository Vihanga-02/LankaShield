import { colors, DISTRICTS, radius, spacing, type District } from '@lankashield/shared';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, RadioButton, TouchableRipple, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/** Field that opens a scrollable list of the 25 districts. */
export function DistrictPicker({
  value,
  onChange,
  disabled,
  error,
}: {
  value: District | undefined;
  onChange: (district: District) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableRipple
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`District: ${value ?? 'not selected'}`}
        style={[styles.field, error && styles.fieldError]}>
        <>
          <MaterialCommunityIcons
            name="map-marker-radius-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text variant="bodyLarge" style={[styles.value, !value && styles.placeholder]}>
            {value ?? 'Select district'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textSecondary} />
        </>
      </TouchableRipple>

      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)} style={styles.dialog}>
          <Dialog.Title>Select district</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView>
              <RadioButton.Group
                value={value ?? ''}
                onValueChange={(next) => {
                  onChange(next as District);
                  setOpen(false);
                }}>
                {DISTRICTS.map((district) => (
                  <RadioButton.Item key={district} label={district} value={district} />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setOpen(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
  },
  fieldError: { borderColor: colors.danger },
  value: { flex: 1 },
  placeholder: { color: colors.textSecondary },
  dialog: { maxHeight: '80%' },
  scrollArea: { paddingHorizontal: 0, maxHeight: 420 },
});
