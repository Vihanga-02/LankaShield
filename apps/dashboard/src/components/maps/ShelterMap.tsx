import {
  colors,
  SHELTER_STATUS_PRESENTATION,
  SRI_LANKA_REGION,
  type EmergencyShelter,
} from '@lankashield/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { InfoWindow, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';

import { MapMarker } from './MapMarker';
import { MAP_ID } from './config';
import { MapFrame } from './MapFrame';

/** Fits the map to the shelters whenever the visible set changes (Phase 10). */
function FitBounds({ shelters }: { shelters: EmergencyShelter[] }) {
  const map = useMap();
  const key = shelters.map((s) => s.shelterId).join(',');

  useEffect(() => {
    if (!map || shelters.length === 0) return;
    if (shelters.length === 1) {
      map.setCenter({ lat: shelters[0].location.latitude, lng: shelters[0].location.longitude });
      map.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    shelters.forEach((s) => bounds.extend({ lat: s.location.latitude, lng: s.location.longitude }));
    map.fitBounds(bounds, 48);
    // Refit only when the set of shelters changes, not on every occupancy update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

/** Shelter markers coloured by status; the info window and legend name the status in text. */
export function ShelterMap({
  shelters,
  onAllocate,
}: {
  shelters: EmergencyShelter[];
  onAllocate?: (shelter: EmergencyShelter) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = shelters.find((s) => s.shelterId === selectedId);

  return (
    <MapFrame height={360}>
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: SRI_LANKA_REGION.latitude, lng: SRI_LANKA_REGION.longitude }}
        defaultZoom={7}
        gestureHandling="cooperative"
        streetViewControl={false}
        mapTypeControl={false}
        style={{ width: '100%', height: '100%' }}>
        <FitBounds shelters={shelters} />
        {shelters.map((s) => {
          const presentation = SHELTER_STATUS_PRESENTATION[s.status];
          const color = colors[presentation.color];
          return (
            <MapMarker
              key={s.shelterId}
              position={{ lat: s.location.latitude, lng: s.location.longitude }}
              title={`${s.name} — ${presentation.label}, ${s.availableCapacity} places available`}
              onClick={() => setSelectedId(s.shelterId)}
              background={color}
              borderColor={colors.surface}
              glyphColor={colors.surface}
            />
          );
        })}
        {selected ? (
          <InfoWindow
            position={{ lat: selected.location.latitude, lng: selected.location.longitude }}
            pixelOffset={[0, -36]}
            onCloseClick={() => setSelectedId(null)}>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="subtitle2">{selected.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {SHELTER_STATUS_PRESENTATION[selected.status].label} · {selected.currentOccupancy}/
                {selected.capacity} occupied · {selected.availableCapacity} available
              </Typography>
              {onAllocate && selected.status !== 'CLOSED' ? (
                <Button size="small" sx={{ mt: 1 }} onClick={() => onAllocate(selected)}>
                  Allocate evacuees
                </Button>
              ) : null}
            </Box>
          </InfoWindow>
        ) : null}
      </Map>
    </MapFrame>
  );
}
