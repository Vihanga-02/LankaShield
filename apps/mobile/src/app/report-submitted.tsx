import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  HAZARD_REPORT_STATUS_PRESENTATION,
  layout,
  radius,
  spacing,
  SYNC_STATUS_PRESENTATION,
  type StatusPresentation,
} from '@lankashield/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, ProgressBar, Text } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { useHazardReport } from '@/features/hazard-reports/hooks/useHazardReport';
import { syncNow } from '@/features/offline-sync/sync.service';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

/**
 * Submission result (UC01 step 10). Shows "Report submitted" only once the report is in
 * Firestore; a report that exists only on this device is shown as Pending Sync (§13.2).
 */
export default function ReportSubmittedScreen() {
  const { reportId, outcome } = useLocalSearchParams<{ reportId: string; outcome?: string }>();
  const { state } = useHazardReport(reportId);
  const queued = useOfflineQueueStore((s) => s.items.find((i) => i.reportId === reportId));
  const syncing = useOfflineQueueStore((s) => s.syncing);
  const [note, setNote] = useState<string | null>(null);

  const remote = state.status === 'success' ? state.data : null;
  const local = !remote && (!!queued || outcome === 'queued');
  const syncStatus = queued?.syncStatus ?? 'PENDING';

  const presentation: StatusPresentation = remote
    ? HAZARD_REPORT_STATUS_PRESENTATION[remote.status]
    : local
      ? SYNC_STATUS_PRESENTATION[syncStatus]
      : HAZARD_REPORT_STATUS_PRESENTATION.PENDING_VERIFICATION;

  const retry = async () => {
    setNote(null);
    const result = await syncNow();
    if (result.status === 'offline') setNote("You're still offline. It will send automatically.");
  };

  return (
    <ScreenContainer edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.icon}>
        <MaterialCommunityIcons
          name={local ? 'cloud-upload-outline' : 'check-circle-outline'}
          size={56}
          color={local ? colors.warning : colors.success}
        />
      </View>
      <Text variant="headlineSmall" style={styles.center}>
        {local ? 'Saved on this device' : 'Report submitted'}
      </Text>
      <Text variant="bodyMedium" style={[styles.center, styles.muted]}>
        {local
          ? 'It has not been sent yet. It will be sent automatically when you are back online — keep this tracking ID.'
          : 'A Duty Officer will review your report. You will be notified when it is verified.'}
      </Text>

      <View style={styles.card}>
        <Text variant="labelMedium" style={styles.muted}>
          Tracking ID
        </Text>
        <Text variant="titleLarge" selectable>
          {reportId}
        </Text>
        <StatusBadge presentation={presentation} />
        {local && syncStatus === 'SYNCING' ? (
          <ProgressBar indeterminate color={colors.info} style={styles.progress} />
        ) : null}
        {local && queued?.syncStatus === 'FAILED' && queued.lastError ? (
          <Text variant="bodySmall" style={[styles.center, styles.error]}>
            {queued.lastError}
          </Text>
        ) : null}
        {note ? (
          <Text variant="bodySmall" style={[styles.center, styles.muted]}>
            {note}
          </Text>
        ) : null}
      </View>

      {local ? (
        <Button
          mode="contained"
          icon="sync"
          onPress={retry}
          disabled={syncing}
          loading={syncing}
          contentStyle={styles.button}>
          {syncStatus === 'FAILED' ? 'Retry sync' : 'Sync now'}
        </Button>
      ) : (
        <Button
          mode="contained"
          onPress={() =>
            router.replace({ pathname: '/report-details/[id]', params: { id: reportId } })
          }
          contentStyle={styles.button}>
          View report
        </Button>
      )}
      <Button mode="outlined" onPress={() => router.back()} contentStyle={styles.button}>
        Report another hazard
      </Button>
      <Button mode="text" onPress={() => router.replace('/reports')}>
        Go to My Reports
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  icon: { alignItems: 'center' },
  center: { textAlign: 'center' },
  muted: { color: colors.textSecondary },
  error: { color: colors.danger },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  progress: { width: 160 },
  button: { height: layout.buttonHeight },
});
