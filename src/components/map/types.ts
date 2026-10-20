import type { StyleProp, ViewStyle } from 'react-native';

import type { LatLng } from '@/lib/location';

export type MarkerKind = 'store' | 'customer' | 'rider' | 'station';

export interface MapMarker extends LatLng {
  id: string;
  kind: MarkerKind;
  title?: string;
}

export interface AppMapProps {
  /** Where the map opens */
  initialCenter: LatLng;
  initialZoom?: number;
  markers?: MapMarker[];
  /** Zoom to show every marker once they first arrive (tracking) */
  fitToMarkers?: boolean;
  /** Picker mode: a fixed pin sits in the middle; the map moves under it */
  onCenterChange?: (center: LatLng) => void;
  /** Move the map here (new object = move again), e.g. "use my location" */
  focus?: LatLng & { zoom?: number };
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const MARKER_COLORS: Record<MarkerKind, string> = {
  store: '#8B5CF6',
  customer: '#16A34A',
  rider: '#F59E0B',
  station: '#3B82F6',
};

/** Zoom level ↔ map span (native maps use deltas) */
export const zoomToDelta = (zoom: number) => 360 / 2 ** zoom;
