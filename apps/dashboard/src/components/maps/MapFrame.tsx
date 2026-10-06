import 'leaflet/dist/leaflet.css';

import type { GeoPoint } from '@lankashield/shared';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { LatLngTuple } from 'leaflet';
import { useEffect, useState, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

import { OSM_ATTRIBUTION, OSM_TILE_URL, osmLink } from './config';

/** Keeps Leaflet's size in step with its container (dialogs, responsive layouts). */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/**
 * OpenStreetMap base map (D42). When tiles cannot load (offline), a notice with the
 * coordinates and an OpenStreetMap link is shown over the map, so the location is still readable.
 */
export function MapFrame({
  height = 320,
  center,
  zoom,
  point,
  children,
}: {
  height?: number;
  center: LatLngTuple;
  zoom: number;
  /** Shown as coordinates + link when tiles cannot load. */
  point?: GeoPoint;
  children?: ReactNode;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        // Keep the map under the sticky top bar, drawers and dialogs.
        isolation: 'isolate',
        '& .leaflet-container': { width: '100%', height: '100%', fontFamily: 'inherit' },
        '& .ls-pin': { background: 'none', border: 0 },
        // Leaflet spaces popup paragraphs widely; MUI Typography renders paragraphs.
        '& .leaflet-popup-content p': { margin: 0 },
      }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false}>
        <TileLayer
          url={OSM_TILE_URL}
          attribution={OSM_ATTRIBUTION}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTilesFailed(true),
            tileload: () => setTilesFailed(false),
          }}
        />
        <ResizeWatcher />
        {children}
      </MapContainer>

      {tilesFailed ? (
        <Box
          role="status"
          sx={{
            position: 'absolute',
            left: 8,
            right: 8,
            bottom: 28,
            zIndex: 1000,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: 2,
          }}>
          <Typography variant="body2">
            Map tiles could not be loaded. Check your internet connection.
          </Typography>
          {point ? (
            <Link href={osmLink(point)} target="_blank" rel="noopener noreferrer" variant="body2">
              {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)} — open in OpenStreetMap
            </Link>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
