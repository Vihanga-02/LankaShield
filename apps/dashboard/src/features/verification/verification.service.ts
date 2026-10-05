import { COLLECTIONS, type HazardReport } from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';

import { db } from '../../services/firebase';

const newestFirst = (a: HazardReport, b: HazardReport) => b.createdAt.localeCompare(a.createdAt);

/** Live queue of reports waiting for a decision (UC02), newest first. */
export function subscribeToPendingReports(
  onData: (reports: HazardReport[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  // Sorted in the browser so the query needs no composite index.
  const q = query(
    collection(db, COLLECTIONS.hazardReports).withConverter(converters.hazardReports),
    where('status', '==', 'PENDING_VERIFICATION'),
  );
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data()).sort(newestFirst)), onError);
}
