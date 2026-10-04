import type { AllocationStatus, ShelterStatus } from '../enums';
import type { GeoPoint, IsoDateString } from './common';
import type { District } from '../constants/districts';

/** `shelters/{shelterId}` */
export interface EmergencyShelter {
  shelterId: string;
  name: string;
  district: District;
  address: string;
  location: GeoPoint;
  capacity: number;
  currentOccupancy: number;
  availableCapacity: number;
  status: ShelterStatus;
  contactName?: string;
  contactPhone?: string;
  updatedAt: IsoDateString;
}

/** Derived occupancy snapshot of a shelter (not stored as its own collection). */
export interface OccupancyRecord {
  shelterId: string;
  capacity: number;
  currentOccupancy: number;
  availableCapacity: number;
  /** 0–1 */
  occupancyRate: number;
  status: ShelterStatus;
}

/** `shelterAllocations/{allocationId}` */
export interface ShelterAllocation {
  allocationId: string;
  shelterId: string;
  disasterEventId?: string;
  officerId: string;
  evacueeCount: number;
  status: AllocationStatus;
  createdAt: IsoDateString;
}
