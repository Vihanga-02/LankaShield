import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@lankashield/shared';
import { Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { startAutoSync } from '@/features/offline-sync/sync.service';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';
import { INTER_FONTS } from '@/theme/paperTheme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const queued = useOfflineQueueStore((s) => s.items.length);

  // Sync queued reports now, on reconnect and when the app returns to the foreground.
  useEffect(() => startAutoSync(), []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: INTER_FONTS.medium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen
        name="report"
        options={{ title: 'Report Hazard', tabBarIcon: tabIcon('alert-plus-outline') }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'My Reports',
          tabBarIcon: tabIcon('clipboard-list-outline'),
          tabBarBadge: queued > 0 ? queued : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.warning },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Notifications', tabBarIcon: tabIcon('bell-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('account-circle-outline') }}
      />
    </Tabs>
  );
}
