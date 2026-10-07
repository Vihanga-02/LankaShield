import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LankaShield',
  slug: 'lankashield',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/lankashield-logo.png',
  scheme: 'lankashield',
  userInterfaceStyle: 'light',
  android: {
    package: 'lk.lankashield.mobile',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/lankashield-logo.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/lankashield-logo.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/lankashield-logo.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'LankaShield uses your location to attach the hazard position to your report.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'LankaShield lets you attach photos of the hazard as evidence.',
        cameraPermission: 'LankaShield lets you take photos of the hazard as evidence.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
