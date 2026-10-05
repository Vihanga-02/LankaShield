import { describe, expect, it } from 'vitest';

import { isWithinSriLanka, matchDistrict } from './location';
import { evidenceIdFor, generateReportId, REPORT_ID_PATTERN } from './reportId';

describe('generateReportId', () => {
  it('formats the UTC date and a six-character suffix', () => {
    const id = generateReportId(new Date('2026-10-05T08:00:00Z'), () => 0);
    expect(id).toBe('LS-20261005-000000');
    expect(id).toMatch(REPORT_ID_PATTERN);
  });

  it('only uses unambiguous characters', () => {
    const ids = Array.from({ length: 200 }, () => generateReportId());
    expect(ids.every((id) => REPORT_ID_PATTERN.test(id))).toBe(true);
    expect(ids.map((id) => id.slice(-6)).join('')).not.toMatch(/[ILOU]/);
  });

  it('produces different IDs for different random values', () => {
    expect(generateReportId(new Date(), () => 0.1)).not.toBe(
      generateReportId(new Date(), () => 0.9),
    );
  });
});

describe('evidenceIdFor', () => {
  it('is positional so a retry overwrites the same file', () => {
    expect([0, 1, 2].map(evidenceIdFor)).toEqual(['ev-1', 'ev-2', 'ev-3']);
  });
});

describe('matchDistrict', () => {
  it('matches district names in common geocoder formats', () => {
    expect(matchDistrict([null, 'Ratnapura District'])).toBe('Ratnapura');
    expect(matchDistrict(['Sabaragamuwa Province', 'ratnapura'])).toBe('Ratnapura');
    expect(matchDistrict(['Nuwara Eliya'])).toBe('Nuwara Eliya');
    expect(matchDistrict(['NuwaraEliya'])).toBe('Nuwara Eliya');
  });

  it('returns undefined when nothing matches', () => {
    expect(matchDistrict(['Mountain View', 'California', undefined])).toBeUndefined();
  });
});

describe('isWithinSriLanka', () => {
  it('accepts points on the island and rejects points elsewhere', () => {
    expect(isWithinSriLanka({ latitude: 6.6828, longitude: 80.3992 })).toBe(true);
    expect(isWithinSriLanka({ latitude: 9.6615, longitude: 80.0255 })).toBe(true);
    expect(isWithinSriLanka({ latitude: 37.422, longitude: -122.084 })).toBe(false);
  });
});
