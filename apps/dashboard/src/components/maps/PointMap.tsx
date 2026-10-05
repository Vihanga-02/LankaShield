import {
  colors,
  isWithinSriLanka,
  SRI_LANKA_BOUNDS,
  SRI_LANKA_REGION,
  type GeoPoint,
} from '@lankashield/shared';
import { AdvancedMarker, Map, Pin, type MapMouseEvent, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';

import { MapFrame } from './MapFrame';
import { MAP_ID } from './config';

const toLatLng = (p: GeoPoint) => ({ lat: p.latitude, lng: p.longitude });

function MapFocus({ latitude, longitude }: Partial<GeoPoint>) {
  const map = useMap();
  const previousKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!map || latitude === undefined || longitude === undefined) return;
    const key = `${latitude},${longitude}`;
    if (previousKey.current && previousKey.current !== key) {
      map.panTo({ lat: latitude, lng: longitude });
      map.setZoom(13);
    }
    previousKey.current = key;
  }, [latitude, longitude, map]);

  return null;
}

/**
 * One location on a map. With `onPick`, clicking the map moves the pin (shelter location);
 * without it, the map just shows the point (report review).
 */
export function PointMap({
  point,
  onPick,
  focusPoint,
  height = 320,
  zoom = 14,
}: {
  point?: GeoPoint;
  onPick?: (point: GeoPoint) => void;
  focusPoint?: GeoPoint;
  height?: number;
  zoom?: number;
}) {
  const validPoint = point && isWithinSriLanka(point) ? point : undefined;
  const center = validPoint ?? focusPoint ?? SRI_LANKA_REGION;

  const pickPoint = (latitude: number, longitude: number) => {
    const next = { latitude, longitude };
    if (onPick && isWithinSriLanka(next)) onPick(next);
  };

  const onClick = (event: MapMouseEvent) => {
    const latLng = event.detail.latLng;
    if (latLng) pickPoint(latLng.lat, latLng.lng);
  };

  const onDragEnd = (event: google.maps.MapMouseEvent) => {
    const latLng = event.latLng;
    if (latLng) pickPoint(latLng.lat(), latLng.lng());
  };

  return (
    <MapFrame height={height} point={point}>
      <Map
        mapId={MAP_ID}
        defaultCenter={toLatLng(center)}
        defaultZoom={validPoint ? zoom : focusPoint ? 12 : 7}
        gestureHandling="cooperative"
        streetViewControl={false}
        mapTypeControl={false}
        restriction={onPick ? { latLngBounds: SRI_LANKA_BOUNDS, strictBounds: true } : undefined}
        onClick={onPick ? onClick : undefined}
        style={{ width: '100%', height: '100%' }}>
        <MapFocus latitude={focusPoint?.latitude} longitude={focusPoint?.longitude} />
        {validPoint ? (
          <AdvancedMarker
            position={toLatLng(validPoint)}
            title={onPick ? 'Drag to adjust the shelter location' : 'Location'}
            draggable={!!onPick}
            onDragEnd={onPick ? onDragEnd : undefined}>
            <Pin
              background={colors.primary}
              borderColor={colors.primaryHover}
              glyphColor={colors.surface}
            />
          </AdvancedMarker>
        ) : null}
      </Map>
    </MapFrame>
  );
}
