import type { GeoPoint } from '@/features/orders/types';

/** Straight-line distance in km (good enough for "2.4 km" on a card, or "is this address in that city") */
export function distanceKm(a: { lat: number; lng: number }, b: GeoPoint): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const [lng, lat] = b.coordinates;
  const dLat = toRad(lat - a.lat);
  const dLng = toRad(lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
