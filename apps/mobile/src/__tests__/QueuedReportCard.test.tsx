import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { QueuedReport } from '@lankashield/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { QueuedReportCard } from '@/features/offline-sync/components/QueuedReportCard';
import { syncNow, type SyncOutcome } from '@/features/offline-sync/sync.service';
import { useAuthStore } from '@/store/authStore';
import { useOfflineQueueStore } from '@/store/offlineQueueStore';

// The card talks to SQLite and Firestore through these modules; neither runs in tests.
jest.mock('@/features/offline-sync/sync.service', () => ({ syncNow: jest.fn() }));
jest.mock('@/features/offline-sync/queue', () => ({ discardQueuedReport: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mockedSyncNow = syncNow as jest.MockedFunction<typeof syncNow>;

function queued(overrides: Partial<QueuedReport> = {}): QueuedReport {
  return {
    reportId: 'LS-20261008-ABC123',
    input: {
      hazardType: 'FLOOD',
      severity: 'HIGH',
      title: 'River overflowing near the bridge',
      description: 'Water is above the footpath and still rising.',
      district: 'Ratnapura',
      location: { latitude: 6.68, longitude: 80.4, source: 'GPS' },
      evidence: [],
    },
    reporter: { uid: 'citizen-1', role: 'CITIZEN' },
    clientCreatedAt: new Date().toISOString(),
    syncStatus: 'PENDING',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('QueuedReportCard (Phase 6 Pending Sync display)', () => {
  beforeEach(() => {
    mockedSyncNow.mockReset();
    useOfflineQueueStore.setState({ items: [], syncing: false, progress: null });
    useAuthStore.setState({
      status: 'signedIn',
      user: {
        uid: 'citizen-1',
        fullName: 'Nimal Perera',
        email: 'citizen.demo@example.com',
        role: 'CITIZEN',
        active: true,
        createdAt: '2025-05-01T00:00:00.000Z',
      },
    });
  });

  it('shows a saved-on-device report as Pending Sync, never as submitted', async () => {
    await render(<QueuedReportCard report={queued()} />);

    expect(screen.getByText('Pending Sync')).toBeTruthy();
    expect(screen.getByText('River overflowing near the bridge')).toBeTruthy();
    expect(screen.getByText('LS-20261008-ABC123')).toBeTruthy();
    expect(screen.getByText('Sync now')).toBeTruthy();
    expect(screen.queryByText('Discard')).toBeNull();
    expect(screen.queryByText(/Pending Verification/)).toBeNull();
  });

  it('shows the error, attempt count, Retry and Discard after a failed sync', async () => {
    await render(
      <QueuedReportCard
        report={queued({
          syncStatus: 'FAILED',
          retryCount: 2,
          lastError: 'Unable to reach the server.',
        })}
      />,
    );

    expect(screen.getByText('Sync Failed')).toBeTruthy();
    expect(screen.getByText('Unable to reach the server. (attempt 2)')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
    expect(screen.getByText('Discard')).toBeTruthy();
  });

  it('hides the actions while the report is syncing', async () => {
    await render(<QueuedReportCard report={queued({ syncStatus: 'SYNCING' })} />);

    expect(screen.getByText('Syncing')).toBeTruthy();
    expect(screen.queryByText('Sync now')).toBeNull();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('tells the user when Sync now is pressed while still offline', async () => {
    mockedSyncNow.mockResolvedValue({ status: 'offline' } satisfies SyncOutcome);
    await render(<QueuedReportCard report={queued()} />);

    await fireEvent.press(screen.getByText('Sync now'));

    await waitFor(() => expect(mockedSyncNow).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText("You're still offline. It will send automatically."),
    ).toBeTruthy();
  });
});
