/**
 * ISO-8601 timestamp string. Firestore stores `Timestamp` values; each app maps them
 * to ISO strings at the data boundary so models stay serialisable (SQLite, Zustand, JSON).
 */
export type IsoDateString = string;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
