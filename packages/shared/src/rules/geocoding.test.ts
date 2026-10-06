import { describe, expect, it, vi } from 'vitest';

import {
  districtFromNominatim,
  lookupDistrict,
  nominatimReverseUrl,
  type FetchLike,
} from './geocoding';

// Trimmed from real Nominatim responses.
const RATNAPURA = {
  address: {
    city: 'Ratnapura',
    state_district: 'Ratnapura District',
    'ISO3166-2-lvl5': 'LK-91',
    state: 'Sabaragamuwa Province',
    country_code: 'lk',
  },
};
const MONARAGALA = {
  address: {
    state_district: 'Monaragala District',
    'ISO3166-2-lvl5': 'LK-82',
    country_code: 'lk',
  },
};

const respond =
  (body: unknown, ok = true): FetchLike =>
  async () => ({ ok, json: async () => body });

describe('districtFromNominatim', () => {
  it('reads the district name', () => {
    expect(districtFromNominatim(RATNAPURA)).toBe('Ratnapura');
    expect(districtFromNominatim(MONARAGALA)).toBe('Monaragala');
  });

  it('falls back to the ISO district code when the name is spelled differently', () => {
    expect(
      districtFromNominatim({
        address: { state_district: 'Moneragala', 'ISO3166-2-lvl5': 'LK-82', country_code: 'lk' },
      }),
    ).toBe('Monaragala');
  });

  it('returns undefined for the sea, other countries and unexpected responses', () => {
    expect(districtFromNominatim({ error: 'Unable to geocode' })).toBeUndefined();
    expect(
      districtFromNominatim({ address: { state_district: 'Ratnapura', country_code: 'in' } }),
    ).toBeUndefined();
    expect(districtFromNominatim(null)).toBeUndefined();
  });
});

describe('lookupDistrict', () => {
  const ratnapura = { latitude: 6.6828, longitude: 80.3992 };

  it('builds a district-level reverse geocoding URL', () => {
    const url = nominatimReverseUrl(ratnapura);
    expect(url).toContain('lat=6.6828');
    expect(url).toContain('lon=80.3992');
    expect(url).toContain('zoom=10');
  });

  it('returns the district for a point in Sri Lanka', async () => {
    await expect(
      lookupDistrict(ratnapura, { fetchFn: respond(RATNAPURA), minIntervalMs: 0 }),
    ).resolves.toBe('Ratnapura');
  });

  it('does not call the service for a point outside Sri Lanka', async () => {
    const fetchFn = vi.fn(respond(RATNAPURA));
    await expect(
      lookupDistrict({ latitude: 13.08, longitude: 80.27 }, { fetchFn }),
    ).resolves.toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns undefined when the service fails', async () => {
    await expect(
      lookupDistrict(ratnapura, { fetchFn: respond(RATNAPURA, false), minIntervalMs: 0 }),
    ).resolves.toBeUndefined();
    const failing: FetchLike = async () => {
      throw new Error('offline');
    };
    await expect(
      lookupDistrict(ratnapura, { fetchFn: failing, minIntervalMs: 0 }),
    ).resolves.toBeUndefined();
  });
});
