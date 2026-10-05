import { matchDistrict, type District, type GeoLocation, type GeoPoint } from '@lankashield/shared';
import * as Location from 'expo-location';

import { withTimeout } from '@/utils/withTimeout';

export type LocationResult =
  { ok: true; location: GeoLocation; district?: District } | { ok: false; message: string };

/** Readable address and district for a point. Best effort: failures return an empty result. */
export async function describeLocation(
  point: GeoPoint,
): Promise<{ address?: string; district?: District }> {
  try {
    const [place] = await withTimeout(Location.reverseGeocodeAsync(point), 8_000);
    if (!place) return {};
    const address =
      place.formattedAddress ??
      ([place.name, place.street, place.city].filter(Boolean).join(', ') || undefined);
    const district = matchDistrict([place.subregion, place.district, place.city, place.region]);
    return { address, district };
  } catch {
    return {};
  }
}

/**
 * Current GPS position with address and district. When permission is denied, location services
 * are off or no fix is available, it returns a message so the user can pick on the map instead.
 */
export async function getCurrentLocation(): Promise<LocationResult> {
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

  const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  const { address, district } = await describeLocation(point);
  return { ok: true, location: { ...point, address, source: 'GPS' }, district };
}
