import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { fromFirestoreData, toFirestoreData } from './converters';

const ISO = '2026-10-05T08:30:00.000Z';

describe('toFirestoreData', () => {
  it('converts ISO strings in timestamp fields, including nested ones', () => {
    const data = toFirestoreData({
      createdAt: ISO,
      clientCreatedAt: ISO,
      latestDecision: { outcome: 'VERIFIED_INFO', decidedAt: ISO },
      shares: [{ organisation: 'Red Cross', sharedAt: ISO }],
    }) as Record<string, any>;

    expect(data.createdAt).toBeInstanceOf(Timestamp);
    expect(data.latestDecision.decidedAt).toBeInstanceOf(Timestamp);
    expect(data.shares[0].sharedAt).toBeInstanceOf(Timestamp);
    expect(data.clientCreatedAt).toBe(ISO);
  });

  it('drops undefined fields and keeps FieldValues', () => {
    const pending = serverTimestamp();
    const data = toFirestoreData({ phone: undefined, updatedAt: pending, count: 0 });
    expect(data).toEqual({ updatedAt: pending, count: 0 });
  });
});

describe('fromFirestoreData', () => {
  it('converts every Timestamp back to an ISO string', () => {
    const ts = Timestamp.fromDate(new Date(ISO));
    expect(
      fromFirestoreData({ createdAt: ts, nested: { decidedAt: ts }, list: [{ sharedAt: ts }] }),
    ).toEqual({ createdAt: ISO, nested: { decidedAt: ISO }, list: [{ sharedAt: ISO }] });
  });

  it('round-trips a model', () => {
    const model = {
      reportId: 'r1',
      createdAt: ISO,
      evidenceUrls: ['a'],
      location: { latitude: 1 },
    };
    expect(fromFirestoreData(toFirestoreData(model))).toEqual(model);
  });
});
