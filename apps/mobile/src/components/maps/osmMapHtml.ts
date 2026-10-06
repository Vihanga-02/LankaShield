import type { GeoPoint } from '@lankashield/shared';

/** Leaflet is loaded from a CDN; the map needs internet for the tiles anyway (D42). */
const LEAFLET_VERSION = '1.9.4';
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface MapHtmlOptions {
  center: [number, number];
  zoom: number;
  point: GeoPoint | null;
  interactive: boolean;
  pinColor: string;
}

/** Messages the map page posts back to React Native. */
export type MapMessage =
  | { type: 'ready' }
  | { type: 'error' }
  | { type: 'tileerror' }
  | { type: 'pick'; latitude: number; longitude: number };

/**
 * A self-contained Leaflet page for the WebView. Taps and pin drags are posted to the app as
 * `pick` messages; the app moves the pin with `lsSetPoint` and re-centres with `lsCenterOn`.
 */
export function buildMapHtml(options: MapHtmlOptions): string {
  const pin = `<svg viewBox="0 0 28 40" width="28" height="40"><path d="M14 1C6.8 1 1 6.7 1 13.8 1 23.5 14 39 14 39s13-15.5 13-25.2C27 6.7 21.2 1 14 1z" fill="${options.pinColor}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css">
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #F1F5F9; }
  .ls-pin { background: none; border: 0; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  function send(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
</script>
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js" onerror="send({ type: 'error' })"></script>
<script>
(function () {
  if (!window.L) { send({ type: 'error' }); return; }
  var o = ${JSON.stringify(options)};
  var map = L.map('map', {
    zoomControl: o.interactive,
    dragging: o.interactive,
    touchZoom: o.interactive,
    doubleClickZoom: o.interactive,
    scrollWheelZoom: false,
    boxZoom: false,
    keyboard: false
  }).setView(o.center, o.zoom);
  L.tileLayer(${JSON.stringify(OSM_TILE_URL)}, {
    maxZoom: 19,
    attribution: ${JSON.stringify(OSM_ATTRIBUTION)}
  }).on('tileerror', function () { send({ type: 'tileerror' }); }).addTo(map);

  var icon = L.divIcon({ className: 'ls-pin', html: ${JSON.stringify(pin)}, iconSize: [28, 40], iconAnchor: [14, 39] });
  var marker = null;
  function place(lat, lng) {
    if (marker) { marker.setLatLng([lat, lng]); return; }
    marker = L.marker([lat, lng], { icon: icon, draggable: o.interactive }).addTo(map);
    marker.on('dragend', function () {
      var p = marker.getLatLng();
      send({ type: 'pick', latitude: p.lat, longitude: p.lng });
    });
  }
  if (o.point) place(o.point.latitude, o.point.longitude);
  if (o.interactive) {
    map.on('click', function (e) {
      place(e.latlng.lat, e.latlng.lng);
      send({ type: 'pick', latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
  }
  window.lsSetPoint = function (lat, lng) {
    place(lat, lng);
    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng]);
  };
  window.lsCenterOn = function (lat, lng, zoom) {
    place(lat, lng);
    map.setView([lat, lng], zoom);
  };
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}
