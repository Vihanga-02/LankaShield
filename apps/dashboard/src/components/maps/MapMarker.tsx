import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useLayoutEffect } from 'react';

/** Attach content before the map, and detach during layout cleanup, before passive map disposal. */
export function MapMarker({
  position,
  title,
  background,
  borderColor,
  glyphColor,
  onClick,
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  background: string;
  borderColor: string;
  glyphColor: string;
  onClick?: () => void;
}) {
  const map = useMap();
  const library = useMapsLibrary('marker');
  const { lat, lng } = position;
  useLayoutEffect(() => {
    if (!map || !library) return;
    const pin = new library.PinElement({ background, borderColor, glyphColor });
    const marker = new library.AdvancedMarkerElement({
      position: { lat, lng },
      title,
      content: pin.element,
    });
    marker.map = map;
    const listener = onClick ? marker.addListener('click', onClick) : undefined;
    return () => {
      listener?.remove();
      marker.map = null;
    };
  }, [map, library, lat, lng, title, background, borderColor, glyphColor, onClick]);
  return null;
}
