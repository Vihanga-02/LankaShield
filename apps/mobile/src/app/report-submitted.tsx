import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  HAZARD_REPORT_STATUS_PRESENTATION,
  layout,
  radius,
  spacing,
} from '@lankashield/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { useHazardReport } from '@/features/hazard-reports/hooks/useHazardReport';

/** Submission result (UC01 step 10): tracking ID and live status. */
export default function ReportSubmittedScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { state } = useHazardReport(reportId);
  const status =
    state.status === 'success' && state.data ? state.data.status : 'PENDING_VERIFICATION';

  return (
    <ScreenContainer edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="check-circle-outline" size={56} color={colors.success} />
      </View>
      <Text variant="headlineSmall" style={styles.center}>
        Report submitted
      </Text>
      <Text variant="bodyMedium" style={[styles.center, styles.muted]}>
        A Duty Officer will review your report. You will be notified when it is verified.
      </Text>

      <View style={styles.card}>
        <Text variant="labelMedium" style={styles.muted}>
          Tracking ID
        </Text>
        <Text variant="titleLarge" selectable>
          {reportId}
        </Text>
        <StatusBadge presentation={HAZARD_REPORT_STATUS_PRESENTATION[status]} />
      </View>

      <Button
        mode="contained"
        onPress={() =>
          router.replace({ pathname: '/report-details/[id]', params: { id: reportId } })
        }
        contentStyle={styles.button}>
        View report
      </Button>
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
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  button: { height: layout.buttonHeight },
});
