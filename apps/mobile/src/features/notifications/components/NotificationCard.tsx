import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  NOTIFICATION_TYPE_LABELS,
  radius,
  spacing,
  type ColorToken,
  type NotificationRecord,
  type NotificationType,
} from '@lankashield/shared';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';

import { INTER_FONTS } from '@/theme/paperTheme';
import { timeAgo } from '@/utils/time';

const TYPE_STYLE: Record<
  NotificationType,
  {
    icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
    color: ColorToken;
    soft: ColorToken;
  }
> = {
  WARNING: { icon: 'alert-outline', color: 'warning', soft: 'warningSoft' },
  VERIFICATION_RESULT: {
    icon: 'clipboard-check-outline',
    color: 'primary',
    soft: 'primarySoft',
  },
  SYSTEM: { icon: 'information-outline', color: 'info', soft: 'surfaceMuted' },
};

/** One in-app notification; unread ones are bold with a dot. */
export function NotificationCard({
  notification,
  onPress,
}: {
  notification: NotificationRecord;
  onPress: () => void;
}) {
  const style = TYPE_STYLE[notification.type];
  const unread = !notification.read;

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${NOTIFICATION_TYPE_LABELS[notification.type]}: ${notification.title}`}
      style={[styles.card, unread && styles.unreadCard]}
      borderless>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: colors[style.soft] }]}>
          <MaterialCommunityIcons name={style.icon} size={22} color={colors[style.color]} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text
              variant="titleSmall"
              style={[styles.flex, unread ? styles.bold : styles.regular]}
              numberOfLines={2}>
              {notification.title}
            </Text>
            {unread ? <View style={styles.dot} accessibilityElementsHidden /> : null}
          </View>
          <Text variant="bodySmall" style={styles.body} numberOfLines={3}>
            {notification.body}
          </Text>
          <Text variant="labelSmall" style={styles.muted}>
            {NOTIFICATION_TYPE_LABELS[notification.type]} · {timeAgo(notification.createdAt)}
          </Text>
        </View>
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
  unreadCard: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  content: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  // Each Inter weight is its own font family (see paperTheme).
  bold: { fontFamily: INTER_FONTS.bold },
  regular: { fontFamily: INTER_FONTS.medium },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: colors.primary,
  },
  body: { color: colors.textPrimary, marginTop: 2 },
  muted: { color: colors.textSecondary, marginTop: spacing.xs },
});
