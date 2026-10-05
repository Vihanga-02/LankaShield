import {
  HAZARD_TYPE_LABELS,
  toErrorMessage,
  type DisasterEvent,
  type DisasterEventStatus,
} from '@lankashield/shared';
import EventOutlined from '@mui/icons-material/EventOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';

import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { PageHeader } from '../components/layout/PageHeader';
import { listEvents } from '../features/analytics/analytics.service';
import { useAsync } from '../hooks/useAsync';
import { formatDate } from '../utils/format';

function EventStatusChip({ status }: { status: DisasterEventStatus }) {
  return status === 'ACTIVE' ? (
    <Chip size="small" color="warning" variant="outlined" label="Active" />
  ) : (
    <Chip size="small" color="success" variant="outlined" label="Completed" />
  );
}

/** UC04 step 1: choose the disaster event to analyse. */
export default function AnalyticsPage() {
  const { state, retry } = useAsync(listEvents);
  const [status, setStatus] = useState<DisasterEventStatus | ''>('');
  const [district, setDistrict] = useState('');
  const [search, setSearch] = useState('');

  const events = state.status === 'success' ? state.data : [];
  const term = search.trim().toLowerCase();
  const visible = events.filter(
    (e: DisasterEvent) =>
      (!status || e.status === status) &&
      (!district || e.district === district) &&
      (!term || e.name.toLowerCase().includes(term)),
  );
  const districts = [...new Set(events.map((e) => e.district))].sort();

  return (
    <>
      <PageHeader
        title="Disaster Analytics"
        subtitle="Select a disaster event to generate and analyse its response report"
      />

      {state.status === 'loading' && <LoadingState message="Loading disaster events…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {state.status === 'success' && (
        <Stack spacing={2}>
          <Card sx={{ p: 2 }}>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
              <TextField
                size="small"
                label="Search events"
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
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DisasterEventStatus | '')}
                sx={{ minWidth: 160 }}>
                <MenuItem value="">All events</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
              </TextField>
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
            </Stack>
          </Card>

          <Card>
            {visible.length === 0 ? (
              <EmptyState
                icon={<EventOutlined />}
                title={
                  events.length === 0 ? 'No disaster events yet' : 'No events match these filters'
                }
              />
            ) : (
              <TableContainer>
                <Table size="small" aria-label="Disaster events">
                  <TableHead>
                    <TableRow>
                      <TableCell>Event</TableCell>
                      <TableCell>Hazard</TableCell>
                      <TableCell>District</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map((e) => (
                      <TableRow key={e.eventId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {e.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{HAZARD_TYPE_LABELS[e.hazardType]}</TableCell>
                        <TableCell>{e.district}</TableCell>
                        <TableCell>
                          {formatDate(e.startedAt)} –{' '}
                          {e.endedAt ? formatDate(e.endedAt) : 'ongoing'}
                        </TableCell>
                        <TableCell>
                          <EventStatusChip status={e.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            component={RouterLink}
                            to={`/analytics/${e.eventId}`}
                            variant="outlined"
                            size="small">
                            Analyse
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Stack>
      )}
    </>
  );
}
