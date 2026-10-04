import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Service/network failure with a retry action (§11.3). */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon="cloud-alert-outline"
      title="Something went wrong"
      message={message}
      actionLabel={onRetry ? 'Retry' : undefined}
      onAction={onRetry}
    />
  );
}
