import { z } from 'zod';

import { districtSchema } from './common';

/** UC04 analytics filters. Dates are calendar days (YYYY-MM-DD). */
export const reportFiltersInputSchema = z
  .object({
    eventId: z.string().min(1, { error: 'Select a disaster event.' }),
    district: districtSchema.optional(),
    from: z.iso.date({ error: 'Enter a valid start date.' }).optional(),
    to: z.iso.date({ error: 'Enter a valid end date.' }).optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    error: 'End date must be on or after the start date.',
    path: ['to'],
  });

export type ReportFiltersInput = z.infer<typeof reportFiltersInputSchema>;
