import { describe, expect, it } from 'vitest';

import type {
  DisasterEvent,
  EmergencyShelter,
  HazardReport,
  NotificationRecord,
  ShelterAllocation,
} from '../models';
import { calculateResponseMetrics, decideReportStatus, type AnalyticsInput } from './analytics';

const NOW = '2026-10-05T00:00:00.000Z';

const completedEvent: DisasterEvent = {
  eventId: 'evt-1',
  name: 'Ratnapura Floods',
  hazardType: 'FLOOD',
  district: 'Ratnapura',
  status: 'COMPLETED',
  startedAt: '2025-05-20T00:00:00.000Z',
  endedAt: '2025-05-30T00:00:00.000Z',
};

function report(id: string, overrides: Partial<HazardReport> = {}): HazardReport {
  return {
    reportId: id,
    reporterId: 'citizen-1',
    reporterRole: 'CITIZEN',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    title: 'Flooding',
    description: 'Water rising near the river',
    location: { latitude: 6.68, longitude: 80.4, source: 'GPS' },
    evidenceUrls: [],
    status: 'VERIFIED',
    district: 'Ratnapura',
    disasterEventId: 'evt-1',
    createdAt: '2025-05-21T08:00:00.000Z',
    updatedAt: '2025-05-21T09:00:00.000Z',
    clientCreatedAt: '2025-05-21T08:00:00.000Z',
    syncSource: 'ONLINE',
    ...overrides,
  };
}

const shelterIn = (district: 'Ratnapura' | 'Kalutara', occupancy: number) =>
  ({ district, currentOccupancy: occupancy }) as EmergencyShelter;

const allocation = (count: number, overrides: Partial<ShelterAllocation> = {}) =>
  ({
    evacueeCount: count,
    status: 'CONFIRMED',
    disasterEventId: 'evt-1',
    ...overrides,
  }) as ShelterAllocation;

const sent = (recipientId: string, relatedEntityId: string, deliveryStatus = 'SENT') =>
  ({ recipientId, relatedEntityId, deliveryStatus }) as NotificationRecord;

function input(overrides: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return {
    event: completedEvent,
    reports: [
      report('r1'),
      report('r2', { status: 'ESCALATED', reporterId: 'citizen-2' }),
      report('r3', { status: 'REJECTED' }),
      report('other-event', { disasterEventId: 'evt-2' }),
    ],
    shelters: [shelterIn('Ratnapura', 120), shelterIn('Ratnapura', 30), shelterIn('Kalutara', 999)],
    allocations: [
      allocation(100),
      allocation(50),
      allocation(40, { status: 'CANCELLED' }),
      allocation(70, { disasterEventId: 'evt-2' }),
    ],
    notifications: [
      sent('citizen-1', 'r1'),
      sent('citizen-1', 'r3'),
      sent('citizen-2', 'r2'),
      sent('citizen-3', 'r1', 'FAILED'),
      sent('citizen-4', 'other-event'),
    ],
    now: NOW,
    ...overrides,
  };
}

describe('decideReportStatus', () => {
  it('is FINAL only for a completed event with no missing metrics', () => {
    expect(decideReportStatus('COMPLETED', [])).toBe('FINAL');
    expect(decideReportStatus('COMPLETED', ['citizensReached'])).toBe('PROVISIONAL');
    expect(decideReportStatus('ACTIVE', [])).toBe('PROVISIONAL');
  });
});

describe('calculateResponseMetrics', () => {
  it('calculates every metric from records linked to the event', () => {
    const result = calculateResponseMetrics(input());
    expect(result.values).toEqual({
      reportsReceived: 3,
      verifiedReports: 2,
      citizensReached: 2,
      shelterOccupancy: 150,
      allocatedEvacuees: 150,
    });
    expect(result.missingMetrics).toEqual([]);
    expect(result.status).toBe('FINAL');
    expect(result.metrics.every((m) => m.complete && m.calculatedAt === NOW)).toBe(true);
  });

  it('records the source collection of each metric', () => {
    const sources = Object.fromEntries(
      calculateResponseMetrics(input()).metrics.map((m) => [m.key, m.sourceCollection]),
    );
    expect(sources).toEqual({
      reportsReceived: 'hazardReports',
      verifiedReports: 'hazardReports',
      citizensReached: 'notifications',
      shelterOccupancy: 'shelters',
      allocatedEvacuees: 'shelterAllocations',
    });
  });

  it('is PROVISIONAL for an active event even with complete data', () => {
    const result = calculateResponseMetrics(
      input({ event: { ...completedEvent, status: 'ACTIVE', endedAt: undefined } }),
    );
    expect(result.missingMetrics).toEqual([]);
    expect(result.status).toBe('PROVISIONAL');
  });

  it('marks report counts incomplete while reports in the event window are unreviewed', () => {
    const pending = report('pending', {
      status: 'PENDING_VERIFICATION',
      disasterEventId: undefined,
      createdAt: '2025-05-25T10:00:00.000Z',
    });
    const outsideWindow = report('old-pending', {
      status: 'PENDING_VERIFICATION',
      disasterEventId: undefined,
      createdAt: '2025-01-01T10:00:00.000Z',
    });
    const result = calculateResponseMetrics(
      input({ reports: [...input().reports!, pending, outsideWindow] }),
    );

    expect(result.unreviewedReports).toBe(1);
    expect(result.missingMetrics).toEqual(['reportsReceived', 'verifiedReports']);
    expect(result.values.reportsReceived).toBe(3);
    expect(result.status).toBe('PROVISIONAL');
  });

  it('lists a metric as missing when its source failed to load', () => {
    const result = calculateResponseMetrics(input({ notifications: null }));
    const citizensReached = result.metrics.find((m) => m.key === 'citizensReached');

    expect(citizensReached).toMatchObject({ value: null, complete: false });
    expect(result.missingMetrics).toEqual(['citizensReached']);
    expect(result.values.citizensReached).toBe(0);
    expect(result.values.shelterOccupancy).toBe(150);
    expect(result.status).toBe('PROVISIONAL');
  });

  it('applies date filters to linked reports', () => {
    const result = calculateResponseMetrics(
      input({
        reports: [
          report('early', { createdAt: '2025-05-20T08:00:00.000Z' }),
          report('late', { createdAt: '2025-05-28T08:00:00.000Z' }),
        ],
        filters: { from: '2025-05-27', to: '2025-05-30' },
      }),
    );
    expect(result.eventReports.map((r) => r.reportId)).toEqual(['late']);
  });

  it('returns zero counts for filters that match no records', () => {
    const result = calculateResponseMetrics(input({ filters: { from: '2030-01-01' } }));
    expect(result.values.reportsReceived).toBe(0);
    expect(result.eventReports).toEqual([]);
  });
});
