import { APP_ERROR_MESSAGES } from './errors';

/** User-facing messages for Firebase Auth and Firestore error codes, shared by both apps. */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': APP_ERROR_MESSAGES.NETWORK_ERROR.message,
  'permission-denied': 'You do not have permission to do this. Sign in again.',
  unauthenticated: APP_ERROR_MESSAGES.UNAUTHENTICATED.message,
  unavailable: APP_ERROR_MESSAGES.NETWORK_ERROR.message,
  'deadline-exceeded': APP_ERROR_MESSAGES.NETWORK_ERROR.message,
};

/** Turns any thrown value into a message that can be shown to the user. */
export function toErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code in FIREBASE_ERROR_MESSAGES) {
    return FIREBASE_ERROR_MESSAGES[code];
  }
  if (error instanceof Error && error.name === 'AppError') return error.message;
  return APP_ERROR_MESSAGES.UNKNOWN_ERROR.message + ' Try again.';
}
