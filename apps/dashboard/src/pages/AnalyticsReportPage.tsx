import {
  APP_ERROR_MESSAGES,
  alertsByDay,
  calculateResponseMetrics,
  citizenReachByDivision,
  DISASTER_REPORT_STATUS_PRESENTATION,
  DISTRICTS,
  HAZARD_TYPE_LABELS,
  METRIC_LABELS,
  resourcesByCategory,
  reportFiltersInputSchema,
  reportsByDay,
  reportsByHazardType,
  shelterOccupancyOverTime,
  toErrorMessage,
  verificationOutcomes,
  type AnalyticsResult,
  type DisasterEvent,
  type DisasterResponseReport,
  type ReportFilters,
  type ReportMetric,
} from '@lankashield/shared';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlineOutlined';
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';

import { ChartCard } from '../components/charts/ChartCard';
import {
  AlertTimelineChart,
  CountBarChart,
  ReportsByDayChart,
  ShelterOccupancyTimelineChart,
} from '../components/charts/charts';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { LoadingState } from '../components/feedback/LoadingState';
import { StatusChip } from '../components/feedback/StatusChip';
import { PageHeader } from '../components/layout/PageHeader';
import {
  getEvent,
  loadAnalyticsSources,
  recordShare,
  saveResponseReport,
  subscribeToResponseReports,
  uploadReportPdf,
} from '../features/analytics/analytics.service';
import { useAsync } from '../hooks/useAsync';
import { useLive, type Subscribe } from '../hooks/useLive';
import { useAuthStore } from '../store/authStore';
import { formatDate, formatDateTime, formatNumber } from '../utils/format';

/** Mocked donor organisations for the authorised-share step (no real integration). */
const DONOR_ORGANISATIONS = [
  'Community Recovery Trust (mock)',
  'Global Humanitarian Partners (mock)',
  'Island Relief Fund (mock)',
];

interface Analysis {
  result: AnalyticsResult;
  filters: ReportFilters;
}

async function analyse(event: DisasterEvent, filters: ReportFilters): Promise<Analysis> {
  const sources = await loadAnalyticsSources(event);
  return {
    result: calculateResponseMetrics({ event, filters, ...sources, now: new Date().toISOString() }),
    filters,
  };
}

