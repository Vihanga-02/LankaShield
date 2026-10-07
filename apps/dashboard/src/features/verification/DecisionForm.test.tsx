import { AppError, type DisasterEvent } from '@lankashield/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore, type OfficerUser } from '../../store/authStore';
import { DecisionForm } from './DecisionForm';
import { submitVerificationDecision } from './verification.service';

vi.mock('./verification.service', () => ({ submitVerificationDecision: vi.fn() }));
const submit = vi.mocked(submitVerificationDecision);

const officer: OfficerUser = {
  uid: 'officer-1',
  fullName: 'Ruwan Jayasinghe',
  email: 'duty.officer.demo@example.com',
  role: 'DUTY_OFFICER',
  active: true,
  createdAt: '2025-05-01T00:00:00.000Z',
};

const activeEvent: DisasterEvent = {
  eventId: 'EVT-ACTIVE',
  name: 'Ratnapura Floods — October 2026',
  hazardType: 'FLOOD',
  district: 'Ratnapura',
  status: 'ACTIVE',
  startedAt: '2026-10-01T00:00:00.000Z',
};
const completedEvent: DisasterEvent = {
  ...activeEvent,
  eventId: 'EVT-DONE',
  name: 'Ratnapura Floods — May 2025',
  status: 'COMPLETED',
  startedAt: '2025-05-20T00:00:00.000Z',
  endedAt: '2025-05-30T00:00:00.000Z',
};

function renderForm(events: DisasterEvent[] = [activeEvent, completedEvent]) {
  const user = userEvent.setup();
  render(<DecisionForm reportId="LS-1" events={events} />);
  return user;
}

describe('DecisionForm (UC02 verification decision)', () => {
  beforeEach(() => {
    submit.mockReset();
    useAuthStore.setState({ status: 'signedIn', user: officer });
  });

  it('requires a decision before recording', async () => {
    const user = renderForm();
    await user.click(screen.getByRole('button', { name: 'Record decision' }));

    expect(await screen.findByText('Choose a decision.')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('requires remarks when rejecting, then records the rejection', async () => {
    const user = renderForm();
    await user.click(screen.getByRole('radio', { name: 'Reject report' }));
    expect(screen.getByLabelText('Remarks (required)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Record decision' }));
    expect(
      await screen.findByText('Explain why the report is rejected (at least 5 characters).'),
    ).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Remarks (required)'), 'Duplicate of LS-0');
    await user.click(screen.getByRole('button', { name: 'Record decision' }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith({
      reportId: 'LS-1',
      officer,
      input: expect.objectContaining({ outcome: 'REJECTED', remarks: 'Duplicate of LS-0' }),
    });
  });

  it('pre-selects the only active event and verifies without remarks', async () => {
    const user = renderForm();
    expect(screen.getByRole('combobox', { name: 'Disaster event (optional)' })).toHaveTextContent(
      'Ratnapura Floods — October 2026',
    );

    await user.click(screen.getByRole('radio', { name: 'Verify information' }));
    expect(screen.getByLabelText('Remarks (optional)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record decision' }));

    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            outcome: 'VERIFIED_INFO',
            disasterEventId: 'EVT-ACTIVE',
          }),
        }),
      ),
    );
  });

  it('does not pre-select an event when none is active', () => {
    renderForm([completedEvent]);
    // Empty selection: the field shows only its label, no event name.
    expect(
      screen.getByRole('combobox', { name: 'Disaster event (optional)' }),
    ).not.toHaveTextContent(/Floods/);
  });

  it('shows the second-decision error when another officer decided first', async () => {
    submit.mockRejectedValueOnce(new AppError('ALREADY_VERIFIED'));
    const user = renderForm();
    await user.click(
      screen.getByRole('radio', { name: 'Verify and escalate for warning assessment' }),
    );
    await user.click(screen.getByRole('button', { name: 'Record decision' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This report has already been reviewed by another officer.',
    );
  });
});
