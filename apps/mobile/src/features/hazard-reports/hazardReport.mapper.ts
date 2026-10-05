import type {
  AppUser,
  HazardReport,
  HazardReportInput,
  MobileRole,
  SyncSource,
} from '@lankashield/shared';
import { serverTimestamp, type FieldValue } from 'firebase/firestore';

/** Firestore write shape: server timestamps for createdAt/updatedAt, ISO strings elsewhere. */
export type HazardReportWrite = Omit<HazardReport, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export interface BuildHazardReportArgs {
  reportId: string;
  input: HazardReportInput;
  reporter: Pick<AppUser, 'uid' | 'role'>;
  evidenceUrls: string[];
  /** When the citizen pressed Submit on the device (kept through offline sync). */
  clientCreatedAt: string;
  syncSource: SyncSource;
}

/** Maps the validated UC01 form to the `hazardReports/{reportId}` document. */
export function buildHazardReport({
  reportId,
  input,
  reporter,
  evidenceUrls,
  clientCreatedAt,
  syncSource,
}: BuildHazardReportArgs): HazardReportWrite {
  return {
    reportId,
    reporterId: reporter.uid,
    reporterRole: reporter.role as MobileRole,
    hazardType: input.hazardType,
    severity: input.severity,
    title: input.title,
    description: input.description,
    district: input.district,
    location: input.location,
    evidenceUrls,
    status: 'PENDING_VERIFICATION',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    clientCreatedAt,
    syncSource,
  };
}
