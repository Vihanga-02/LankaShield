import { colors, type GeoPoint } from '@lankashield/shared';
import type { Marker as LeafletMarker } from 'leaflet';
import { useEffect, useRef } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';

import { SRI_LANKA_CENTER, SRI_LANKA_ZOOM, toLatLng } from './config';
import { MapFrame } from './MapFrame';
import { pinIcon } from './markers';

// Six decimals is about 10 cm — plenty for a shelter or hazard location.
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const pointFrom = (lat: number, lng: number): GeoPoint => ({
  latitude: round6(lat),
  longitude: round6(lng),
});

function ClickToPick({ onPick }: { onPick: (point: GeoPoint) => void }) {
  useMapEvents({
    click: (e) => onPick(pointFrom(e.latlng.lat, e.latlng.lng)),
  });
  return null;
}

/** Brings the pin into view when the point changes from outside the map (typed coordinates). */
function FollowPoint({ point, zoom }: { point?: GeoPoint; zoom: number }) {
  const map = useMap();
  const hadPoint = useRef(!!point);
  useEffect(() => {
    if (!point) return;
    const latLng = toLatLng(point);
    if (!hadPoint.current) map.setView(latLng, zoom);
    else if (!map.getBounds().contains(latLng)) map.panTo(latLng);
    hadPoint.current = true;
  }, [map, point, zoom]);
  return null;
}

/**
 * One location on an OpenStreetMap map. With `onPick`, clicking the map or dragging the pin moves
 * it (shelter location); without it, the map just shows the point (report review).
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
  return (
    <MapFrame
      height={height}
      center={point ? toLatLng(point) : SRI_LANKA_CENTER}
      zoom={point ? zoom : SRI_LANKA_ZOOM}
      point={point}>
      {onPick ? <ClickToPick onPick={onPick} /> : null}
      <FollowPoint point={point} zoom={zoom} />
      {point ? (
        <Marker
          position={toLatLng(point)}
          icon={pinIcon(colors.primary)}
          title="Location"
          draggable={!!onPick}
          eventHandlers={
            onPick
              ? {
                  dragend: (e) => {
                    const { lat, lng } = (e.target as LeafletMarker).getLatLng();
                    onPick(pointFrom(lat, lng));
                  },
                }
              : undefined
          }
        />
      ) : null}
    </MapFrame>
  );
}
