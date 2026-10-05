import {
  colors,
  layout,
  radius,
  spacing,
  toErrorMessage,
  USER_ROLE_LABELS,
} from '@lankashield/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ReportCard } from '@/features/hazard-reports/components/ReportCard';
import { useMyReports } from '@/features/hazard-reports/hooks/useMyReports';
import { SyncBanner } from '@/features/offline-sync/components/SyncBanner';
import { useAuthStore } from '@/store/authStore';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.fullName.split(' ')[0] ?? '';
  const { state, retry } = useMyReports();
  const recent = state.status === 'success' ? state.data.slice(0, 3) : [];

  return (
    <ScreenContainer scroll>
      <View>
        <Text variant="headlineSmall">Hello, {firstName}</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          {user ? USER_ROLE_LABELS[user.role] : ''}
        </Text>
      </View>

      <SyncBanner />

      <View style={styles.reportCard}>
        <Text variant="titleMedium" style={styles.onPrimary}>
          See a hazard?
        </Text>
        <Text variant="bodyMedium" style={styles.onPrimary}>
          Report floods, landslides and other hazards with your location and photos.
        </Text>
        <Button
          mode="contained"
          buttonColor={colors.surface}
          textColor={colors.primary}
          icon="alert-plus-outline"
          onPress={() => router.navigate('/report')}
          contentStyle={styles.button}>
          Report a hazard
        </Button>
      </View>

      <Text variant="titleMedium">Active warnings</Text>
      <EmptyState
        icon="shield-check-outline"
        title="No active warnings"
        message="Official warnings for your area will appear here."
      />

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">Recent reports</Text>
        {recent.length > 0 ? (
          <Button compact onPress={() => router.navigate('/reports')}>
            See all
          </Button>
        ) : null}
      </View>
      {state.status === 'loading' && <LoadingState message="Loading your reports…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {state.status === 'success' && recent.length === 0 && (
        <EmptyState
          icon="clipboard-text-outline"
          title="No reports yet"
          message="Reports you submit and their verification status will appear here."
        />
      )}
      {recent.map((report) => (
        <ReportCard key={report.reportId} report={report} />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: layout.mobilePagePadding,
    gap: spacing.sm,
  },
  onPrimary: { color: colors.surface },
  button: { height: layout.buttonHeight },
});
