import { zodResolver } from '@hookform/resolvers/zod';
import { toErrorMessage, layout, loginInputSchema, type LoginInput } from '@lankashield/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Banner, Button, TextInput } from 'react-native-paper';

import { FormTextField } from '@/components/FormTextField';
import { ScreenContainer } from '@/components/ScreenContainer';
import { signInUser } from '@/features/auth/auth.service';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const notice = useAuthStore((s) => s.notice);
  const clearNotice = useAuthStore((s) => s.clearNotice);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    clearNotice();
    try {
      await signInUser(values);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  });

  const message = error ?? notice;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer scroll edges={['top', 'bottom']}>
        <AuthHeader title="Sign in" subtitle="Report hazards and track their status" />

        <Banner visible={!!message} icon="alert-circle-outline">
          {message ?? ''}
        </Banner>

        <FormTextField
          control={control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <FormTextField
          control={control}
          name="password"
          label="Password"
          secureTextEntry={!showPassword}
          autoComplete="password"
          textContentType="password"
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            />
          }
        />

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting}
          contentStyle={styles.button}>
          Sign in
        </Button>

        <Link href="/register" asChild>
          <Button mode="text">Create an account</Button>
        </Link>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: { height: layout.buttonHeight },
});
