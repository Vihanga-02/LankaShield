import {
  DELIVERY_STATUS_PRESENTATION,
  DELIVERY_STATUSES,
  deliverySummary,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPES,
  toErrorMessage,
  USER_ROLE_LABELS,
  type AppUser,
  type DeliveryStatus,
  type NotificationRecord,
  type NotificationType,
} from '@lankashield/shared';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { StatusChip } from '../components/feedback/StatusChip';
import { PageHeader } from '../components/layout/PageHeader';
import {
  loadRecipients,
  retryDelivery,
  subscribeToNotifications,
} from '../features/notifications/notifications.service';
import { useAsync } from '../hooks/useAsync';
import { useLive } from '../hooks/useLive';
import { formatDateTime, formatRelative } from '../utils/format';

type DeliveryFilter = 'ATTENTION' | DeliveryStatus | 'ALL';

const DELIVERY_FILTERS: { value: DeliveryFilter; label: string }[] = [
  { value: 'ATTENTION', label: 'Pending and failed' },
  ...DELIVERY_STATUSES.map((s) => ({ value: s, label: DELIVERY_STATUS_PRESENTATION[s].label })),
  { value: 'ALL', label: 'All deliveries' },
];

const matchesDelivery = (n: NotificationRecord, filter: DeliveryFilter) =>
  filter === 'ALL'
    ? true
    : filter === 'ATTENTION'
      ? n.deliveryStatus !== 'SENT'
      : n.deliveryStatus === filter;

function Recipient({ uid, users }: { uid: string; users: Map<string, AppUser> | null }) {
  const user = users?.get(uid);
  if (!user) return <Typography variant="body2">{users ? 'Unknown user' : '…'}</Typography>;
  return (
    <>
      <Typography variant="body2">{user.fullName}</Typography>
      <Typography variant="caption" color="textSecondary">
        {USER_ROLE_LABELS[user.role]}
      </Typography>
    </>
  );
}

