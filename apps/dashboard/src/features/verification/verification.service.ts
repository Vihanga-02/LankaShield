import {
  AppError,
  assertCanReceiveDecision,
  COLLECTIONS,
  createsWarningRequest,
  findPossibleDuplicates,
  OUTCOME_TO_REPORT_STATUS,
  verificationNotificationText,
  verificationDecisionInputSchema,
  type VerificationDecision,
  type WarningRequest,
  type AppUser,
  type DisasterEvent,
  type DuplicateCandidate,
  type HazardReport,
  type HazardReportStatus,
  type VerificationDecisionInput,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../../services/firebase';

const reports = () =>
  collection(db, COLLECTIONS.hazardReports).withConverter(converters.hazardReports);
const reportRef = (id: string) =>
  doc(db, COLLECTIONS.hazardReports, id).withConverter(converters.hazardReports);

const newestFirst = (a: HazardReport, b: HazardReport) => b.createdAt.localeCompare(a.createdAt);

export type VerificationQueueStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'ALL';

/** Live list of reports with one status (default: waiting for a decision), newest first. */
export function subscribeToReportsByStatus(
  status: VerificationQueueStatus,
  onData: (reports: HazardReport[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  // Sorted in the browser so the query needs no composite index.
  const statuses: HazardReportStatus[] =
    status === 'ALL'
      ? ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'ESCALATED']
      : status === 'VERIFIED'
        ? ['VERIFIED', 'ESCALATED']
        : [status];
  const q = query(reports(), where('status', 'in', statuses));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => d.data()).sort(newestFirst)), onError);
}

export function subscribeToReport(
  reportId: string,
  onData: (report: HazardReport | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(reportRef(reportId), (s) => onData(s.exists() ? s.data() : null), onError);
}

export interface ReviewContext {
  reporter: AppUser | null;
  duplicates: DuplicateCandidate[];
  /** Events in the report's district: active first, then most recent. */
  events: DisasterEvent[];
}

/** Reporter profile, possible duplicates and selectable disaster events for the review screen. */
export async function loadReviewContext(report: HazardReport): Promise<ReviewContext> {
  const [reporterSnap, sameDistrict, eventSnap] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.users, report.reporterId).withConverter(converters.users)),
    getDocs(query(reports(), where('district', '==', report.district))),
    getDocs(
      query(
        collection(db, COLLECTIONS.disasterEvents).withConverter(converters.disasterEvents),
        where('district', '==', report.district),
      ),
    ),
  ]);
  const events = eventSnap.docs
    .map((d) => d.data())
    .sort(
      (a, b) =>
        Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') ||
        b.startedAt.localeCompare(a.startedAt),
    );
  return {
    reporter: reporterSnap.exists() ? reporterSnap.data() : null,
    duplicates: findPossibleDuplicates(
      report,
      sameDistrict.docs.map((d) => d.data()),
    ),
    events,
  };
}

/**
 * Records a UC02 decision atomically (§10.2): decision, report status + latestDecision (D7),
 * warning request when escalated, and the reporter's in-app notification. Runs as a transaction,
 * so the "still pending?" check and the writes cannot interleave with another officer's decision.
 */
