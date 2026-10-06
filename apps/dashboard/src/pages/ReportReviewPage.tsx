import {
  HAZARD_REPORT_STATUS_PRESENTATION,
  HAZARD_TYPE_LABELS,
  SEVERITY_LABELS,
  toErrorMessage,
  USER_ROLE_LABELS,
  type HazardReport,
} from '@lankashield/shared';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback } from 'react';
import { Link as RouterLink, useParams } from 'react-router';

import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { StatusChip } from '../components/feedback/StatusChip';
import { PointMap } from '../components/maps/PointMap';
import { DecisionForm } from '../features/verification/DecisionForm';
import { RecordedDecision } from '../features/verification/RecordedDecision';
import { Row, Section } from '../features/verification/ReviewLayout';
import {
  loadReviewContext,
  subscribeToReport,
  type ReviewContext,
} from '../services/verification';
import { useAsync } from '../hooks/useAsync';
import { useLive, type Subscribe } from '../hooks/useLive';
import { formatDateTime } from '../utils/format';

function ContextPanels({ report }: { report: HazardReport }) {
  const load = useCallback(() => loadReviewContext(report), [report]);
  const { state, retry } = useAsync<ReviewContext>(load);
  const pending = report.status === 'PENDING_VERIFICATION';

  if (state.status === 'loading') return <LoadingState message="Loading reporter and events…" />;
  if (state.status === 'error') {
    return <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />;
  }
  const { reporter, duplicates, events } = state.data;

  return (
    <Stack spacing={3}>
      {pending ? (
        <Section title="Decision">
          <DecisionForm reportId={report.reportId} events={events} />
        </Section>
      ) : (
        <RecordedDecision report={report} events={events} />
      )}

      <Section title="Reporter">
        {reporter ? (
          <>
            <Row label="Name" value={reporter.fullName} />
            <Row label="Role" value={USER_ROLE_LABELS[reporter.role]} />
            <Row label="Email" value={reporter.email} />
            <Row label="Phone" value={reporter.phone ?? 'Not provided'} />
          </>
        ) : (
          <Typography color="textSecondary">Reporter profile not found.</Typography>
        )}
      </Section>

      <Section title={`Possible duplicates (${duplicates.length})`}>
        {duplicates.length === 0 ? (
          <Typography color="textSecondary">
            No other {HAZARD_TYPE_LABELS[report.hazardType].toLowerCase()} reports within 1 km and
            24 hours.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1}>
            {duplicates.map((d) => (
              <Box key={d.report.reportId}>
                <Link component={RouterLink} to={`/verification/${d.report.reportId}`}>
                  {d.report.title}
                </Link>
                <Typography variant="caption" color="textSecondary" component="div">
                  {d.report.reportId} · {(d.distanceKm * 1000).toFixed(0)} m away ·{' '}
                  {d.hoursApart.toFixed(1)} h apart ·{' '}
                  {HAZARD_REPORT_STATUS_PRESENTATION[d.report.status].label}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Section>
    </Stack>
  );
}

function ReviewContent({ report }: { report: HazardReport }) {
  return (
    <>
      <Stack
        direction="row"
        sx={{
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}>
        <Box>
          <Typography variant="h5" component="h1">
            {report.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <Typography color="textSecondary">{report.reportId}</Typography>
            <Button
              size="small"
              startIcon={<ContentCopyOutlined fontSize="small" />}
              onClick={() => void navigator.clipboard.writeText(report.reportId)}
              aria-label="Copy tracking ID">
              Copy
            </Button>
          </Stack>
        </Box>
        <StatusChip presentation={HAZARD_REPORT_STATUS_PRESENTATION[report.status]} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 3 }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Section title="Report">
            <Row label="Hazard" value={HAZARD_TYPE_LABELS[report.hazardType]} />
            <Row label="Severity" value={SEVERITY_LABELS[report.severity]} />
            <Row label="District" value={report.district} />
            <Row label="Received" value={formatDateTime(report.createdAt)} />
            <Row
              label="Submitted"
              value={`${formatDateTime(report.clientCreatedAt)} on the device${
                report.syncSource === 'OFFLINE_QUEUE' ? ' (sent from the offline queue)' : ''
              }`}
            />
            <Row
              label="Description"
              value={<Typography sx={{ whiteSpace: 'pre-wrap' }}>{report.description}</Typography>}
            />
          </Section>

          <Section title={`Evidence (${report.evidenceUrls.length})`}>
            {report.evidenceUrls.length === 0 ? (
              <Typography color="textSecondary">No photos were attached.</Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 1.5,
                }}>
                {report.evidenceUrls.map((url, i) => (
                  <Box
                    key={url}
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open evidence photo ${i + 1} in a new tab`}
                    sx={{
                      display: 'block',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                    }}>
                    <Box
                      component="img"
                      src={url}
                      alt={`Evidence photo ${i + 1}`}
                      loading="lazy"
                      sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Section>

          <Section title="Location">
            <PointMap point={report.location} height={300} />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {report.location.address ?? 'No address'} · {report.location.latitude.toFixed(5)},{' '}
              {report.location.longitude.toFixed(5)} ·{' '}
              {report.location.source === 'GPS' ? 'GPS' : 'Selected on map'}
            </Typography>
          </Section>
        </Stack>

        <ContextPanels report={report} />
      </Box>
    </>
  );
}

/** UC02 report review: evidence, map, reporter, duplicates and the decision form. */
export default function ReportReviewPage() {
  const { reportId = '' } = useParams();
  const subscribe = useCallback<Subscribe<HazardReport | null>>(
    (onData, onError) => subscribeToReport(reportId, onData, onError),
    [reportId],
  );
  const { state, retry } = useLive(subscribe);

  return (
    <>
      <Button
        component={RouterLink}
        to="/verification"
        startIcon={<ArrowBackOutlined />}
        sx={{ mb: 2 }}>
        Verification Queue
      </Button>
      {state.status === 'loading' && <LoadingState message="Loading report…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {state.status === 'success' && !state.data && (
        <Card>
          <EmptyState
            icon={<SearchOffOutlined />}
            title="Report not found"
            message={`No report with ID ${reportId}.`}
          />
        </Card>
      )}
      {state.status === 'success' && state.data && <ReviewContent report={state.data} />}
    </>
  );
}
