import { Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';

// My Reports list — implemented in Phase 5.
export default function MyReportsScreen() {
  return (
    <ScreenContainer scroll>
      <Text variant="headlineSmall">My reports</Text>
      <EmptyState
        icon="clipboard-list-outline"
        title="No reports yet"
        message="Track the status of the hazard reports you submit."
      />
    </ScreenContainer>
  );
}
