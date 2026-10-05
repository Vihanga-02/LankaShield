import type { HazardReport } from '@lankashield/shared';
import { useCallback, useEffect, useState } from 'react';

import { subscribeToReport } from '../hazardReport.service';
import type { LiveState } from './useMyReports';

/** Live single report; `data` is null when the report does not exist. */
export function useHazardReport(reportId: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LiveState<HazardReport | null>>({ status: 'loading' });

  useEffect(() => {
    if (!reportId) return;
    return subscribeToReport(
      reportId,
      (data) => setState({ status: 'success', data }),
      (error) => setState({ status: 'error', error }),
    );
  }, [reportId, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
