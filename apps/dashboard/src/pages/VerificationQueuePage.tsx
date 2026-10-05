import {
  HAZARD_TYPE_LABELS,
  SEVERITY_LABELS,
  toErrorMessage,
  USER_ROLE_LABELS,
  type HazardReport,
} from '@lankashield/shared';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { PageHeader } from '../components/layout/PageHeader';
import { useVerificationQueue } from '../features/verification/useVerificationQueue';
import { formatDateTime, formatRelative } from '../utils/format';

const SEVERITY_COLOR = {
  LOW: 'default',
  MODERATE: 'info',
  HIGH: 'warning',
  EXTREME: 'error',
} as const;

function QueueTable({ reports }: { reports: HazardReport[] }) {
  return (
    <TableContainer>
      <Table size="small" aria-label="Reports waiting for verification">
        <TableHead>
          <TableRow>
            <TableCell>Report</TableCell>
            <TableCell>Hazard</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>District</TableCell>
            <TableCell>Reporter</TableCell>
            <TableCell align="center">Evidence</TableCell>
            <TableCell>Received</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((r) => (
            <TableRow key={r.reportId} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {r.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.reportId}
                </Typography>
              </TableCell>
              <TableCell>{HAZARD_TYPE_LABELS[r.hazardType]}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  variant="outlined"
                  color={SEVERITY_COLOR[r.severity]}
                  label={SEVERITY_LABELS[r.severity]}
                />
              </TableCell>
              <TableCell>{r.district}</TableCell>
              <TableCell>{USER_ROLE_LABELS[r.reporterRole]}</TableCell>
              <TableCell align="center">
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <PhotoLibraryOutlined fontSize="small" color="action" />
                  <span>{r.evidenceUrls.length}</span>
                </Stack>
              </TableCell>
              <TableCell>
                <Tooltip title={formatDateTime(r.createdAt)}>
                  <span>{formatRelative(r.createdAt)}</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// UC02 queue. Filters and the review/decision screen are added in Phase 7.
export default function VerificationQueuePage() {
  const { state, retry } = useVerificationQueue();

  return (
    <>
      <PageHeader
        title="Verification Queue"
        subtitle="Hazard reports waiting for review, newest first"
        actions={
          state.status === 'success' ? (
            <Chip
              icon={<FiberManualRecord sx={{ fontSize: 12 }} />}
              label={`Live · ${state.data.length} pending`}
              color="success"
              variant="outlined"
            />
          ) : undefined
        }
      />
      <Card>
        {state.status === 'loading' && <LoadingState message="Loading pending reports…" />}
        {state.status === 'error' && (
          <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
        )}
        {state.status === 'success' &&
          (state.data.length === 0 ? (
            <EmptyState
              icon={<InboxOutlined />}
              title="No reports waiting for verification"
              message="New reports from the mobile app appear here automatically."
            />
          ) : (
            <QueueTable reports={state.data} />
          ))}
      </Card>
    </>
  );
}
