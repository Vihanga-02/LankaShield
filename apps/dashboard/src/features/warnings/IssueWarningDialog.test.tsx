import type { AppUser, DisasterEvent, HazardReport, WarningRequest } from '@lankashield/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore, type OfficerUser } from '../../store/authStore';
import { IssueWarningDialog } from './IssueWarningDialog';
import { loadReport, sendWarning } from './warnings.service';

vi.mock('./warnings.service', () => ({ loadReport: vi.fn(), sendWarning: vi.fn() }));
const send = vi.mocked(sendWarning);

const officer: OfficerUser = {
  uid: 'district-1',
  fullName: 'Shalini Fernando',
  email: 'district.officer.demo@example.com',
  role: 'DISTRICT_OFFICER',
  district: 'Ratnapura',
  active: true,
  createdAt: '2025-05-01T00:00:00.000Z',
};

const person = (uid: string, overrides: Partial<AppUser> = {}): AppUser => ({
  uid,
  fullName: uid,
  email: `${uid}@example.com`,
  role: 'CITIZEN',
  district: 'Ratnapura',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});
const users = [
  person('citizen'),
  person('volunteer', { role: 'VOLUNTEER' }),
  person('kalutara', { district: 'Kalutara' }),
  person('nodistrict', { district: undefined }),
];
const events: DisasterEvent[] = [
  {
    eventId: 'EVT-ACTIVE',
    name: 'Ratnapura Floods — October 2026',
    hazardType: 'FLOOD',
    district: 'Ratnapura',
    status: 'ACTIVE',
    startedAt: '2026-10-01T00:00:00.000Z',
  },
];

function renderDialog(props: { request?: WarningRequest; users?: AppUser[] | null } = {}) {
  const user = userEvent.setup();
  render(
    <IssueWarningDialog
      request={props.request}
      users={props.users === undefined ? users : props.users}
      events={events}
      onClose={vi.fn()}
    />,
  );
  return user;
}

describe('IssueWarningDialog (warnings to a district)', () => {
  beforeEach(() => {
    send.mockReset();
    vi.mocked(loadReport).mockReset();
    useAuthStore.setState({ status: 'signedIn', user: officer });
  });

  it("shows who will receive it, starting from the officer's district", () => {
    renderDialog();
    expect(screen.getByRole('combobox', { name: 'District' })).toHaveTextContent('Ratnapura');
    expect(screen.getByText(/whose home district is Ratnapura/)).toHaveTextContent(
      'Sends to 2 people',
    );
    expect(
      screen.getByText('1 user has no home district set and cannot receive district warnings.'),
    ).toBeInTheDocument();
    // The only active event in the district is suggested.
    expect(screen.getByRole('combobox', { name: 'Disaster event (optional)' })).toHaveTextContent(
      'Ratnapura Floods — October 2026',
    );
  });

  it('does not allow sending when nobody lives in the district', () => {
    renderDialog({ users: [person('kalutara', { district: 'Kalutara' })] });
    expect(screen.getByText(/nobody would receive this warning/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send warning/ })).toBeDisabled();
  });

  it('validates the text and sends to the matching recipients only', async () => {
    send.mockResolvedValue({ warningId: 'W1', delivered: 2, recipients: 2 });
    const user = renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send warning to 2' }));
    expect(await screen.findByText('Title must be at least 5 characters.')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Flood warning: Ratnapura');
    await user.type(
      screen.getByLabelText('Message'),
      'Kalu Ganga is rising. Move to higher ground.',
    );
    await user.click(screen.getByRole('button', { name: 'Send warning to 2' }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    const args = send.mock.calls[0][0];
    expect(args.recipients.map((u) => u.uid)).toEqual(['citizen', 'volunteer']);
    expect(args.input).toMatchObject({
      district: 'Ratnapura',
      severity: 'HIGH',
      durationHours: 24,
      disasterEventId: 'EVT-ACTIVE',
    });
    expect(await screen.findByText('Warning sent')).toBeInTheDocument();
  });

  it('pre-fills a request from its escalated report', async () => {
    vi.mocked(loadReport).mockResolvedValue({
      title: 'Kalu Ganga rising quickly',
      description: 'River rose one metre in two hours.',
    } as HazardReport);
    renderDialog({
      request: {
        warningRequestId: 'WR-1',
        sourceReportId: 'LS-SEED-010',
        requestedBy: 'duty-1',
        hazardType: 'FLOOD',
        severity: 'EXTREME',
        affectedDistrict: 'Ratnapura',
        status: 'PENDING_ASSESSMENT',
        createdAt: '2026-10-02T06:00:00.000Z',
      },
    });

    expect(screen.getByText(/LS-SEED-010/)).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Flood warning: Ratnapura');
    expect(screen.getByRole('combobox', { name: 'Severity' })).toHaveTextContent('Extreme');
    await waitFor(() =>
      expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain(
        'Kalu Ganga rising quickly. River rose one metre in two hours.',
      ),
    );
  });
});
