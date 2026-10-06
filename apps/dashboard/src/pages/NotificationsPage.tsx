import { canSendStakeholderNotifications, toErrorMessage, type NotificationRecord } from '@lankashield/shared';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { NotificationComposer } from '../features/notifications/NotificationComposer';
import { NotificationOutbox } from '../features/notifications/NotificationOutbox';
import { subscribeToInbox } from '../features/notifications/notifications.service';
import { useLive, type Subscribe } from '../hooks/useLive';
import { useAuthStore } from '../store/authStore';
import { formatDateTime } from '../utils/format';

function Inbox({ uid }: { uid: string }) {
  const subscribe = useCallback<Subscribe<NotificationRecord[]>>(
    (onData, onError) => subscribeToInbox(uid, onData, onError),
    [uid],
  );
  const { state, retry } = useLive(subscribe);
  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error')
    return <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />;
  return (
    <Stack spacing={2}>
      {!state.data.length && (
        <Typography color="textSecondary">No received notifications.</Typography>
      )}
      {state.data.map((record) => (
        <Card key={record.notificationId} sx={{ p: 2 }}>
          <Typography variant="h6">{record.title}</Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{record.body}</Typography>
          <Typography variant="caption" color="textSecondary">
            {formatDateTime(record.createdAt)}
            {record.relatedEntityId ? ' - ' + record.relatedEntityId : ''}
          </Typography>
        </Card>
      ))}
    </Stack>
  );
}
export default function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState(0);
  const officer = canSendStakeholderNotifications(user);
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="In-app stakeholder notifications and delivery history"
      />
      {officer && (
        <Tabs value={tab} onChange={(_, value: number) => setTab(value)} sx={{ mb: 2 }}>
          <Tab label="Stakeholder notifications" />
          <Tab label="Received" />
        </Tabs>
      )}
      {officer && tab === 0 ? (
        <Stack spacing={3}>
          <NotificationComposer />
          <NotificationOutbox />
        </Stack>
      ) : (
        user && <Inbox key={user.uid} uid={user.uid} />
      )}
    </>
  );
}
