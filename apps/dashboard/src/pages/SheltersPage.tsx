import {
  SHELTER_STATUS_PRESENTATION,
  SHELTER_STATUSES,
  toErrorMessage,
  type DisasterEvent,
  type EmergencyShelter,
  type ShelterStatus,
} from '@lankashield/shared';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HolidayVillageOutlined from '@mui/icons-material/HolidayVillageOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
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
import { StatusChip } from '../components/feedback/StatusChip';
import { PageHeader } from '../components/layout/PageHeader';
import { ShelterMap } from '../components/maps/ShelterMap';
import { AllocationDialog } from '../features/shelters/AllocationDialog';
import { loadActiveEvents, subscribeToShelters } from '../features/shelters/shelters.service';
import { ShelterFormDialog } from '../features/shelters/ShelterFormDialog';
import { useAsync } from '../hooks/useAsync';
import { useLive } from '../hooks/useLive';
import { formatNumber } from '../utils/format';

type Dialog =
  | { kind: 'register' }
  | { kind: 'edit'; shelter: EmergencyShelter }
  | { kind: 'allocate'; shelter: EmergencyShelter }
  | null;

function ShelterTable({
  shelters,
  onEdit,
  onAllocate,
}: {
  shelters: EmergencyShelter[];
  onEdit: (s: EmergencyShelter) => void;
  onAllocate: (s: EmergencyShelter) => void;
}) {
  return (
    <TableContainer>
      <Table size="small" aria-label="Emergency shelters">
        <TableHead>
          <TableRow>
            <TableCell>Shelter</TableCell>
            <TableCell>District</TableCell>
            <TableCell align="right">Capacity</TableCell>
            <TableCell sx={{ minWidth: 180 }}>Occupancy</TableCell>
            <TableCell align="right">Available</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shelters.map((s) => {
            const rate = s.capacity > 0 ? (s.currentOccupancy / s.capacity) * 100 : 0;
            return (
              <TableRow key={s.shelterId} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {s.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {s.address}
                    {s.contactPhone ? ` · ${s.contactName ?? 'Contact'} ${s.contactPhone}` : ''}
                  </Typography>
                </TableCell>
                <TableCell>{s.district}</TableCell>
                <TableCell align="right">{formatNumber(s.capacity)}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatNumber(s.currentOccupancy)} ({rate.toFixed(0)}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(rate, 100)}
                    aria-label={`${s.name} occupancy`}
                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatNumber(s.availableCapacity)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusChip presentation={SHELTER_STATUS_PRESENTATION[s.status]} />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onAllocate(s)}
                    disabled={s.status === 'CLOSED'}>
                    Allocate
                  </Button>
                  <Tooltip title="Edit shelter">
                    <IconButton
                      aria-label={`Edit ${s.name}`}
                      onClick={() => onEdit(s)}
                      sx={{ ml: 0.5 }}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const noEvents = async (): Promise<DisasterEvent[]> => loadActiveEvents();

/** UC03 Manage Emergency Shelter. */
export default function SheltersPage() {
  const { state, retry } = useLive(subscribeToShelters);
  const events = useAsync(noEvents);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [status, setStatus] = useState<ShelterStatus | ''>('');

  const shelters = state.status === 'success' ? state.data : [];
  const term = search.trim().toLowerCase();
  const visible = shelters.filter(
    (s) =>
      (!district || s.district === district) &&
      (!status || s.status === status) &&
      (!term || s.name.toLowerCase().includes(term) || s.address.toLowerCase().includes(term)),
  );
  const districts = [...new Set(shelters.map((s) => s.district))].sort();
  const activeEvents = events.state.status === 'success' ? events.state.data : [];

  return (
    <>
      <PageHeader
        title="Shelters"
        subtitle="Register shelters, check capacity and allocate evacuees"
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => setDialog({ kind: 'register' })}>
            Register shelter
          </Button>
        }
      />

      {state.status === 'loading' && <LoadingState message="Loading shelters…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {events.state.status === 'error' && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={<Button onClick={events.retry}>Retry</Button>}>
          Disaster events could not be loaded, so allocations cannot be linked to an event.
        </Alert>
      )}

      {state.status === 'success' && shelters.length === 0 && (
        <Card>
          <EmptyState
            icon={<HolidayVillageOutlined />}
            title="No shelters registered"
            message="Register the first emergency shelter to start allocating evacuees."
          />
        </Card>
      )}

      {state.status === 'success' && shelters.length > 0 && (
        <Stack spacing={3}>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {SHELTER_STATUSES.map((s) => {
              const n = shelters.filter((x) => x.status === s).length;
              return n > 0 ? (
                <Stack key={s} direction="row" spacing={0.5} sx={{ alignItems: 'center', mr: 1.5 }}>
                  <StatusChip presentation={SHELTER_STATUS_PRESENTATION[s]} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {n}
                  </Typography>
                </Stack>
              ) : null;
            })}
          </Stack>

          <Card sx={{ p: 2 }}>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
              <TextField
                size="small"
                label="Search"
                placeholder="Name or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: '1 1 240px' }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlined fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select
                size="small"
                label="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                sx={{ minWidth: 160 }}>
                <MenuItem value="">All districts</MenuItem>
                {districts.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ShelterStatus | '')}
                sx={{ minWidth: 160 }}>
                <MenuItem value="">All statuses</MenuItem>
                {SHELTER_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {SHELTER_STATUS_PRESENTATION[s].label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Card>

          <Card sx={{ p: 2 }}>
            <ShelterMap
              shelters={visible}
              onAllocate={(s) => setDialog({ kind: 'allocate', shelter: s })}
            />
          </Card>

          <Card>
            {visible.length === 0 ? (
              <EmptyState icon={<SearchOutlined />} title="No shelters match these filters" />
            ) : (
              <Box>
                <ShelterTable
                  shelters={visible}
                  onEdit={(s) => setDialog({ kind: 'edit', shelter: s })}
                  onAllocate={(s) => setDialog({ kind: 'allocate', shelter: s })}
                />
              </Box>
            )}
          </Card>
        </Stack>
      )}

      {dialog?.kind === 'register' || dialog?.kind === 'edit' ? (
        <ShelterFormDialog
          shelter={dialog.kind === 'edit' ? dialog.shelter : undefined}
          shelters={shelters}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setToast(message);
          }}
        />
      ) : null}
      {dialog?.kind === 'allocate' ? (
        <AllocationDialog
          initialShelter={dialog.shelter}
          shelters={shelters}
          events={activeEvents}
          onClose={() => setDialog(null)}
        />
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
