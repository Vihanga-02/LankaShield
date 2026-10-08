import { zodResolver } from '@hookform/resolvers/zod';
import {
  toErrorMessage,
  colors,
  layout,
  registerInputSchema,
  USER_ROLE_LABELS,
  type RegisterInput,
} from '@lankashield/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Banner, Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { FormTextField } from '@/components/FormTextField';
import { ScreenContainer } from '@/components/ScreenContainer';
import { registerUser } from '@/features/auth/auth.service';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { HomeDistrictField } from '@/features/auth/components/HomeDistrictField';

export default function RegisterScreen() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'CITIZEN',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await registerUser(values);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer scroll edges={['top', 'bottom']}>
        <AuthHeader title="Create an account" subtitle="For citizens and community volunteers" />

        <Banner visible={!!error} icon="alert-circle-outline">
          {error ?? ''}
        </Banner>

        <View>
          <Text variant="labelLarge" style={styles.label}>
            I am a
          </Text>
          <Controller
            control={control}
            name="role"
            render={({ field, fieldState }) => (
              <>
                <SegmentedButtons
                  value={field.value}
                  onValueChange={field.onChange}
                  buttons={[
                    { value: 'CITIZEN', label: USER_ROLE_LABELS.CITIZEN, icon: 'account' },
                    {
                      value: 'VOLUNTEER',
                      label: USER_ROLE_LABELS.VOLUNTEER,
                      icon: 'hand-heart',
                    },
                  ]}
                />
                <HelperText type="error" visible={!!fieldState.error}>
                  {fieldState.error?.message}
                </HelperText>
              </>
            )}
          />
        </View>

        <FormTextField control={control} name="fullName" label="Full name" autoComplete="name" />
        <FormTextField
          control={control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <FormTextField
          control={control}
          name="phone"
          label="Phone (optional)"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <Controller
          control={control}
          name="district"
          render={({ field, fieldState }) => (
            <HomeDistrictField
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              disabled={formState.isSubmitting}
            />
          )}
        />
        <FormTextField
          control={control}
          name="password"
          label="Password"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword((value) => !value)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            />
          }
        />
        <FormTextField
          control={control}
          name="confirmPassword"
          label="Confirm password"
          secureTextEntry={!showConfirmPassword}
          autoComplete="new-password"
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowConfirmPassword((value) => !value)}
              accessibilityLabel={
                showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
              }
            />
          }
        />

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting}
          contentStyle={styles.button}>
          Create account
        </Button>

        <Link href="/login" asChild>
          <Button mode="text">Already have an account? Sign in</Button>
        </Link>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { marginBottom: 8, color: colors.textSecondary },
  button: { height: layout.buttonHeight },
});
