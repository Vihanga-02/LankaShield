import { describe, expect, it } from 'vitest';

import { AppError } from '../constants/errors';
import {
  allocateEvacuees,
  calculateAvailableCapacity,
  deriveShelterStatus,
  findAlternativeShelters,
  toOccupancyRecord,
} from './shelter';

const shelter = (id: string, capacity: number, currentOccupancy: number, status = 'AVAILABLE') => ({
  shelterId: id,
  capacity,
  currentOccupancy,
  status: status as 'AVAILABLE' | 'NEARLY_FULL' | 'FULL' | 'CLOSED',
});

describe('calculateAvailableCapacity', () => {
  it('returns remaining places', () => {
    expect(calculateAvailableCapacity(100, 30)).toBe(70);
  });

  it('never goes below zero', () => {
    expect(calculateAvailableCapacity(100, 120)).toBe(0);
  });
});

describe('deriveShelterStatus', () => {
  it.each([
    [100, 0, 'AVAILABLE'],
    [100, 79, 'AVAILABLE'],
    [100, 80, 'NEARLY_FULL'],
    [100, 99, 'NEARLY_FULL'],
    [100, 100, 'FULL'],
  ] as const)('capacity %i with occupancy %i is %s', (capacity, occupancy, expected) => {
    expect(deriveShelterStatus(capacity, occupancy)).toBe(expected);
  });

  it('keeps a closed shelter closed', () => {
    expect(deriveShelterStatus(100, 10, 'CLOSED')).toBe('CLOSED');
  });
});

describe('toOccupancyRecord', () => {
  it('derives available places, rate and status', () => {
    expect(toOccupancyRecord(shelter('s1', 200, 170))).toEqual({
      shelterId: 's1',
      capacity: 200,
      currentOccupancy: 170,
      availableCapacity: 30,
      occupancyRate: 0.85,
      status: 'NEARLY_FULL',
    });
  });
});

describe('allocateEvacuees', () => {
  it('returns the updated occupancy fields when places are available', () => {
    expect(allocateEvacuees(shelter('s1', 100, 50), 30)).toEqual({
      currentOccupancy: 80,
      availableCapacity: 20,
      status: 'NEARLY_FULL',
    });
  });

  it('allows filling the shelter exactly', () => {
    expect(allocateEvacuees(shelter('s1', 100, 60), 40).status).toBe('FULL');
  });

  it('throws INSUFFICIENT_CAPACITY when the group does not fit', () => {
    expect(() => allocateEvacuees(shelter('s1', 100, 90), 11)).toThrowError(
      expect.objectContaining({ code: 'INSUFFICIENT_CAPACITY' }),
    );
  });

  it('rejects zero, negative and fractional counts', () => {
    for (const count of [0, -5, 2.5]) {
      expect(() => allocateEvacuees(shelter('s1', 100, 0), count)).toThrowError(AppError);
    }
  });

  it('rejects allocation to a closed shelter', () => {
    expect(() => allocateEvacuees(shelter('s1', 100, 0, 'CLOSED'), 1)).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
  });
});

describe('findAlternativeShelters', () => {
  const shelters = [
    shelter('selected', 100, 95, 'NEARLY_FULL'),
    shelter('small', 50, 40),
    shelter('large', 300, 100),
    shelter('closed', 500, 0, 'CLOSED'),
    shelter('medium', 150, 100),
  ];

  it('lists open shelters that fit the group, most available places first', () => {
    const ids = findAlternativeShelters(shelters, 20, 'selected').map((s) => s.shelterId);
    expect(ids).toEqual(['large', 'medium']);
  });

  it('returns an empty list when nothing fits', () => {
    expect(findAlternativeShelters(shelters, 1000)).toEqual([]);
  });
});
