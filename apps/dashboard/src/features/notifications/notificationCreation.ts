import { COLLECTIONS, stakeholderNotificationInputSchema, canSendStakeholderNotifications, type StakeholderNotificationInput } from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
/** Save first, then send separately so a delivery failure never loses the composed message. */
export async function createStakeholderNotification(
  reportId: string,
  input: StakeholderNotificationInput,
): Promise<string> {
  const content = stakeholderNotificationInputSchema.parse(input);
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to create notifications.');
  const outboxRef = doc(collection(db, COLLECTIONS.stakeholderNotifications).withConverter(converters.stakeholderNotifications));
  const warningRef = doc(collection(db, COLLECTIONS.warningRequests));
  return runTransaction(db, async (tx) => {
    const officer = await tx.get(doc(db, COLLECTIONS.users, uid).withConverter(converters.users));
    const report = await tx.get(
      doc(db, COLLECTIONS.hazardReports, reportId).withConverter(converters.hazardReports),
    );
    if (
      !officer.exists() || !canSendStakeholderNotifications(officer.data())
    )
      throw new Error('Only active Duty Officers and DMC Analysts can create notifications.');
    if (!report.exists() || !['VERIFIED', 'ESCALATED'].includes(report.data().status))
      throw new Error('Select a verified report.');
    const hazard = report.data();
    tx.set(warningRef.withConverter(converters.warningRequests), {
      warningRequestId: warningRef.id,
      sourceReportId: reportId,
      requestedBy: uid,
      hazardType: hazard.hazardType,
      severity: hazard.severity,
      affectedDistrict: hazard.district,
      status: 'PENDING_ASSESSMENT',
      deliveryStatus: 'PENDING',
      createdAt: serverTimestamp(),
    });
    tx.set(outboxRef, {
      notificationId: outboxRef.id,
      reportId,
      reportTitle: hazard.title,
      hazardType: hazard.hazardType,
      district: hazard.district,
      warningRequestId: warningRef.id,
      stakeholders: [...new Set(content.stakeholders)],
      title: content.title,
      message: content.message,
      createdBy: uid,
      officerName: officer.data().fullName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deliveryStatus: 'PENDING',
      sendRequested: false,
      attemptCount: 0,
    });
    return outboxRef.id;
  });
}
