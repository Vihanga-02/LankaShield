import { Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';

// UC01 Submit Hazard Report — implemented in Phase 5.
export default function ReportScreen() {
  return (
    <ScreenContainer scroll>
      <Text variant="headlineSmall">Report a hazard</Text>
      <EmptyState
        icon="alert-plus-outline"
        title="Hazard reporting"
        message="The hazard report form will be available here."
      />
    </ScreenContainer>
  );
}
