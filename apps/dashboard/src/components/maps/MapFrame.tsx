import MapOutlined from '@mui/icons-material/MapOutlined';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { APILoadingStatus, useApiLoadingStatus } from '@vis.gl/react-google-maps';
import type { ReactNode } from 'react';

import { hasMapsKey } from './config';

function Fallback({
  height,
  message,
  point,
}: {
  height: number;
  message: string;
  point?: { latitude: number; longitude: number };
}) {
  return (
    <Box
      role="img"
      aria-label={message}
      sx={{
        height,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        textAlign: 'center',
        p: 2,
        color: 'text.secondary',
      }}>
      <MapOutlined />
      <Typography variant="body2">{message}</Typography>
      {point ? (
        <Link
          href={`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          variant="body2">
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)} — open in Google Maps
        </Link>
      ) : null}
    </Box>
  );
}

function LoadedGate({
  height,
  point,
  children,
}: {
  height: number;
  point?: { latitude: number; longitude: number };
  children: ReactNode;
}) {
  const status = useApiLoadingStatus();
  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <Fallback
        height={height}
        point={point}
        message="The map could not be loaded. Check the Maps JavaScript API key."
      />
    );
  }
  if (status !== APILoadingStatus.LOADED) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} aria-label="Loading map" />
      </Box>
    );
  }
  return <Box sx={{ height, borderRadius: 2, overflow: 'hidden' }}>{children}</Box>;
}

/** Renders the map only when the Maps API is available; otherwise a readable fallback (Phase 10). */
export function MapFrame({
  height = 320,
  point,
  children,
}: {
  height?: number;
  /** Shown as coordinates + Google Maps link when the map cannot load. */
  point?: { latitude: number; longitude: number };
  children: ReactNode;
}) {
  if (!hasMapsKey) {
    return (
      <Fallback height={height} point={point} message="Maps are not configured (no web API key)." />
    );
  }
  return (
    <LoadedGate height={height} point={point}>
      {children}
    </LoadedGate>
  );
}
