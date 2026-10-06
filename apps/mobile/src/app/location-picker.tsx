import { colors, isWithinSriLanka, layout, spacing, type GeoPoint } from '@lankashield/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OsmMap, type OsmMapHandle } from '@/components/maps/OsmMap';
import { getCurrentPoint } from '@/features/hazard-reports/location.service';
import { useLocationPickerStore } from '@/store/locationPickerStore';

/**
 * Manual location selection (UC01 step 5): tap to place the pin or drag it, then confirm.
 * OpenStreetMap in a WebView (D42), so it also works in Expo Go.
 */
export default function LocationPickerScreen() {
  const initial = useLocationPickerStore((s) => s.initial);
  const onPick = useLocationPickerStore((s) => s.onPick);
  const close = useLocationPickerStore((s) => s.close);
  const [pin, setPin] = useState<GeoPoint | null>(initial);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const map = useRef<OsmMapHandle>(null);

  const centreOnMe = async () => {
    setLocating(true);
    setMessage(null);
    const result = await getCurrentPoint();
    setLocating(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setPin(result.point);
    map.current?.centerOn(result.point);
  };

  const confirm = () => {
    if (!pin) return;
    onPick?.(pin);
    close();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OsmMap ref={map} point={initial} interactive onPick={setPin} style={styles.map} />

      <View style={styles.footer}>
        <Text variant="bodyMedium" style={styles.hint}>
          {pin
            ? `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)} — drag the pin to adjust`
            : 'Tap the map where the hazard is'}
        </Text>
        {pin && !isWithinSriLanka(pin) ? (
          <Text variant="bodySmall" style={styles.warning}>
            This location is outside Sri Lanka.
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
            onPress={centreOnMe}
            loading={locating}
            disabled={locating}
            contentStyle={styles.button}
            style={styles.flex}>
            My location
          </Button>
          <Button
            mode="contained"
            disabled={!pin}
            onPress={confirm}
            contentStyle={styles.button}
            style={styles.flex}>
            Use this location
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  map: { flex: 1 },
  footer: { padding: layout.mobilePagePadding, gap: spacing.md },
  hint: { color: colors.textSecondary, textAlign: 'center' },
  warning: { color: colors.warning, textAlign: 'center' },
  error: { color: colors.danger, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  button: { height: layout.buttonHeight },
});
