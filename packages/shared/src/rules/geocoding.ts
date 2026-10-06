import type { District } from '../constants/districts';
import type { GeoPoint } from '../models';
import { isWithinSriLanka, matchDistrict } from './location';

/** OpenStreetMap's public reverse geocoder. Usage policy: at most one request per second. */
export const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

/** ISO 3166-2:LK district codes, which Nominatim returns as `ISO3166-2-lvl5`. */
const ISO_DISTRICTS: Record<string, District> = {
  'LK-11': 'Colombo',
  'LK-12': 'Gampaha',
  'LK-13': 'Kalutara',
  'LK-21': 'Kandy',
  'LK-22': 'Matale',
  'LK-23': 'Nuwara Eliya',
  'LK-31': 'Galle',
  'LK-32': 'Matara',
  'LK-33': 'Hambantota',
  'LK-41': 'Jaffna',
  'LK-42': 'Kilinochchi',
  'LK-43': 'Mannar',
  'LK-44': 'Vavuniya',
  'LK-45': 'Mullaitivu',
  'LK-51': 'Batticaloa',
  'LK-52': 'Ampara',
  'LK-53': 'Trincomalee',
  'LK-61': 'Kurunegala',
  'LK-62': 'Puttalam',
  'LK-71': 'Anuradhapura',
  'LK-72': 'Polonnaruwa',
  'LK-81': 'Badulla',
  'LK-82': 'Monaragala',
  'LK-91': 'Ratnapura',
  'LK-92': 'Kegalle',
};

export function nominatimReverseUrl({ latitude, longitude }: GeoPoint): string {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    // Zoom 10 resolves to the district level ("state_district" in Sri Lanka).
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'en',
  });
  return `${NOMINATIM_REVERSE_URL}?${params.toString()}`;
}

/**
 * The district in a Nominatim reverse-geocoding response: the district name first
 * ("Ratnapura District"), then the ISO district code (LK-91). Undefined for points at sea,
 * outside Sri Lanka or an unexpected response.
 */
export function districtFromNominatim(response: unknown): District | undefined {
  const address = (response as { address?: Record<string, unknown> } | null)?.address;
  if (!address || address.country_code !== 'lk') return undefined;
  const text = (key: string) => (typeof address[key] === 'string' ? address[key] : undefined);
  const iso = text('ISO3166-2-lvl5');
  return (
    matchDistrict([text('state_district'), text('county')]) ??
    (iso ? ISO_DISTRICTS[iso] : undefined)
  );
}

/** Minimal `fetch` shape, so both apps (and tests) can pass their own. */
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

let nextRequestAt = 0;

/**
 * Finds the Sri Lankan district for a point picked on the map (UC01 location, UC03 shelter).
 * Best effort: returns undefined when the point is outside Sri Lanka, the lookup fails or it
 * takes longer than `timeoutMs`, and the user then chooses the district manually.
 * Requests are spaced at least `minIntervalMs` apart (Nominatim allows one per second).
 */
export async function lookupDistrict(
  point: GeoPoint,
  {
    fetchFn = fetch,
    headers,
    timeoutMs = 8_000,
    minIntervalMs = 1_000,
  }: {
    fetchFn?: FetchLike;
    headers?: Record<string, string>;
    timeoutMs?: number;
    minIntervalMs?: number;
  } = {},
): Promise<District | undefined> {
  if (!isWithinSriLanka(point)) return undefined;

  const now = Date.now();
  const wait = nextRequestAt - now;
  nextRequestAt = Math.max(now, nextRequestAt) + minIntervalMs;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(nominatimReverseUrl(point), {
      headers,
      signal: controller.signal,
    });
    return response.ok ? districtFromNominatim(await response.json()) : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
