import { createVerificationService } from '@lankashield/shared/verification';
import { db } from './firebase';
export const {
  subscribeToReportsByStatus,
  subscribeToReport,
  loadReviewContext,
  submitVerificationDecision,
  subscribeToDecision,
  subscribeToWarnings,
  loadOfficerName,
  recordWarningDeliveryResult,
} = createVerificationService(db);
export type {
  ReviewContext,
  VerificationQueueStatusFilter,
} from '@lankashield/shared/verification';
