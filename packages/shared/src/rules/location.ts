import { DISTRICTS, type District } from '../constants/districts';
import type { GeoPoint } from '../models';

/** Default map view covering the whole island. */
export const SRI_LANKA_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 4.2,
  longitudeDelta: 3.2,
} as const;

// Generous bounding box around Sri Lanka, including coastal waters.
const BOUNDS = { minLat: 5.7, maxLat: 10.1, minLng: 79.4, maxLng: 82.1 };

export function isWithinSriLanka({ latitude, longitude }: GeoPoint): boolean {
  return (
    latitude >= BOUNDS.minLat &&
    latitude <= BOUNDS.maxLat &&
    longitude >= BOUNDS.minLng &&
    longitude <= BOUNDS.maxLng
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
