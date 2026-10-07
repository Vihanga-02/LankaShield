import {
  colors,
  HAZARD_REPORT_STATUS_PRESENTATION,
  HAZARD_TYPE_LABELS,
  radius,
  SEVERITY_LABELS,
  spacing,
  toErrorMessage,
  unreadResultIdsForReport,
  type HazardReport,
} from '@lankashield/shared';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, List, Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { OsmMap } from '@/components/maps/OsmMap';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusBadge } from '@/components/StatusBadge';
import { useHazardReport } from '@/features/hazard-reports/hooks/useHazardReport';
import { markNotificationsRead } from '@/features/notifications/notifications.service';
import { useNotificationsStore } from '@/store/notificationsStore';
import { formatDateTime } from '@/utils/time';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ReportDetails({ report }: { report: HazardReport }) {
  const decision = report.latestDecision;

  return (
    <>
      <View style={styles.headerBlock}>
        <StatusBadge presentation={HAZARD_REPORT_STATUS_PRESENTATION[report.status]} />
        <Text variant="headlineSmall">{report.title}</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          {HAZARD_TYPE_LABELS[report.hazardType]} · {SEVERITY_LABELS[report.severity]} severity ·{' '}
          {report.district}
        </Text>
        <Text variant="labelMedium" style={styles.muted} selectable>
          Tracking ID {report.reportId}
        </Text>
      </View>

      <Section title="Verification">
        {decision ? (
          <>
            <Text variant="bodyMedium">
              {HAZARD_REPORT_STATUS_PRESENTATION[report.status].label} on{' '}
              {formatDateTime(decision.decidedAt)}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {decision.remarks
                ? `Officer remarks: ${decision.remarks}`
                : 'No remarks from the officer.'}
            </Text>
          </>
        ) : (
          <Text variant="bodyMedium" style={styles.muted}>
            Waiting for a Duty Officer to review this report.
          </Text>
        )}
      </Section>

      <Section title="Description">
        <Text variant="bodyMedium">{report.description}</Text>
      </Section>

      <Section title="Location">
        {/* A fixed preview: touches pass through so the screen keeps scrolling. */}
        <View style={styles.map} pointerEvents="none">
          <OsmMap point={report.location} zoom={15} style={styles.mapFill} />
        </View>
        <Text variant="bodySmall" style={styles.muted}>
          {report.location.address ??
            `${report.location.latitude.toFixed(5)}, ${report.location.longitude.toFixed(5)}`}{' '}
          · {report.location.source === 'GPS' ? 'GPS' : 'Selected on map'}
        </Text>
      </Section>

      <Section title={`Evidence (${report.evidenceUrls.length})`}>
        {report.evidenceUrls.length === 0 ? (
          <Text variant="bodyMedium" style={styles.muted}>
            No photos attached.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photos}>
            {report.evidenceUrls.map((url, i) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={styles.photo}
                contentFit="cover"
                accessibilityLabel={`Evidence photo ${i + 1}`}
              />
            ))}
          </ScrollView>
        )}
      </Section>

      <View style={styles.card}>
        <List.Item title="Submitted" description={formatDateTime(report.createdAt)} />
        <Divider />
        <List.Item title="Last updated" description={formatDateTime(report.updatedAt)} />
      </View>
    </>
  );
}

/** Report details: evidence, location, verification status and officer remarks. */
export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useHazardReport(id);

  // Seeing the report counts as reading its verification-result notification (Phase 10).
  const unreadResults = useNotificationsStore((s) =>
    unreadResultIdsForReport(s.items, id).join(','),
  );
  useEffect(() => {
    if (unreadResults) void markNotificationsRead(unreadResults.split(',')).catch(() => {});
  }, [unreadResults]);

  return (
    <ScreenContainer scroll edges={['bottom']}>
      {state.status === 'loading' && <LoadingState message="Loading report…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {state.status === 'success' && !state.data && (
        <EmptyState
          icon="file-question-outline"
          title="Report not found"
          message="It may have been removed."
          actionLabel="Back to My Reports"
          onAction={() => router.replace('/reports')}
        />
      )}
      {state.status === 'success' && state.data && <ReportDetails report={state.data} />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: { gap: spacing.xs },
  muted: { color: colors.textSecondary },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionTitle: { marginBottom: spacing.xs },
  map: { height: 180, borderRadius: radius.input, overflow: 'hidden' },
  mapFill: { flex: 1 },
  photos: { gap: spacing.sm },
  photo: {
    width: 160,
    height: 120,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceMuted,
  },
});
