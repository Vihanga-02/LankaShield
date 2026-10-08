import {
  declineWarningRequestSchema,
  HAZARD_TYPE_LABELS,
  isWarningActive,
  SEVERITY_LABELS,
  toErrorMessage,
  type Severity,
  type Warning,
  type WarningRequest,
} from '@lankashield/shared';
import AddOutlined from '@mui/icons-material/AddOutlined';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { PageHeader } from '../components/layout/PageHeader';
import { IssueWarningDialog } from '../features/warnings/IssueWarningDialog';
import {
  declineRequest,
  loadActiveEvents,
  loadMobileUsers,
  resendWarning,
  subscribeToPendingRequests,
  subscribeToWarnings,
} from '../features/warnings/warnings.service';
import { useAsync } from '../hooks/useAsync';
import { useLive } from '../hooks/useLive';
import { useAuthStore } from '../store/authStore';
import { formatDateTime, formatRelative } from '../utils/format';

const SEVERITY_COLOR: Record<Severity, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default',
  MODERATE: 'info',
  HIGH: 'warning',
  EXTREME: 'error',
};

function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={SEVERITY_COLOR[severity]}
      label={SEVERITY_LABELS[severity]}
    />
  );
}

function DeclineDialog({ request, onClose }: { request: WarningRequest; onClose: () => void }) {
  const officer = useAuthStore((s) => s.user);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = declineWarningRequestSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the reason.');
      return;
    }
    if (!officer) return;
    setBusy(true);
    setError(null);
    try {
      await declineRequest(request, parsed.data.reason, officer);
      onClose();
    } catch (err) {
      setError(toErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Decline warning request</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          No warning is sent for report {request.sourceReportId}. The reason is kept with the
          request.
        </Typography>
        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          error={!!error}
          helperText={error ?? ' '}
          disabled={busy}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={submit} disabled={busy}>
          {busy ? 'Declining…' : 'Decline'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type DialogState =
  { kind: 'issue'; request?: WarningRequest } | { kind: 'decline'; request: WarningRequest } | null;

/** Warnings (D49): send official warnings to a district, from escalated reports or manually. */
export default function WarningsPage() {
  const requests = useLive(subscribeToPendingRequests);
  const warnings = useLive(subscribeToWarnings);
  const users = useAsync(loadMobileUsers);
  const events = useAsync(loadActiveEvents);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const userList = users.state.status === 'success' ? users.state.data : null;
  const eventList = events.state.status === 'success' ? events.state.data : [];
  const now = new Date().toISOString();

  const resend = async (warning: Warning) => {
    if (!userList) return;
    setResending(warning.warningId);
    setActionError(null);
    try {
      const delivered = await resendWarning(warning, userList);
      setToast(
        delivered === 0
          ? 'Everyone in the district already has this warning.'
          : `Delivered to ${delivered} more ${delivered === 1 ? 'person' : 'people'}.`,
      );
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setResending(null);
    }
  };

  const closeDialog = () => {
    setDialog(null);
    // Recount recipients next time: people may have set their district meanwhile.
    users.retry();
  };

  return (
    <>
      <PageHeader
        title="Warnings"
        subtitle="Send official warnings to the citizens and volunteers of a district"
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => setDialog({ kind: 'issue' })}>
            Issue warning
          </Button>
        }
      />

      {users.state.status === 'error' ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={<Button onClick={users.retry}>Retry</Button>}>
          Users could not be loaded, so recipients cannot be counted.
        </Alert>
      ) : null}
      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          Resend failed. {actionError}
        </Alert>
      ) : null}

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Requests from escalated reports
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              A Duty Officer escalated these reports for warning assessment. Review and send a
              warning, or decline with a reason.
            </Typography>
            {requests.state.status === 'loading' && <LoadingState message="Loading requests…" />}
            {requests.state.status === 'error' && (
              <ErrorState message={toErrorMessage(requests.state.error)} onRetry={requests.retry} />
            )}
            {requests.state.status === 'success' && requests.state.data.length === 0 && (
              <EmptyState icon={<InboxOutlined />} title="No warning requests waiting" />
            )}
            {requests.state.status === 'success' && requests.state.data.length > 0 && (
              <TableContainer>
                <Table size="small" aria-label="Warning requests">
                  <TableHead>
                    <TableRow>
                      <TableCell>Report</TableCell>
                      <TableCell>Hazard</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>District</TableCell>
                      <TableCell>Requested</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.state.data.map((r) => (
                      <TableRow key={r.warningRequestId} hover>
                        <TableCell>{r.sourceReportId}</TableCell>
                        <TableCell>{HAZARD_TYPE_LABELS[r.hazardType]}</TableCell>
                        <TableCell>
                          <SeverityChip severity={r.severity} />
                        </TableCell>
                        <TableCell>{r.affectedDistrict}</TableCell>
                        <TableCell>
                          <Tooltip title={formatDateTime(r.createdAt)}>
                            <span>{formatRelative(r.createdAt)}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => setDialog({ kind: 'issue', request: r })}>
                            Review and send
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            sx={{ ml: 1 }}
                            onClick={() => setDialog({ kind: 'decline', request: r })}>
                            Decline
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sent warnings
            </Typography>
            {warnings.state.status === 'loading' && <LoadingState message="Loading warnings…" />}
            {warnings.state.status === 'error' && (
              <ErrorState message={toErrorMessage(warnings.state.error)} onRetry={warnings.retry} />
            )}
            {warnings.state.status === 'success' && warnings.state.data.length === 0 && (
              <EmptyState
                icon={<CampaignOutlined />}
                title="No warnings sent yet"
                message="Warnings you send appear here with how many people received them."
              />
            )}
            {warnings.state.status === 'success' && warnings.state.data.length > 0 && (
              <TableContainer>
                <Table size="small" aria-label="Sent warnings">
                  <TableHead>
                    <TableRow>
                      <TableCell>Warning</TableCell>
                      <TableCell>District</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Delivered</TableCell>
                      <TableCell>Issued</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {warnings.state.data.map((w) => {
                      const active = isWarningActive(w, now);
                      const incomplete = w.deliveredCount < w.recipientCount;
                      return (
                        <TableRow key={w.warningId} hover>
                          <TableCell sx={{ maxWidth: 380 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {w.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" component="div">
                              {w.message}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              By {w.issuedByName}
                              {w.sourceReportId ? ` · from report ${w.sourceReportId}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>{w.district}</TableCell>
                          <TableCell>
                            <SeverityChip severity={w.severity} />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">
                              {w.deliveredCount} / {w.recipientCount}
                            </Typography>
                            {incomplete ? (
                              <Button
                                size="small"
                                startIcon={<ReplayOutlined />}
                                disabled={resending !== null || !userList}
                                onClick={() => resend(w)}>
                                {resending === w.warningId ? 'Resending…' : 'Resend'}
                              </Button>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={formatDateTime(w.issuedAt)}>
                              <span>{formatRelative(w.issuedAt)}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              color={active ? 'warning' : 'default'}
                              label={
                                active ? `Active until ${formatDateTime(w.expiresAt)}` : 'Expired'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>

      {dialog?.kind === 'issue' ? (
        <IssueWarningDialog
          request={dialog.request}
          users={userList}
          events={eventList}
          onClose={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'decline' ? (
        <DeclineDialog request={dialog.request} onClose={() => setDialog(null)} />
      ) : null}

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
