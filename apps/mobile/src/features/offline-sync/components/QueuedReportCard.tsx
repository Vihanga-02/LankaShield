import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  HAZARD_TYPE_LABELS,
  radius,
  SEVERITY_LABELS,
  spacing,
  SYNC_STATUS_PRESENTATION,
  type QueuedReport,
} from '@lankashield/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { StatusBadge } from '@/components/StatusBadge';
import { HAZARD_ICONS } from '@/features/hazard-reports/hazardIcons';
import { useAuthStore } from '@/store/authStore';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { timeAgo } from '@/utils/time';

import { discardQueuedReport } from '../queue';
import { syncNow } from '../sync.service';

/** A report that exists only on this device — never presented as "submitted" (§13.2). */
export function QueuedReportCard({ report }: { report: QueuedReport }) {
  const uid = useAuthStore((s) => s.user?.uid);
  const syncing = useOfflineQueueStore((s) => s.syncing);
  const [message, setMessage] = useState<string | null>(null);
  const isSyncing = report.syncStatus === 'SYNCING';
  const failed = report.syncStatus === 'FAILED';

  const retry = async () => {
    setMessage(null);
    const outcome = await syncNow();
    if (outcome.status === 'offline')
      setMessage("You're still offline. It will send automatically.");
  };

  const discard = () =>
    Alert.alert(
      'Discard this report?',
      `${report.reportId} has not been sent. Discarding deletes it from this device.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => uid && void discardQueuedReport(report.reportId, uid),
        },
      ],
    );

  return (
    <TouchableRipple
      onPress={() =>
        router.push({ pathname: '/report-submitted', params: { reportId: report.reportId } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${report.input.title}, ${SYNC_STATUS_PRESENTATION[report.syncStatus].label}`}
      style={[styles.card, failed && styles.failed]}
      borderless>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.icon}>
            <MaterialCommunityIcons
              name={HAZARD_ICONS[report.input.hazardType]}
              size={22}
              color={colors.warning}
            />
          </View>
          <View style={styles.flex}>
            <Text variant="titleSmall" numberOfLines={1}>
              {report.input.title}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {HAZARD_TYPE_LABELS[report.input.hazardType]} ·{' '}
              {SEVERITY_LABELS[report.input.severity]} · {report.input.district}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <StatusBadge presentation={SYNC_STATUS_PRESENTATION[report.syncStatus]} />
          <Text variant="bodySmall" style={styles.muted}>
            Saved {timeAgo(report.createdAt)}
          </Text>
        </View>
        {isSyncing ? <ProgressBar indeterminate color={colors.info} /> : null}

        {failed && report.lastError ? (
          <Text variant="bodySmall" style={styles.error}>
            {report.lastError} (attempt {report.retryCount})
          </Text>
        ) : null}
        {message ? (
          <Text variant="bodySmall" style={styles.muted}>
            {message}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text variant="labelSmall" style={styles.muted}>
            {report.reportId}
          </Text>
          {!isSyncing ? (
            <View style={styles.actions}>
              {failed ? (
                <Button compact textColor={colors.danger} onPress={discard}>
                  Discard
                </Button>
              ) : null}
              <Button compact icon="sync" onPress={retry} disabled={syncing}>
                {failed ? 'Retry' : 'Sync now'}
              </Button>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  failed: { borderColor: colors.danger },
  content: { padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row' },
  muted: { color: colors.textSecondary },
  error: { color: colors.danger },
});
