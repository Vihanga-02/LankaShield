import {
  alertLevelFor,
  AppError,
  COLLECTIONS,
  isMobileRole,
  missingRecipients,
  warningExpiry,
  warningNotificationId,
  warningRecipients,
  type AppUser,
  type DisasterEvent,
  type HazardReport,
  type Warning,
  type WarningInput,
  type WarningRequest,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../../services/firebase';
import { withTimeout } from '../../utils/withTimeout';

const warningsCollection = () =>
  collection(db, COLLECTIONS.warnings).withConverter(converters.warnings);
const requestRef = (id: string) =>
  doc(db, COLLECTIONS.warningRequests, id).withConverter(converters.warningRequests);
const newestFirst = <T extends { createdAt?: string; issuedAt?: string }>(a: T, b: T) =>
  (b.issuedAt ?? b.createdAt ?? '').localeCompare(a.issuedAt ?? a.createdAt ?? '');

/** Writes per batch; Firestore allows 500 operations, one is the warning's counter update. */
const BATCH_SIZE = 400;
const WRITE_TIMEOUT_MS = 20_000;

/** Live warning requests created by escalated reports that nobody has handled yet. */
export function subscribeToPendingRequests(
  onData: (requests: WarningRequest[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, COLLECTIONS.warningRequests).withConverter(converters.warningRequests),
      where('status', '==', 'PENDING_ASSESSMENT'),
    ),
    (snap) => onData(snap.docs.map((d) => d.data()).sort(newestFirst)),
    onError,
  );
}

/** Live list of sent warnings, newest first. */
export function subscribeToWarnings(
  onData: (warnings: Warning[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    warningsCollection(),
    (snap) => onData(snap.docs.map((d) => d.data()).sort(newestFirst)),
    onError,
  );
}

/** Citizens and volunteers, for the recipient count and the "no district set" count. */
export async function loadMobileUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.users).withConverter(converters.users));
  return snap.docs.map((d) => d.data()).filter((u) => isMobileRole(u.role));
}

export async function loadActiveEvents(): Promise<DisasterEvent[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.disasterEvents).withConverter(converters.disasterEvents),
      where('status', '==', 'ACTIVE'),
    ),
  );
  return snap.docs.map((d) => d.data());
}

export async function loadReport(reportId: string): Promise<HazardReport | null> {
  const snap = await getDoc(
    doc(db, COLLECTIONS.hazardReports, reportId).withConverter(converters.hazardReports),
  );
  return snap.exists() ? snap.data() : null;
}

/** Writes one WARNING notification per recipient in batches, counting them on the warning. */
async function deliver(warning: Warning, recipients: readonly AppUser[]): Promise<number> {
  let delivered = 0;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const user of chunk) {
      batch.set(
        doc(db, COLLECTIONS.notifications, warningNotificationId(warning.warningId, user.uid)),
        {
          notificationId: warningNotificationId(warning.warningId, user.uid),
          recipientId: user.uid,
          type: 'WARNING',
          title: warning.title,
          body: warning.message,
          relatedEntityId: warning.warningId,
          read: false,
          deliveryStatus: 'SENT',
          severity: warning.severity,
          expiresAt: new Date(warning.expiresAt),
          createdAt: serverTimestamp(),
        },
      );
    }
    batch.update(doc(db, COLLECTIONS.warnings, warning.warningId), {
      deliveredCount: increment(chunk.length),
    });
    await withTimeout(batch.commit(), WRITE_TIMEOUT_MS);
    delivered += chunk.length;
  }
  return delivered;
}

