import { USER_ROLE_LABELS } from '@lankashield/shared';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { PageHeader } from '../components/layout/PageHeader';
import { signOutOfficer } from '../features/auth/auth.service';
import { useAuthStore } from '../store/authStore';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 1.5 }}>
      <Typography color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Stack>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  return (
    <>
      <PageHeader title="Profile" />
      <Card sx={{ maxWidth: 560 }}>
        <CardContent>
          <Row label="Name" value={user.fullName} />
          <Divider />
          <Row label="Email" value={user.email} />
          <Divider />
          <Row label="Role" value={USER_ROLE_LABELS[user.role]} />
          <Divider />
          <Row label="District" value={user.district ?? 'All districts'} />
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutOutlined />}
            disabled={signingOut}
            sx={{ mt: 2 }}
            onClick={() => {
              setSigningOut(true);
              void signOutOfficer().finally(() => setSigningOut(false));
            }}>
            {signingOut ? 'Signing out…' : 'Logout'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
