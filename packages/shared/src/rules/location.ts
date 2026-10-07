import { DISTRICTS, type District } from '../constants/districts';
import type { GeoPoint } from '../models';

/** Default map view covering the whole island. */
export const SRI_LANKA_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 4.2,
  longitudeDelta: 3.2,
} as const;

export const SRI_LANKA_BOUNDS = { north: 10.1, south: 5.7, east: 82.1, west: 79.4 } as const;

export const DISTRICT_MAP_CENTERS = {
  Ampara: { latitude: 7.2912, longitude: 81.6724 },
  Anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
  Badulla: { latitude: 6.9934, longitude: 81.055 },
  Batticaloa: { latitude: 7.717, longitude: 81.7 },
  Colombo: { latitude: 6.9271, longitude: 79.8612 },
  Galle: { latitude: 6.0535, longitude: 80.221 },
  Gampaha: { latitude: 7.0873, longitude: 80.0144 },
  Hambantota: { latitude: 6.1429, longitude: 81.1212 },
  Jaffna: { latitude: 9.6615, longitude: 80.0255 },
  Kalutara: { latitude: 6.5854, longitude: 79.9607 },
  Kandy: { latitude: 7.2906, longitude: 80.6337 },
  Kegalle: { latitude: 7.2513, longitude: 80.3464 },
  Kilinochchi: { latitude: 9.3803, longitude: 80.377 },
  Kurunegala: { latitude: 7.4818, longitude: 80.3609 },
  Mannar: { latitude: 8.981, longitude: 79.904 },
  Matale: { latitude: 7.4675, longitude: 80.6234 },
  Matara: { latitude: 5.949, longitude: 80.5353 },
  Monaragala: { latitude: 6.8728, longitude: 81.3507 },
  Mullaitivu: { latitude: 9.2671, longitude: 80.8142 },
  'Nuwara Eliya': { latitude: 6.9497, longitude: 80.7891 },
  Polonnaruwa: { latitude: 7.9403, longitude: 81.0188 },
  Puttalam: { latitude: 8.0362, longitude: 79.8283 },
  Ratnapura: { latitude: 6.6828, longitude: 80.3992 },
  Trincomalee: { latitude: 8.5874, longitude: 81.2152 },
  Vavuniya: { latitude: 8.7514, longitude: 80.4971 },
} as const satisfies Record<District, GeoPoint>;

export function districtMapCenter(district: District): GeoPoint {
  return { ...DISTRICT_MAP_CENTERS[district] };
}

export function isWithinSriLanka({ latitude, longitude }: GeoPoint): boolean {
  return (
    latitude >= SRI_LANKA_BOUNDS.south &&
    latitude <= SRI_LANKA_BOUNDS.north &&
    longitude >= SRI_LANKA_BOUNDS.west &&
    longitude <= SRI_LANKA_BOUNDS.east
  );
}

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/\bdistrict\b/g, '')
    .replace(/[^a-z]/g, '');

const BY_KEY = new Map<string, District>(DISTRICTS.map((d) => [normalise(d), d]));

/**
 * Finds a Sri Lankan district in reverse-geocoding fields such as subregion ("Ratnapura District"),
 * district or city. Returns undefined when none match, so the user picks it manually.
 */
export function matchDistrict(
  candidates: readonly (string | null | undefined)[],
): District | undefined {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = BY_KEY.get(normalise(candidate));
    if (match) return match;
  }
  return undefined;
}
