import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';
import { router } from 'expo-router';
import { PaperProvider } from 'react-native-paper';

import ReportScreen from '@/app/(tabs)/report';
import { submitHazardReport } from '@/features/hazard-reports/hazardReport.service';
import { getCurrentLocation } from '@/features/hazard-reports/location.service';
import { useAuthStore } from '@/store/authStore';

// Firestore, Storage, GPS and the image picker never run in tests (D5).
jest.mock('@/features/hazard-reports/hazardReport.service', () => ({
  submitHazardReport: jest.fn(),
}));
jest.mock('@/features/hazard-reports/location.service', () => ({
  getCurrentLocation: jest.fn(),
  describeLocation: jest.fn(),
}));
jest.mock('@/features/hazard-reports/evidence.service', () => ({
  pickFromGallery: jest.fn(),
  takePhoto: jest.fn(),
}));
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock(
  'react-native-safe-area-context',
  () =>
    (jest.requireActual('react-native-safe-area-context/jest/mock') as { default: object }).default,
);

const submit = submitHazardReport as jest.MockedFunction<typeof submitHazardReport>;
const locate = getCurrentLocation as jest.MockedFunction<typeof getCurrentLocation>;
const network = useNetworkState as jest.MockedFunction<typeof useNetworkState>;

function setOnline(online: boolean) {
  network.mockReturnValue({
    isConnected: online,
    isInternetReachable: online,
  } as ReturnType<typeof useNetworkState>);
}

const renderScreen = () =>
  render(
    <PaperProvider>
      <ReportScreen />
    </PaperProvider>,
  );

describe('ReportScreen (UC01 report form validation)', () => {
  beforeEach(() => {
    submit.mockReset();
    locate.mockReset();
    jest.mocked(router.push).mockReset();
    setOnline(true);
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

  it('shows every validation message and sends nothing for an empty form', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Submit report'));

    expect(await screen.findByText('Select a hazard type.')).toBeTruthy();
    expect(screen.getByText('Select a severity.')).toBeTruthy();
    expect(screen.getByText('Title must be at least 5 characters.')).toBeTruthy();
    expect(screen.getByText('Describe the hazard in at least 10 characters.')).toBeTruthy();
    expect(screen.getByText('Select a location.')).toBeTruthy();
    expect(screen.getByText('Select a district.')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('submits a complete report with its tracking ID and opens the result screen', async () => {
    locate.mockResolvedValue({
      ok: true,
      location: { latitude: 6.6828, longitude: 80.3992, address: 'Ratnapura', source: 'GPS' },
      district: 'Ratnapura',
    });
    submit.mockResolvedValue('submitted');
    await renderScreen();
    const trackingId = screen.getByText(/Tracking ID for this report:/).props.children[1] as string;

    await fireEvent.press(screen.getByText('Flood'));
    await fireEvent.press(screen.getByText('High'));
    await fireEvent.changeText(screen.getByLabelText('Short title'), 'River overflowing');
    await fireEvent.changeText(
      screen.getByLabelText('Description'),
      'Water is above the bridge footpath and rising.',
    );
    await fireEvent.press(screen.getByText('Use GPS'));
    expect(await screen.findByText('Current GPS location')).toBeTruthy();

    await fireEvent.press(screen.getByText('Submit report'));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0][0]).toMatchObject({
      reportId: trackingId,
      input: {
        hazardType: 'FLOOD',
        severity: 'HIGH',
        title: 'River overflowing',
        district: 'Ratnapura',
        location: { latitude: 6.6828, longitude: 80.3992, source: 'GPS' },
        evidence: [],
      },
    });
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/report-submitted',
        params: { reportId: trackingId, outcome: 'submitted' },
      }),
    );
  });

  it('shows the GPS failure message so the user can choose on the map', async () => {
    locate.mockResolvedValue({
      ok: false,
      message: 'Location permission was denied. Choose the hazard location on the map instead.',
    });
    await renderScreen();
    await fireEvent.press(screen.getByText('Use GPS'));

    expect(
      await screen.findByText(
        'Location permission was denied. Choose the hazard location on the map instead.',
      ),
    ).toBeTruthy();
  });

  it('offers to save on the device when offline', async () => {
    setOnline(false);
    await renderScreen();

    expect(
      screen.getByText(/You're offline\. Your report will be saved on this device/),
    ).toBeTruthy();
    expect(screen.getByText('Save on this device')).toBeTruthy();
  });
});
