import { describe, expect, it } from 'vitest';

import { MAX_EVIDENCE_BYTES } from '../constants/limits';
import { hazardReportInputSchema } from './hazardReport.schema';
import { reportFiltersInputSchema } from './reportFilters.schema';
import { allocationInputSchema, shelterInputSchema } from './shelter.schema';
import { verificationDecisionInputSchema } from './verification.schema';

const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((i) => i.path.join('.')) ?? [];

describe('hazardReportInputSchema', () => {
  const valid = {
    hazardType: 'FLOOD',
    severity: 'HIGH',
    title: 'River overflowing',
    description: 'Water is entering houses near the bridge.',
    district: 'Ratnapura',
    location: { latitude: 6.6828, longitude: 80.3992, source: 'GPS' },
    evidence: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', sizeBytes: 1_000_000 }],
  };

  it('accepts a valid report and trims text', () => {
    const result = hazardReportInputSchema.parse({ ...valid, title: '  River overflowing  ' });
    expect(result.title).toBe('River overflowing');
  });

  it('reports every invalid field so the form can highlight them', () => {
    const result = hazardReportInputSchema.safeParse({
      ...valid,
      hazardType: 'VOLCANO',
      title: 'Hi',
      description: 'short',
      location: undefined,
    });
    expect(issuePaths(result)).toEqual(['hazardType', 'title', 'description', 'location']);
  });

  it('rejects more than three images', () => {
    const result = hazardReportInputSchema.safeParse({
      ...valid,
      evidence: Array(4).fill(valid.evidence[0]),
    });
    expect(issuePaths(result)).toEqual(['evidence']);
  });

  it('rejects unsupported and oversized images', () => {
    const result = hazardReportInputSchema.safeParse({
      ...valid,
      evidence: [
        { uri: 'file:///a.gif', mimeType: 'image/gif', sizeBytes: 100 },
        { uri: 'file:///b.jpg', mimeType: 'image/jpeg', sizeBytes: MAX_EVIDENCE_BYTES + 1 },
      ],
    });
    expect(issuePaths(result)).toEqual(['evidence.0.mimeType', 'evidence.1.sizeBytes']);
  });

  it('accepts a report without evidence', () => {
    expect(hazardReportInputSchema.safeParse({ ...valid, evidence: [] }).success).toBe(true);
  });
});

describe('verificationDecisionInputSchema', () => {
  it('requires remarks when rejecting', () => {
    const result = verificationDecisionInputSchema.safeParse({
      outcome: 'REJECTED',
      remarks: '   ',
    });
    expect(issuePaths(result)).toEqual(['remarks']);
  });

  it('accepts a rejection with remarks', () => {
    const result = verificationDecisionInputSchema.safeParse({
      outcome: 'REJECTED',
      remarks: 'Duplicate of an earlier report',
    });
    expect(result.success).toBe(true);
  });

  it('allows verification without remarks', () => {
    for (const outcome of ['VERIFIED_INFO', 'VERIFIED_ESCALATED']) {
      expect(
        verificationDecisionInputSchema.safeParse({
          outcome,
          remarks: '',
          ...(outcome === 'VERIFIED_ESCALATED'
            ? {
                stakeholderNotification: {
                  stakeholders: ['CITIZEN'],
                  title: 'Flood',
                  message: 'Verified flooding',
                },
              }
            : {}),
        }).success,
      ).toBe(true);
    }
  });
});

describe('shelterInputSchema', () => {
  const valid = {
    name: 'Ratnapura Central College',
    district: 'Ratnapura',
    address: 'Main Street, Ratnapura',
    location: { latitude: 6.68, longitude: 80.4 },
    capacity: 300,
    currentOccupancy: 0,
    contactPhone: '0771234567',
  };

  it('accepts a valid shelter', () => {
    expect(shelterInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects occupancy above capacity', () => {
    const result = shelterInputSchema.safeParse({ ...valid, currentOccupancy: 301 });
    expect(issuePaths(result)).toEqual(['currentOccupancy']);
  });

  it('accepts an empty phone and rejects an invalid one', () => {
    expect(shelterInputSchema.safeParse({ ...valid, contactPhone: '' }).success).toBe(true);
    expect(issuePaths(shelterInputSchema.safeParse({ ...valid, contactPhone: '12345' }))).toEqual([
      'contactPhone',
    ]);
  });
});

describe('allocationInputSchema', () => {
  it('requires a positive whole evacuee count', () => {
    for (const evacueeCount of [0, -1, 1.5]) {
      expect(allocationInputSchema.safeParse({ shelterId: 's1', evacueeCount }).success).toBe(
        false,
      );
    }
    expect(allocationInputSchema.safeParse({ shelterId: 's1', evacueeCount: 12 }).success).toBe(
      true,
    );
  });
});

describe('reportFiltersInputSchema', () => {
  it('requires an event', () => {
    expect(issuePaths(reportFiltersInputSchema.safeParse({ eventId: '' }))).toEqual(['eventId']);
  });

  it('rejects an end date before the start date', () => {
    const result = reportFiltersInputSchema.safeParse({
      eventId: 'evt-1',
      from: '2025-05-30',
      to: '2025-05-20',
    });
    expect(issuePaths(result)).toEqual(['to']);
  });
});

describe('stakeholder escalation validation', () => {
  it('requires recipients and message for escalation', () => {
    expect(
      verificationDecisionInputSchema.safeParse({ outcome: 'VERIFIED_ESCALATED', remarks: '' })
        .success,
    ).toBe(false);
    expect(
      verificationDecisionInputSchema.safeParse({
        outcome: 'VERIFIED_ESCALATED',
        remarks: '',
        stakeholderNotification: { stakeholders: [], title: ' ', message: '' },
      }).success,
    ).toBe(false);
  });
  it('accepts multiple selected stakeholders', () => {
    expect(
      verificationDecisionInputSchema.safeParse({
        outcome: 'VERIFIED_ESCALATED',
        remarks: '',
        stakeholderNotification: {
          stakeholders: ['CITIZEN', 'VOLUNTEER'],
          title: 'Fire',
          message: 'Verified fire hazard',
        },
      }).success,
    ).toBe(true);
  });
});
