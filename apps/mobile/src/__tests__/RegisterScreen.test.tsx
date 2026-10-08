import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import RegisterScreen from '@/app/(auth)/register';
import { registerUser } from '@/features/auth/auth.service';
import { getCurrentLocation } from '@/features/hazard-reports/location.service';

jest.mock('@/features/auth/auth.service', () => ({ registerUser: jest.fn() }));
jest.mock('@/features/hazard-reports/location.service', () => ({
  getCurrentLocation: jest.fn(),
}));
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock(
  'react-native-safe-area-context',
  () =>
    (jest.requireActual('react-native-safe-area-context/jest/mock') as { default: object }).default,
);

const register = registerUser as jest.MockedFunction<typeof registerUser>;
const locate = getCurrentLocation as jest.MockedFunction<typeof getCurrentLocation>;

const renderScreen = () =>
  render(
    <PaperProvider>
      <RegisterScreen />
    </PaperProvider>,
  );

async function fillAccountFields() {
  await fireEvent.changeText(screen.getByLabelText('Full name'), 'Nimal Perera');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'nimal@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'secret1');
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'secret1');
}

describe('RegisterScreen (home district, D48)', () => {
  beforeEach(() => {
    register.mockReset();
    locate.mockReset();
  });

  it('requires a home district before creating the account', async () => {
    await renderScreen();
    await fillAccountFields();
    await fireEvent.press(screen.getByText('Create account'));

    expect(await screen.findByText('Select a district.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('suggests the district from the location and registers with it', async () => {
    locate.mockResolvedValue({
      ok: true,
      location: { latitude: 6.68, longitude: 80.4, source: 'GPS' },
      district: 'Ratnapura',
    });
    register.mockResolvedValue();
    await renderScreen();
    await fillAccountFields();

    await fireEvent.press(screen.getByText('Use my location'));
    expect(await screen.findByText(/Suggested from your location: Ratnapura/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Create account'));

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toMatchObject({
      fullName: 'Nimal Perera',
      email: 'nimal@example.com',
      role: 'CITIZEN',
      district: 'Ratnapura',
    });
  });
});
