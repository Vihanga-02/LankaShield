import {
  STAKEHOLDER_LABELS,
  toErrorMessage,
  type DeliveryStatus,
  type StakeholderNotification,
} from '@lankashield/shared';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useLive, type Subscribe } from '../../hooks/useLive';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { formatDateTime } from '../../utils/format';
import { sendStakeholderNotification, subscribeToOutbox } from './notifications.service';

function NotificationCard({ record }: { record: StakeholderNotification }) {
  const canReview = useAuthStore((state) => state.user?.role === 'DUTY_OFFICER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendStakeholderNotification(record.notificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6">{record.title}</Typography>
          <Chip
            size="small"
            label={{ PENDING: 'Pending', SENT: 'Sent', FAILED: 'Failed' }[record.deliveryStatus]}
            color={
              record.deliveryStatus === 'SENT'
                ? 'success'
                : record.deliveryStatus === 'FAILED'
                  ? 'error'
                  : 'warning'
            }
          />
        </Stack>
        <Button
          component={canReview ? Link : 'span'}
          to={canReview ? '/verification/' + record.reportId : undefined}
          sx={{ alignSelf: 'flex-start', textAlign: 'left' }}>
          {record.reportTitle} - {record.district} ({record.reportId})
        </Button>
        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {record.message}
        </Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {record.stakeholders.map((group) => (
            <Chip key={group} size="small" label={STAKEHOLDER_LABELS[group]} />
          ))}
        </Stack>
        <Typography variant="body2" color="textSecondary">
          Created by {record.officerName} - {formatDateTime(record.createdAt)}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Last delivery attempt:{' '}
          {record.lastAttemptAt ? formatDateTime(record.lastAttemptAt) : 'Not attempted'} -
          Attempts: {record.attemptCount}
        </Typography>
        {record.recipientIds && (
          <Typography variant="body2">
            Delivered to {record.deliveredRecipientIds?.length ?? 0} of{' '}
            {record.recipientIds?.length ?? 0} in-app inboxes.
          </Typography>
        )}
        {(error || record.lastError) && record.deliveryStatus !== 'SENT' && (
          <Alert severity="error">{error || record.lastError}</Alert>
        )}
        {record.deliveryStatus !== 'SENT' && (
          <Button
            variant="contained"
            onClick={() => void send()}
            disabled={busy}
            sx={{ alignSelf: 'flex-start' }}>
            {busy ? 'Sending...' : record.attemptCount ? 'Retry' : 'Send Notification'}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

export function NotificationOutbox({ reportId }: { reportId?: string }) {
  const subscribe = useCallback<Subscribe<StakeholderNotification[]>>(
    (onData, onError) => subscribeToOutbox(onData, onError, reportId),
    [reportId],
  );
  const { state, retry } = useLive(subscribe);
  const [filter, setFilter] = useState<DeliveryStatus | 'ALL'>('ALL');
  const records =
    state.status === 'success'
      ? state.data.filter((record) => filter === 'ALL' || record.deliveryStatus === filter)
      : [];
  return (
    <Stack spacing={2}>
      {!reportId && (
        <TextField
          select
          label="Delivery status"
          value={filter}
          size="small"
          onChange={(event) => setFilter(event.target.value as DeliveryStatus | 'ALL')}
          sx={{ maxWidth: 220 }}>
          {(['ALL', 'PENDING', 'SENT', 'FAILED'] as const).map((status) => (
            <MenuItem key={status} value={status}>
              {{ ALL: 'All', PENDING: 'Pending', SENT: 'Sent', FAILED: 'Failed' }[status]}
            </MenuItem>
          ))}
        </TextField>
      )}
      {state.status === 'loading' && <LoadingState message="Loading notifications..." />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {state.status === 'success' && !records.length && (
        <Typography color="textSecondary">
          No notifications{filter !== 'ALL' ? ' with this status' : ''}.
        </Typography>
      )}
      {records.map((record) => (
        <NotificationCard key={record.notificationId} record={record} />
      ))}
    </Stack>
  );
}
