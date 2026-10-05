import { toErrorMessage, colors, radius, spacing, USER_ROLE_LABELS } from '@lankashield/shared';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Button, Divider, HelperText, List, Text } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { signOutUser } from '@/features/auth/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queued = useOfflineQueueStore((s) => s.items.length);

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const confirmSignOut = () => {
    if (queued === 0) return void onSignOut();
    Alert.alert(
      'Reports not sent yet',
      `${queued} report${queued === 1 ? ' is' : 's are'} saved only on this device. They will be sent the next time you sign in on this phone.`,
      [
        { text: 'Stay signed in', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void onSignOut() },
      ],
    );
  };

  const onSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOutUser();
    } catch (err) {
      setError(toErrorMessage(err));
      setSigningOut(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Avatar.Text size={64} label={initials} />
        <Text variant="titleLarge">{user.fullName}</Text>
        <Text variant="bodyMedium" style={styles.muted}>
          {USER_ROLE_LABELS[user.role]}
        </Text>
      </View>

      <View style={styles.card}>
        <List.Item
          title="Email"
          description={user.email}
          left={(p) => <List.Icon {...p} icon="email-outline" />}
        />
        <Divider />
        <List.Item
          title="Phone"
          description={user.phone ?? 'Not provided'}
          left={(p) => <List.Icon {...p} icon="phone-outline" />}
        />
        {user.district ? (
          <>
            <Divider />
            <List.Item
              title="District"
              description={user.district}
              left={(p) => <List.Icon {...p} icon="map-marker-outline" />}
            />
          </>
        ) : null}
      </View>

      <Button
        mode="outlined"
        icon="logout"
        onPress={confirmSignOut}
        loading={signingOut}
        disabled={signingOut}
        textColor={colors.danger}>
        Sign out
      </Button>
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  muted: { color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
