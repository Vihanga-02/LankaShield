import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  HAZARD_REPORT_STATUS_PRESENTATION,
  HAZARD_TYPE_LABELS,
  radius,
  SEVERITY_LABELS,
  spacing,
  type HazardReport,
} from '@lankashield/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';

import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/utils/time';

import { HAZARD_ICONS } from '../hazardIcons';

export function ReportCard({ report }: { report: HazardReport }) {
  return (
    <TouchableRipple
      onPress={() =>
        router.push({ pathname: '/report-details/[id]', params: { id: report.reportId } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${report.title}, ${HAZARD_REPORT_STATUS_PRESENTATION[report.status].label}`}
      style={styles.card}
      borderless>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.icon}>
            <MaterialCommunityIcons
              name={HAZARD_ICONS[report.hazardType]}
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.flex}>
            <Text variant="titleSmall" numberOfLines={1}>
              {report.title}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {HAZARD_TYPE_LABELS[report.hazardType]} · {SEVERITY_LABELS[report.severity]} ·{' '}
              {report.district}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <StatusBadge presentation={HAZARD_REPORT_STATUS_PRESENTATION[report.status]} />
          <Text variant="bodySmall" style={styles.muted}>
            Updated {timeAgo(report.updatedAt)}
          </Text>
        </View>
        <Text variant="labelSmall" style={styles.muted}>
          {report.reportId}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  content: { padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.textSecondary },
});
