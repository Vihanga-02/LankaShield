export const APP_ERROR_CODES = [
  'UNAUTHENTICATED',
  'VALIDATION_FAILED',
  'REPORT_NOT_FOUND',
  'ALREADY_VERIFIED',
  'INSUFFICIENT_CAPACITY',
  'INCOMPLETE_DATA',
  'NETWORK_ERROR',
  'UNKNOWN_ERROR',
] as const;
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/** User-facing message and recovery action for every error code (§10.6). */
export const APP_ERROR_MESSAGES: Record<AppErrorCode, { message: string; action: string }> = {
  UNAUTHENTICATED: {
    message: 'Your session has expired.',
    action: 'Sign in again to continue.',
  },
  VALIDATION_FAILED: {
    message: 'Some fields are missing or invalid.',
    action: 'Correct the highlighted fields and try again.',
  },
  REPORT_NOT_FOUND: {
    message: 'This hazard report could not be found.',
    action: 'Return to the list and refresh.',
  },
  ALREADY_VERIFIED: {
    message: 'This report has already been reviewed by another officer.',
    action: 'Refresh to see the recorded decision.',
  },
  INSUFFICIENT_CAPACITY: {
    message: 'The selected shelter does not have enough available places.',
    action: 'Reduce the evacuee count or choose an alternative shelter.',
  },
  INCOMPLETE_DATA: {
    message: 'Some metrics could not be calculated.',
    action: 'Review the missing metrics. The report stays provisional until they are available.',
  },
  NETWORK_ERROR: {
    message: 'Unable to reach the server.',
    action: 'Check your connection and retry.',
  },
  UNKNOWN_ERROR: {
    message: 'Something went wrong.',
    action: 'Try again. If the problem continues, contact support.',
  },
};

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message?: string) {
    super(message ?? APP_ERROR_MESSAGES[code].message);
    this.name = 'AppError';
    this.code = code;
  }
}
