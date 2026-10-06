import { HAZARD_REPORT_STATUS_PRESENTATION, VERIFICATION_OUTCOME_LABELS, toErrorMessage, type HazardReport, type VerificationDecision, type WarningRequest } from '@lankashield/shared';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback } from 'react';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { StatusChip } from '../../components/feedback/StatusChip';
import { useAsync } from '../../hooks/useAsync';
import { useLive, type Subscribe } from '../../hooks/useLive';
import { formatDateTime } from '../../utils/format';
import { NotificationOutbox } from '../notifications/NotificationOutbox';
import { loadOfficerName, subscribeToDecision, subscribeToWarnings } from './verification.service';
import { Section, Row } from './ReviewLayout';
function OfficerName({ officerId }: { officerId: string }) {
  const load = useCallback(() => loadOfficerName(officerId), [officerId]);
  const { state } = useAsync(load);
  return <>{state.status === 'success' ? state.data : officerId}</>;
}

function WarningStatus({ reportId }: { reportId: string }) {
  const subscribe = useCallback<Subscribe<WarningRequest[]>>(
    (onData, onError) => subscribeToWarnings(reportId, onData, onError),
    [reportId],
  );
  const { state, retry } = useLive(subscribe);
  if (state.status === 'loading') return <LoadingState message="Loading warning status..." />;
  if (state.status === 'error')
    return <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />;
  if (!state.data.length)
    return <Row label="Warning status" value="No warning delivery record available" />;
  return (
    <>
      {state.data.map((warning) => (
        <Row
          key={warning.warningRequestId}
          label="Warning status"
          value={
            <StatusChip
              presentation={
                warning.deliveryStatus === 'SENT'
                  ? { label: 'Sent', color: 'success' }
                  : warning.deliveryStatus === 'FAILED'
                    ? { label: 'Failed', color: 'danger' }
                    : warning.deliveryStatus === 'PENDING'
                      ? { label: 'Warning Pending', color: 'warning' }
                      : { label: 'Delivery not recorded', color: 'textSecondary' }
              }
            />
          }
        />
      ))}
    </>
  );
}

export function RecordedDecision({ report }: { report: HazardReport }) {
  const decisionId = report.latestDecision?.decisionId;
  const subscribe = useCallback<Subscribe<VerificationDecision | null>>(
    (onData, onError) => {
      if (!decisionId) {
        onData(null);
        return () => {};
      }
      return subscribeToDecision(decisionId, onData, onError);
    },
    [decisionId],
  );
  const { state, retry } = useLive(subscribe);
  const decision = state.status === 'success' && state.data ? state.data : report.latestDecision;
  return (
    <Section title="Recorded decision">
      <Row
        label="Verification status"
        value={<StatusChip presentation={HAZARD_REPORT_STATUS_PRESENTATION[report.status]} />}
      />
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}
      {decision ? (
        <>
          <Alert severity={decision.outcome === 'REJECTED' ? 'error' : 'success'} sx={{ mb: 2 }}>
            {VERIFICATION_OUTCOME_LABELS[decision.outcome]} recorded.
          </Alert>
          <Row
            label="Duty Officer"
            value={
              decision.officerName ||
              (decision.officerId ? <OfficerName officerId={decision.officerId} /> : 'Not recorded')
            }
          />
          <Row label="Decision timestamp" value={formatDateTime(decision.decidedAt)} />
          <Row
            label={decision.outcome === 'REJECTED' ? 'Rejection reason' : 'Remarks'}
            value={
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {decision.remarks || 'No remarks'}
              </Typography>
            }
          />
        </>
      ) : (
        <Typography color="textSecondary">No decision audit record available.</Typography>
      )}
      {(decision?.outcome === 'VERIFIED_ESCALATED' || report.status === 'ESCALATED') && (
        <Stack spacing={2}>
          <WarningStatus reportId={report.reportId} />
          <NotificationOutbox reportId={report.reportId} />
        </Stack>
      )}
    </Section>
  );
}