export async function submitVerificationDecision({
  reportId,
  officer,
  input,
}: {
  reportId: string;
  officer: Pick<AppUser, 'uid' | 'fullName'>;
  input: VerificationDecisionInput;
}): Promise<{ decisionId: string }> {
  input = verificationDecisionInputSchema.parse(input);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(reportRef(reportId));
    if (!snap.exists()) throw new AppError('REPORT_NOT_FOUND');
    const report = snap.data();
    assertCanReceiveDecision(report.status);

    const remarks = input.remarks.trim();
    const disasterEventId = input.disasterEventId || undefined;
    const decisionRef = doc(collection(db, COLLECTIONS.verificationDecisions));
    const decisionId = decisionRef.id;

    tx.set(decisionRef.withConverter(converters.verificationDecisions), {
      decisionId,
      reportId,
      officerId: officer.uid,
      officerName: officer.fullName,
      outcome: input.outcome,
      remarks,
      disasterEventId,
      decidedAt: serverTimestamp(),
      notificationStatus: 'SENT',
    });

    // update() bypasses the converter, so only defined fields are written.
    tx.update(reportRef(reportId), {
      status: OUTCOME_TO_REPORT_STATUS[input.outcome],
      ...(disasterEventId ? { disasterEventId } : {}),
      latestDecision: {
        decisionId,
        officerId: officer.uid,
        officerName: officer.fullName,
        outcome: input.outcome,
        remarks,
        decidedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    if (createsWarningRequest(input.outcome)) {
      const warningRef = doc(collection(db, COLLECTIONS.warningRequests));
      tx.set(warningRef.withConverter(converters.warningRequests), {
        warningRequestId: warningRef.id,
        sourceReportId: reportId,
        requestedBy: officer.uid,
        hazardType: report.hazardType,
        severity: report.severity,
        affectedDistrict: report.district,
        status: 'PENDING_ASSESSMENT',
        deliveryStatus: 'PENDING',
        createdAt: serverTimestamp(),
      });
      const notification = input.stakeholderNotification!;
      const outboxRef = doc(collection(db, COLLECTIONS.stakeholderNotifications));
      tx.set(outboxRef.withConverter(converters.stakeholderNotifications), {
        notificationId: outboxRef.id,
        reportId,
        reportTitle: report.title,
        hazardType: report.hazardType,
        district: report.district,
        warningRequestId: warningRef.id,
        stakeholders: [...new Set(notification.stakeholders)],
        title: notification.title,
        message: notification.message,
        createdBy: officer.uid,
        officerName: officer.fullName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deliveryStatus: 'PENDING',
        sendRequested: false,
        attemptCount: 0,
      });
    }

    const notificationRef = doc(collection(db, COLLECTIONS.notifications));
    tx.set(notificationRef.withConverter(converters.notifications), {
      notificationId: notificationRef.id,
      recipientId: report.reporterId,
      type: 'VERIFICATION_RESULT',
      ...verificationNotificationText(input.outcome, report.title, remarks),
      relatedEntityId: reportId,
      read: false,
      // The in-app record is the delivery channel, created in the same commit.
      deliveryStatus: 'SENT',
      createdAt: serverTimestamp(),
    });

    return { decisionId };
  });
}

/** Live audit records and delivery results persisted by the warning sender. */
export function subscribeToDecision(
  decisionId: string,
  onData: (decision: VerificationDecision | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.verificationDecisions, decisionId).withConverter(
      converters.verificationDecisions,
    ),
    (snap) => onData(snap.exists() ? snap.data() : null),
    onError,
  );
}
export function subscribeToWarnings(
  reportId: string,
  onData: (warnings: WarningRequest[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.warningRequests).withConverter(converters.warningRequests),
      where('sourceReportId', '==', reportId),
    ),
    (snap) => onData(snap.docs.map((d) => d.data())),
    onError,
  );
}
export async function loadOfficerName(officerId: string): Promise<string> {
  const snap = await getDoc(doc(db, COLLECTIONS.users, officerId).withConverter(converters.users));
  return snap.exists() ? snap.data().fullName : officerId;
}

/** Called only with a real delivery result; never by the verification submit action. */
export async function recordWarningDeliveryResult(
  warningRequestId: string,
  result: 'SENT' | 'FAILED',
): Promise<void> {
  if (result !== 'SENT' && result !== 'FAILED') throw new AppError('VALIDATION_FAILED');
  const ref = doc(db, COLLECTIONS.warningRequests, warningRequestId).withConverter(
    converters.warningRequests,
  );
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new AppError('INCOMPLETE_DATA', 'Warning request not found.');
    // A late failure from an earlier attempt must not overwrite confirmed delivery.
    if (snap.data().deliveryStatus === 'SENT') return;
    tx.update(ref, { deliveryStatus: result, updatedAt: serverTimestamp() });
  });
}
