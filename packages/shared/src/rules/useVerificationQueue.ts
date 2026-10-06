import { useCallback, useEffect, useState } from 'react';
import type { HazardReport } from '../models';
import type { createVerificationService } from './verification.service';
import type { VerificationQueueStatusFilter } from './verificationQueue';

type QueueState =
  | { status: 'loading' }
  | { status: 'success'; data: HazardReport[] }
  | { status: 'error'; error: unknown };

/** Live reports with the given status; retry re-subscribes after an error. */
export function useVerificationQueue(
  subscribeToReportsByStatus: ReturnType<
    typeof createVerificationService
  >['subscribeToReportsByStatus'],
  status: VerificationQueueStatusFilter = 'PENDING_VERIFICATION',
) {
  const [state, setState] = useState<QueueState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(
    () =>
      subscribeToReportsByStatus(
        status,
        (data) => setState({ status: 'success', data }),
        (error) => setState({ status: 'error', error }),
      ),
    [subscribeToReportsByStatus, status, attempt],
  );
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);
  return { state, retry };
}
