/**
 * Native map (react-native-maps). The web preview uses AppMap.web.tsx (Leaflet).
 * Android release builds need a Google Maps API key in app.json.
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { Radius } from '@/constants/theme';

import { CenterPin } from './CenterPin';
import { MARKER_COLORS, zoomToDelta, type AppMapProps } from './types';

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
  const ref = useRef<MapView>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!focus || typeof focus.lat !== 'number' || typeof focus.lng !== 'number' || isNaN(focus.lat) || isNaN(focus.lng)) return;
    const delta = zoomToDelta(focus.zoom ?? 16);
    ref.current?.animateToRegion({ latitude: focus.lat, longitude: focus.lng, latitudeDelta: delta, longitudeDelta: delta });
  }, [focus]);

  useEffect(() => {
    if (!fitToMarkers || fitted.current || markers.length < 2) return;
    const valid = markers.filter((m) => typeof m?.lat === 'number' && !isNaN(m.lat) && typeof m?.lng === 'number' && !isNaN(m.lng));
    if (valid.length < 2) return;
    fitted.current = true;
    ref.current?.fitToCoordinates(
      valid.map((m) => ({ latitude: m.lat, longitude: m.lng })),
      { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: false },
    );
  }, [fitToMarkers, markers]);

  const delta = zoomToDelta(initialZoom);
  const centerLat = typeof initialCenter?.lat === 'number' && !isNaN(initialCenter.lat) ? initialCenter.lat : 9.537;
  const centerLng = typeof initialCenter?.lng === 'number' && !isNaN(initialCenter.lng) ? initialCenter.lng : -13.6785;
  const validMarkers = markers.filter((m) => typeof m?.lat === 'number' && !isNaN(m.lat) && typeof m?.lng === 'number' && !isNaN(m.lng));

  return (
    <View style={[styles.box, style]} accessibilityLabel={accessibilityLabel}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: centerLat, longitude: centerLng, latitudeDelta: delta, longitudeDelta: delta }}
        onRegionChangeComplete={(r: Region) => onCenterChange?.({ lat: r.latitude, lng: r.longitude })}
        toolbarEnabled={false}>
        {validMarkers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.title}
            pinColor={MARKER_COLORS[m.kind]}
          />
        ))}
      </MapView>
      {onCenterChange && <CenterPin />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', borderRadius: Radius.lg },
});
