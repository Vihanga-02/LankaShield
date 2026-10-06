import {
  HAZARD_REPORT_STATUS_PRESENTATION,
  HAZARD_TYPE_LABELS,
  HAZARD_TYPES,
  SEVERITIES,
  SEVERITY_LABELS,
  toErrorMessage,
  USER_ROLE_LABELS,
  type HazardReport,
  type HazardType,
  type Severity,
} from '@lankashield/shared';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
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
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { StatusChip } from '../components/feedback/StatusChip';
import { PageHeader } from '../components/layout/PageHeader';
import type { VerificationQueueStatus } from '../features/verification/verification.service';
import { useVerificationQueue } from '../features/verification/useVerificationQueue';
import { formatDateTime, formatRelative } from '../utils/format';

const SEVERITY_COLOR = {
  LOW: 'default',
  MODERATE: 'info',
  HIGH: 'warning',
  EXTREME: 'error',
} as const;

const STATUS_OPTIONS: VerificationQueueStatus[] = [
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'ALL',
];

interface Filters {
  search: string;
  hazardType: HazardType | '';
  severity: Severity | '';
  district: string;
}

function applyFilters(reports: HazardReport[], f: Filters): HazardReport[] {
  const term = f.search.trim().toLowerCase();
  return reports.filter(
    (r) =>
      (!f.hazardType || r.hazardType === f.hazardType) &&
      (!f.severity || r.severity === f.severity) &&
      (!f.district || r.district === f.district) &&
      (!term ||
        r.title.toLowerCase().includes(term) ||
        r.reportId.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term)),
  );
}

function QueueTable({ reports }: { reports: HazardReport[] }) {
  const navigate = useNavigate();
  return (
    <TableContainer>
      <Table size="small" aria-label="Hazard reports">
        <TableHead>
          <TableRow>
            <TableCell>Report</TableCell>
            <TableCell>Hazard</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Reporter</TableCell>
            <TableCell align="center">Evidence</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Age</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((r) => (
            <TableRow
              key={r.reportId}
              hover
              tabIndex={0}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/verification/${r.reportId}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/verification/${r.reportId}`)}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {r.title}
                </Typography>
                <Typography variant="caption" color="textSecondary">
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
              <TableCell>
                <Typography variant="body2">{r.district}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {r.location.address ??
                    `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}`}
                </Typography>
              </TableCell>
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
                <StatusChip presentation={HAZARD_REPORT_STATUS_PRESENTATION[r.status]} />
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

/** UC02 verification queue: live list with search, filters and pagination. */
export default function VerificationQueuePage() {
  const [status, setStatus] = useState<VerificationQueueStatus>('PENDING_VERIFICATION');
  const { state, retry } = useVerificationQueue(status);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    hazardType: '',
    severity: '',
    district: '',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const all = state.status === 'success' ? state.data : [];
  const filtered = applyFilters(all, filters);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const pageRows = filtered.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
  const districts = [...new Set(all.map((r) => r.district))].sort();

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  return (
    <>
      <PageHeader
        title="Verification Queue"
        subtitle="Review hazard reports from citizens and volunteers"
        actions={
          state.status === 'success' ? (
            <Chip
              icon={<FiberManualRecord sx={{ fontSize: 12 }} />}
              label={`Live · ${all.length} ${status === 'ALL' ? 'all' : HAZARD_REPORT_STATUS_PRESENTATION[status].label.toLowerCase()}`}
              color="success"
              variant="outlined"
            />
          ) : undefined
        }
      />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small"
            label="Search"
            placeholder="Title, tracking ID or description"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            sx={{ flex: '1 1 260px' }}
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
            onChange={(e) => {
              setStatus(e.target.value as VerificationQueueStatus);
              setPage(0);
            }}
            sx={{ minWidth: 200 }}>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s === 'ALL' ? 'All' : HAZARD_REPORT_STATUS_PRESENTATION[s].label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Hazard type"
            value={filters.hazardType}
            onChange={(e) => update({ hazardType: e.target.value as HazardType | '' })}
            sx={{ minWidth: 150 }}>
            <MenuItem value="">All types</MenuItem>
            {HAZARD_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {HAZARD_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Severity"
            value={filters.severity}
            onChange={(e) => update({ severity: e.target.value as Severity | '' })}
            sx={{ minWidth: 140 }}>
            <MenuItem value="">All severities</MenuItem>
            {SEVERITIES.map((s) => (
              <MenuItem key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="District"
            value={filters.district}
            onChange={(e) => update({ district: e.target.value })}
            sx={{ minWidth: 150 }}>
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
        {state.status === 'loading' && <LoadingState message="Loading reports…" />}
        {state.status === 'error' && (
          <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
        )}
        {state.status === 'success' && all.length === 0 && (
          <EmptyState
            icon={<InboxOutlined />}
            title={
              status === 'PENDING_VERIFICATION'
                ? 'No reports waiting for verification'
                : `No ${status === 'ALL' ? 'all' : HAZARD_REPORT_STATUS_PRESENTATION[status].label.toLowerCase()} reports`
            }
            message={
              status === 'PENDING_VERIFICATION'
                ? 'New reports from the mobile app appear here automatically.'
                : undefined
            }
          />
        )}
        {state.status === 'success' && all.length > 0 && filtered.length === 0 && (
          <EmptyState icon={<SearchOutlined />} title="No reports match these filters" />
        )}
        {filtered.length > 0 && (
          <>
            <QueueTable reports={pageRows} />
            <TablePagination
              component="div"
              count={filtered.length}
              page={currentPage}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Card>
    </>
  );
}
