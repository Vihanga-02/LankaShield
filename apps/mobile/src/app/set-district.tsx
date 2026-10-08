import { colors, layout, spacing, toErrorMessage, type District } from '@lankashield/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Banner, Button, Text } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { updateHomeDistrict } from '@/features/auth/auth.service';
import { HomeDistrictField } from '@/features/auth/components/HomeDistrictField';
import { useAuthStore } from '@/store/authStore';

/**
 * Home district (D48). Shown once per session to users who have none — accounts created before the
 * district was part of registration — and opened from Profile to change it.
 */
export default function SetDistrictScreen() {
  const current = useAuthStore((s) => s.user?.district);
  const [district, setDistrict] = useState<District | undefined>(current);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!district) {
      setFieldError('Select a district.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateHomeDistrict(district);
      router.back();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <Text variant="headlineSmall">{current ? 'Change home district' : 'Where do you live?'}</Text>
      <Text variant="bodyMedium" style={styles.muted}>
        Choose your home district to receive official warnings for your area. You can change it
        later in Profile.
      </Text>

      <Banner visible={!!error} icon="alert-circle-outline">
        {error ?? ''}
      </Banner>

      <HomeDistrictField
        value={district}
        onChange={(d) => {
          setDistrict(d);
          setFieldError(undefined);
        }}
        error={fieldError}
        disabled={saving}
      />

      <Button
        mode="contained"
        onPress={save}
        loading={saving}
        disabled={saving}
        contentStyle={styles.button}>
        Save
      </Button>
      <Button mode="text" onPress={() => router.back()} disabled={saving}>
        {current ? 'Cancel' : 'Later'}
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textSecondary, marginBottom: spacing.sm },
  button: { height: layout.buttonHeight },
});
