import type { ExpoConfig } from 'expo/config';

/** EAS project in the group's Expo organisation (D15). */
const EAS_PROJECT_ID = '6fe32d5b-4ac7-45f7-b34a-7fd0abdf18ed';

const config: ExpoConfig = {
  name: 'LankaShield',
  slug: 'lankashield',
  owner: 'lankashield-team',
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
  // OTA updates (EAS Update). The fingerprint changes only when native code or native config
  // changes, so CI publishes JS-only changes as updates and builds a new APK otherwise (D47).
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
