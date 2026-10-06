import { z } from 'zod';
import { STAKEHOLDERS } from '../models/stakeholderNotification';

export const stakeholderNotificationInputSchema = z.object({
  stakeholders: z.array(z.enum(STAKEHOLDERS)).min(1, 'Select at least one stakeholder.').max(STAKEHOLDERS.length),
  title: z.string().trim().min(1, 'Enter a notification title.').max(160),
  message: z.string().trim().min(1, 'Enter a message.').max(2000),
});
export type StakeholderNotificationInput = z.infer<typeof stakeholderNotificationInputSchema>;
