import {
  allocateEvacuees,
  AppError,
  calculateAvailableCapacity,
  COLLECTIONS,
  deriveShelterStatus,
  type AllocationResult,
  type AppUser,
  type DisasterEvent,
  type EmergencyShelter,
  type ShelterInput,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import {
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../../services/firebase';

const sheltersCollection = () =>
  collection(db, COLLECTIONS.shelters).withConverter(converters.shelters);
const shelterRef = (id: string) =>
  doc(db, COLLECTIONS.shelters, id).withConverter(converters.shelters);

/** Live list of all shelters, by district then name. */
export function subscribeToShelters(
  onData: (shelters: EmergencyShelter[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    sheltersCollection(),
    (snap) =>
      onData(
        snap.docs
          .map((d) => d.data())
          .sort((a, b) => a.district.localeCompare(b.district) || a.name.localeCompare(b.name)),
      ),
    onError,
  );
}

/** Active disaster events, used to link an allocation to an event (UC04 analytics). */
export async function loadActiveEvents(): Promise<DisasterEvent[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.disasterEvents).withConverter(converters.disasterEvents),
      where('status', '==', 'ACTIVE'),
    ),
  );
  return snap.docs.map((d) => d.data());
}

const contactFields = (input: ShelterInput) => ({
  contactName: input.contactName?.trim() || undefined,
  contactPhone: input.contactPhone?.trim() || undefined,
});

/** Registers a new shelter (UC03). Available capacity and status are derived, never typed in. */
export async function registerShelter(input: ShelterInput, closed: boolean): Promise<string> {
  const ref = doc(sheltersCollection());
  await setDoc(ref, {
    shelterId: ref.id,
    name: input.name.trim(),
    district: input.district,
    address: input.address.trim(),
    location: input.location,
    capacity: input.capacity,
    currentOccupancy: input.currentOccupancy,
    availableCapacity: calculateAvailableCapacity(input.capacity, input.currentOccupancy),
    status: deriveShelterStatus(
      input.capacity,
      input.currentOccupancy,
      closed ? 'CLOSED' : undefined,
    ),
    ...contactFields(input),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Updates shelter details. Occupancy is read inside the transaction (it changes only through
 * allocations), so an edit can never overwrite an allocation made meanwhile.
 */
export async function updateShelter(
  shelterId: string,
  input: ShelterInput,
  closed: boolean,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(shelterRef(shelterId));
    if (!snap.exists()) throw new AppError('VALIDATION_FAILED', 'This shelter no longer exists.');
    const occupancy = snap.data().currentOccupancy;
    if (input.capacity < occupancy) {
      throw new AppError(
        'VALIDATION_FAILED',
        `Capacity cannot be lower than the current occupancy (${occupancy}).`,
      );
    }
    const { contactName, contactPhone } = contactFields(input);
    tx.update(shelterRef(shelterId), {
      name: input.name.trim(),
      district: input.district,
      address: input.address.trim(),
      location: input.location,
      capacity: input.capacity,
      availableCapacity: calculateAvailableCapacity(input.capacity, occupancy),
      // Reopening derives the status again from occupancy.
      status: closed ? 'CLOSED' : deriveShelterStatus(input.capacity, occupancy),
      contactName: contactName ?? deleteField(),
      contactPhone: contactPhone ?? deleteField(),
      updatedAt: serverTimestamp(),
    });
  });
}

export interface AllocationOutcome extends AllocationResult {
  allocationId: string;
}

/**
 * Allocates evacuees to a shelter (§10.3): reads the shelter inside a transaction, checks the
 * capacity with `allocateEvacuees` (throws INSUFFICIENT_CAPACITY), then writes the allocation and
 * the new occupancy together. Concurrent allocations retry against fresh data, so occupancy can
 * never exceed capacity.
 */
export async function allocateToShelter({
  shelterId,
  evacueeCount,
  disasterEventId,
  officer,
}: {
  shelterId: string;
  evacueeCount: number;
  disasterEventId?: string;
  officer: Pick<AppUser, 'uid'>;
}): Promise<AllocationOutcome> {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(shelterRef(shelterId));
    if (!snap.exists()) throw new AppError('VALIDATION_FAILED', 'This shelter no longer exists.');
    const result = allocateEvacuees(snap.data(), evacueeCount);

    const allocationRef = doc(collection(db, COLLECTIONS.shelterAllocations));
    tx.set(allocationRef.withConverter(converters.shelterAllocations), {
      allocationId: allocationRef.id,
      shelterId,
      disasterEventId: disasterEventId || undefined,
      officerId: officer.uid,
      evacueeCount,
      status: 'CONFIRMED',
      createdAt: serverTimestamp(),
    });
    tx.update(shelterRef(shelterId), { ...result, updatedAt: serverTimestamp() });
    return { allocationId: allocationRef.id, ...result };
  });
}
