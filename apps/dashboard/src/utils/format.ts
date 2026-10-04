import type { IsoDateString } from '@lankashield/shared';

const dateTime = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const date = new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium' });

export const formatDateTime = (iso: IsoDateString) => dateTime.format(new Date(iso));
export const formatDate = (iso: IsoDateString) => date.format(new Date(iso));
export const formatNumber = (n: number) => n.toLocaleString('en-LK');
