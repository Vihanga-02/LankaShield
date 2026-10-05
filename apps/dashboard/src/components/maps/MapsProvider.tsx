import { APIProvider } from '@vis.gl/react-google-maps';
import type { ReactNode } from 'react';

import { MAPS_API_KEY } from './config';

/** Loads the Maps JavaScript API once for the signed-in app. Without a key, maps show a fallback. */
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!MAPS_API_KEY) return <>{children}</>;
  return (
    <APIProvider apiKey={MAPS_API_KEY} language="en" region="LK">
      {children}
    </APIProvider>
  );
}
