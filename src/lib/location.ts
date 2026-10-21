/**
 * Current position + reverse geocoding (pin → region / city / commune).
 * Native: expo-location. Web preview: see location.web.ts.
 */
import * as Location from 'expo-location';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceGuess {
  region?: string;
  city?: string;
  commune?: string;
  neighborhood?: string;
}

/** Conakry centre: where the map opens when we don't know better */
export const CONAKRY: LatLng = { lat: 9.5370, lng: -13.6785 };

/** null when the user refuses or the GPS is off */
export async function getCurrentPosition(): Promise<LatLng | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return null;
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Best effort: empty when offline or unknown (the user types it). */
export async function reverseGeocode({ lat, lng }: LatLng): Promise<PlaceGuess> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!place) return {};
    return {
      region: place.region ?? undefined,
      city: place.city ?? place.subregion ?? undefined,
      commune: place.district ?? undefined,
      neighborhood: place.street ?? place.name ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Follows the position while the app is open (rider online). Returns a stop
 * function, or null when the user refuses location.
 */
export async function watchPosition(onPosition: (p: LatLng & { heading?: number }) => void, intervalMs = 20_000): Promise<(() => void) | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return null;
  try {
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: intervalMs, distanceInterval: 25 },
      (pos) => onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading ?? undefined }),
    );
    return () => sub.remove();
  } catch {
    return null;
  }
}
