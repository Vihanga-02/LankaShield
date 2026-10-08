import { colors, spacing, type District } from '@lankashield/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';

import { DistrictPicker } from '@/features/hazard-reports/components/DistrictPicker';
import { getCurrentLocation } from '@/features/hazard-reports/location.service';

/**
 * Home district picker with a GPS suggestion (D48). The user always confirms: people often sign up
 * away from home, so the location only fills the field in.
 */
export function HomeDistrictField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: District | undefined;
  onChange: (district: District) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const suggestFromLocation = async () => {
    setLocating(true);
    setNote(null);
    const result = await getCurrentLocation();
    setLocating(false);
    if (!result.ok) {
      setNote(result.message.replace('hazard location on the map', 'district from the list'));
      return;
    }
    if (result.district) {
      onChange(result.district);
      setNote(`Suggested from your location: ${result.district}. Change it if you live elsewhere.`);
    } else {
      setNote('Your district could not be detected. Choose it from the list.');
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="labelLarge" style={styles.label}>
        Home district
      </Text>
      <DistrictPicker value={value} onChange={onChange} disabled={disabled} error={!!error} />
      <Button
        mode="text"
        icon="crosshairs-gps"
        onPress={suggestFromLocation}
        loading={locating}
        disabled={disabled || locating}
        style={styles.button}>
        Use my location
      </Button>
      {note ? (
        <Text variant="bodySmall" style={styles.note} accessibilityLiveRegion="polite">
          {note}
        </Text>
      ) : null}
      <HelperText type={error ? 'error' : 'info'} visible>
        {error ?? 'Warnings for this district are sent to you.'}
      </HelperText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.textSecondary },
  button: { alignSelf: 'flex-start' },
  note: { color: colors.textSecondary },
});
