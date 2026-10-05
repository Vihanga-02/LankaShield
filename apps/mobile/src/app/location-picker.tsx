import { colors, layout, spacing, SRI_LANKA_REGION, type GeoPoint } from '@lankashield/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocationPickerStore } from '@/store/locationPickerStore';

/**
 * Manual location selection (UC01 step 5): tap to place the pin or drag it, then confirm.
 * A full-screen route rather than a React Native Modal — Google Maps renders black inside an
 * Android Modal window.
 */
export default function LocationPickerScreen() {
  const initial = useLocationPickerStore((s) => s.initial);
  const onPick = useLocationPickerStore((s) => s.onPick);
  const close = useLocationPickerStore((s) => s.close);
  const [pin, setPin] = useState<GeoPoint | null>(initial);

  const onMapPress = (event: MapPressEvent) => setPin(event.nativeEvent.coordinate);

  const confirm = () => {
    if (!pin) return;
    onPick?.(pin);
    close();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={
          initial ? { ...initial, latitudeDelta: 0.05, longitudeDelta: 0.05 } : SRI_LANKA_REGION
        }
        onPress={onMapPress}
        showsUserLocation
        showsMyLocationButton>
        {pin ? (
          <Marker
            coordinate={pin}
            draggable
            pinColor={colors.primary}
            onDragEnd={(e) => setPin(e.nativeEvent.coordinate)}
          />
        ) : null}
      </MapView>

      <View style={styles.footer}>
        <Text variant="bodyMedium" style={styles.hint}>
          {pin
            ? `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)} — drag the pin to adjust`
            : 'Tap the map where the hazard is'}
        </Text>
        <Button mode="contained" disabled={!pin} onPress={confirm} contentStyle={styles.button}>
          Use this location
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  map: { flex: 1 },
  footer: { padding: layout.mobilePagePadding, gap: spacing.md },
  hint: { color: colors.textSecondary, textAlign: 'center' },
  button: { height: layout.buttonHeight },
});
