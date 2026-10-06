import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown };

/**
 * Runs `load` on mount and whenever `retry` is called. Pass a stable function
 * (module-level or memoised) so it does not reload on every render.
 */
export function useAsync<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ source: typeof load | null; state: AsyncState<T> }>({ source: null, state: { status: 'loading' } });

  useEffect(() => {
    let active = true;
    Promise.resolve().then(load).then(
      (data) => active && setSnapshot({ source: load, state: { status: 'success', data } }),
      (error: unknown) => active && setSnapshot({ source: load, state: { status: 'error', error } }),
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setSnapshot({ source: null, state: { status: 'loading' } });
    setAttempt((n) => n + 1);
  }, []);

  const state: AsyncState<T> = snapshot.source === load ? snapshot.state : { status: 'loading' };
  return { state, retry };
}
