import { AppError } from '../constants/errors';
import { SHELTER_NEARLY_FULL_RATIO } from '../constants/limits';
import type { ShelterStatus } from '../enums';
import type { EmergencyShelter, OccupancyRecord } from '../models';

export function calculateAvailableCapacity(capacity: number, currentOccupancy: number): number {
  return Math.max(0, capacity - currentOccupancy);
}

/**
 * Available below 80%, Nearly Full from 80% to 99%, Full at 100%.
 * A shelter an officer has closed stays CLOSED regardless of occupancy.
 */
export function deriveShelterStatus(
  capacity: number,
  currentOccupancy: number,
  currentStatus?: ShelterStatus,
): ShelterStatus {
  if (currentStatus === 'CLOSED') return 'CLOSED';
  if (capacity <= 0 || currentOccupancy >= capacity) return 'FULL';
  if (currentOccupancy / capacity >= SHELTER_NEARLY_FULL_RATIO) return 'NEARLY_FULL';
  return 'AVAILABLE';
}

type ShelterCapacity = Pick<
  EmergencyShelter,
  'shelterId' | 'capacity' | 'currentOccupancy' | 'status'
>;

export function toOccupancyRecord(shelter: ShelterCapacity): OccupancyRecord {
  const { shelterId, capacity, currentOccupancy } = shelter;
  return {
    shelterId,
    capacity,
    currentOccupancy,
    availableCapacity: calculateAvailableCapacity(capacity, currentOccupancy),
    occupancyRate: capacity > 0 ? currentOccupancy / capacity : 1,
    status: deriveShelterStatus(capacity, currentOccupancy, shelter.status),
  };
}

/** Shelter fields to write after a successful allocation. */
export interface AllocationResult {
  currentOccupancy: number;
  availableCapacity: number;
  status: ShelterStatus;
}

/**
 * Checks a requested evacuee count against the shelter's current state and returns the new
 * occupancy fields. Used inside the Firestore allocation transaction (§10.3).
 *
 * @throws AppError VALIDATION_FAILED for a non-positive count or a closed shelter
 * @throws AppError INSUFFICIENT_CAPACITY when the count exceeds available places
 */
export function allocateEvacuees(shelter: ShelterCapacity, evacueeCount: number): AllocationResult {
  if (!Number.isInteger(evacueeCount) || evacueeCount <= 0) {
    throw new AppError('VALIDATION_FAILED', 'Evacuee count must be a whole number above zero.');
  }
  if (shelter.status === 'CLOSED') {
    throw new AppError('VALIDATION_FAILED', 'This shelter is closed and cannot accept evacuees.');
  }
  const available = calculateAvailableCapacity(shelter.capacity, shelter.currentOccupancy);
  if (evacueeCount > available) {
    throw new AppError('INSUFFICIENT_CAPACITY');
  }
  const currentOccupancy = shelter.currentOccupancy + evacueeCount;
  return {
    currentOccupancy,
    availableCapacity: calculateAvailableCapacity(shelter.capacity, currentOccupancy),
    status: deriveShelterStatus(shelter.capacity, currentOccupancy),
  };
}

/**
 * Open shelters that can take the whole group, most available places first.
 * Shown when the selected shelter has insufficient capacity.
 */
export function findAlternativeShelters<T extends ShelterCapacity>(
  shelters: readonly T[],
  evacueeCount: number,
  excludeShelterId?: string,
): T[] {
  return shelters
    .filter(
      (s) =>
        s.shelterId !== excludeShelterId &&
        s.status !== 'CLOSED' &&
        calculateAvailableCapacity(s.capacity, s.currentOccupancy) >= evacueeCount,
    )
    .sort(
      (a, b) =>
        calculateAvailableCapacity(b.capacity, b.currentOccupancy) -
        calculateAvailableCapacity(a.capacity, a.currentOccupancy),
    );
}

const normaliseName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Another shelter in the same district with the same name (case/space-insensitive), if any. */
export function findDuplicateShelterName<
  T extends Pick<EmergencyShelter, 'shelterId' | 'name' | 'district'>,
>(
  name: string,
  district: string,
  shelters: readonly T[],
  excludeShelterId?: string,
): T | undefined {
  const key = normaliseName(name);
  if (!key) return undefined;
  return shelters.find(
    (s) =>
      s.shelterId !== excludeShelterId && s.district === district && normaliseName(s.name) === key,
  );
}
