import {
  allocateEvacuees,
  AppError,
  calculateAvailableCapacity,
  findAlternativeShelters,
  SHELTER_STATUS_PRESENTATION,
  toErrorMessage,
  type DisasterEvent,
  type EmergencyShelter,
} from '@lankashield/shared';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { StatusChip } from '../../components/feedback/StatusChip';
import { useAuthStore } from '../../store/authStore';
import { allocateToShelter, type AllocationOutcome } from './shelters.service';

function previewFor(shelter: EmergencyShelter, count: number) {
  try {
    return { ok: true as const, result: allocateEvacuees(shelter, count) };
  } catch (err) {
    return { ok: false as const, error: err };
  }
}

/** UC03 allocation: requested count, capacity check, alternatives when it does not fit. */
export function AllocationDialog({
  initialShelter,
  shelters,
  events,
  onClose,
}: {
  initialShelter: EmergencyShelter;
  /** Live list, so the preview always uses current occupancy. */
  shelters: EmergencyShelter[];
  events: DisasterEvent[];
  onClose: () => void;
}) {
  const officer = useAuthStore((s) => s.user);
  const [shelterId, setShelterId] = useState(initialShelter.shelterId);
  const [countText, setCountText] = useState('');
  const [eventId, setEventId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<
    (AllocationOutcome & { shelterName: string; count: number }) | null
  >(null);

  const shelter = shelters.find((s) => s.shelterId === shelterId) ?? initialShelter;
  const districtEvents = events.filter((e) => e.district === shelter.district);
  const count = Number(countText);
  const validCount = countText !== '' && Number.isInteger(count) && count > 0;
  const preview = validCount ? previewFor(shelter, count) : null;
  const insufficient =
    preview &&
    !preview.ok &&
    preview.error instanceof AppError &&
    preview.error.code === 'INSUFFICIENT_CAPACITY';

  const alternatives = insufficient
    ? findAlternativeShelters(shelters, count, shelter.shelterId)
        // Same district first, then most available places.
        .sort(
          (a, b) =>
            Number(b.district === shelter.district) - Number(a.district === shelter.district),
        )
        .slice(0, 5)
    : [];

  const submit = async () => {
    if (!officer || !validCount) return;
    setSubmitting(true);
    setError(null);
    try {
      const outcome = await allocateToShelter({
        shelterId: shelter.shelterId,
        evacueeCount: count,
        disasterEventId: eventId || undefined,
        officer,
      });
      setDone({ ...outcome, shelterName: shelter.name, count });
    } catch (err) {
      // If another officer filled the shelter first, the live preview now shows alternatives.
      setError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleOutline color="success" sx={{ fontSize: 48 }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            Allocation confirmed
          </Typography>
          <Typography color="text.secondary">
            {done.count} evacuee{done.count === 1 ? '' : 's'} allocated to {done.shelterName}.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Now {done.currentOccupancy} occupied · {done.availableCapacity} places left
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <StatusChip presentation={SHELTER_STATUS_PRESENTATION[done.status]} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  const available = calculateAvailableCapacity(shelter.capacity, shelter.currentOccupancy);
  const rate = shelter.capacity > 0 ? (shelter.currentOccupancy / shelter.capacity) * 100 : 100;

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Allocate evacuees</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1">{shelter.name}</Typography>
              <StatusChip presentation={SHELTER_STATUS_PRESENTATION[shelter.status]} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {shelter.district} · {shelter.currentOccupancy} / {shelter.capacity} occupied ·{' '}
              <strong>{available} available</strong>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(rate, 100)}
              aria-label="Current occupancy"
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
            />
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Number of evacuees"
            type="number"
            value={countText}
            onChange={(e) => setCountText(e.target.value)}
            disabled={submitting}
            autoFocus
            error={countText !== '' && !validCount}
            helperText={countText !== '' && !validCount ? 'Enter a whole number above zero.' : ' '}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
          />

          <TextField
            select
            label="Disaster event (optional)"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            disabled={submitting}
            helperText="Counts these evacuees in the event's response report.">
            <MenuItem value="">Not linked to an event</MenuItem>
            {districtEvents.map((e) => (
              <MenuItem key={e.eventId} value={e.eventId}>
                {e.name}
              </MenuItem>
            ))}
          </TextField>

          {preview?.ok ? (
            <Alert severity="info">
              After this allocation: {preview.result.currentOccupancy} / {shelter.capacity}{' '}
              occupied, {preview.result.availableCapacity} places left —{' '}
              {SHELTER_STATUS_PRESENTATION[preview.result.status].label}.
            </Alert>
          ) : null}
          {preview && !preview.ok && !insufficient ? (
            <Alert severity="error">{toErrorMessage(preview.error)}</Alert>
          ) : null}
          {insufficient ? (
            <Box>
              <Alert severity="warning">
                Insufficient capacity: {shelter.name} has only {available} place
                {available === 1 ? '' : 's'} for {count} evacuees.
              </Alert>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Alternative shelters
              </Typography>
              {alternatives.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No open shelter can take {count} evacuees. Split the group or register another
                  shelter.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {alternatives.map((alt) => (
                    <ListItem
                      key={alt.shelterId}
                      disableGutters
                      secondaryAction={
                        <Button
                          size="small"
                          onClick={() => setShelterId(alt.shelterId)}
                          disabled={submitting}>
                          Allocate here
                        </Button>
                      }>
                      <ListItemText
                        primary={alt.name}
                        secondary={`${alt.district} · ${calculateAvailableCapacity(alt.capacity, alt.currentOccupancy)} available`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={submitting || !preview?.ok}>
          {submitting ? 'Allocating…' : 'Confirm allocation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
