import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@lankashield/shared';
import { Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { startAutoSync } from '@/features/offline-sync/sync.service';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { INTER_FONTS } from '@/theme/paperTheme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

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
  const insets = useSafeAreaInsets();

  // Sync queued reports now, on reconnect and when the app returns to the foreground.
  useEffect(() => startAutoSync(), []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
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
        options={{ title: 'Notifications', tabBarIcon: tabIcon('bell', 'bell-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('account-circle', 'account-circle-outline'),
        }}
      />
    </Tabs>
  );
}
