import { colors, USER_ROLE_LABELS } from '@lankashield/shared';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { PageHeader } from '../components/layout/PageHeader';
import { signOutOfficer } from '../features/auth/auth.service';
import { useAuthStore } from '../store/authStore';

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 2, alignItems: 'center' }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0 }}>{icon}</Box>
      <Typography color="text.secondary" sx={{ width: { xs: 100, sm: 120 }, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{value}</Typography>
    </Stack>
  );
}

function InformationCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.25, alignItems: 'center' }}>
          <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
          <Typography variant="h6">{title}</Typography>
        </Stack>
        <Divider />
        {children}
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <PageHeader title="Profile" subtitle="View your account information and role details" />

      <Card
        sx={{
          mb: 3,
          background: `linear-gradient(105deg, ${colors.surface} 0%, ${colors.primarySoft} 100%)`,
        }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
          <Stack direction="row" spacing={{ xs: 2, sm: 3 }} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                width: { xs: 72, sm: 96 },
                height: { xs: 72, sm: 96 },
                bgcolor: colors.primarySoft,
                color: 'primary.main',
                fontSize: { xs: 27, sm: 34 },
                fontWeight: 600,
              }}>
              {initials}
            </Avatar>
            <Box>
              <Typography variant="h5" component="h2">
                {user.fullName}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {USER_ROLE_LABELS[user.role]}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2.5,
        }}>
        <InformationCard icon={<PersonOutlined />} title="Personal Information">
          <InfoRow icon={<PersonOutlined />} label="Name" value={user.fullName} />
          <Divider />
          <InfoRow icon={<EmailOutlined />} label="Email" value={user.email} />
        </InformationCard>

        <InformationCard icon={<ShieldOutlined />} title="Role & Access">
          <InfoRow icon={<BadgeOutlined />} label="Role" value={USER_ROLE_LABELS[user.role]} />
          <Divider />
          <InfoRow
            icon={<MapOutlined />}
            label="District Access"
            value={user.district ?? 'All districts'}
          />
        </InformationCard>
      </Box>

      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutOutlined />}
        disabled={signingOut}
        sx={{ mt: 3 }}
        onClick={() => {
          setSigningOut(true);
          void signOutOfficer().finally(() => setSigningOut(false));
        }}>
        {signingOut ? 'Signing out…' : 'Logout'}
      </Button>
    </>
  );
}
