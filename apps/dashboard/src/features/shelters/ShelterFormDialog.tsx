import { zodResolver } from '@hookform/resolvers/zod';
import {
  DISTRICTS,
  districtMapCenter,
  findDuplicateShelterName,
  isWithinSriLanka,
  lookupAddress,
  lookupLocation,
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
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
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
    setLocationStatus('Updating address and district from the map location…');

    const details = await lookupLocation(point);
    if (request !== locationRequest.current) return;

    if (details) {
      setValue('address', details.address, { shouldDirty: true, shouldValidate: true });
      setValue('district', details.district, { shouldDirty: true, shouldValidate: true });
    } else {
      setLocationError(
        'Could not update the address and district from this map location. Confirm them before saving.',
      );
    }
    setResolvingLocation(false);
    setLocationStatus(null);
  };

  const findAddressLocation = async (address: string, selectedDistrict?: District) => {
    const query = address.trim();
    if (!query) return;

    const request = ++locationRequest.current;
    setLocationError(null);
    setResolvingLocation(true);
    setLocationStatus('Finding the address on the map…');

    const result = await lookupAddress(query, { district: selectedDistrict });
    if (request !== locationRequest.current) return;

    if (result) {
      setValue('location', result.point, { shouldDirty: true, shouldValidate: true });
      if (result.district) {
        setValue('district', result.district, { shouldDirty: true, shouldValidate: true });
      }
    } else {
      setLocationError(
        'Could not find this address in Sri Lanka. Use a more detailed address, or click or drag the marker to choose the location manually.',
      );
    }
    setResolvingLocation(false);
    setLocationStatus(null);
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
      <DialogTitle sx={{ color: 'primary.main' }}>
        {editing ? `Edit ${shelter.name}` : 'Register shelter'}
      </DialogTitle>
      <DialogContent dividers sx={{ py: 3 }}>
        <Stack component="form" id="shelter-form" spacing={2.5} noValidate onSubmit={onSubmit}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {duplicate ? (
            <Alert severity="warning">
              A shelter named “{duplicate.name}” is already registered in {duplicate.district}.
              Check that this is not the same shelter.
            </Alert>
          ) : null}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(360px, 1fr)' },
              gap: 3,
              alignItems: 'start',
            }}>
            <Stack spacing={2}>
              <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    size="small"
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
                    size="small"
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

              <Controller
                control={control}
                name="address"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    size="small"
                    label="Address"
                    error={!!fieldState.error}
                    helperText={
                      fieldState.error?.message ?? 'Leave this field to find the address on the map.'
                    }
                    onBlur={(event) => {
                      field.onBlur();
                      void findAddressLocation(event.currentTarget.value, district);
                    }}
                    disabled={busy}
                  />
                )}
              />

              <Controller
                control={control}
                name="capacity"
                render={({ field, fieldState }) => (
                  <TextField
                    size="small"
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
                    size="small"
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

              <Controller
                control={control}
                name="contactName"
                render={({ field }) => (
                  <TextField
                    {...field}
                    size="small"
                    label="Contact name (optional)"
                    disabled={busy}
                  />
                )}
              />
              <Controller
                control={control}
                name="contactPhone"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    size="small"
                    label="Contact phone (optional)"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={busy}
                  />
                )}
              />
              <Controller
                control={control}
                name="location"
                render={({ field }) => {
                  const syncTypedLocation = () => {
                    if (field.value) void syncLocationDetails(field.value);
                  };

                  return (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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
                        onBlur={syncTypedLocation}
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
                        onBlur={syncTypedLocation}
                        disabled={busy}
                      />
                    </Box>
                  );
                }}
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

            <Controller
              control={control}
              name="location"
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Location
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Click the map or drag the marker to update the address and district
                      automatically.
                    </Typography>
                    <PointMap
                      point={field.value}
                      onPick={busy ? undefined : syncLocationDetails}
                      height={420}
                      zoom={13}
                    />
                    {fieldState.error ? (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message ?? 'Select the shelter location.'}
                      </Typography>
                    ) : null}
                    {resolvingLocation ? (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        {locationStatus}
                      </Typography>
                    ) : null}
                    {locationError ? (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                        {locationError}
                      </Typography>
                    ) : null}
                  </Box>
                );
              }}
            />
          </Box>
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
