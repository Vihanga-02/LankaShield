import { describe, expect, it } from 'vitest';
import type {
  AnalyticsInput,
  CitizenReachRecord,
  DisasterEvent,
  EventAlert,
  HazardReport,
  ResourceDistribution,
  ShelterOccupancySnapshot,
} from '..';
import { calculateResponseMetrics, decideReportStatus } from './analytics';

const NOW = '2026-10-05T00:00:00.000Z';
const event: DisasterEvent = {
  eventId: 'evt-1',
  name: 'Kalutara Landslides',
  hazardType: 'LANDSLIDE',
  district: 'Kalutara',
  status: 'COMPLETED',
  startedAt: '2025-11-03T00:00:00.000Z',
  endedAt: '2025-11-12T00:00:00.000Z',
};
const report = {
  reportId: 'r1',
  reporterId: 'u1',
  reporterRole: 'CITIZEN',
  hazardType: 'LANDSLIDE',
  severity: 'HIGH',
  title: 'Slope failure',
  description: 'Earth is moving behind houses',
  location: { latitude: 6.5, longitude: 80.1, source: 'GPS' },
  evidenceUrls: [],
  status: 'VERIFIED',
  district: 'Kalutara',
  disasterEventId: 'evt-1',
  createdAt: '2025-11-04T08:00:00.000Z',
  updatedAt: '2025-11-04T09:00:00.000Z',
  clientCreatedAt: '2025-11-04T08:00:00.000Z',
  syncSource: 'ONLINE',
} as HazardReport;
const alerts: EventAlert[] = [
  {
    alertId: 'a1',
    disasterEventId: 'evt-1',
    level: 'HIGH',
    district: 'Kalutara',
    issuedAt: '2025-11-04T06:00:00.000Z',
    acknowledged: true,
  },
  {
    alertId: 'a2',
    disasterEventId: 'evt-1',
    level: 'ADVISORY',
    district: 'Kalutara',
    issuedAt: '2025-11-05T06:00:00.000Z',
    acknowledged: true,
  },
];
const reach: CitizenReachRecord[] = [
  {
    reachId: 'c1',
    disasterEventId: 'evt-1',
    district: 'Kalutara',
    gsDivision: 'Horana',
    citizensReached: 600,
    recordedAt: '2025-11-05T12:00:00.000Z',
  },
  {
    reachId: 'c2',
    disasterEventId: 'evt-1',
    district: 'Kalutara',
    gsDivision: 'Agalawatta',
    citizensReached: 400,
    recordedAt: '2025-11-05T12:00:00.000Z',
  },
];
const occupancy: ShelterOccupancySnapshot[] = [
  {
    snapshotId: 's1',
    disasterEventId: 'evt-1',
    shelterId: 'sh1',
    district: 'Kalutara',
    occupancy: 80,
    capacity: 100,
    recordedAt: '2025-11-05T18:00:00.000Z',
  },
  {
    snapshotId: 's2',
    disasterEventId: 'evt-1',
    shelterId: 'sh2',
    district: 'Kalutara',
    occupancy: 40,
    capacity: 50,
    recordedAt: '2025-11-05T18:00:00.000Z',
  },
];
const resources: ResourceDistribution[] = [
  {
    distributionId: 'd1',
    disasterEventId: 'evt-1',
    district: 'Kalutara',
    category: 'FOOD_PACK',
    quantity: 300,
    distributedAt: '2025-11-06T10:00:00.000Z',
  },
  {
    distributionId: 'd2',
    disasterEventId: 'evt-1',
    district: 'Colombo',
    category: 'WATER_KIT',
    quantity: 200,
    distributedAt: '2025-11-06T10:00:00.000Z',
  },
];
const input = (overrides: Partial<AnalyticsInput> = {}): AnalyticsInput => ({
  event,
  reports: [report],
  alerts,
  citizenReach: reach,
  occupancySnapshots: occupancy,
  resourceDistributions: resources,
  now: NOW,
  ...overrides,
});

describe('decideReportStatus', () => {
  it('only makes complete finished events final', () => {
    expect(decideReportStatus('COMPLETED', [])).toBe('FINAL');
    expect(decideReportStatus('ACTIVE', [])).toBe('PROVISIONAL');
    expect(decideReportStatus('COMPLETED', ['alertsIssued'])).toBe('PROVISIONAL');
  });
});

describe('calculateResponseMetrics', () => {
  it('calculates the campus reporting metrics from event records', () => {
    const result = calculateResponseMetrics(input());
    expect(result.values).toEqual({
      alertsIssued: 2,
      citizensReached: 1000,
      sheltersActivated: 2,
      resourcesDistributed: 500,
    });
    expect(result.status).toBe('FINAL');
    expect(result.missingMetrics).toEqual([]);
  });

  it('marks a failed source missing', () => {
    const result = calculateResponseMetrics(input({ citizenReach: null }));
    expect(result.values.citizensReached).toBe(0);
    expect(result.missingMetrics).toEqual(['citizensReached']);
    expect(result.status).toBe('PROVISIONAL');
  });

  it('applies date and destination-district filters to every reporting source', () => {
    const result = calculateResponseMetrics(
      input({ filters: { district: 'Colombo', from: '2025-11-06', to: '2025-11-06' } }),
    );
    expect(result.values).toEqual({
      alertsIssued: 0,
      citizensReached: 0,
      sheltersActivated: 0,
      resourcesDistributed: 200,
    });
    expect(result.resourceDistributions).toHaveLength(1);
  });
});
