import {
  HAZARD_REPORT_STATUS_PRESENTATION,
  toErrorMessage,
  VERIFICATION_OUTCOME_LABELS,
  type DisasterEvent,
  type HazardReport,
  type VerificationDecision,
  type WarningRequest,
} from '@lankashield/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';

import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingState } from '../../components/feedback/LoadingState';
import { StatusChip } from '../../components/feedback/StatusChip';
import { useAsync } from '../../hooks/useAsync';
import { useLive, type Subscribe } from '../../hooks/useLive';
import { formatDateTime } from '../../utils/format';
import { Row, Section } from './ReviewLayout';
import {
  loadOfficerName,
  recordWarningDeliveryResult,
  subscribeToDecision,
  subscribeToWarnings,
} from './verification.service';

function OfficerName({ officerId }: { officerId: string }) {
  const load = useCallback(() => loadOfficerName(officerId), [officerId]);
  const { state } = useAsync(load);
  return <>{state.status === 'success' ? state.data : officerId}</>;
}

function WarningDeliverySection({ reportId }: { reportId: string }) {
  const subscribe = useCallback<Subscribe<WarningRequest[]>>(
    (onData, onError) => subscribeToWarnings(reportId, onData, onError),
    [reportId],
  );
  const { state, retry } = useLive(subscribe);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (state.status === 'loading') return <LoadingState message="Loading warning status…" />;
  if (state.status === 'error') {
    return <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />;
  }
  if (!state.data.length) {
    return (
      <Row
        label="Warning status"
        value={<StatusChip presentation={{ label: 'Warning Pending', color: 'warning' }} />}
      />
    );
  }

  const handleUpdate = async (warningRequestId: string, result: 'SENT' | 'FAILED') => {
    setUpdatingId(warningRequestId);
    try {
      await recordWarningDeliveryResult(warningRequestId, result);
    } catch {
      // Ignored; state is live
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      {state.data.map((warning) => {
        const isSent = warning.deliveryStatus === 'SENT';
        const isFailed = warning.deliveryStatus === 'FAILED';
        const isPending = !isSent && !isFailed;

        return (
          <Box key={warning.warningRequestId} sx={{ pt: 0.5 }}>
            <Row
              label="Warning status"
              value={
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusChip
                    presentation={
                      isSent
                        ? { label: 'Sent', color: 'success' }
                        : isFailed
                          ? { label: 'Failed', color: 'danger' }
                          : { label: 'Warning Pending', color: 'warning' }
                    }
                  />
                  {isPending && (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        disabled={updatingId === warning.warningRequestId}
                        onClick={() => handleUpdate(warning.warningRequestId, 'SENT')}>
                        Simulate Sent
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={updatingId === warning.warningRequestId}
                        onClick={() => handleUpdate(warning.warningRequestId, 'FAILED')}>
                        Simulate Failed
                      </Button>
                    </Stack>
                  )}
                </Stack>
              }
            />
          </Box>
        );
      })}
    </>
  );
}

export function RecordedDecision({
  report,
  events = [],
}: {
  report: HazardReport;
  events?: DisasterEvent[];
}) {
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
  const isRejected = decision?.outcome === 'REJECTED' || report.status === 'REJECTED';
  const isEscalated = decision?.outcome === 'VERIFIED_ESCALATED' || report.status === 'ESCALATED';

  const linkedEvent = events.find((e) => e.eventId === report.disasterEventId);

  return (
    <Section title="Recorded decision">
      {state.status === 'error' && (
        <ErrorState message={toErrorMessage(state.error)} onRetry={retry} />
      )}

      {decision ? (
        <>
          <Alert severity={isRejected ? 'error' : 'success'} sx={{ mb: 2 }}>
            {VERIFICATION_OUTCOME_LABELS[decision.outcome]} recorded. The reporter has been
            notified.
          </Alert>

          <Row
            label="Current status"
            value={<StatusChip presentation={HAZARD_REPORT_STATUS_PRESENTATION[report.status]} />}
          />

          <Row label="Decision made" value={VERIFICATION_OUTCOME_LABELS[decision.outcome]} />

          <Row
            label="Duty Officer"
            value={
              decision.officerName ? (
                decision.officerName
              ) : decision.officerId ? (
                <OfficerName officerId={decision.officerId} />
              ) : (
                'Duty Officer'
              )
            }
          />

          <Row label="Decision timestamp" value={formatDateTime(decision.decidedAt)} />

          <Row
            label={isRejected ? 'Rejection reason' : 'Remarks'}
            value={
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {decision.remarks || 'No remarks provided'}
              </Typography>
            }
          />

          {linkedEvent ? (
            <Row label="Disaster event" value={`${linkedEvent.name} (${linkedEvent.district})`} />
          ) : report.disasterEventId ? (
            <Row label="Disaster event" value={report.disasterEventId} />
          ) : null}

          {isEscalated && (
            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <WarningDeliverySection reportId={report.reportId} />
            </Box>
          )}
        </>
      ) : (
        <Typography color="textSecondary">This report has already been reviewed.</Typography>
      )}
    </Section>
  );
}
