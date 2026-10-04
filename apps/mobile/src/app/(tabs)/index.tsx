import { colors, layout, radius, spacing, USER_ROLE_LABELS } from '@lankashield/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuthStore } from '@/store/authStore';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.fullName.split(' ')[0] ?? '';

  return (
    <ScreenContainer scroll>
      <View>
        <Text variant="headlineSmall">Hello, {firstName}</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          {user ? USER_ROLE_LABELS[user.role] : ''}
        </Text>
      </View>

      <View style={styles.reportCard}>
        <Text variant="titleMedium" style={styles.onPrimary}>
          See a hazard?
        </Text>
        <Text variant="bodyMedium" style={styles.onPrimary}>
          Report floods, landslides and other hazards with your location and photos.
        </Text>
        <Button
          mode="contained"
          buttonColor={colors.surface}
          textColor={colors.primary}
          icon="alert-plus-outline"
          onPress={() => router.navigate('/report')}
          contentStyle={styles.button}>
          Report a hazard
        </Button>
      </View>

      <Text variant="titleMedium">Active warnings</Text>
      <EmptyState
        icon="shield-check-outline"
        title="No active warnings"
        message="Official warnings for your area will appear here."
      />

      <Text variant="titleMedium">Recent reports</Text>
      <EmptyState
        icon="clipboard-text-outline"
        title="No reports yet"
        message="Reports you submit and their verification status will appear here."
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary },
  reportCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: layout.mobilePagePadding,
    gap: spacing.sm,
  },
  onPrimary: { color: colors.surface },
  button: { height: layout.buttonHeight },
});
