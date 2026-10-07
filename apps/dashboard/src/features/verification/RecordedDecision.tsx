import {
  HAZARD_REPORT_STATUS_PRESENTATION,
  toErrorMessage,
  VERIFICATION_OUTCOME_LABELS,
  type DisasterEvent,
  type HazardReport,
  type VerificationDecision,
} from '@lankashield/shared';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useCallback } from 'react';

import { ErrorState } from '../../components/feedback/ErrorState';
import { StatusChip } from '../../components/feedback/StatusChip';
import { useAsync } from '../../hooks/useAsync';
import { useLive, type Subscribe } from '../../hooks/useLive';
import { formatDateTime } from '../../utils/format';
import { Row, Section } from './ReviewLayout';
import { loadOfficerName, subscribeToDecision } from './verification.service';

function OfficerName({ officerId }: { officerId: string }) {
  const load = useCallback(() => loadOfficerName(officerId), [officerId]);
  const { state } = useAsync(load);
  return <>{state.status === 'success' ? state.data : officerId}</>;
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
        </>
      ) : (
        <Typography color="textSecondary">This report has already been reviewed.</Typography>
      )}
    </Section>
  );
}