function DeliveryTable({
  rows,
  users,
  retrying,
  onRetry,
}: {
  rows: NotificationRecord[];
  users: Map<string, AppUser> | null;
  retrying: string | null;
  onRetry: (n: NotificationRecord) => void;
}) {
  return (
    <TableContainer>
      <Table size="small" aria-label="Notification deliveries">
        <TableHead>
          <TableRow>
            <TableCell>Notification</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Recipient</TableCell>
            <TableCell>Delivery</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((n) => (
            <TableRow key={n.notificationId} hover>
              <TableCell sx={{ maxWidth: 420 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {n.title}
                </Typography>
                <Typography variant="caption" color="textSecondary" component="div">
                  {n.body}
                </Typography>
                {n.type === 'VERIFICATION_RESULT' && n.relatedEntityId ? (
                  <Link
                    component={RouterLink}
                    to={`/verification/${n.relatedEntityId}`}
                    variant="caption">
                    {n.relatedEntityId}
                  </Link>
                ) : null}
              </TableCell>
              <TableCell>{NOTIFICATION_TYPE_LABELS[n.type]}</TableCell>
              <TableCell>
                <Recipient uid={n.recipientId} users={users} />
              </TableCell>
              <TableCell>
                <StatusChip presentation={DELIVERY_STATUS_PRESENTATION[n.deliveryStatus]} />
              </TableCell>
              <TableCell>
                <Tooltip title={formatDateTime(n.createdAt)}>
                  <span>{formatRelative(n.createdAt)}</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                {n.deliveryStatus === 'SENT' ? (
                  <Typography variant="caption" color="textSecondary">
                    Delivered
                  </Typography>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ReplayOutlined />}
                    disabled={retrying !== null}
                    onClick={() => onRetry(n)}>
                    {retrying === n.notificationId ? 'Retrying…' : 'Retry delivery'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** Notification deliveries for the Duty Officer: pending and failed items with retry (Phase 10). */
export default function NotificationsPage() {
  const { state, retry } = useLive(subscribeToNotifications);
  const all = state.status === 'success' ? state.data : [];

  // Recipient names; reloaded when a new recipient appears in the list.
  const recipientKey = [...new Set(all.map((n) => n.recipientId))].sort().join(',');
  const loadUsers = useCallback(
    () => loadRecipients(recipientKey ? recipientKey.split(',') : []),
    [recipientKey],
  );
  const recipients = useAsync(loadUsers);
  const users = recipients.state.status === 'success' ? recipients.state.data : null;

  const [delivery, setDelivery] = useState<DeliveryFilter>('ATTENTION');
  const [type, setType] = useState<NotificationType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const summary = deliverySummary(all);
  const term = search.trim().toLowerCase();
  const filtered = all.filter(
    (n) =>
      matchesDelivery(n, delivery) &&
      (!type || n.type === type) &&
      (!term ||
        n.title.toLowerCase().includes(term) ||
        n.body.toLowerCase().includes(term) ||
        (n.relatedEntityId ?? '').toLowerCase().includes(term) ||
        (users?.get(n.recipientId)?.fullName.toLowerCase().includes(term) ?? false)),
  );
  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const onRetry = async (n: NotificationRecord) => {
    setRetrying(n.notificationId);
    setActionError(null);
    try {
      await retryDelivery(n.notificationId);
      const name = users?.get(n.recipientId)?.fullName ?? 'the recipient';
      setToast(`Delivered to ${name}. It now appears in their app.`);
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setRetrying(null);
    }
  };

  const resetPage = () => setPage(0);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Delivery of verification results and warnings to citizens and volunteers"
      />

      {state.status === 'loading' && <LoadingState message="Loading notifications…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}

      {state.status === 'success' && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            {DELIVERY_STATUSES.map((s) => (
              <Stack key={s} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <StatusChip presentation={DELIVERY_STATUS_PRESENTATION[s]} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {summary[s]}
                </Typography>
              </Stack>
            ))}
            <Typography variant="body2" color="textSecondary">
              Pending and failed notifications have not reached the recipient's app yet.
            </Typography>
          </Stack>

          {recipients.state.status === 'error' ? (
            <Alert severity="warning" action={<Button onClick={recipients.retry}>Retry</Button>}>
              Recipient names could not be loaded.
            </Alert>
          ) : null}
          {actionError ? (
            <Alert severity="error" onClose={() => setActionError(null)}>
              Retry failed. {actionError}
            </Alert>
          ) : null}

          <Card sx={{ p: 2 }}>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
              <TextField
                size="small"
                label="Search"
                placeholder="Title, recipient or tracking ID"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                sx={{ flex: '1 1 260px' }}
              />
              <TextField
                select
                size="small"
                label="Delivery"
                value={delivery}
                onChange={(e) => {
                  setDelivery(e.target.value as DeliveryFilter);
                  resetPage();
                }}
                sx={{ minWidth: 200 }}>
                {DELIVERY_FILTERS.map((f) => (
                  <MenuItem key={f.value} value={f.value}>
                    {f.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as NotificationType | '');
                  resetPage();
                }}
                sx={{ minWidth: 180 }}>
                <MenuItem value="">All types</MenuItem>
                {NOTIFICATION_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {NOTIFICATION_TYPE_LABELS[t]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Card>

          <Card>
            {all.length === 0 ? (
              <EmptyState icon={<MarkEmailReadOutlined />} title="No notifications yet" />
            ) : filtered.length === 0 ? (
              delivery === 'ATTENTION' && !type && !term ? (
                <EmptyState
                  icon={<MarkEmailReadOutlined />}
                  title="No pending or failed deliveries"
                  message="Every notification has reached its recipient."
                />
              ) : (
                <EmptyState
                  icon={<SearchOutlined />}
                  title="No notifications match these filters"
                />
              )
            ) : (
              <>
                <DeliveryTable
                  rows={pageRows}
                  users={users}
                  retrying={retrying}
                  onRetry={onRetry}
                />
                <TablePagination
                  component="div"
                  count={filtered.length}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    resetPage();
                  }}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </>
            )}
          </Card>
        </Stack>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
