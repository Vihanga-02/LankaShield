import { AppError } from '@lankashield/shared';

/**
 * Rejects with NETWORK_ERROR if the promise does not settle in time. Firestore writes made while
 * the connection drops never reject on their own, so every network step is wrapped in this.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError('NETWORK_ERROR', message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
