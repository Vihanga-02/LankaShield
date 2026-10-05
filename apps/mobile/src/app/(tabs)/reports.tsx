import { toErrorMessage, type HazardReportStatus } from '@lankashield/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { OptionChips } from '@/features/hazard-reports/components/OptionChips';
import { ReportCard } from '@/features/hazard-reports/components/ReportCard';
import { useMyReports } from '@/features/hazard-reports/hooks/useMyReports';
import { QueuedReportCard } from '@/features/offline-sync/components/QueuedReportCard';
import { SyncBanner } from '@/features/offline-sync/components/SyncBanner';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

type Filter =
  | 'ALL'
  | Extract<HazardReportStatus, 'PENDING_VERIFICATION' | 'VERIFIED' | 'ESCALATED' | 'REJECTED'>;

const FILTER_LABELS: Record<Filter, string> = {
  ALL: 'All',
  PENDING_VERIFICATION: 'Pending',
  VERIFIED: 'Verified',
  ESCALATED: 'Escalated',
  REJECTED: 'Rejected',
};

export default function MyReportsScreen() {
  const { state, retry } = useMyReports();
  const queuedItems = useOfflineQueueStore((s) => s.items);
  const [filter, setFilter] = useState<Filter>('ALL');

  const reports = state.status === 'success' ? state.data : [];
  // A report briefly exists in both places between Firestore's confirmation and the queue refresh.
  const syncedIds = new Set(reports.map((r) => r.reportId));
  const queued = queuedItems.filter((q) => !syncedIds.has(q.reportId));

  const visible = filter === 'ALL' ? reports : reports.filter((r) => r.status === filter);
  const options = (Object.keys(FILTER_LABELS) as Filter[]).map((value) => ({
    value,
    label: `${FILTER_LABELS[value]} (${
      value === 'ALL' ? reports.length : reports.filter((r) => r.status === value).length
    })`,
  }));

  return (
    <ScreenContainer scroll>
      <Text variant="headlineSmall">My reports</Text>

      <SyncBanner />
      {queued.length > 0 && (
        <>
          <Text variant="titleSmall">Waiting to sync</Text>
          {queued.map((item) => (
            <QueuedReportCard key={item.reportId} report={item} />
          ))}
          <Text variant="titleSmall">Submitted</Text>
        </>
      )}

      {state.status === 'loading' && <LoadingState message="Loading your reports…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}

      {state.status === 'success' && reports.length === 0 && (
        <EmptyState
          icon="clipboard-list-outline"
          title={queued.length > 0 ? 'Nothing submitted yet' : 'No reports yet'}
          message="Reports you submit appear here with their verification status."
          actionLabel={queued.length > 0 ? undefined : 'Report a hazard'}
          onAction={() => router.navigate('/report')}
        />
      )}

      {state.status === 'success' && reports.length > 0 && (
        <>
          <OptionChips options={options} value={filter} onChange={setFilter} />
          {visible.length === 0 ? (
            <EmptyState
              icon="filter-off-outline"
              title={`No ${FILTER_LABELS[filter].toLowerCase()} reports`}
            />
          ) : (
            visible.map((report) => <ReportCard key={report.reportId} report={report} />)
          )}
        </>
      )}
    </ScreenContainer>
  );
}
