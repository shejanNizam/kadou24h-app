import type { GeoPoint } from '@/features/orders/types';

interface LatLng {
  lat: number;
  lng: number;
}

/** Straight-line distance in km between two { lat, lng } points */
export function kmBetween(a: LatLng, b: LatLng): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Same, to a GeoJSON point (delivery legs): good enough for "2.4 km" on a card */
export const distanceKm = (a: LatLng, b: GeoPoint): number => kmBetween(a, { lat: b.coordinates[1], lng: b.coordinates[0] });
