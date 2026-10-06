import { zodResolver } from '@hookform/resolvers/zod';
import {
  remarksRequired,
  STAKEHOLDERS,
  STAKEHOLDER_LABELS,
  HAZARD_TYPE_LABELS,
  type HazardReport,
  toErrorMessage,
  VERIFICATION_OUTCOME_LABELS,
  VERIFICATION_OUTCOMES,
  verificationDecisionInputSchema,
  type DisasterEvent,
  type VerificationDecisionInput,
} from '@lankashield/shared';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/format';
import { submitVerificationDecision } from './verification.service';

/** UC02 decision form: verify, reject (remarks required) or escalate; optional event link (D6). */
export function DecisionForm({
  report,
  events,
}: {
  report: HazardReport;
  events: DisasterEvent[];
}) {
  const reportId = report.reportId;
  const officer = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);
  const activeEvents = events.filter((e) => e.status === 'ACTIVE');

  const { control, handleSubmit, formState, setValue, getValues } =
    useForm<VerificationDecisionInput>({
      resolver: zodResolver(verificationDecisionInputSchema),
      defaultValues: {
        remarks: '',
        // Pre-select the event when exactly one is active in the report's district.
        disasterEventId: activeEvents.length === 1 ? activeEvents[0].eventId : '',
      },
    });
  const outcome = useWatch({ control, name: 'outcome' });

  const onSubmit = handleSubmit(async (input) => {
    if (!officer) return;
    setError(null);
    try {
      await submitVerificationDecision({ reportId, officer, input });
      // The live report subscription swaps this form for the recorded decision.
    } catch (err) {
      setError(toErrorMessage(err));
    }
  });

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit}>
      {error ? (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      ) : null}

      <Controller
        control={control}
        name="outcome"
        render={({ field, fieldState }) => (
          <FormControl error={!!fieldState.error}>
            <FormLabel id="outcome-label">Decision</FormLabel>
            <RadioGroup
              aria-labelledby="outcome-label"
              value={field.value ?? ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                if (e.target.value === 'VERIFIED_ESCALATED') {
                  if (!getValues('stakeholderNotification'))
                    setValue('stakeholderNotification', {
                      stakeholders: [],
                      title:
                        'Verified ' +
                        HAZARD_TYPE_LABELS[report.hazardType] +
                        ' Hazard - ' +
                        report.district,
                      message:
                        'A ' +
                        HAZARD_TYPE_LABELS[report.hazardType].toLowerCase() +
                        ' incident in ' +
                        report.district +
                        ' has been verified and escalated. Relevant authorities are requested to take appropriate action.',
                    });
                } else setValue('stakeholderNotification', undefined);
              }}>
              {VERIFICATION_OUTCOMES.map((o) => (
                <FormControlLabel
                  key={o}
                  value={o}
                  control={<Radio />}
                  label={VERIFICATION_OUTCOME_LABELS[o]}
                  disabled={formState.isSubmitting}
                />
              ))}
            </RadioGroup>
            {fieldState.error ? <FormHelperText>{fieldState.error.message}</FormHelperText> : null}
          </FormControl>
        )}
      />

      <Controller
        control={control}
        name="remarks"
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={
              outcome && remarksRequired(outcome) ? 'Remarks (required)' : 'Remarks (optional)'
            }
            placeholder="Shown to the reporter in the mobile app"
            multiline
            minRows={3}
            disabled={formState.isSubmitting}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
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
            disabled={formState.isSubmitting}
            helperText="Links this report to an event for disaster analytics.">
            <MenuItem value="">Not linked to an event</MenuItem>
            {events.map((e) => (
              <MenuItem key={e.eventId} value={e.eventId}>
                {e.name} ·{' '}
                {e.status === 'ACTIVE'
                  ? 'Active'
                  : `Completed ${formatDate(e.endedAt ?? e.startedAt)}`}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      {outcome === 'VERIFIED_ESCALATED' && (
        <Stack spacing={2}>
          <Typography variant="h6">Notify Stakeholders</Typography>
          <Typography variant="body2" color="textSecondary">
            {report.title} - {report.district} - {report.reportId}
          </Typography>
          <Controller
            control={control}
            name="stakeholderNotification.stakeholders"
            render={({ field, fieldState }) => (
              <Autocomplete
                multiple
                options={[...STAKEHOLDERS]}
                value={field.value ?? []}
                getOptionLabel={(value) => STAKEHOLDER_LABELS[value]}
                disableCloseOnSelect
                onChange={(_, value) => field.onChange(value)}
                disabled={formState.isSubmitting}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Stakeholders"
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )}
          />
          <Controller
            control={control}
            name="stakeholderNotification.title"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                label="Notification Title"
                required
                disabled={formState.isSubmitting}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="stakeholderNotification.message"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                label="Message"
                multiline
                minRows={4}
                required
                disabled={formState.isSubmitting}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Typography variant="body2" color="textSecondary">
            Selected roles include all active registered users in those roles. Record the decision
            to save this notification. You can then send it to the selected registered stakeholders.
          </Typography>
        </Stack>
      )}

      <Button type="submit" variant="contained" size="large" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Recording decision…' : 'Record decision'}
      </Button>
    </Stack>
  );
}
