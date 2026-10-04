import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, type StatusPresentation } from '@lankashield/shared';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Icon per status label, so status is never shown by colour alone (§5.2).
const ICONS: Record<string, IconName> = {
  Draft: 'file-outline',
  'Pending Sync': 'cloud-upload-outline',
  Syncing: 'sync',
  Synced: 'cloud-check-outline',
  'Sync Failed': 'cloud-alert-outline',
  'Pending Verification': 'clock-outline',
  Verified: 'check-circle-outline',
  Rejected: 'close-circle-outline',
  Escalated: 'alert-octagon-outline',
};

export function StatusBadge({ presentation }: { presentation: StatusPresentation }) {
  const color = colors[presentation.color];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <MaterialCommunityIcons
        name={ICONS[presentation.label] ?? 'information-outline'}
        size={14}
        color={color}
      />
      <Text variant="labelSmall" style={{ color }}>
        {presentation.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
});
