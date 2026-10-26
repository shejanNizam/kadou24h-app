import type { GeoPoint } from '@/features/orders/types';
import type { FileRef } from '@/types/api';

/** Moto-taxi (point A → point B). Mirrors kadou24h-server ride module. */
export type RideStatus = 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

export const RUNNING_RIDE: RideStatus[] = ['searching', 'accepted', 'arrived', 'in_progress'];

export interface RidePlace {
  location: GeoPoint;
  address: string;
}

export interface Ride {
  _id: string;
  rideNumber: string;
  status: RideStatus;
  pickup: RidePlace;
  dropoff: RidePlace;
  distanceKm: number;
  durationMin: number;
  /** GNF, paid in cash to the rider at the end */
  fare: number;
  note?: string;
  searchStartedAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancellation?: { by: 'passenger' | 'rider' | 'admin'; reason?: string; at: string };
  rating?: { stars: number; comment?: string; at: string };
  createdAt: string;
  /** How I see this ride */
  role: 'passenger' | 'rider' | 'admin';
  /** The rider sees the phone once they accepted */
  passenger?: { _id: string; name?: string; avatar?: FileRef; phone?: string };
  /** Never the phone (client rule) */
  rider?: {
    _id: string;
    name?: string;
    avatar?: FileRef;
    vehicle?: { type?: string; brand?: string; model?: string; color?: string; plateNumber?: string };
    /** Moto-taxi vest: the passenger checks it with the plate */
    vestNumber?: string;
    rating: number;
    ratingCount: number;
    rides: number;
    /** Live, while the rider is on this ride */
    location?: GeoPoint;
    locationAt?: string;
  };
}

export interface RideEstimate {
  distanceKm: number;
  durationMin: number;
  fare: number;
  ridersNearby: number;
}

export interface RidePlaceInput {
  lat: number;
  lng: number;
  address: string;
}

/** GET /rides/rider/offers row */
export interface RideOffer {
  _id: string;
  rideNumber: string;
  pickup: RidePlace;
  dropoff: RidePlace;
  distanceKm: number;
  durationMin: number;
  fare: number;
  note?: string;
  pickupKm: number;
  searchStartedAt: string;
}

/** My moto-taxi subscription (only while Kadou24h requires one; rides are free otherwise) */
export interface RideAccess {
  required: boolean;
  allowed: boolean;
  until: string | null;
  trialAvailable: boolean;
  trialDays: number;
  justStartedTrial: boolean;
}
