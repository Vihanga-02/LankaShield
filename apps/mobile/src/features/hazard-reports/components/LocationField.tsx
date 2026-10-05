import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  isWithinSriLanka,
  radius,
  spacing,
  type District,
  type GeoLocation,
  type GeoPoint,
} from '@lankashield/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { useLocationPickerStore } from '@/store/locationPickerStore';

import { describeLocation, getCurrentLocation } from '../location.service';

/**
 * GPS location with a map fallback (UC01 steps 4–5). Also suggests the district from the
 * reverse-geocoded address so the user rarely has to pick it.
 */
export function LocationField({
  value,
  onChange,
  onDistrictDetected,
  disabled,
}: {
  value: GeoLocation | undefined;
  onChange: (location: GeoLocation) => void;
  onDistrictDetected: (district: District) => void;
  disabled?: boolean;
}) {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const openPicker = useLocationPickerStore((s) => s.open);

  const locateWithGps = async () => {
    setLocating(true);
    setMessage(null);
    const result = await getCurrentLocation();
    setLocating(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onChange(result.location);
    if (result.district) onDistrictDetected(result.district);
  };

  const applyMapPoint = async (point: GeoPoint) => {
    setMessage(null);
    onChange({ ...point, source: 'MANUAL' });
    const { address, district } = await describeLocation(point);
    if (address) onChange({ ...point, address, source: 'MANUAL' });
    if (district) onDistrictDetected(district);
  };

  return (
    <View style={styles.card}>
      {locating ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" />
          <Text variant="bodyMedium">Getting your location…</Text>
        </View>
      ) : value ? (
        <View style={styles.row}>
          <MaterialCommunityIcons
            name={value.source === 'GPS' ? 'crosshairs-gps' : 'map-marker'}
            size={22}
            color={colors.success}
          />
          <View style={styles.flex}>
            <Text variant="bodyMedium">
              {value.address ?? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {value.source === 'GPS' ? 'Current GPS location' : 'Selected on map'}
            </Text>
          </View>
        </View>
      ) : (
        <Text variant="bodyMedium" style={styles.muted}>
          No location selected yet.
        </Text>
      )}

      {value && !isWithinSriLanka(value) ? (
        <Text variant="bodySmall" style={styles.warning}>
          This location is outside Sri Lanka. Check it before submitting.
        </Text>
      ) : null}
      {message ? (
        <Text variant="bodySmall" style={styles.error} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="crosshairs-gps"
          onPress={locateWithGps}
          disabled={disabled || locating}
          style={styles.flex}>
          {value?.source === 'GPS' ? 'Refresh GPS' : 'Use GPS'}
        </Button>
        <Button
          mode="outlined"
          icon="map-search-outline"
          onPress={() => {
            openPicker(value ?? null, (point) => void applyMapPoint(point));
            router.push('/location-picker');
          }}
          disabled={disabled || locating}
          style={styles.flex}>
          Choose on map
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  muted: { color: colors.textSecondary },
  warning: { color: colors.warning },
  error: { color: colors.danger },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
