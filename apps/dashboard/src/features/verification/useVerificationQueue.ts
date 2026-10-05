import type { HazardReport } from '@lankashield/shared';
import { useCallback, useEffect, useState } from 'react';

import type { AsyncState } from '../../hooks/useAsync';
import { subscribeToPendingReports } from './verification.service';

/** Live pending-verification reports; `retry` re-subscribes after an error. */
export function useVerificationQueue() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AsyncState<HazardReport[]>>({ status: 'loading' });

  useEffect(
    () =>
      subscribeToPendingReports(
        (data) => setState({ status: 'success', data }),
        (error) => setState({ status: 'error', error }),
      ),
    [attempt],
  );

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
