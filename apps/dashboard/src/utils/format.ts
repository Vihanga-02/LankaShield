import type { IsoDateString } from '@lankashield/shared';

const dateTime = new Intl.DateTimeFormat('en-LK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const date = new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium' });

export const formatDateTime = (iso: IsoDateString) => dateTime.format(new Date(iso));
export const formatDate = (iso: IsoDateString) => date.format(new Date(iso));
export const formatNumber = (n: number) => n.toLocaleString('en-LK');

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "5 minutes ago", "yesterday" — used for report age in the verification queue. */
export function formatRelative(iso: IsoDateString, now: number = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}
