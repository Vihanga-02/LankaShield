import { z } from 'zod';

import { VERIFICATION_OUTCOMES } from '../enums';
import { remarksRequired } from '../rules/verification';

const MIN_REQUIRED_REMARKS = 5;

/** UC02 decision form. Rejection requires remarks; the disaster event is optional (D6). */
export const verificationDecisionInputSchema = z
  .object({
    outcome: z.enum(VERIFICATION_OUTCOMES, { error: 'Choose a decision.' }),
    remarks: z.string().trim().max(500, { error: 'Remarks must be 500 characters or fewer.' }),
    /** Empty string or undefined means "no event". */
    disasterEventId: z.string().optional(),
  })
  .refine((v) => !remarksRequired(v.outcome) || v.remarks.length >= MIN_REQUIRED_REMARKS, {
    error: `Explain why the report is rejected (at least ${MIN_REQUIRED_REMARKS} characters).`,
    path: ['remarks'],
  });

export type VerificationDecisionInput = z.infer<typeof verificationDecisionInputSchema>;
