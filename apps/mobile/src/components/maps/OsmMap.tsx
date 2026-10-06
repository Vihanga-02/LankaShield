import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, SRI_LANKA_REGION, type GeoPoint } from '@lankashield/shared';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildMapHtml, type MapMessage } from './osmMapHtml';

export interface OsmMapHandle {
  /** Moves the pin to the point and zooms the map to it. */
  centerOn: (point: GeoPoint, zoom?: number) => void;
}

// Gives the page a real origin, so tile requests carry a Referer identifying the app
// (OpenStreetMap tile usage policy).
const BASE_URL = 'https://lankashield.mobile/';
const LOAD_TIMEOUT_MS = 15_000;

/**
 * OpenStreetMap map rendered with Leaflet in a WebView (D42), so it works in Expo Go without
 * Google Maps. `interactive` maps report taps and pin drags through `onPick`.
 */
export function OsmMap({
  ref,
  point,
  zoom = 15,
  interactive = false,
  onPick,
  style,
}: {
  ref?: Ref<OsmMapHandle>;
  point: GeoPoint | null;
  zoom?: number;
  interactive?: boolean;
  onPick?: (point: GeoPoint) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const webView = useRef<WebView>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tilesFailed, setTilesFailed] = useState(false);

  // The page is built once from the first props; later changes are sent with injectJavaScript.
  const [html] = useState(() =>
    buildMapHtml({
      center: point
        ? [point.latitude, point.longitude]
        : [SRI_LANKA_REGION.latitude, SRI_LANKA_REGION.longitude],
      zoom: point ? zoom : 7,
      point,
      interactive,
      pinColor: colors.primary,
    }),
  );

  const run = (script: string) => webView.current?.injectJavaScript(`${script};true;`);

  useImperativeHandle(ref, () => ({
    centerOn: (p, z = 16) => run(`window.lsCenterOn(${p.latitude}, ${p.longitude}, ${z})`),
  }));

  const latitude = point?.latitude;
  const longitude = point?.longitude;
  useEffect(() => {
    if (status === 'ready' && latitude !== undefined && longitude !== undefined) {
      run(`window.lsSetPoint(${latitude}, ${longitude})`);
    }
  }, [status, latitude, longitude]);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const onMessage = (event: WebViewMessageEvent) => {
    let message: MapMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as MapMessage;
    } catch {
      return;
    }
    if (message.type === 'ready') setStatus('ready');
    else if (message.type === 'error') setStatus('error');
    else if (message.type === 'tileerror') setTilesFailed(true);
    else if (message.type === 'pick') {
      // Six decimals is about 10 cm.
      const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
      onPick?.({ latitude: round6(message.latitude), longitude: round6(message.longitude) });
    }
  };

  const failed = status === 'error' || tilesFailed;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webView}
        source={{ html, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onError={() => setStatus('error')}
        // Links such as the OpenStreetMap attribution open in the browser, not inside the map.
        onShouldStartLoadWithRequest={(request) => {
          const internal =
            request.url.startsWith(BASE_URL) ||
            request.url.startsWith('about:') ||
            request.url.startsWith('data:');
          if (!internal) void Linking.openURL(request.url);
          return internal;
        }}
        applicationNameForUserAgent="LankaShield/1.0"
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        overScrollMode="never"
        style={styles.webView}
      />

      {status === 'loading' ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator />
        </View>
      ) : null}

      {failed ? (
        <View style={styles.notice} pointerEvents="none">
          <MaterialCommunityIcons name="map-marker-off-outline" size={18} color={colors.warning} />
          <Text variant="bodySmall" style={styles.noticeText}>
            {status === 'error'
              ? 'The map could not be loaded. Check your internet connection.'
              : 'Some map tiles could not be loaded.'}
            {point ? ` ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  webView: { flex: 1, backgroundColor: colors.surfaceMuted },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  notice: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  noticeText: { flex: 1, color: colors.textPrimary },
});