function MetricTile({ metric }: { metric: ReportMetric }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="textSecondary">
          {METRIC_LABELS[metric.key]}
        </Typography>
        <Typography variant="h4" component="p" sx={{ my: 0.5 }}>
          {metric.value === null ? '—' : formatNumber(metric.value)}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          {metric.complete ? (
            <CheckCircleOutline fontSize="small" color="success" />
          ) : (
            <WarningAmberOutlined fontSize="small" color="warning" />
          )}
          <Typography variant="caption" color="textSecondary">
            {metric.value === null ? 'Unavailable' : metric.complete ? 'Complete' : 'Incomplete'} ·{' '}
            {metric.sourceCollection}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EventAnalytics({ event }: { event: DisasterEvent }) {
  const analyst = useAuthStore((s) => s.user);
  const defaultFilters: ReportFilters = {};

  // Filter form
  const [district, setDistrict] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);

  // Analysis run — kept on screen when saving, exporting or sharing fails, so nothing is recalculated.
  const [request, setRequest] = useState({ filters: defaultFilters, n: 0 });
  const [analysis, setAnalysis] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'ready'; data: Analysis }
  >({ status: 'loading' });

  useEffect(() => {
    let active = true;
    analyse(event, request.filters).then(
      (data) => active && setAnalysis({ status: 'ready', data }),
      (error: unknown) => active && setAnalysis({ status: 'error', error }),
    );
    return () => {
      active = false;
    };
  }, [event, request]);

  const [saved, setSaved] = useState<{ n: number; id: string } | null>(null);
  const savedId = saved?.n === request.n ? saved.id : null;
  const [busy, setBusy] = useState<'saving' | 'exporting' | 'sharing' | null>(null);
  const [actionError, setActionError] = useState<{
    action: 'save' | 'export' | 'share';
    message: string;
  } | null>(null);
  const [exportedUrl, setExportedUrl] = useState<{ n: number; url: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [organisation, setOrganisation] = useState(DONOR_ORGANISATIONS[0]);
  const [toast, setToast] = useState<string | null>(null);

  const subscribeHistory = useCallback<Subscribe<DisasterResponseReport[]>>(
    (onData, onError) => subscribeToResponseReports(event.eventId, onData, onError),
    [event.eventId],
  );
  const history = useLive(subscribeHistory);

  const generate = (filters: ReportFilters) => {
    setAnalysis({ status: 'loading' });
    setActionError(null);
    setRequest((r) => ({ filters, n: r.n + 1 }));
  };

  const applyFilters = () => {
    const parsed = reportFiltersInputSchema.safeParse({
      eventId: event.eventId,
      district: district || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0]?.message ?? 'Check the filters.');
      return;
    }
    setFilterError(null);
    const { district: d, from: f, to: t } = parsed.data;
    generate({ district: d, from: f, to: t });
  };

  if (analysis.status === 'loading') return <LoadingState message="Calculating metrics…" />;
  if (analysis.status === 'error') {
    return (
      <ErrorState
        message={toErrorMessage(analysis.error)}
        onRetry={() => generate(request.filters)}
      />
    );
  }

  const { result, filters } = analysis.data;
  const isFinal = result.status === 'FINAL';
  const byDay = reportsByDay(result.eventReports);
  const byHazard = reportsByHazardType(result.eventReports);
  const outcomes = verificationOutcomes(result.eventReports).map((o) =>
    o.label === 'Pending' ? { ...o, count: result.unreviewedReports } : o,
  );
  const alertTimeline = alertsByDay(result.alerts);
  const reachByDivision = citizenReachByDivision(result.citizenReach);
  const occupancyTimeline = shelterOccupancyOverTime(result.occupancySnapshots);
  const resourceCategories = resourcesByCategory(result.resourceDistributions);
  const calculatedAt = result.metrics[0]?.calculatedAt ?? new Date().toISOString();
  const currentExportUrl = exportedUrl?.n === request.n ? exportedUrl.url : null;

  const ensureSaved = async (): Promise<string> => {
    if (savedId) return savedId;
    if (!analyst) throw new Error('Not signed in.');
    const id = await saveResponseReport({ event, result, filters, analyst });
    setSaved({ n: request.n, id });
    return id;
  };

  const onSave = async () => {
    setBusy('saving');
    setActionError(null);
    try {
      await ensureSaved();
      setToast('Report saved.');
    } catch (err) {
      setActionError({ action: 'save', message: toErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const onExport = async () => {
    setBusy('exporting');
    setActionError(null);
    try {
      const id = await ensureSaved();
      // jsPDF is loaded only when exporting, keeping it out of the page bundle.
      const { buildReportPdf } = await import('../features/analytics/pdf');
      const pdf = buildReportPdf({
        responseReportId: id,
        event,
        result,
        filters,
        generatedBy: analyst?.fullName ?? 'DMC Analyst',
        byHazard,
        outcomes,
        alertTimeline,
        reachByDivision,
        occupancyTimeline,
        resourceCategories,
      });
      const url = await uploadReportPdf(id, pdf.output('blob'));
      pdf.save(`LankaShield-${event.eventId}-${id}.pdf`);
      setExportedUrl({ n: request.n, url });
      setToast('PDF exported and stored.');
    } catch (err) {
      setActionError({ action: 'export', message: toErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (!analyst || !savedId) return;
    setBusy('sharing');
    setActionError(null);
    try {
      await recordShare(savedId, organisation, analyst);
      setShareOpen(false);
      setToast(`Authorised share with ${organisation} recorded.`);
    } catch (err) {
      setActionError({ action: 'share', message: toErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const provisionalReasons = [
    event.status === 'ACTIVE' ? 'the event is still active' : null,
    result.missingMetrics.length > 0 ? 'some metrics are missing or incomplete' : null,
  ].filter(Boolean);

  return (
    <Stack spacing={3}>
      {/* Filters */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            select
            size="small"
            label="District"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            sx={{ minWidth: 170 }}>
            <MenuItem value="">All event districts</MenuItem>
            {DISTRICTS.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={applyFilters}>
            Generate report
          </Button>
          <Button
            onClick={() => {
              setDistrict('');
              setFrom('');
              setTo('');
              setFilterError(null);
              generate(defaultFilters);
            }}>
            Reset
          </Button>
        </Stack>
        {filterError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {filterError}
          </Alert>
        ) : null}
      </Card>

      {/* Status, freshness and completeness */}
      <Card>
        <CardContent>
          <Stack
            direction="row"
            sx={{
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <StatusChip presentation={DISASTER_REPORT_STATUS_PRESENTATION[result.status]} />
              <Typography variant="body2" color="textSecondary">
                {isFinal
                  ? 'Completed event with every metric complete.'
                  : `Provisional because ${provisionalReasons.join(' and ')}.`}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Data as of {formatDateTime(calculatedAt)}
              </Typography>
              <Button
                size="small"
                startIcon={<RefreshOutlined />}
                onClick={() => generate(filters)}>
                Refresh
              </Button>
            </Stack>
          </Stack>
          {result.unreviewedReports > 0 ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {result.unreviewedReports} hazard report
              {result.unreviewedReports === 1 ? ' is' : 's are'} in {event.district} during this
              event still waiting for verification. This only affects the optional hazard-report
              context; the alert, reach, shelter and relief metrics remain independently complete.
            </Alert>
          ) : null}
          {result.missingMetrics.length > 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {APP_ERROR_MESSAGES.INCOMPLETE_DATA.message} Missing or incomplete:{' '}
              {result.missingMetrics.map((k) => METRIC_LABELS[k]).join(', ')}.
            </Alert>
          ) : null}
          {result.eventReports.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No hazard reports linked to this event match these filters.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {/* Metrics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}>
        {result.metrics.map((m) => (
          <MetricTile key={m.key} metric={m} />
        ))}
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <ChartCard
          title="Alert timeline"
          subtitle="Official alerts issued by day and threat level"
          table={{
            columns: ['Day', 'High', 'Medium', 'Advisory'],
            rows: alertTimeline.map((d) => [d.day, d.high, d.medium, d.advisory]),
          }}>
          <AlertTimelineChart data={alertTimeline} />
        </ChartCard>
        <ChartCard
          title="Shelter occupancy over time"
          subtitle="Historical event occupancy against activated capacity"
          table={{
            columns: ['Day', 'Occupied', 'Capacity', 'Rate'],
            rows: occupancyTimeline.map((d) => [d.day, d.occupancy, d.capacity, `${d.rate}%`]),
          }}>
          <ShelterOccupancyTimelineChart data={occupancyTimeline} />
        </ChartCard>
        <ChartCard
          title="Citizen reach by GS division"
          subtitle="Unique citizens reached by official alerts"
          table={{
            columns: ['GS division', 'Citizens'],
            rows: reachByDivision.map((d) => [d.label, d.count]),
          }}>
          <CountBarChart data={reachByDivision} valueLabel="Citizens" />
        </ChartCard>
        <ChartCard
          title={`Resource Distribution – ${event.district}`}
          subtitle="Relief items distributed during the event"
          table={{
            columns: ['Resource', 'Quantity'],
            rows: resourceCategories.map((d) => [d.label, d.count]),
          }}>
          <CountBarChart data={resourceCategories} valueLabel="Quantity" />
        </ChartCard>
        <ChartCard
          title="Verification outcomes"
          subtitle="Pending = unreviewed reports in the event area"
          table={{ columns: ['Outcome', 'Reports'], rows: outcomes.map((d) => [d.label, d.count]) }}
          empty="No reports to show.">
          <CountBarChart data={outcomes} valueLabel="Reports" />
        </ChartCard>
        <ChartCard
          title="Hazard reports by day"
          subtitle="Optional operational context linked to this event"
          table={{ columns: ['Day', 'Reports'], rows: byDay.map((d) => [d.day, d.count]) }}>
          <ReportsByDayChart data={byDay} />
        </ChartCard>
        <ChartCard
          title="Reports by hazard type"
          subtitle="Optional operational context"
          table={{ columns: ['Hazard', 'Reports'], rows: byHazard.map((d) => [d.label, d.count]) }}>
          <CountBarChart data={byHazard} valueLabel="Reports" />
        </ChartCard>
      </Box>

      {/* Save, export, share */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Save, export and share
          </Typography>
          {actionError ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={
                    actionError.action === 'export'
                      ? onExport
                      : actionError.action === 'save'
                        ? onSave
                        : onShare
                  }>
                  Retry
                </Button>
              }>
              {actionError.action === 'export' ? 'PDF export failed. ' : ''}
              {actionError.message} The analysis above is kept — nothing needs to be recalculated.
            </Alert>
          ) : null}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<SaveOutlined />}
              onClick={onSave}
              disabled={!!busy || !!savedId}>
              {savedId ? 'Saved' : busy === 'saving' ? 'Saving…' : 'Save report'}
            </Button>
            <Button
              variant="contained"
              startIcon={<PictureAsPdfOutlined />}
              onClick={onExport}
              disabled={!!busy}>
              {busy === 'exporting' ? 'Exporting…' : 'Export PDF'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareOutlined />}
              onClick={() => setShareOpen(true)}
              disabled={!!busy || !savedId || !isFinal}>
              Share with donor
            </Button>
            {currentExportUrl ? (
              <Link
                href={currentExportUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2">
                Open stored PDF
              </Link>
            ) : null}
          </Stack>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            {isFinal
              ? 'Save the report first; only authorised final reports can be shared with donor organisations.'
              : 'Provisional reports can be saved and exported but not shared with donors.'}
          </Typography>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Saved reports for this event
          </Typography>
          {history.state.status === 'loading' && <LoadingState message="Loading saved reports…" />}
          {history.state.status === 'error' && (
            <ErrorState message={toErrorMessage(history.state.error)} onRetry={history.retry} />
          )}
          {history.state.status === 'success' && history.state.data.length === 0 && (
            <Typography color="textSecondary">No reports saved yet.</Typography>
          )}
          {history.state.status === 'success' && history.state.data.length > 0 && (
            <Stack divider={<Divider flexItem />} spacing={1}>
              {history.state.data.map((r) => (
                <Stack
                  key={r.responseReportId}
                  direction="row"
                  sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                  <StatusChip presentation={DISASTER_REPORT_STATUS_PRESENTATION[r.status]} />
                  <Typography variant="body2">{formatDateTime(r.generatedAt)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {r.metrics.alertsIssued ?? 0} alerts · {r.metrics.resourcesDistributed ?? 0}{' '}
                    resource units
                    {r.missingMetrics.length > 0 ? ` · ${r.missingMetrics.length} incomplete` : ''}
                  </Typography>
                  {r.exportedUrl ? (
                    <Link
                      href={r.exportedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2">
                      PDF
                    </Link>
                  ) : null}
                  {r.shares && r.shares.length > 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      Shared with {r.shares.map((s) => s.organisation).join(', ')}
                    </Typography>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={shareOpen}
        onClose={busy ? undefined : () => setShareOpen(false)}
        maxWidth="xs"
        fullWidth>
        <DialogTitle>Share final report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Records an authorised share of this final report. Donor delivery is mocked in this
            prototype.
          </Typography>
          <TextField
            select
            fullWidth
            label="Donor organisation"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}>
            {DONOR_ORGANISATIONS.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)} disabled={!!busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={onShare} disabled={!!busy}>
            {busy === 'sharing' ? 'Recording…' : 'Record share'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Stack>
  );
}

/** UC04 Generate and Analyze Disaster Response Report. */
export default function AnalyticsReportPage() {
  const { eventId = '' } = useParams();
  const load = useCallback(() => getEvent(eventId), [eventId]);
  const { state, retry } = useAsync(load);

  return (
    <>
      <Button
        component={RouterLink}
        to="/analytics"
        startIcon={<ArrowBackOutlined />}
        sx={{ mb: 2 }}>
        All events
      </Button>
      {state.status === 'loading' && <LoadingState message="Loading event…" />}
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {state.status === 'success' && !state.data && (
        <Card>
          <EmptyState icon={<EventBusyOutlined />} title="Event not found" />
        </Card>
      )}
      {state.status === 'success' && state.data && (
        <>
          <PageHeader
            title={state.data.name}
            subtitle={`${HAZARD_TYPE_LABELS[state.data.hazardType]} · ${state.data.district} · ${formatDate(state.data.startedAt)} – ${
              state.data.endedAt ? formatDate(state.data.endedAt) : 'ongoing'
            }`}
          />
          <EventAnalytics event={state.data} />
        </>
      )}
    </>
  );
}
