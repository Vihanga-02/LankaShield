import { SRI_LANKA_REGION, type GeoPoint } from '@lankashield/shared';
import type { LatLngTuple } from 'leaflet';

/** OpenStreetMap's standard tiles: free, no API key; attribution is required (D42). */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const SRI_LANKA_CENTER: LatLngTuple = [
  SRI_LANKA_REGION.latitude,
  SRI_LANKA_REGION.longitude,
];

export const SRI_LANKA_ZOOM = 7;

export const toLatLng = (p: GeoPoint): LatLngTuple => [p.latitude, p.longitude];

export const osmLink = ({ latitude, longitude }: GeoPoint) =>
  `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
