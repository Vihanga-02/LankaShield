import { colors, countUnread, toErrorMessage, type NotificationRecord } from '@lankashield/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { OptionChips } from '@/features/hazard-reports/components/OptionChips';
import { NotificationCard } from '@/features/notifications/components/NotificationCard';
import { markAllRead } from '@/features/notifications/notifications.service';
import { openNotification } from '@/features/notifications/openNotification';
import { useNotificationsStore } from '@/store/notificationsStore';

type Filter = 'ALL' | 'UNREAD' | 'WARNING' | 'VERIFICATION_RESULT';

const FILTERS: { value: Filter; label: string; matches: (n: NotificationRecord) => boolean }[] = [
  { value: 'ALL', label: 'All', matches: () => true },
  { value: 'UNREAD', label: 'Unread', matches: (n) => !n.read },
  { value: 'WARNING', label: 'Warnings', matches: (n) => n.type === 'WARNING' },
  {
    value: 'VERIFICATION_RESULT',
    label: 'Report results',
    matches: (n) => n.type === 'VERIFICATION_RESULT',
  },
];

/** Warnings and verification results for the signed-in user (§10.5, Phase 10). */
export default function NotificationsScreen() {
  const status = useNotificationsStore((s) => s.status);
  const items = useNotificationsStore((s) => s.items);
  const error = useNotificationsStore((s) => s.error);
  const retry = useNotificationsStore((s) => s.retry);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [markingAll, setMarkingAll] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const unread = countUnread(items);
  const active = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const visible = items.filter(active.matches);
  const options = FILTERS.map((f) => ({
    value: f.value,
    label: `${f.label} (${items.filter(f.matches).length})`,
  }));

  const onMarkAll = async () => {
    setMarkingAll(true);
    setMarkError(null);
    try {
      await markAllRead(items);
    } catch (err) {
      setMarkError(toErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="headlineSmall">Notifications</Text>
          {status === 'success' ? (
            <Text variant="bodyMedium" style={styles.muted}>
              {unread === 0 ? 'All caught up' : `${unread} unread`}
            </Text>
          ) : null}
        </View>
        {unread > 0 ? (
          <Button
            compact
            icon="check-all"
            onPress={onMarkAll}
            loading={markingAll}
            disabled={markingAll}>
            Mark all as read
          </Button>
        ) : null}
      </View>
      {markError ? (
        <Text variant="bodySmall" style={styles.error}>
          {markError}
        </Text>
      ) : null}

      {(status === 'loading' || status === 'idle') && (
        <LoadingState message="Loading notifications…" />
      )}
      {status === 'error' && <ErrorState message={toErrorMessage(error)} onRetry={retry} />}

      {status === 'success' && items.length === 0 && (
        <EmptyState
          icon="bell-outline"
          title="No notifications"
          message="Warnings and verification results will appear here."
        />
      )}

      {status === 'success' && items.length > 0 && (
        <>
          <OptionChips options={options} value={filter} onChange={setFilter} />
          {visible.length === 0 ? (
            <EmptyState
              icon={filter === 'UNREAD' ? 'bell-check-outline' : 'filter-off-outline'}
              title={
                filter === 'UNREAD' ? 'No unread notifications' : `No ${active.label.toLowerCase()}`
              }
            />
          ) : (
            visible.map((n) => (
              <NotificationCard
                key={n.notificationId}
                notification={n}
                onPress={() => openNotification(n)}
              />
            ))
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  muted: { color: colors.textSecondary },
  error: { color: colors.danger },
});
