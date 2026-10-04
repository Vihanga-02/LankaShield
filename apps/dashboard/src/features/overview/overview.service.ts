import {
  COLLECTIONS,
  SHELTER_STATUSES,
  type DisasterEvent,
  type EmergencyShelter,
  type HazardReport,
  type ShelterStatus,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { db } from '../../services/firebase';

export interface OverviewData {
  pendingReports: number;
  verifiedReports: number;
  recentReports: HazardReport[];
  shelters: {
    total: number;
    byStatus: Record<ShelterStatus, number>;
    capacity: number;
    occupancy: number;
    availablePlaces: number;
  };
  activeEvents: DisasterEvent[];
  completedEvents: number;
  loadedAt: string;
}

const reports = () =>
  collection(db, COLLECTIONS.hazardReports).withConverter(converters.hazardReports);

function summariseShelters(shelters: EmergencyShelter[]): OverviewData['shelters'] {
  const byStatus = Object.fromEntries(SHELTER_STATUSES.map((s) => [s, 0])) as Record<
    ShelterStatus,
    number
  >;
  let capacity = 0;
  let occupancy = 0;
  let availablePlaces = 0;
  for (const s of shelters) {
    byStatus[s.status] += 1;
    if (s.status === 'CLOSED') continue;
    capacity += s.capacity;
    occupancy += s.currentOccupancy;
    availablePlaces += s.availableCapacity;
  }
  return { total: shelters.length, byStatus, capacity, occupancy, availablePlaces };
}

/** KPI cards and summaries for the Overview page. */
export async function loadOverview(): Promise<OverviewData> {
  const [pending, verified, recent, shelterSnap, eventSnap] = await Promise.all([
    getCountFromServer(query(reports(), where('status', '==', 'PENDING_VERIFICATION'))),
    getCountFromServer(query(reports(), where('status', 'in', ['VERIFIED', 'ESCALATED']))),
    getDocs(query(reports(), orderBy('createdAt', 'desc'), limit(5))),
    getDocs(collection(db, COLLECTIONS.shelters).withConverter(converters.shelters)),
    getDocs(collection(db, COLLECTIONS.disasterEvents).withConverter(converters.disasterEvents)),
  ]);

  const events = eventSnap.docs.map((d) => d.data());

  return {
    pendingReports: pending.data().count,
    verifiedReports: verified.data().count,
    recentReports: recent.docs.map((d) => d.data()),
    shelters: summariseShelters(shelterSnap.docs.map((d) => d.data())),
    activeEvents: events
      .filter((e) => e.status === 'ACTIVE')
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    completedEvents: events.filter((e) => e.status === 'COMPLETED').length,
    loadedAt: new Date().toISOString(),
  };
}
