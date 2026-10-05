import type { Unsubscribe } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import type { AsyncState } from './useAsync';

export type Subscribe<T> = (
  onData: (data: T) => void,
  onError: (error: unknown) => void,
) => Unsubscribe;

/**
 * Live Firestore subscription state. Pass a memoised `subscribe` (useCallback) — it re-subscribes
 * whenever it changes, or when `retry` is called after an error. `null` means "not ready yet".
 */
export function useLive<T>(subscribe: Subscribe<T> | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    if (!subscribe) return;
    return subscribe(
      (data) => setState({ status: 'success', data }),
      (error) => setState({ status: 'error', error }),
    );
  }, [subscribe, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
