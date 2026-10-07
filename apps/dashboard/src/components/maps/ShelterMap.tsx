import { colors, SHELTER_STATUS_PRESENTATION, type EmergencyShelter } from '@lankashield/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { latLngBounds } from 'leaflet';
import { useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';

import { SRI_LANKA_CENTER, SRI_LANKA_ZOOM, toLatLng } from './config';
import { MapFrame } from './MapFrame';
import { pinIcon } from './markers';

/** Fits the map to the shelters whenever the visible set changes. */
function FitBounds({ shelters }: { shelters: EmergencyShelter[] }) {
  const map = useMap();
  const key = shelters.map((s) => s.shelterId).join(',');

  useEffect(() => {
    if (shelters.length === 0) return;
    if (shelters.length === 1) {
      map.setView(toLatLng(shelters[0].location), 13);
      return;
    }
    map.fitBounds(latLngBounds(shelters.map((s) => toLatLng(s.location))), {
      padding: [48, 48],
      maxZoom: 14,
    });
    // Refit only when the set of shelters changes, not on every occupancy update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

/** Shelter markers coloured by status; the popup and the status chips name the status in text. */
export function ShelterMap({
  shelters,
  onAllocate,
  height = 520,
}: {
  shelters: EmergencyShelter[];
  onAllocate?: (shelter: EmergencyShelter) => void;
  height?: number;
}) {
  return (
    <MapFrame height={height} center={SRI_LANKA_CENTER} zoom={SRI_LANKA_ZOOM}>
      <FitBounds shelters={shelters} />
      {shelters.map((s) => {
        const presentation = SHELTER_STATUS_PRESENTATION[s.status];
        return (
          <Marker
            key={s.shelterId}
            position={toLatLng(s.location)}
            icon={pinIcon(colors[presentation.color])}
            title={`${s.name} — ${presentation.label}, ${s.availableCapacity} places available`}>
            <Popup>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle2">{s.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {presentation.label} · {s.currentOccupancy}/{s.capacity} occupied ·{' '}
                  {s.availableCapacity} available
                </Typography>
                {onAllocate && s.status !== 'CLOSED' ? (
                  <Button size="small" sx={{ mt: 1 }} onClick={() => onAllocate(s)}>
                    Allocate evacuees
                  </Button>
                ) : null}
              </Box>
            </Popup>
          </Marker>
        );
      })}
    </MapFrame>
  );
}
