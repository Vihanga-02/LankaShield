import {
  COLLECTIONS,
  STORAGE_PATHS,
  type AnalyticsInput,
  type AnalyticsResult,
  type AppUser,
  type DisasterEvent,
  type DisasterResponseReport,
  type HazardReport,
  type ReportFilters,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '../../services/firebase';
import { withTimeout } from '../../utils/withTimeout';

const eventsCollection = () =>
  collection(db, COLLECTIONS.disasterEvents).withConverter(converters.disasterEvents);
const reportsCollection = () =>
  collection(db, COLLECTIONS.hazardReports).withConverter(converters.hazardReports);
const responseReportsCollection = () =>
  collection(db, COLLECTIONS.responseReports).withConverter(converters.responseReports);

/** All disaster events: active first, then most recent. */
export async function listEvents(): Promise<DisasterEvent[]> {
  const snap = await getDocs(eventsCollection());
  return snap.docs
    .map((d) => d.data())
    .sort(
      (a, b) =>
        Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') ||
        b.startedAt.localeCompare(a.startedAt),
    );
}

export async function getEvent(eventId: string): Promise<DisasterEvent | null> {
  const snap = await getDoc(doc(eventsCollection(), eventId));
  return snap.exists() ? snap.data() : null;
}

async function loadReports(event: DisasterEvent): Promise<HazardReport[]> {
  // Reports linked to the event plus all reports in its district (to find unreviewed ones).
  const [linked, inDistrict] = await Promise.all([
    getDocs(query(reportsCollection(), where('disasterEventId', '==', event.eventId))),
    getDocs(query(reportsCollection(), where('district', '==', event.district))),
  ]);
  const byId = new Map<string, HazardReport>();
  [...linked.docs, ...inDistrict.docs].forEach((d) => byId.set(d.id, d.data()));
  return [...byId.values()];
}

const settled = <T>(result: PromiseSettledResult<T>): T | null =>
  result.status === 'fulfilled' ? result.value : null;

/**
 * Loads every source for UC04. A source that fails becomes `null`, so its metric is reported as
 * missing and the report stays PROVISIONAL instead of the whole analysis failing (§14).
 */
export async function loadAnalyticsSources(
  event: DisasterEvent,
): Promise<
  Pick<
    AnalyticsInput,
    'reports' | 'alerts' | 'citizenReach' | 'occupancySnapshots' | 'resourceDistributions'
  >
> {
  const [reports, alerts, citizenReach, occupancySnapshots, resourceDistributions] =
    await Promise.allSettled([
      loadReports(event),
      getDocs(
        query(
          collection(db, COLLECTIONS.eventAlerts).withConverter(converters.eventAlerts),
          where('disasterEventId', '==', event.eventId),
        ),
      ).then((s) => s.docs.map((d) => d.data())),
      getDocs(
        query(
          collection(db, COLLECTIONS.citizenReach).withConverter(converters.citizenReach),
          where('disasterEventId', '==', event.eventId),
        ),
      ).then((s) => s.docs.map((d) => d.data())),
      getDocs(
        query(
          collection(db, COLLECTIONS.shelterOccupancyHistory).withConverter(
            converters.shelterOccupancyHistory,
          ),
          where('disasterEventId', '==', event.eventId),
        ),
      ).then((s) => s.docs.map((d) => d.data())),
      getDocs(
        query(
          collection(db, COLLECTIONS.resourceDistributions).withConverter(
            converters.resourceDistributions,
          ),
          where('disasterEventId', '==', event.eventId),
        ),
      ).then((s) => s.docs.map((d) => d.data())),
    ]);

  return {
    reports: settled(reports),
    alerts: settled(alerts),
    citizenReach: settled(citizenReach),
    occupancySnapshots: settled(occupancySnapshots),
    resourceDistributions: settled(resourceDistributions),
  };
}

/** Saves the generated report's metadata to `responseReports` (§10.4). */
/** A new `responseReports` document ID, chosen before the first save attempt. */
export function newResponseReportId(): string {
  return doc(responseReportsCollection()).id;
}

/**
 * Saves the report under `responseReportId`. The caller keeps the same ID for every retry, so a
 * save that timed out but still reaches Firestore later is overwritten, never duplicated.
 */
export async function saveResponseReport({
  responseReportId,
  event,
  result,
  filters,
  analyst,
}: {
  responseReportId: string;
  event: DisasterEvent;
  result: AnalyticsResult;
  filters: ReportFilters;
  analyst: Pick<AppUser, 'uid'>;
}): Promise<string> {
  const ref = doc(responseReportsCollection(), responseReportId);
  await withTimeout(
    setDoc(ref, {
      responseReportId: ref.id,
      eventId: event.eventId,
      generatedBy: analyst.uid,
      status: result.status,
      filters,
      metrics: result.values,
      missingMetrics: result.missingMetrics,
      generatedAt: serverTimestamp(),
      shares: [],
    }),
    20_000,
    'Saving the report took too long. Check your connection and retry.',
  );
  return ref.id;
}

/** Uploads the exported PDF to `generated-reports/{id}/report.pdf` and records its URL. */
export async function uploadReportPdf(responseReportId: string, pdf: Blob): Promise<string> {
  const fileRef = ref(storage, STORAGE_PATHS.generatedReport(responseReportId));
  await withTimeout(
    uploadBytes(fileRef, pdf, { contentType: 'application/pdf' }),
    30_000,
    'Uploading the PDF took too long. Check your connection and retry.',
  );
  const url = await withTimeout(getDownloadURL(fileRef), 15_000);
  await updateDoc(doc(db, COLLECTIONS.responseReports, responseReportId), { exportedUrl: url });
  return url;
}

/** Records a (mocked) authorised share of a FINAL report with a donor organisation. */
export async function recordShare(
  responseReportId: string,
  organisation: string,
  analyst: Pick<AppUser, 'uid'>,
): Promise<void> {
  await withTimeout(
    updateDoc(doc(db, COLLECTIONS.responseReports, responseReportId), {
      // serverTimestamp() is not allowed inside arrays.
      shares: arrayUnion({ organisation, sharedBy: analyst.uid, sharedAt: Timestamp.now() }),
    }),
    20_000,
  );
}

/** Live list of reports already generated for an event, newest first. */
export function subscribeToResponseReports(
  eventId: string,
  onData: (reports: DisasterResponseReport[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(responseReportsCollection(), where('eventId', '==', eventId)),
    (snap) =>
      onData(
        snap.docs.map((d) => d.data()).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
      ),
    onError,
  );
}
