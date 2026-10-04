import { zodResolver } from '@hookform/resolvers/zod';
import { loginInputSchema, toErrorMessage, type LoginInput } from '@lankashield/shared';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';

import { FullPageLoader } from '../../components/feedback/FullPageLoader';
import { useAuthStore } from '../../store/authStore';
import { signInOfficer } from './auth.service';

export default function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const notice = useAuthStore((s) => s.notice);
  const clearNotice = useAuthStore((s) => s.clearNotice);
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'initializing') return <FullPageLoader message="Restoring your session…" />;
  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    clearNotice();
    try {
      await signInOfficer(values);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  });

  const message = error ?? notice;

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1} sx={{ mb: 3, alignItems: 'center' }}>
            <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <ShieldOutlined />
            </Avatar>
            <Typography variant="h5" color="primary">
              LankaShield
            </Typography>
            <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
              Officer dashboard for Duty Officers, District Officers and DMC Analysts
            </Typography>
          </Stack>

          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2}>
              {message ? (
                <Alert severity="error" role="alert">
                  {message}
                </Alert>
              ) : null}
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={formState.isSubmitting}>
                {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
