import type { GeoPoint, HazardReport } from '../models';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points in kilometres (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface DuplicateCandidate {
  report: HazardReport;
  distanceKm: number;
  hoursApart: number;
}

/**
 * Other reports of the same hazard type, close in place and time — shown to the Duty Officer as a
 * duplicate indicator on the review screen (UC02). Nearest first.
 */
export function findPossibleDuplicates(
  report: HazardReport,
  candidates: readonly HazardReport[],
  { radiusKm = 1, windowHours = 24 }: { radiusKm?: number; windowHours?: number } = {},
): DuplicateCandidate[] {
  const created = Date.parse(report.createdAt);
  return candidates
    .filter((c) => c.reportId !== report.reportId && c.hazardType === report.hazardType)
    .map((c) => ({
      report: c,
      distanceKm: distanceKm(report.location, c.location),
      hoursApart: Math.abs(Date.parse(c.createdAt) - created) / 3_600_000,
    }))
    .filter((c) => c.distanceKm <= radiusKm && c.hoursApart <= windowHours)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
