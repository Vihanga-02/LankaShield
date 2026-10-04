import { Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';

// Warning and verification-result list — implemented in Phase 10.
export default function NotificationsScreen() {
  return (
    <ScreenContainer scroll>
      <Text variant="headlineSmall">Notifications</Text>
      <EmptyState
        icon="bell-outline"
        title="No notifications"
        message="Warnings and verification results will appear here."
      />
    </ScreenContainer>
  );
}
