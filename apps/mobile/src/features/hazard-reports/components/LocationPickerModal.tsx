import { colors, layout, spacing, SRI_LANKA_REGION, type GeoPoint } from '@lankashield/shared';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent } from 'react-native-maps';
import { Appbar, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Full-screen map: tap to place the pin or drag it, then confirm (manual location, UC01). */
export function LocationPickerModal({
  visible,
  initial,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  initial?: GeoPoint;
  onCancel: () => void;
  onConfirm: (point: GeoPoint) => void;
}) {
  const [pin, setPin] = useState<GeoPoint | undefined>(initial);

  const onMapPress = (event: MapPressEvent) => setPin(event.nativeEvent.coordinate);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Appbar.Header mode="small" statusBarHeight={0}>
          <Appbar.Action icon="close" onPress={onCancel} accessibilityLabel="Cancel" />
          <Appbar.Content title="Choose location" />
        </Appbar.Header>

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
          <Button
            mode="contained"
            disabled={!pin}
            onPress={() => pin && onConfirm(pin)}
            contentStyle={styles.button}>
            Use this location
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  map: { flex: 1 },
  footer: { padding: layout.mobilePagePadding, gap: spacing.md },
  hint: { color: colors.textSecondary, textAlign: 'center' },
  button: { height: layout.buttonHeight },
});
