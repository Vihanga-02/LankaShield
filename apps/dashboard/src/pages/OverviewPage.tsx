import {
  HAZARD_REPORT_STATUS_PRESENTATION,
  HAZARD_TYPE_LABELS,
  SEVERITY_LABELS,
  SHELTER_STATUS_PRESENTATION,
  SHELTER_STATUSES,
  toErrorMessage,
} from '@lankashield/shared';
import EventOutlined from '@mui/icons-material/EventOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import HolidayVillageOutlined from '@mui/icons-material/HolidayVillageOutlined';
import HourglassEmptyOutlined from '@mui/icons-material/HourglassEmptyOutlined';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { StatusChip } from '../components/feedback/StatusChip';
import { PageHeader } from '../components/layout/PageHeader';
import { loadOverview, type OverviewData } from '../features/overview/overview.service';
import { useAsync } from '../hooks/useAsync';
import { useAuthStore } from '../store/authStore';
import { formatDate, formatDateTime, formatNumber } from '../utils/format';

function KpiCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Card sx={{ flex: '1 1 200px' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            opacity: 0.9,
          }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5">{value}</Typography>
          <Typography variant="body2" color="textSecondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card sx={{ flex: '1 1 340px', minWidth: 0 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function OverviewContent({ data }: { data: OverviewData }) {
  const { shelters } = data;
  const occupancyRate = shelters.capacity > 0 ? (shelters.occupancy / shelters.capacity) * 100 : 0;

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
        <KpiCard
          label="Pending verification"
          value={formatNumber(data.pendingReports)}
          icon={<HourglassEmptyOutlined />}
        />
        <KpiCard
          label="Verified reports"
          value={formatNumber(data.verifiedReports)}
          icon={<FactCheckOutlined />}
        />
        <KpiCard
          label="Active disaster events"
          value={formatNumber(data.activeEvents.length)}
          icon={<EventOutlined />}
        />
        <KpiCard
          label="Available shelter places"
          value={formatNumber(shelters.availablePlaces)}
          icon={<HolidayVillageOutlined />}
        />
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent hazard reports
          </Typography>
          {data.recentReports.length === 0 ? (
            <EmptyState icon={<InboxOutlined />} title="No hazard reports yet" />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Report</TableCell>
                    <TableCell>Hazard</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>District</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Received</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentReports.map((r) => (
                    <TableRow key={r.reportId} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {r.reportId}
                        </Typography>
                      </TableCell>
                      <TableCell>{HAZARD_TYPE_LABELS[r.hazardType]}</TableCell>
                      <TableCell>{SEVERITY_LABELS[r.severity]}</TableCell>
                      <TableCell>{r.district}</TableCell>
                      <TableCell>
                        <StatusChip presentation={HAZARD_REPORT_STATUS_PRESENTATION[r.status]} />
                      </TableCell>
                      <TableCell>{formatDateTime(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 3 }}>
        <SectionCard title="Shelter summary">
          {shelters.total === 0 ? (
            <EmptyState icon={<HolidayVillageOutlined />} title="No shelters registered" />
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {SHELTER_STATUSES.filter((s) => shelters.byStatus[s] > 0).map((s) => (
                  <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StatusChip presentation={SHELTER_STATUS_PRESENTATION[s]} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {shelters.byStatus[s]}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Occupancy of open shelters: {formatNumber(shelters.occupancy)} /{' '}
                  {formatNumber(shelters.capacity)} ({occupancyRate.toFixed(0)}%)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(occupancyRate, 100)}
                  aria-label="Shelter occupancy"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Disaster events">
          {data.activeEvents.length === 0 ? (
            <EmptyState icon={<EventOutlined />} title="No active events" />
          ) : (
            <Stack spacing={1.5}>
              {data.activeEvents.map((e) => (
                <Box key={e.eventId}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {e.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {HAZARD_TYPE_LABELS[e.hazardType]} · {e.district} · since{' '}
                    {formatDate(e.startedAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            {data.completedEvents} completed event{data.completedEvents === 1 ? '' : 's'}
          </Typography>
        </SectionCard>
      </Stack>

      <Typography variant="caption" color="textSecondary">
        Last updated {formatDateTime(data.loadedAt)}
      </Typography>
    </Stack>
  );
}

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);
  const { state, retry } = useAsync(loadOverview);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={user ? `Welcome back, ${user.fullName.split(' ')[0]}` : undefined}
      />
      {state.status === 'loading' && <LoadingState message="Loading overview…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {state.status === 'success' && <OverviewContent data={state.data} />}
    </>
  );
}
