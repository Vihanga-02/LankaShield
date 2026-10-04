import { USER_ROLE_LABELS } from '@lankashield/shared';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { Link } from 'react-router';

import { EmptyState } from '../components/feedback/EmptyState';
import { useAuthStore } from '../store/authStore';

export function NoAccessPage() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <Card>
      <EmptyState
        icon={<BlockOutlined />}
        title="This page is not available for your role"
        message={role ? `${USER_ROLE_LABELS[role]} accounts cannot open this page.` : undefined}
        action={
          <Button variant="contained" component={Link} to="/">
            Back to overview
          </Button>
        }
      />
    </Card>
  );
}
