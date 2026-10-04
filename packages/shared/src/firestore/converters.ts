import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type PartialWithFieldValue,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';

import type {
  AppUser,
  DisasterEvent,
  DisasterResponseReport,
  EmergencyShelter,
  HazardReport,
  NotificationRecord,
  ShelterAllocation,
  VerificationDecision,
  WarningRequest,
} from '../models';

/**
 * Model fields stored as Firestore `Timestamp` (D11). Matched by key at any depth, so nested
 * values such as `latestDecision.decidedAt` and `shares[].sharedAt` are converted too.
 * `clientCreatedAt` is intentionally absent: it stays the device's ISO string.
 */
export const TIMESTAMP_FIELDS: ReadonlySet<string> = new Set([
  'createdAt',
  'updatedAt',
  'decidedAt',
  'startedAt',
  'endedAt',
  'generatedAt',
  'sharedAt',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Firestore → model: every Timestamp becomes an ISO string. */
export function fromFirestoreData(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(fromFirestoreData);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fromFirestoreData(v)]));
  }
  return value;
}

/**
 * Model → Firestore: ISO strings in timestamp fields become Timestamps and `undefined` fields are
 * dropped (Firestore rejects them). FieldValues such as `serverTimestamp()` pass through unchanged.
 */
export function toFirestoreData(value: unknown, key?: string): unknown {
  if (typeof value === 'string' && key !== undefined && TIMESTAMP_FIELDS.has(key)) {
    return Timestamp.fromDate(new Date(value));
  }
  if (Array.isArray(value)) return value.map((item) => toFirestoreData(item));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, toFirestoreData(v, k)]),
    );
  }
  return value;
}

export function createConverter<T>(): FirestoreDataConverter<T, DocumentData> {
  return {
    toFirestore(model: PartialWithFieldValue<T>): DocumentData {
      return toFirestoreData(model) as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      // 'estimate' gives pending serverTimestamp() writes a local time instead of null.
      return fromFirestoreData(snapshot.data({ serverTimestamps: 'estimate', ...options })) as T;
    },
  };
}

/** One converter per collection, keyed like `COLLECTIONS`. */
export const converters = {
  users: createConverter<AppUser>(),
  hazardReports: createConverter<HazardReport>(),
  verificationDecisions: createConverter<VerificationDecision>(),
  warningRequests: createConverter<WarningRequest>(),
  shelters: createConverter<EmergencyShelter>(),
  shelterAllocations: createConverter<ShelterAllocation>(),
  disasterEvents: createConverter<DisasterEvent>(),
  responseReports: createConverter<DisasterResponseReport>(),
  notifications: createConverter<NotificationRecord>(),
};
