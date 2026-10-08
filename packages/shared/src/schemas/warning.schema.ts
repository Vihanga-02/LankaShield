import { z } from 'zod';

import { SEVERITIES } from '../enums';
import { districtSchema } from './common';

/** How long a warning stays active, in hours (the "Active for" choice on the dashboard). */
export const WARNING_DURATION_HOURS = [6, 12, 24, 48, 72, 168] as const;

/** District Officer warning form (D49): one district per warning. */
export const warningInputSchema = z.object({
  district: districtSchema,
  severity: z.enum(SEVERITIES, { error: 'Select a severity.' }),
  title: z
    .string()
    .trim()
    .min(5, { error: 'Title must be at least 5 characters.' })
    .max(100, { error: 'Title must be 100 characters or fewer.' }),
  message: z
    .string()
    .trim()
    .min(10, { error: 'Write the warning message (at least 10 characters).' })
    .max(500, { error: 'Message must be 500 characters or fewer.' }),
  durationHours: z
    .number({ error: 'Choose how long the warning stays active.' })
    .int()
    .min(1)
    .max(168, { error: 'A warning can stay active for at most 7 days.' }),
  /** Empty string or undefined means "no event". */
  disasterEventId: z.string().optional(),
});

/** Declining an escalated report's warning request needs a reason. */
export const declineWarningRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, { error: 'Explain why no warning is sent (at least 5 characters).' })
    .max(300, { error: 'Reason must be 300 characters or fewer.' }),
});

export type WarningInput = z.infer<typeof warningInputSchema>;
export type DeclineWarningRequestInput = z.infer<typeof declineWarningRequestSchema>;
