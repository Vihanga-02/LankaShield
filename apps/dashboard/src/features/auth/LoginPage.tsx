import { zodResolver } from '@hookform/resolvers/zod';
import { colors, loginInputSchema, toErrorMessage, type LoginInput } from '@lankashield/shared';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import HolidayVillageOutlined from '@mui/icons-material/HolidayVillageOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';

import { FullPageLoader } from '../../components/feedback/FullPageLoader';
import { useAuthStore } from '../../store/authStore';
import { signInOfficer } from './auth.service';

// Brand panel: the primary colour deepening to a dark crimson, with a soft coral glow.
const BRAND_BACKGROUND = [
  `radial-gradient(circle at 18% 12%, ${colors.coralAccent}59 0%, transparent 42%)`,
  `linear-gradient(155deg, ${colors.primary} 0%, ${colors.primaryHover} 45%, #4A0F1C 100%)`,
].join(', ');

/** The shield from the favicon, drawn in white for the brand panel. */
function LogoMark({ size }: { size: number }) {
  return (
    <Box component="svg" viewBox="0 0 32 32" aria-hidden sx={{ width: size, height: size }}>
      <path fill="#fff" d="M16 2 4 6.5v8.2c0 7.3 5.1 13.6 12 15.3 6.9-1.7 12-8 12-15.3V6.5L16 2z" />
      <path fill={colors.primary} d="M14.6 9h2.8v9h-2.8zM14.6 20.2h2.8V23h-2.8z" />
    </Box>
  );
}

/** Concentric "warning signal" rings behind the brand content. */
function SignalRings() {
  return (
    <Box
      component="svg"
      viewBox="0 0 600 600"
      aria-hidden
      sx={{
        position: 'absolute',
        width: { xs: 420, md: 760 },
        height: { xs: 420, md: 760 },
        right: { xs: -180, md: -260 },
        bottom: { xs: -220, md: -280 },
        pointerEvents: 'none',
      }}>
      {[60, 120, 180, 240, 300].map((r, i) => (
        <circle
          key={r}
          cx="300"
          cy="300"
          r={r - 1}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.14 - i * 0.022}
          strokeWidth="1.5"
        />
      ))}
    </Box>
  );
}

function RoleItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.78 }}>
          {text}
        </Typography>
      </Box>
    </Stack>
  );
}

function BrandPanel() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: '#fff',
        background: BRAND_BACKGROUND,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: { xs: 'center', md: 'space-between' },
        alignItems: { xs: 'center', md: 'flex-start' },
        textAlign: { xs: 'center', md: 'left' },
        px: { xs: 3, md: 7, lg: 9 },
        pt: { xs: 5, md: 6 },
        pb: { xs: 7, md: 6 },
        minHeight: { xs: 240, md: '100vh' },
      }}>
      <SignalRings />

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', position: 'relative' }}>
        <LogoMark size={40} />
        <Typography variant="h5" component="p" sx={{ letterSpacing: 0.3 }}>
          LankaShield
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative', maxWidth: 520, mt: { xs: 2, md: 0 } }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{ fontWeight: 700, lineHeight: 1.15, display: { xs: 'none', md: 'block' } }}>
          Early warning.
          <br />
          Coordinated response.
        </Typography>
        <Typography sx={{ mt: { xs: 0, md: 2 }, opacity: 0.85, fontSize: { xs: 15, md: 17 } }}>
          Smart disaster early-warning and emergency coordination for Sri Lanka.
        </Typography>

        <Stack spacing={2.5} sx={{ mt: 5, display: { xs: 'none', md: 'flex' } }}>
          <RoleItem
            icon={<FactCheckOutlined fontSize="small" />}
            title="Duty Officers"
            text="Verify hazard reports from citizens and volunteers."
          />
          <RoleItem
            icon={<HolidayVillageOutlined fontSize="small" />}
            title="District Officers"
            text="Manage shelters and allocate evacuees."
          />
          <RoleItem
            icon={<InsightsOutlined fontSize="small" />}
            title="DMC Analysts"
            text="Analyse disaster response and share final reports."
          />
        </Stack>
      </Box>

      <Typography
        variant="caption"
        sx={{ position: 'relative', opacity: 0.6, display: { xs: 'none', md: 'block' } }}>
        LankaShield campus prototype
      </Typography>
    </Box>
  );
}

export default function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const notice = useAuthStore((s) => s.notice);
  const clearNotice = useAuthStore((s) => s.clearNotice);
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gridTemplateRows: { xs: 'auto 1fr', md: '1fr' },
        bgcolor: 'background.paper',
      }}>
      <BrandPanel />

      {/* On small screens the form is a sheet that overlaps the brand header. */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'background.paper',
          mt: { xs: -3, md: 0 },
          borderRadius: { xs: '24px 24px 0 0', md: 0 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2.5, sm: 4 },
          py: { xs: 4, md: 6 },
        }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Typography variant="h4" component="h2" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            Officer sign in
          </Typography>
          <Typography
            color="textSecondary"
            sx={{ mt: 1, mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
            Use your LankaShield officer email and password.
          </Typography>

          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2.5}>
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
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}>
                              {showPassword ? (
                                <VisibilityOffOutlined fontSize="small" />
                              ) : (
                                <VisibilityOutlined fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={formState.isSubmitting}
                sx={{ minHeight: 50, mt: 1 }}>
                {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>

          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mt: 4, textAlign: 'center', pt: 3, borderTop: 1, borderColor: 'divider' }}>
            For Duty Officers, District Officers and DMC Analysts.
            <br />
            Citizens and volunteers use the LankaShield mobile app.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
