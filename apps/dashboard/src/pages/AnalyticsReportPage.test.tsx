import type { AnalyticsInput, DisasterEvent, HazardReport } from '@lankashield/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getEvent,
  loadAnalyticsSources,
  newResponseReportId,
  saveResponseReport,
  subscribeToResponseReports,
} from '../features/analytics/analytics.service';
import { useAuthStore } from '../store/authStore';
import AnalyticsReportPage from './AnalyticsReportPage';

vi.mock('../features/analytics/analytics.service', () => ({
  getEvent: vi.fn(),
  loadAnalyticsSources: vi.fn(),
  newResponseReportId: vi.fn(),
  saveResponseReport: vi.fn(),
  uploadReportPdf: vi.fn(),
  recordShare: vi.fn(),
  subscribeToResponseReports: vi.fn(),
}));

type Sources = Pick<
  AnalyticsInput,
  'reports' | 'alerts' | 'citizenReach' | 'occupancySnapshots' | 'resourceDistributions'
>;

const completedEvent: DisasterEvent = {
  eventId: 'EVT-KAL',
  name: 'Kalutara Landslides — November 2025',
  hazardType: 'LANDSLIDE',
  district: 'Kalutara',
  status: 'COMPLETED',
  startedAt: '2025-11-03T00:00:00.000Z',
  endedAt: '2025-11-12T00:00:00.000Z',
};

const report = {
  reportId: 'LS-1',
  reporterId: 'u1',
  reporterRole: 'CITIZEN',
  hazardType: 'LANDSLIDE',
  severity: 'HIGH',
  title: 'Slope failure',
  description: 'Earth is moving behind houses',
  location: { latitude: 6.5, longitude: 80.1, source: 'GPS' },
  evidenceUrls: [],
  status: 'VERIFIED',
  district: 'Kalutara',
  disasterEventId: 'EVT-KAL',
  createdAt: '2025-11-04T08:00:00.000Z',
  updatedAt: '2025-11-04T09:00:00.000Z',
  clientCreatedAt: '2025-11-04T08:00:00.000Z',
  syncSource: 'ONLINE',
} as HazardReport;

const completeSources: Sources = {
  reports: [report],
  alerts: [
    {
      alertId: 'a1',
      disasterEventId: 'EVT-KAL',
      level: 'HIGH',
      district: 'Kalutara',
      issuedAt: '2025-11-04T06:00:00.000Z',
      acknowledged: true,
    },
  ],
  citizenReach: [
    {
      reachId: 'c1',
      disasterEventId: 'EVT-KAL',
      district: 'Kalutara',
      gsDivision: 'Horana',
      citizensReached: 600,
      recordedAt: '2025-11-05T12:00:00.000Z',
    },
  ],
  occupancySnapshots: [
    {
      snapshotId: 's1',
      disasterEventId: 'EVT-KAL',
      shelterId: 'sh1',
      district: 'Kalutara',
      occupancy: 80,
      capacity: 100,
      recordedAt: '2025-11-05T18:00:00.000Z',
    },
  ],
  resourceDistributions: [
    {
      distributionId: 'd1',
      disasterEventId: 'EVT-KAL',
      district: 'Kalutara',
      category: 'FOOD_PACK',
      quantity: 300,
      distributedAt: '2025-11-06T10:00:00.000Z',
    },
  ],
};

const emptySources: Sources = {
  reports: [],
  alerts: [],
  citizenReach: [],
  occupancySnapshots: [],
  resourceDistributions: [],
};

