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
  const [snapshot, setSnapshot] = useState<{ source: Subscribe<T> | null; state: AsyncState<T> }>({
    source: null,
    state: { status: 'loading' },
  });

  useEffect(() => {
    if (!subscribe) return;
    let active = true;
    const unsubscribe = subscribe(
      (data) => active && setSnapshot({ source: subscribe, state: { status: 'success', data } }),
      (error) => active && setSnapshot({ source: subscribe, state: { status: 'error', error } }),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [subscribe, attempt]);

  const retry = useCallback(() => {
    setSnapshot({ source: null, state: { status: 'loading' } });
    setAttempt((n) => n + 1);
  }, []);

  const state: AsyncState<T> =
    snapshot.source === subscribe ? snapshot.state : { status: 'loading' };
  return { state, retry };
}
