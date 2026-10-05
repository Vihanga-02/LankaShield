// Crockford-style alphabet without I, L, O and U so tracking IDs are easy to read aloud.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Client-generated tracking ID used as the Firestore document ID, e.g. `LS-20261005-7KQ2XM`.
 * Generated once per draft and reused on every retry, so a report is never created twice.
 */
export function generateReportId(
  now: Date = new Date(),
  random: () => number = Math.random,
): string {
  const day = now.toISOString().slice(0, 10).replaceAll('-', '');
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `LS-${day}-${suffix}`;
}

export const REPORT_ID_PATTERN = /^LS-\d{8}-[0-9A-HJKMNP-TV-Z]{6}$/;

/** Evidence IDs are positional, so re-uploading after a failure overwrites the same file. */
export function evidenceIdFor(index: number): string {
  return `ev-${index + 1}`;
}
