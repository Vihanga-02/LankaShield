import { zodResolver } from '@hookform/resolvers/zod';
import {
  remarksRequired,
  toErrorMessage,
  VERIFICATION_OUTCOME_LABELS,
  VERIFICATION_OUTCOMES,
  verificationDecisionInputSchema,
  type DisasterEvent,
  type VerificationDecisionInput,
} from '@lankashield/shared';
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
import { submitVerificationDecision } from '../../services/verification';

/** UC02 decision form: verify, reject (remarks required) or escalate; optional event link (D6). */
export function DecisionForm({ reportId, events }: { reportId: string; events: DisasterEvent[] }) {
  const officer = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);
  const activeEvents = events.filter((e) => e.status === 'ACTIVE');

  const { control, handleSubmit, formState } = useForm<VerificationDecisionInput>({
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
              onChange={(e) => field.onChange(e.target.value)}>
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

      <Button type="submit" variant="contained" size="large" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Recording decision…' : 'Record decision'}
      </Button>
    </Stack>
  );
}
