import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, countUnread } from '@lankashield/shared';
import { router, Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { startNotificationsListener } from '@/features/notifications/notifications.service';
import { openNotification } from '@/features/notifications/openNotification';
import { startAutoSync } from '@/features/offline-sync/sync.service';
import { useAuthStore } from '@/store/authStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { INTER_FONTS } from '@/theme/paperTheme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Users asked for a home district this app session ("Later" is respected until the next launch).
const askedForDistrict = new Set<string>();

function tabIcon(activeName: IconName, inactiveName: IconName) {
  return function TabIcon({
    color,
    focused,
  }: {
    color: ColorValue;
    focused: boolean;
    size: number;
  }) {
    return (
      <MaterialCommunityIcons name={focused ? activeName : inactiveName} color={color} size={27} />
    );
  };
}

export default function TabsLayout() {
  const queued = useOfflineQueueStore((s) => s.items.length);
  const uid = useAuthStore((s) => s.user?.uid);
  const hasDistrict = useAuthStore((s) => !!s.user?.district);
  const attempt = useNotificationsStore((s) => s.attempt);
  const unread = useNotificationsStore((s) => countUnread(s.items));
  const fresh = useNotificationsStore((s) => s.fresh);
  const dismissFresh = useNotificationsStore((s) => s.dismissFresh);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;

  // Sync queued reports now, on reconnect and when the app returns to the foreground.
  useEffect(() => startAutoSync(), []);

  // One live notification listener for the signed-in user; feeds the badge, list and Home (Phase 10).
  useEffect(() => (uid ? startNotificationsListener(uid) : undefined), [uid, attempt]);

  // Accounts created before registration asked for a district: ask once per session (D48).
  useEffect(() => {
    if (uid && !hasDistrict && !askedForDistrict.has(uid)) {
      askedForDistrict.add(uid);
      router.push('/set-district');
    }
  }, [uid, hasDistrict]);

  return (
    <View style={styles.flex}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
          },
          tabBarItemStyle: { paddingTop: 2 },
          tabBarLabelStyle: { fontFamily: INTER_FONTS.medium, fontSize: 10 },
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
        />
        <Tabs.Screen
          name="report"
          options={{ title: 'Report', tabBarIcon: tabIcon('alert', 'alert-outline') }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'My Reports',
            tabBarIcon: tabIcon('clipboard-list', 'clipboard-list-outline'),
            tabBarBadge: queued > 0 ? queued : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.warning },
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: tabIcon('bell', 'bell-outline'),
            tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.primary },
            tabBarAccessibilityLabel:
              unread > 0 ? `Notifications, ${unread} unread` : 'Notifications',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: tabIcon('account-circle', 'account-circle-outline'),
          }}
        />
      </Tabs>

      {/* A notification that arrives while the app is open (in place of a system notification). */}
      <Snackbar
        visible={!!fresh}
        onDismiss={dismissFresh}
        duration={6000}
        wrapperStyle={{ bottom: tabBarHeight }}
        action={{
          label: 'View',
          onPress: () => {
            if (fresh) openNotification(fresh, () => router.navigate('/notifications'));
          },
        }}>
        {fresh?.title ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
