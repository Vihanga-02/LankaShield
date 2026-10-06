import type { HazardReport } from '@lankashield/shared';
import { useCallback } from 'react';

import { useLive, type Subscribe } from '../../hooks/useLive';
import { subscribeToReportsByStatus, type VerificationQueueStatus } from './verification.service';

/** Live reports with the given status; `retry` re-subscribes after an error. */
export function useVerificationQueue(status: VerificationQueueStatus = 'PENDING_VERIFICATION') {
  const subscribe = useCallback<Subscribe<HazardReport[]>>(
    (onData, onError) => subscribeToReportsByStatus(status, onData, onError),
    [status],
  );
  return useLive(subscribe);
}
