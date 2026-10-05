import { zodResolver } from '@hookform/resolvers/zod';
import {
  DISTRICTS,
  districtMapCenter,
  findDuplicateShelterName,
  isWithinSriLanka,
  matchDistrict,
  shelterInputSchema,
  toErrorMessage,
  type District,
  type EmergencyShelter,
  type GeoPoint,
  type ShelterInput,
} from '@lankashield/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { PointMap } from '../../components/maps/PointMap';
import { registerShelter, updateShelter } from './shelters.service';

const toNumber = (value: string) => (value === '' ? undefined : Number(value));

async function reverseGeocodeShelterLocation(
  point: GeoPoint,
): Promise<{ address: string; district: District }> {
  const { Geocoder } = (await google.maps.importLibrary(
    'geocoding',
  )) as google.maps.GeocodingLibrary;
  const { results } = await new Geocoder().geocode({
    location: { lat: point.latitude, lng: point.longitude },
    region: 'lk',
  });
  const result = results[0];
  const district = matchDistrict(
    results.flatMap((entry) =>
      entry.address_components.flatMap((part) => [part.long_name, part.short_name]),
    ),
  );

  if (!result?.formatted_address || !district) {
    throw new Error('The selected location could not be matched to a Sri Lankan district.');
  }

  return { address: result.formatted_address, district };
}

/** Register or edit a shelter (UC03). Shows a duplicate-name warning; does not block it. */
export function ShelterFormDialog({
  shelter,
  shelters,
  onClose,
  onSaved,
}: {
  /** Undefined to register a new shelter. */
  shelter?: EmergencyShelter;
  shelters: EmergencyShelter[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = !!shelter;
  const [closed, setClosed] = useState(shelter?.status === 'CLOSED');
  const [error, setError] = useState<string | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRequest = useRef(0);

  const { control, handleSubmit, formState, setValue } = useForm<ShelterInput>({
    resolver: zodResolver(shelterInputSchema),
    defaultValues: shelter
      ? {
          name: shelter.name,
          district: shelter.district,
          address: shelter.address,
          location: isWithinSriLanka(shelter.location)
            ? shelter.location
            : districtMapCenter(shelter.district),
          capacity: shelter.capacity,
          currentOccupancy: shelter.currentOccupancy,
          contactName: shelter.contactName ?? '',
          contactPhone: shelter.contactPhone ?? '',
        }
      : { name: '', address: '', currentOccupancy: 0, contactName: '', contactPhone: '' },
  });
  const [name, district] = useWatch({ control, name: ['name', 'district'] });
  const duplicate =
    name && district
      ? findDuplicateShelterName(name, district, shelters, shelter?.shelterId)
      : undefined;

  const syncLocationDetails = async (point: GeoPoint) => {
    const request = ++locationRequest.current;
    setValue('location', point, { shouldDirty: true, shouldValidate: true });
    setLocationError(null);
    setResolvingLocation(true);

    try {
      const details = await reverseGeocodeShelterLocation(point);
      if (request !== locationRequest.current) return;
      setValue('address', details.address, { shouldDirty: true, shouldValidate: true });
      setValue('district', details.district, { shouldDirty: true, shouldValidate: true });
    } catch {
      if (request === locationRequest.current) {
        setLocationError(
          'Could not update the address and district from this map location. Confirm them before saving.',
        );
      }
    } finally {
      if (request === locationRequest.current) setResolvingLocation(false);
    }
  };

  const onSubmit = handleSubmit(async (input) => {
    setError(null);
    try {
      if (shelter) {
        await updateShelter(shelter.shelterId, input, closed);
        onSaved(`${input.name} was updated.`);
      } else {
        await registerShelter(input, closed);
        onSaved(`${input.name} was registered.`);
      }
    } catch (err) {
      setError(toErrorMessage(err));
    }
  });

  const busy = formState.isSubmitting;

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? `Edit ${shelter.name}` : 'Register shelter'}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="shelter-form" spacing={2} noValidate onSubmit={onSubmit}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {duplicate ? (
            <Alert severity="warning">
              A shelter named “{duplicate.name}” is already registered in {duplicate.district}.
              Check that this is not the same shelter.
            </Alert>
          ) : null}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Shelter name"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={busy}
                />
              )}
            />
            <Controller
              control={control}
              name="district"
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="District"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const nextDistrict = e.target.value as District;
                    field.onChange(nextDistrict);
                    if (nextDistrict !== district) {
                      void syncLocationDetails(districtMapCenter(nextDistrict));
                    }
                  }}
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
          </Box>

          <Controller
            control={control}
            name="address"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Address"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={busy}
              />
            )}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Controller
              control={control}
              name="capacity"
              render={({ field, fieldState }) => (
                <TextField
                  label="Capacity (people)"
                  type="number"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(toNumber(e.target.value))}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={busy}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              )}
            />
            <Controller
              control={control}
              name="currentOccupancy"
              render={({ field, fieldState }) => (
                <TextField
                  label="Current occupancy"
                  type="number"
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? null : Number(e.target.value))
                  }
                  error={!!fieldState.error}
                  helperText={
                    fieldState.error?.message ??
                    (editing
                      ? 'Changes only through evacuee allocations.'
                      : 'People already sheltered here.')
                  }
                  disabled={busy || editing}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              )}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Controller
              control={control}
              name="contactName"
              render={({ field }) => (
                <TextField {...field} label="Contact name (optional)" disabled={busy} />
              )}
            />
            <Controller
              control={control}
              name="contactPhone"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Contact phone (optional)"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={busy}
                />
              )}
            />
          </Box>

          <Controller
            control={control}
            name="location"
            render={({ field, fieldState }) => (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Location
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Select the district first. Its centre is used as a starting point; then click or
                  drag the marker to the shelter's exact location.
                </Typography>
                <PointMap
                  point={field.value}
                  onPick={busy ? undefined : syncLocationDetails}
                  focusPoint={district ? districtMapCenter(district) : undefined}
                  height={260}
                  zoom={13}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1.5 }}>
                  <TextField
                    size="small"
                    label="Latitude"
                    type="number"
                    value={field.value?.latitude ?? ''}
                    onChange={(e) =>
                      field.onChange({
                        latitude: Number(e.target.value),
                        longitude: field.value?.longitude ?? 0,
                      })
                    }
                    disabled={busy}
                  />
                  <TextField
                    size="small"
                    label="Longitude"
                    type="number"
                    value={field.value?.longitude ?? ''}
                    onChange={(e) =>
                      field.onChange({
                        latitude: field.value?.latitude ?? 0,
                        longitude: Number(e.target.value),
                      })
                    }
                    disabled={busy}
                  />
                </Box>
                {fieldState.error ? (
                  <Typography variant="caption" color="error">
                    {fieldState.error.message ?? 'Select the shelter location.'}
                  </Typography>
                ) : null}
                {resolvingLocation ? (
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Updating address and district from the map location…
                  </Typography>
                ) : null}
                {locationError ? (
                  <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                    {locationError}
                  </Typography>
                ) : null}
              </Box>
            )}
          />

          <FormControlLabel
            control={
              <Switch
                checked={closed}
                onChange={(e) => setClosed(e.target.checked)}
                disabled={busy}
              />
            }
            label={closed ? 'Closed — cannot receive evacuees' : 'Open for allocations'}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="shelter-form"
          variant="contained"
          disabled={busy || resolvingLocation}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Register shelter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
