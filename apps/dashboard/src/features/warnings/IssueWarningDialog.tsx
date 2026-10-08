import { zodResolver } from '@hookform/resolvers/zod';
import {
  DISTRICTS,
  draftFromRequest,
  SEVERITIES,
  SEVERITY_LABELS,
  toErrorMessage,
  usersWithoutDistrict,
  WARNING_DURATION_HOURS,
  warningInputSchema,
  warningRecipients,
  type AppUser,
  type DisasterEvent,
  type District,
  type WarningInput,
  type WarningRequest,
} from '@lankashield/shared';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useAuthStore } from '../../store/authStore';
import { loadReport, sendWarning, type SendResult } from './warnings.service';

const durationLabel = (hours: number) =>
  hours < 24
    ? `${hours} hours`
    : hours === 168
      ? '7 days'
      : `${hours / 24} day${hours === 24 ? '' : 's'}`;

/**
 * Issue a warning to one district (D49): manually, or for an escalated report's warning request
 * (pre-filled from the report). Shows who will receive it before sending.
 */
export function IssueWarningDialog({
  request,
  users,
  events,
  onClose,
}: {
  request?: WarningRequest;
  /** Citizens and volunteers; `null` while loading. */
  users: AppUser[] | null;
  events: DisasterEvent[];
  onClose: () => void;
}) {
  const officer = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const initialDistrict: District | undefined = request?.affectedDistrict ?? officer?.district;
  const { control, handleSubmit, formState, reset, setValue } = useForm<WarningInput>({
    resolver: zodResolver(warningInputSchema),
    defaultValues: {
      district: initialDistrict,
      severity: request?.severity ?? 'HIGH',
      title: '',
      message: '',
      durationHours: 24,
      disasterEventId: '',
      ...(request ? draftFromRequest(request) : {}),
    },
  });
  const district = useWatch({ control, name: 'district' });

  // A request is pre-filled from its report once that loads (title and description).
  useEffect(() => {
    if (!request) return;
    let active = true;
    loadReport(request.sourceReportId)
      .then((report) => {
        if (!active || !report) return;
        reset((values) => ({
          ...values,
          ...draftFromRequest(request, report),
          disasterEventId: report.disasterEventId ?? values.disasterEventId,
        }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [request, reset]);

  const districtEvents = events.filter((e) => e.district === district);
  // Suggest the event when exactly one is active in the chosen district.
  useEffect(() => {
    const active = events.filter((e) => e.district === district);
    setValue('disasterEventId', active.length === 1 ? active[0].eventId : '');
  }, [district, events, setValue]);

  const recipients = users && district ? warningRecipients(users, district) : [];
  const unreachable = users ? usersWithoutDistrict(users) : 0;

  const onSubmit = handleSubmit(async (input) => {
    if (!officer) return;
    setError(null);
    try {
      setResult(
        await sendWarning({
          input,
          officer,
          recipients,
          request,
        }),
      );
    } catch (err) {
      setError(
        `${toErrorMessage(err)} If some people already received it, use Resend under Sent warnings to finish.`,
      );
    }
  });

  if (result) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleOutline color="success" sx={{ fontSize: 48 }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            Warning sent
          </Typography>
          <Typography color="textSecondary">
            Delivered to {result.delivered} of {result.recipients} citizens and volunteers in{' '}
            {district}. It appears in their app straight away.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  const busy = formState.isSubmitting;

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'primary.main' }}>
        {request ? 'Review and send warning' : 'Issue warning'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="warning-form" spacing={2.5} noValidate onSubmit={onSubmit}>
          {request ? (
            <Alert severity="info">
              Requested after report <strong>{request.sourceReportId}</strong> was verified and
              escalated. Check the text before sending.
            </Alert>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Controller
              control={control}
              name="district"
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="District"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={busy}>
                  {DISTRICTS.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="severity"
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="Severity"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={busy}>
                  {SEVERITIES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {SEVERITY_LABELS[s]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>

          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Title"
                placeholder="e.g. Flood warning: Ratnapura"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={busy}
              />
            )}
          />
          <Controller
            control={control}
            name="message"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Message"
                placeholder="What is happening and what people should do"
                multiline
                minRows={3}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={busy}
              />
            )}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Controller
              control={control}
              name="durationHours"
              render={({ field }) => (
                <TextField
                  select
                  label="Active for"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={busy}>
                  {WARNING_DURATION_HOURS.map((h) => (
                    <MenuItem key={h} value={h}>
                      {durationLabel(h)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="disasterEventId"
              render={({ field }) => (
                <TextField
                  select
                  label="Disaster event (optional)"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={busy}
                  helperText="Counts it in the event's analytics.">
                  <MenuItem value="">Not linked to an event</MenuItem>
                  {districtEvents.map((e) => (
                    <MenuItem key={e.eventId} value={e.eventId}>
                      {e.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>

          {users === null ? (
            <Alert severity="info">Counting recipients…</Alert>
          ) : recipients.length === 0 ? (
            <Alert severity="warning">
              No citizens or volunteers have {district ?? 'this district'} as their home district,
              so nobody would receive this warning.
            </Alert>
          ) : (
            <Alert severity="success">
              Sends to <strong>{recipients.length}</strong>{' '}
              {recipients.length === 1 ? 'person' : 'people'} (citizens and volunteers) whose home
              district is {district}.
            </Alert>
          )}
          {users !== null && unreachable > 0 ? (
            <Typography variant="body2" color="textSecondary">
              {unreachable} user{unreachable === 1 ? ' has' : 's have'} no home district set and
              cannot receive district warnings.
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="warning-form"
          variant="contained"
          disabled={busy || users === null || recipients.length === 0}>
          {busy ? 'Sending…' : `Send warning${recipients.length ? ` to ${recipients.length}` : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
