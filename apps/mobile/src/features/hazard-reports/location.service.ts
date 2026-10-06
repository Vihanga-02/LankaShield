import {
  lookupDistrict,
  matchDistrict,
  type District,
  type GeoLocation,
  type GeoPoint,
} from '@lankashield/shared';
import * as Location from 'expo-location';

import { withTimeout } from '@/utils/withTimeout';

export type LocationResult =
  { ok: true; location: GeoLocation; district?: District } | { ok: false; message: string };

export type PointResult = { ok: true; point: GeoPoint } | { ok: false; message: string };

// Identifies the app to OpenStreetMap's Nominatim service, as its usage policy asks.
const NOMINATIM_HEADERS = {
  'User-Agent': 'LankaShield/1.0 (campus prototype; lk.lankashield.mobile)',
};

/**
 * Readable address and district for a point. The phone's geocoder runs first; when it gives no
 * district, OpenStreetMap Nominatim fills it in (D42). Best effort: failures return an empty result.
 */
export async function describeLocation(
  point: GeoPoint,
): Promise<{ address?: string; district?: District }> {
  let address: string | undefined;
  let district: District | undefined;
  try {
    const [place] = await withTimeout(Location.reverseGeocodeAsync(point), 8_000);
    if (place) {
      address =
        place.formattedAddress ??
        ([place.name, place.street, place.city].filter(Boolean).join(', ') || undefined);
      district = matchDistrict([place.subregion, place.district, place.city, place.region]);
    }
  } catch {
    // Fall through to Nominatim for the district.
  }
  district ??= await lookupDistrict(point, { headers: NOMINATIM_HEADERS });
  return { address, district };
}

/**
 * Current GPS position only. When permission is denied, location services are off or no fix is
 * available, it returns a message so the user can pick on the map instead.
 */
export async function getCurrentPoint(): Promise<PointResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return {
      ok: false,
      message: 'Location permission was denied. Choose the hazard location on the map instead.',
    };
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    return {
      ok: false,
      message: 'Location services are turned off. Turn them on or choose the location on the map.',
    };
  }

  let position: Location.LocationObject | null = null;
  try {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      15_000,
    );
  } catch {
    position = await Location.getLastKnownPositionAsync().catch(() => null);
  }
  if (!position) {
    return {
      ok: false,
      message: 'Could not get a GPS fix. Move to an open area, retry, or choose on the map.',
    };
  }
  return {
    ok: true,
    point: { latitude: position.coords.latitude, longitude: position.coords.longitude },
  };
}

/** Current GPS position with address and district. */
export async function getCurrentLocation(): Promise<LocationResult> {
  const result = await getCurrentPoint();
  if (!result.ok) return result;
  const { address, district } = await describeLocation(result.point);
  return { ok: true, location: { ...result.point, address, source: 'GPS' }, district };
}
