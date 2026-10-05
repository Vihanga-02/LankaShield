import { AppError } from '@lankashield/shared';

const NETWORK_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'auth/network-request-failed',
  'storage/retry-limit-exceeded',
]);

/** True when an error means "no connection", so the report should be queued instead of lost. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) return error.code === 'NETWORK_ERROR';
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && NETWORK_CODES.has(code)) return true;
  return error instanceof Error && /network request failed/i.test(error.message);
}
