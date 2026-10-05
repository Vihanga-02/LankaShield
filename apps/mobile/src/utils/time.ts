import type { IsoDateString } from '@lankashield/shared';
import { format, formatDistanceToNowStrict } from 'date-fns';

export const timeAgo = (iso: IsoDateString) =>
  formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

export const formatDateTime = (iso: IsoDateString) => format(new Date(iso), 'd MMM yyyy, h:mm a');
