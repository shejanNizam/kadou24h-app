/**
 * Web preview: browser geolocation + OpenStreetMap Nominatim for reverse
 * geocoding (fine for development; the phone app uses expo-location).
 */
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

export const CONAKRY: LatLng = { lat: 9.537, lng: -13.6785 };

export function getCurrentPosition(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

export async function reverseGeocode({ lat, lng }: LatLng): Promise<PlaceGuess> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=fr&lat=${lat}&lon=${lng}`,
    );
    const json = (await res.json()) as { address?: Record<string, string> };
    const a = json.address ?? {};
    return {
      region: a.state ?? a.region,
      city: a.city ?? a.town ?? a.village ?? a.county,
      commune: a.city_district ?? a.suburb ?? a.municipality,
      neighborhood: a.neighbourhood ?? a.quarter ?? a.hamlet ?? a.road,
    };
  } catch {
    return {};
  }
}