function renderPage(eventId = 'EVT-KAL') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[`/analytics/${eventId}`]}>
      <Routes>
        <Route path="/analytics/:eventId" element={<AnalyticsReportPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

describe('AnalyticsReportPage (UC04)', () => {
  beforeEach(() => {
    vi.mocked(getEvent).mockResolvedValue(completedEvent);
    vi.mocked(loadAnalyticsSources).mockResolvedValue(completeSources);
    vi.mocked(saveResponseReport).mockReset();
    vi.mocked(newResponseReportId).mockReset();
    vi.mocked(newResponseReportId).mockReturnValueOnce('RR-FIRST').mockReturnValueOnce('RR-SECOND');
    vi.mocked(subscribeToResponseReports).mockImplementation((_id, onData) => {
      onData([]);
      return () => {};
    });
    useAuthStore.setState({
      status: 'signedIn',
      user: {
        uid: 'analyst-1',
        fullName: 'Dilan Wickramasinghe',
        email: 'analyst.demo@example.com',
        role: 'DMC_ANALYST',
        active: true,
        createdAt: '2025-05-01T00:00:00.000Z',
      },
    });
  });

  it('shows a final report for a completed event with every metric complete', async () => {
    renderPage();

    expect(await screen.findByText('Final Report')).toBeInTheDocument();
    expect(screen.getByText('Completed event with every metric complete.')).toBeInTheDocument();
    expect(screen.queryByText(/Some metrics could not be calculated/)).not.toBeInTheDocument();
  });

  it('shows the incomplete-data banner and stays provisional when a source fails', async () => {
    vi.mocked(loadAnalyticsSources).mockResolvedValue({ ...completeSources, citizenReach: null });
    renderPage();

    expect(await screen.findByText('Provisional Report')).toBeInTheDocument();
    expect(
      screen.getByText('Provisional because some metrics are missing or incomplete.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Some metrics could not be calculated. Missing or incomplete: Citizens reached.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Unavailable/)).toBeInTheDocument();
  });

  it('shows empty states when no records match', async () => {
    vi.mocked(loadAnalyticsSources).mockResolvedValue(emptySources);
    renderPage();

    expect(
      await screen.findByText('No hazard reports linked to this event match these filters.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('No data for these filters.').length).toBeGreaterThan(0);
  });

  it('rejects an end date before the start date without recalculating', async () => {
    const user = renderPage();
    await screen.findByText('Final Report');
    const callsBefore = vi.mocked(loadAnalyticsSources).mock.calls.length;

    await user.type(screen.getByLabelText('From'), '2025-11-10');
    await user.type(screen.getByLabelText('To'), '2025-11-05');
    await user.click(screen.getByRole('button', { name: 'Generate report' }));

    expect(
      await screen.findByText('End date must be on or after the start date.'),
    ).toBeInTheDocument();
    expect(vi.mocked(loadAnalyticsSources).mock.calls.length).toBe(callsBefore);
  });

  it('keeps the analysis on screen and offers Retry when the PDF export fails', async () => {
    vi.mocked(saveResponseReport).mockRejectedValue(
      Object.assign(new Error('offline'), { code: 'unavailable' }),
    );
    const user = renderPage();
    await screen.findByText('Final Report');

    await user.click(screen.getByRole('button', { name: /Export PDF/ }));

    expect(await screen.findByText(/PDF export failed\./)).toBeInTheDocument();
    expect(screen.getByText(/Unable to reach the server\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    // The calculated report is still there; nothing was lost.
    expect(screen.getByText('Final Report')).toBeInTheDocument();
  });

  it('retries the save under the same report ID, so a late write cannot duplicate it', async () => {
    vi.mocked(saveResponseReport)
      .mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'unavailable' }))
      .mockResolvedValueOnce('RR-FIRST');
    const user = renderPage();
    await screen.findByText('Final Report');

    await user.click(screen.getByRole('button', { name: /Save report/ }));
    await user.click(await screen.findByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Report saved.')).toBeInTheDocument();
    const ids = vi.mocked(saveResponseReport).mock.calls.map(([args]) => args.responseReportId);
    expect(ids).toEqual(['RR-FIRST', 'RR-FIRST']);
  });

  it('says when the event does not exist', async () => {
    vi.mocked(getEvent).mockResolvedValue(null);
    renderPage('NOPE');
    expect(await screen.findByText('Event not found')).toBeInTheDocument();
  });
});
