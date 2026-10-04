import CloudOffOutlined from '@mui/icons-material/CloudOffOutlined';
import Button from '@mui/material/Button';

import { EmptyState } from './EmptyState';

/** Service/network failure with a retry action (§11.3). */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<CloudOffOutlined />}
      title="Something went wrong"
      message={message}
      action={
        onRetry ? (
          <Button variant="contained" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    />
  );
}
