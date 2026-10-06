import { divIcon, type DivIcon } from 'leaflet';

const cache = new Map<string, DivIcon>();

/**
 * A map pin drawn as inline SVG in the given colour. Leaflet's default marker images do not
 * resolve through Vite, and a coloured pin carries the shelter status anyway.
 */
export function pinIcon(color: string): DivIcon {
  let icon = cache.get(color);
  if (!icon) {
    icon = divIcon({
      className: 'ls-pin',
      html: `<svg viewBox="0 0 28 40" width="28" height="40" aria-hidden="true">
        <path d="M14 1C6.8 1 1 6.7 1 13.8 1 23.5 14 39 14 39s13-15.5 13-25.2C27 6.7 21.2 1 14 1z"
          fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="14" cy="14" r="5" fill="#fff"/>
      </svg>`,
      iconSize: [28, 40],
      iconAnchor: [14, 39],
      popupAnchor: [0, -34],
    });
    cache.set(color, icon);
  }
  return icon;
}
