import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LankaShield',
  slug: 'lankashield',
  version: '1.0.0',
  orientation: 'portrait',
  // Generated from assets/images/lankashield-logo.png (the master logo).
  icon: './assets/images/icon.png',
  scheme: 'lankashield',
  userInterfaceStyle: 'light',
  android: {
    package: 'lk.lankashield.mobile',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      // The logo sits inside the launcher's safe zone, so circle and squircle masks never crop it.
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
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