/** Records the warning's reach for analytics when it belongs to a disaster event (`citizenReach`). */
async function recordReach(warning: Warning, delivered: number): Promise<void> {
  if (!warning.disasterEventId) return;
  await withTimeout(
    setDoc(
      doc(db, COLLECTIONS.citizenReach, warning.warningId),
      {
        reachId: warning.warningId,
        disasterEventId: warning.disasterEventId,
        district: warning.district,
        gsDivision: 'All divisions (in-app warning)',
        citizensReached: delivered,
        recordedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    WRITE_TIMEOUT_MS,
  );
}

export interface SendResult {
  warningId: string;
  delivered: number;
  recipients: number;
}

/**
 * Sends a warning (D49): saves `warnings/{id}`, marks the source request APPROVED, records an
 * `eventAlerts` entry when linked to an event, then writes one WARNING notification per recipient.
 * If the send stops part-way, the warning shows fewer delivered than targeted and `resendWarning`
 * completes it without duplicates.
 */
export async function sendWarning({
  input,
  officer,
  recipients,
  request,
  hazardType,
}: {
  input: WarningInput;
  officer: Pick<AppUser, 'uid' | 'fullName'>;
  recipients: readonly AppUser[];
  request?: WarningRequest;
  hazardType?: Warning['hazardType'];
}): Promise<SendResult> {
  if (recipients.length === 0) {
    throw new AppError('VALIDATION_FAILED', `No citizens or volunteers live in ${input.district}.`);
  }
  const ref = doc(warningsCollection());
  const now = new Date();
  const warning: Warning = {
    warningId: ref.id,
    title: input.title.trim(),
    message: input.message.trim(),
    severity: input.severity,
    district: input.district,
    hazardType: hazardType ?? request?.hazardType,
    disasterEventId: input.disasterEventId || undefined,
    warningRequestId: request?.warningRequestId,
    sourceReportId: request?.sourceReportId,
    issuedBy: officer.uid,
    issuedByName: officer.fullName,
    issuedAt: now.toISOString(),
    expiresAt: warningExpiry(now, input.durationHours),
    recipientCount: recipients.length,
    deliveredCount: 0,
  };

  const batch = writeBatch(db);
  batch.set(ref, warning);
  if (request) {
    batch.update(requestRef(request.warningRequestId), {
      status: 'APPROVED',
      warningId: warning.warningId,
      reviewedBy: officer.uid,
      reviewedAt: serverTimestamp(),
    });
  }
  if (warning.disasterEventId) {
    batch.set(doc(db, COLLECTIONS.eventAlerts, warning.warningId), {
      alertId: warning.warningId,
      disasterEventId: warning.disasterEventId,
      level: alertLevelFor(warning.severity),
      district: warning.district,
      issuedAt: serverTimestamp(),
      acknowledged: false,
    });
  }
  await withTimeout(batch.commit(), WRITE_TIMEOUT_MS);

  const delivered = await deliver(warning, recipients);
  await recordReach(warning, delivered);
  return { warningId: warning.warningId, delivered, recipients: recipients.length };
}

/**
 * Completes an interrupted send: notifies the warning's district residents who do not have it yet
 * (by notification ID), so nobody gets it twice.
 */
export async function resendWarning(warning: Warning, users: readonly AppUser[]): Promise<number> {
  const existing = await getDocs(
    query(
      collection(db, COLLECTIONS.notifications).withConverter(converters.notifications),
      where('relatedEntityId', '==', warning.warningId),
    ),
  );
  const notified = new Set(existing.docs.map((d) => d.data().recipientId));
  const missing = missingRecipients(warningRecipients(users, warning.district), notified);
  await withTimeout(
    updateDoc(doc(db, COLLECTIONS.warnings, warning.warningId), {
      recipientCount: notified.size + missing.length,
      deliveredCount: notified.size,
    }),
    WRITE_TIMEOUT_MS,
  );
  const delivered = await deliver(warning, missing);
  await recordReach(warning, notified.size + delivered);
  return delivered;
}

/** Declines an escalated report's warning request with a reason. */
export async function declineRequest(
  request: WarningRequest,
  reason: string,
  officer: Pick<AppUser, 'uid'>,
): Promise<void> {
  await withTimeout(
    updateDoc(requestRef(request.warningRequestId), {
      status: 'DECLINED',
      declineReason: reason.trim(),
      reviewedBy: officer.uid,
      reviewedAt: serverTimestamp(),
    }),
    WRITE_TIMEOUT_MS,
  );
}
