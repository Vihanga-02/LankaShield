import type { District } from '../constants/districts';
import type { GeoPoint } from '../models';
import { isWithinSriLanka, matchDistrict } from './location';

/** OpenStreetMap's public reverse geocoder. Usage policy: at most one request per second. */
export const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

/** OpenStreetMap's public address search endpoint. */
export const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

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

function nominatimUrl({ latitude, longitude }: GeoPoint, zoom: number): string {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: String(zoom),
    addressdetails: '1',
    'accept-language': 'en',
  });
  return `${NOMINATIM_REVERSE_URL}?${params.toString()}`;
}

export function nominatimReverseUrl(point: GeoPoint): string {
  return nominatimUrl(point, 10);
}

export function nominatimLocationUrl(point: GeoPoint): string {
  return nominatimUrl(point, 18);
}

/** Builds a Sri Lanka-only search URL, using the selected district to disambiguate place names. */
export function nominatimAddressSearchUrl(address: string, district?: District): string {
  const query = [address.trim(), district, 'Sri Lanka'].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    countrycodes: 'lk',
    addressdetails: '1',
    limit: '1',
    'accept-language': 'en',
  });
  return `${NOMINATIM_SEARCH_URL}?${params.toString()}`;
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

export function addressFromNominatim(response: unknown): string | undefined {
  const displayName = (response as { display_name?: unknown } | null)?.display_name;
  return typeof displayName === 'string' && displayName.trim() ? displayName : undefined;
}

/** Minimal `fetch` shape, so both apps (and tests) can pass their own. */
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export interface LookupOptions {
  fetchFn?: FetchLike;
  headers?: Record<string, string>;
  timeoutMs?: number;
  minIntervalMs?: number;
}

let nextRequestAt = 0;

async function reverseLookup(
  point: GeoPoint,
  url: string,
  options: LookupOptions = {},
): Promise<unknown | undefined> {
  if (!isWithinSriLanka(point)) return undefined;

  return nominatimLookup(url, options);
}

async function nominatimLookup(
  url: string,
  { fetchFn = fetch, headers, timeoutMs = 8_000, minIntervalMs = 1_000 }: LookupOptions = {},
): Promise<unknown | undefined> {
  const now = Date.now();
  const wait = nextRequestAt - now;
  nextRequestAt = Math.max(now, nextRequestAt) + minIntervalMs;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, { headers, signal: controller.signal });
    return response.ok ? response.json() : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Finds the Sri Lankan district for a point picked on the map (UC01 location, UC03 shelter).
 * Best effort: returns undefined when the point is outside Sri Lanka, the lookup fails or it
 * takes longer than `timeoutMs`, and the user then chooses the district manually.
 * Requests are spaced at least `minIntervalMs` apart (Nominatim allows one per second).
 */
export async function lookupDistrict(
  point: GeoPoint,
  options: LookupOptions = {},
): Promise<District | undefined> {
  const response = await reverseLookup(point, nominatimReverseUrl(point), options);
  return districtFromNominatim(response);
}

export async function lookupLocation(
  point: GeoPoint,
  options: LookupOptions = {},
): Promise<{ address: string; district: District } | undefined> {
  const response = await reverseLookup(point, nominatimLocationUrl(point), options);
  const address = addressFromNominatim(response);
  const district = districtFromNominatim(response);
  return address && district ? { address, district } : undefined;
}

export interface AddressLookupOptions extends LookupOptions {
  /** Narrows a place-name search to the district the user has selected. */
  district?: District;
}

export interface AddressLocation {
  point: GeoPoint;
  district?: District;
}

/** Reads the first valid Sri Lankan point from a Nominatim address-search response. */
export function locationFromNominatimSearch(response: unknown): AddressLocation | undefined {
  if (!Array.isArray(response)) return undefined;

  for (const result of response) {
    if (!result || typeof result !== 'object') continue;
    const { lat, lon } = result as Record<string, unknown>;
    const latitude = typeof lat === 'string' || typeof lat === 'number' ? Number(lat) : NaN;
    const longitude = typeof lon === 'string' || typeof lon === 'number' ? Number(lon) : NaN;
    const point = { latitude, longitude };
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && isWithinSriLanka(point)) {
      return { point, district: districtFromNominatim(result) };
    }
  }

  return undefined;
}

/**
 * Finds a Sri Lankan place from an address entered in a form. The selected district is used as
 * search context, while the returned point remains available for the user to adjust on the map.
 */
export async function lookupAddress(
  address: string,
  { district, ...options }: AddressLookupOptions = {},
): Promise<AddressLocation | undefined> {
  if (!address.trim()) return undefined;
  const response = await nominatimLookup(nominatimAddressSearchUrl(address, district), options);
  return locationFromNominatimSearch(response);
}
