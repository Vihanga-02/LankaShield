import { describe, expect, it } from 'vitest';

import type { EmergencyShelter, HazardReport } from '../models';
import {
  occupancyByDistrict,
  reportsByDay,
  reportsByHazardType,
  verificationOutcomes,
} from './analyticsCharts';
import { distanceKm, findPossibleDuplicates } from './duplicates';
import { findPossibleDuplicateShelter } from './shelter';

function report(id: string, overrides: Partial<HazardReport> = {}): HazardReport {
  return {
    reportId: id,
    reporterId: 'u1',
    reporterRole: 'CITIZEN',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    title: 'Flood',
    description: 'Water rising',
    location: { latitude: 6.6828, longitude: 80.3992, source: 'GPS' },
    evidenceUrls: [],
    status: 'PENDING_VERIFICATION',
    district: 'Ratnapura',
    createdAt: '2026-10-05T08:00:00.000Z',
    updatedAt: '2026-10-05T08:00:00.000Z',
    clientCreatedAt: '2026-10-05T08:00:00.000Z',
    syncSource: 'ONLINE',
    ...overrides,
  };
}

describe('distanceKm', () => {
  it('is zero for the same point and ~111 km per degree of latitude', () => {
    const p = { latitude: 7, longitude: 80 };
    expect(distanceKm(p, p)).toBe(0);
    expect(distanceKm(p, { latitude: 8, longitude: 80 })).toBeCloseTo(111.2, 0);
  });
});

describe('findPossibleDuplicates', () => {
  const base = report('A');

  it('finds same-type reports nearby within the time window, nearest first', () => {
    const near = report('B', { location: { latitude: 6.6858, longitude: 80.3992, source: 'GPS' } });
    const nearer = report('C', {
      location: { latitude: 6.6838, longitude: 80.3992, source: 'GPS' },
    });
    expect(
      findPossibleDuplicates(base, [base, near, nearer]).map((d) => d.report.reportId),
    ).toEqual(['C', 'B']);
  });

  it('ignores other hazard types, distant reports and old reports', () => {
    const otherType = report('B', { hazardType: 'LANDSLIDE' });
    const far = report('C', { location: { latitude: 6.75, longitude: 80.3992, source: 'GPS' } });
    const old = report('D', { createdAt: '2026-10-03T08:00:00.000Z' });
    expect(findPossibleDuplicates(base, [otherType, far, old])).toEqual([]);
  });
});

describe('findPossibleDuplicateShelter', () => {
  const shelters: Pick<
    EmergencyShelter,
    'shelterId' | 'name' | 'district' | 'address' | 'location'
  >[] = [
    {
      shelterId: 's1',
      name: 'Ratnapura Central College',
      district: 'Ratnapura',
      address: 'Main Street, Ratnapura',
      location: { latitude: 6.6828, longitude: 80.3992 },
    },
    {
      shelterId: 's2',
      name: 'Horana Hall',
      district: 'Kalutara',
      address: 'Horana Town',
      location: { latitude: 6.7167, longitude: 80.0622 },
    },
  ];

  it('matches same-name shelters only when the address also matches', () => {
    expect(
      findPossibleDuplicateShelter(
        '  ratnapura  central college',
        'Ratnapura',
        '  Main Street, Ratnapura ',
        undefined,
        shelters,
      )?.shelterId,
    ).toBe('s1');
  });

  it('matches same-name shelters with nearby markers, but not those at another location', () => {
    expect(
      findPossibleDuplicateShelter(
        'Ratnapura Central College',
        'Ratnapura',
        'Other address',
        { latitude: 6.6829, longitude: 80.3992 },
        shelters,
      )?.shelterId,
    ).toBe('s1');
    expect(
      findPossibleDuplicateShelter(
        'Ratnapura Central College',
        'Ratnapura',
        'Other address',
        { latitude: 6.7, longitude: 80.4 },
        shelters,
      ),
    ).toBeUndefined();
  });

  it('ignores other districts and the shelter being edited', () => {
    expect(
      findPossibleDuplicateShelter(
        'Horana Hall',
        'Ratnapura',
        'Horana Town',
        undefined,
        shelters,
      ),
    ).toBeUndefined();
    expect(
      findPossibleDuplicateShelter(
        'Horana Hall',
        'Kalutara',
        'Horana Town',
        undefined,
        shelters,
        's2',
      ),
    ).toBeUndefined();
  });
});

describe('chart data', () => {
  const reports = [
    report('1', { createdAt: '2026-10-01T08:00:00.000Z', status: 'VERIFIED' }),
    report('2', { createdAt: '2026-10-01T09:00:00.000Z', status: 'ESCALATED' }),
    report('3', {
      createdAt: '2026-10-03T09:00:00.000Z',
      hazardType: 'LANDSLIDE',
      status: 'REJECTED',
    }),
  ];

  it('counts reports per day and fills empty days with zero', () => {
    expect(reportsByDay(reports)).toEqual([
      { day: '2026-10-01', count: 2 },
      { day: '2026-10-02', count: 0 },
      { day: '2026-10-03', count: 1 },
    ]);
    expect(reportsByDay([])).toEqual([]);
  });

  it('counts reports per hazard type, largest first, without empty types', () => {
    expect(reportsByHazardType(reports)).toEqual([
      { label: 'Flood', count: 2 },
      { label: 'Landslide', count: 1 },
    ]);
  });

  it('counts outcomes in a fixed order', () => {
    expect(verificationOutcomes(reports)).toEqual([
      { label: 'Verified', count: 1 },
      { label: 'Escalated', count: 1 },
      { label: 'Rejected', count: 1 },
      { label: 'Pending', count: 0 },
    ]);
  });

  it('sums occupancy and capacity per district, skipping closed shelters', () => {
    const shelter = (district: string, occupancy: number, capacity: number, status = 'AVAILABLE') =>
      ({ district, currentOccupancy: occupancy, capacity, status }) as EmergencyShelter;
    expect(
      occupancyByDistrict([
        shelter('Ratnapura', 180, 300),
        shelter('Ratnapura', 125, 150),
        shelter('Kalutara', 10, 200),
        shelter('Kalutara', 0, 100, 'CLOSED'),
      ]),
    ).toEqual([
      { district: 'Ratnapura', occupancy: 305, capacity: 450, rate: 68 },
      { district: 'Kalutara', occupancy: 10, capacity: 200, rate: 5 },
    ]);
  });
});
