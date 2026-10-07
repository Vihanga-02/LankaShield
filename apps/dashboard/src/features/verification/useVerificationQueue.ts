import type { HazardReport, VerificationQueueStatusFilter } from '@lankashield/shared';
import { useCallback } from 'react';

import { useLive, type Subscribe } from '../../hooks/useLive';
import { subscribeToReportsByStatus } from './verification.service';

/** Live reports for a queue filter; `retry` re-subscribes after an error. */
export function useVerificationQueue(
  status: VerificationQueueStatusFilter = 'PENDING_VERIFICATION',
) {
  const subscribe = useCallback<Subscribe<HazardReport[]>>(
    (onData, onError) => subscribeToReportsByStatus(status, onData, onError),
    [status],
  );
  return useLive(subscribe);
}
