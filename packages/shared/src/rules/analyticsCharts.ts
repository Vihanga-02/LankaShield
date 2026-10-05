import { HAZARD_TYPE_LABELS } from '../constants/labels';
import { HAZARD_TYPES } from '../enums';
import type { EmergencyShelter, HazardReport } from '../models';

export interface CountDatum {
  label: string;
  count: number;
}

/** Reports per calendar day (UTC), every day in the range present so gaps show as zero. */
export function reportsByDay(reports: readonly HazardReport[]): { day: string; count: number }[] {
  if (reports.length === 0) return [];
  const counts = new Map<string, number>();
  for (const r of reports) {
    const day = r.createdAt.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const days = [...counts.keys()].sort();
  const result: { day: string; count: number }[] = [];
  for (let d = new Date(`${days[0]}T00:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    result.push({ day, count: counts.get(day) ?? 0 });
    if (day >= days[days.length - 1]) break;
  }
  return result;
}

/** Reports per hazard type, largest first; types with no reports are omitted. */
export function reportsByHazardType(reports: readonly HazardReport[]): CountDatum[] {
  return HAZARD_TYPES.map((type) => ({
    label: HAZARD_TYPE_LABELS[type],
    count: reports.filter((r) => r.hazardType === type).length,
  }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}

const OUTCOME_ROWS = [
  { label: 'Verified', statuses: ['VERIFIED'] },
  { label: 'Escalated', statuses: ['ESCALATED'] },
  { label: 'Rejected', statuses: ['REJECTED'] },
  { label: 'Pending', statuses: ['PENDING_VERIFICATION'] },
] as const;

/** Verification outcome counts in a fixed order, so the chart never reorders between runs. */
export function verificationOutcomes(reports: readonly HazardReport[]): CountDatum[] {
  return OUTCOME_ROWS.map(({ label, statuses }) => ({
    label,
    count: reports.filter((r) => (statuses as readonly string[]).includes(r.status)).length,
  }));
}

export interface OccupancyDatum {
  district: string;
  occupancy: number;
  capacity: number;
  /** 0–100 */
  rate: number;
}

/** Occupancy against capacity per district for open shelters, busiest first. */
export function occupancyByDistrict(shelters: readonly EmergencyShelter[]): OccupancyDatum[] {
  const byDistrict = new Map<string, { occupancy: number; capacity: number }>();
  for (const s of shelters) {
    if (s.status === 'CLOSED') continue;
    const row = byDistrict.get(s.district) ?? { occupancy: 0, capacity: 0 };
    row.occupancy += s.currentOccupancy;
    row.capacity += s.capacity;
    byDistrict.set(s.district, row);
  }
  return [...byDistrict.entries()]
    .map(([district, { occupancy, capacity }]) => ({
      district,
      occupancy,
      capacity,
      rate: capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
}
