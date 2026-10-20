/**
 * Web preview map: Leaflet + OpenStreetMap tiles inside an iframe (no API key,
 * nothing added to the native bundle). Talks to the page with postMessage.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';

import { CenterPin } from './CenterPin';
import { MARKER_COLORS, type AppMapProps, type MapMarker } from './types';

type FrameMessage = { id: string; type: 'ready' } | { id: string; type: 'center'; lat: number; lng: number };

const frameHtml = (id: string, lat: number, lng: number, zoom: number) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;font-family:sans-serif}</style></head>
<body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var ID = ${JSON.stringify(id)};
var COLORS = ${JSON.stringify(MARKER_COLORS)};
var map = L.map('m', { zoomControl: false }).setView([${lat}, ${lng}], ${zoom});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
var layers = {};
function icon(kind) {
  return L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11],
    html: '<div style="width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);background:' + COLORS[kind] + '"></div>' });
}
function setMarkers(list, fit) {
  var keep = {};
  list.forEach(function (m) {
    keep[m.id] = true;
    if (layers[m.id]) layers[m.id].setLatLng([m.lat, m.lng]);
    else layers[m.id] = L.marker([m.lat, m.lng], { icon: icon(m.kind), title: m.title || '' }).addTo(map);
  });
  Object.keys(layers).forEach(function (k) { if (!keep[k]) { map.removeLayer(layers[k]); delete layers[k]; } });
  if (fit && list.length > 1) map.fitBounds(list.map(function (m) { return [m.lat, m.lng]; }), { padding: [40, 40] });
}
map.on('moveend', function () {
  var c = map.getCenter();
  parent.postMessage({ id: ID, type: 'center', lat: c.lat, lng: c.lng }, '*');
});
window.addEventListener('message', function (e) {
  var d = e.data;
  if (!d || d.id !== ID) return;
  if (d.type === 'markers') setMarkers(d.markers, d.fit);
  if (d.type === 'focus') map.setView([d.lat, d.lng], d.zoom || map.getZoom());
});
parent.postMessage({ id: ID, type: 'ready' }, '*');
</script></body></html>`;

export function AppMap({
  initialCenter,
  initialZoom = 15,
  markers = [],
  fitToMarkers,
  onCenterChange,
  focus,
  style,
  accessibilityLabel,
}: AppMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [id] = useState(() => `map-${Math.random().toString(36).slice(2)}`);
  // The page is built once: later changes travel by postMessage
  const [html] = useState(() => frameHtml(id, initialCenter.lat, initialCenter.lng, initialZoom));
  const [ready, setReady] = useState(false);
  const fitted = useRef(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent<FrameMessage>) => {
      if (e.data?.id !== id) return;
      if (e.data.type === 'ready') setReady(true);
      if (e.data.type === 'center') onCenterChange?.({ lat: e.data.lat, lng: e.data.lng });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, onCenterChange]);

  const markerKey = JSON.stringify(markers.map((m: MapMarker) => [m.id, m.kind, m.lat, m.lng]));
  useEffect(() => {
    if (!ready) return;
    const fit = Boolean(fitToMarkers && !fitted.current && markers.length > 1);
    frame.current?.contentWindow?.postMessage({ id, type: 'markers', markers, fit }, '*');
    if (fit) fitted.current = true;
    // markerKey stands for the markers' content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, markerKey]);

  useEffect(() => {
    if (ready && focus) frame.current?.contentWindow?.postMessage({ id, type: 'focus', ...focus }, '*');
  }, [ready, focus, id]);

  return (
    <View style={[styles.box, style]} accessibilityLabel={accessibilityLabel}>
      <iframe ref={frame} srcDoc={html} title={accessibilityLabel ?? 'map'} style={frameStyle} />
      {onCenterChange && <CenterPin />}
    </View>
  );
}

const frameStyle = { border: 0, width: '100%', height: '100%', display: 'block' } as const;

const styles = StyleSheet.create({
  box: { overflow: 'hidden', borderRadius: Radius.lg },
});
