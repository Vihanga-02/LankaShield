import { colors, SRI_LANKA_REGION, type GeoPoint } from '@lankashield/shared';
import { Map, type MapMouseEvent } from '@vis.gl/react-google-maps';

import { MapMarker } from './MapMarker';
import { MapFrame } from './MapFrame';
import { MAP_ID } from './config';

const toLatLng = (p: GeoPoint) => ({ lat: p.latitude, lng: p.longitude });

/**
 * One location on a map. With `onPick`, clicking the map moves the pin (shelter location);
 * without it, the map just shows the point (report review).
 */
export function PointMap({
  point,
  onPick,
  height = 320,
  zoom = 14,
}: {
  point?: GeoPoint;
  onPick?: (point: GeoPoint) => void;
  height?: number;
  zoom?: number;
}) {
  const onClick = (event: MapMouseEvent) => {
    const latLng = event.detail.latLng;
    if (onPick && latLng) onPick({ latitude: latLng.lat, longitude: latLng.lng });
  };

  return (
    <MapFrame height={height} point={point}>
      <Map
        mapId={MAP_ID}
        defaultCenter={
          point
            ? toLatLng(point)
            : { lat: SRI_LANKA_REGION.latitude, lng: SRI_LANKA_REGION.longitude }
        }
        defaultZoom={point ? zoom : 7}
        gestureHandling="cooperative"
        streetViewControl={false}
        mapTypeControl={false}
        onClick={onPick ? onClick : undefined}
        style={{ width: '100%', height: '100%' }}>
        {point ? (
          <MapMarker
            position={toLatLng(point)}
            title="Location"
            background={colors.primary}
            borderColor={colors.primaryHover}
            glyphColor={colors.surface}
          />
        ) : null}
      </Map>
    </MapFrame>
  );
}
