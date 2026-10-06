import {
  STAKEHOLDERS,
  STAKEHOLDER_LABELS,
  HAZARD_TYPE_LABELS,
  type Stakeholder,
} from '@lankashield/shared';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import {
  createStakeholderNotification,
  listNotifiableReports,
  sendStakeholderNotification,
} from './notifications.service';

export function NotificationComposer() {
  const { state, retry } = useAsync(listNotifiableReports);
  const [reportId, setReportId] = useState('');
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const reports = state.status === 'success' ? state.data : [];
  async function send(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    let saved = false;
    try {
      const id = await createStakeholderNotification(reportId, { stakeholders, title, message });
      saved = true;
      // Clear only after the database confirms the durable outbox record.
      setReportId('');
      setStakeholders([]);
      setTitle('');
      setMessage('');
      await sendStakeholderNotification(id);
      setNotice({
        error: false,
        text: 'Notification sent to the selected stakeholders. See delivery details below.',
      });
    } catch (error) {
      setNotice({
        error: true,
        text:
          (saved ? 'Notification saved. Retry delivery from the record below. ' : '') +
          (error instanceof Error ? error.message : 'Unable to send notification.'),
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card sx={{ p: 2 }}>
      <Stack component="form" onSubmit={(event) => void send(event)} spacing={2}>
        <Typography variant="h6">Notify Stakeholders</Typography>
        <Typography variant="body2" color="textSecondary">
          Send an in-app notification to all active registered users in one or more selected roles.
        </Typography>
        {notice && <Alert severity={notice.error ? 'error' : 'success'}>{notice.text}</Alert>}
        {state.status === 'error' && (
          <Alert severity="error" action={<Button onClick={retry}>Retry</Button>}>
            Unable to load verified reports.
          </Alert>
        )}
        <TextField
          select
          label="Verified hazard report"
          required
          value={reportId}
          disabled={busy || state.status !== 'success'}
          onChange={(event) => {
            setReportId(event.target.value);
            const report = reports.find((item) => item.reportId === event.target.value);
            if (report) {
              setTitle(
                'Verified ' +
                  HAZARD_TYPE_LABELS[report.hazardType] +
                  ' Hazard - ' +
                  report.district,
              );
              setMessage(
                report.title +
                  ' in ' +
                  report.district +
                  ' has been verified. Please take appropriate action.',
              );
            }
          }}
          helperText={
            state.status === 'success' && !reports.length
              ? 'No verified reports available yet.'
              : undefined
          }>
          {reports.map((report) => (
            <MenuItem key={report.reportId} value={report.reportId}>
              {report.title} - {report.district} ({report.reportId})
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={[...STAKEHOLDERS]}
          value={stakeholders}
          getOptionLabel={(role) => STAKEHOLDER_LABELS[role]}
          onChange={(_, value) => setStakeholders(value)}
          disabled={busy}
          renderInput={(params) => <TextField {...params} label="Select Stakeholders" />}
        />
        <TextField
          label="Notification Title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
        />
        <TextField
          label="Message"
          required
          multiline
          minRows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={busy}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={busy || !reportId || !stakeholders.length || !title.trim() || !message.trim()}
          sx={{ alignSelf: 'flex-start' }}>
          {busy ? 'Sending...' : 'Send Notification'}
        </Button>
      </Stack>
    </Card>
  );
}
