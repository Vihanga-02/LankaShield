import type { HazardReport } from '@lankashield/shared';
import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/store/authStore';

import { subscribeToMyReports } from '../hazardReport.service';

export type LiveState<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown };

/** Live list of the signed-in user's hazard reports. `retry` re-subscribes after an error. */
export function useMyReports() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LiveState<HazardReport[]>>({ status: 'loading' });

  useEffect(() => {
    if (!uid) return;
    return subscribeToMyReports(
      uid,
      (data) => setState({ status: 'success', data }),
      (error) => setState({ status: 'error', error }),
    );
  }, [uid, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
