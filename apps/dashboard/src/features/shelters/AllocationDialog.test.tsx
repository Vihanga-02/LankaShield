import { AppError, type DisasterEvent, type EmergencyShelter } from '@lankashield/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore, type OfficerUser } from '../../store/authStore';
import { AllocationDialog } from './AllocationDialog';
import { allocateToShelter } from './shelters.service';

vi.mock('./shelters.service', () => ({ allocateToShelter: vi.fn() }));
const allocate = vi.mocked(allocateToShelter);

const officer: OfficerUser = {
  uid: 'district-1',
  fullName: 'Shalini Fernando',
  email: 'district.officer.demo@example.com',
  role: 'DISTRICT_OFFICER',
  district: 'Ratnapura',
  active: true,
  createdAt: '2025-05-01T00:00:00.000Z',
};

function shelter(
  id: string,
  name: string,
  capacity: number,
  occupancy: number,
  overrides: Partial<EmergencyShelter> = {},
): EmergencyShelter {
  return {
    shelterId: id,
    name,
    district: 'Ratnapura',
    address: 'Main Street',
    location: { latitude: 6.68, longitude: 80.4 },
    capacity,
    currentOccupancy: occupancy,
    availableCapacity: capacity - occupancy,
    status:
      occupancy >= capacity ? 'FULL' : occupancy / capacity >= 0.8 ? 'NEARLY_FULL' : 'AVAILABLE',
    updatedAt: '2026-10-04T12:00:00.000Z',
    ...overrides,
  };
}

const sivali = shelter('SH-2', 'Sivali Central College Hall', 150, 125);
const central = shelter('SH-1', 'Ratnapura Central College', 300, 180);
const horana = shelter('SH-4', 'Horana Community Centre', 200, 0, { district: 'Kalutara' });
const closed = shelter('SH-6', 'Bulathsinhala School Hall', 500, 0, {
  district: 'Kalutara',
  status: 'CLOSED',
});
const shelters = [sivali, central, horana, closed];
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

function renderDialog(initial = sivali) {
  const user = userEvent.setup();
  render(
    <AllocationDialog
      initialShelter={initial}
      shelters={shelters}
      events={events}
      onClose={vi.fn()}
    />,
  );
  return user;
}

const countField = () => screen.getByLabelText('Number of evacuees');
const confirmButton = () => screen.getByRole('button', { name: 'Confirm allocation' });

describe('AllocationDialog (UC03 shelter capacity)', () => {
  beforeEach(() => {
    allocate.mockReset();
    useAuthStore.setState({ status: 'signedIn', user: officer });
  });

  it('previews the shelter after an allocation that fits', async () => {
    const user = renderDialog();
    expect(screen.getByText(/25 available/)).toBeInTheDocument();

    await user.type(countField(), '25');
    expect(
      screen.getByText('After this allocation: 150 / 150 occupied, 0 places left — Full.'),
    ).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it('warns about insufficient capacity and offers open alternatives, same district first', async () => {
    const user = renderDialog();
    await user.type(countField(), '30');

    expect(
      screen.getByText(
        'Insufficient capacity: Sivali Central College Hall has only 25 places for 30 evacuees.',
      ),
    ).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();

    const alternatives = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(alternatives).toHaveLength(2);
    expect(alternatives[0]).toContain('Ratnapura Central College');
    expect(alternatives[1]).toContain('Horana Community Centre');
    // A closed shelter is never offered, however much room it has.
    expect(screen.queryByText('Bulathsinhala School Hall')).not.toBeInTheDocument();
  });

  it('switches to an alternative shelter and allocates there', async () => {
    allocate.mockResolvedValueOnce({
      allocationId: 'AL-1',
      currentOccupancy: 210,
      availableCapacity: 90,
      status: 'AVAILABLE',
    });
    const user = renderDialog();
    await user.type(countField(), '30');
    await user.click(screen.getAllByRole('button', { name: 'Allocate here' })[0]);

    expect(screen.getByText('Ratnapura Central College')).toBeInTheDocument();
    await user.click(confirmButton());

    await waitFor(() =>
      expect(allocate).toHaveBeenCalledWith(
        expect.objectContaining({ shelterId: 'SH-1', evacueeCount: 30 }),
      ),
    );
    expect(await screen.findByText('Allocation confirmed')).toBeInTheDocument();
    expect(screen.getByText('Now 210 occupied · 90 places left')).toBeInTheDocument();
  });

  it('says so when no open shelter can take the group', async () => {
    const user = renderDialog();
    await user.type(countField(), '5000');
    expect(
      screen.getByText(
        'No open shelter can take 5000 evacuees. Split the group or register another shelter.',
      ),
    ).toBeInTheDocument();
  });

  it('rejects counts that are not whole numbers above zero', async () => {
    const user = renderDialog();
    await user.type(countField(), '0');
    expect(screen.getByText('Enter a whole number above zero.')).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it('shows the error when another officer filled the shelter first', async () => {
    allocate.mockRejectedValueOnce(new AppError('INSUFFICIENT_CAPACITY'));
    const user = renderDialog();
    await user.type(countField(), '10');
    await user.click(confirmButton());

    expect(
      await screen.findByText('The selected shelter does not have enough available places.'),
    ).toBeInTheDocument();
  });
});
