import type { GeoPoint } from '@/features/orders/types';
import type { FileRef } from '@/types/api';

/** Moto-taxi (point A → point B). Mirrors kadou24h-server ride module. */
export type RideStatus = 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'expired';

export const RUNNING_RIDE: RideStatus[] = ['searching', 'accepted', 'arrived', 'in_progress'];

/** A rider's price for a searching ride (negotiable price, client 2026-11-21) */
export type RideBidStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
export const LIVE_BID: RideBidStatus[] = ['pending', 'countered'];

/** A price the passenger can choose: who offers it (never the phone) and until when */
export interface RideBid {
  _id: string;
  price: number;
  /** The passenger's counter-offer, waiting for the rider */
  counterPrice?: number;
  status: RideBidStatus;
  expiresAt: string;
  createdAt: string;
  pickupKm: number;
  etaMin: number;
  rider?: {
    _id: string;
    name?: string;
    avatar?: FileRef;
    vehicle?: { type?: string; brand?: string; color?: string };
    rating: number;
    ratingCount: number;
    rides: number;
  };
}

/** My last price on a ride request (rider) */
export interface MyRideBid {
  _id: string;
  price: number;
  counterPrice?: number;
  status: RideBidStatus;
  expiresAt: string;
}

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
  /** GNF, paid in cash to the rider at the end: the suggested price while searching, the agreed one once a rider is chosen */
  fare: number;
  /** GNF, Kadou24h's price */
  suggestedFare: number;
  /** GNF, the most a rider may ask */
  maxFare: number;
  /** The riders' live prices (passenger, while searching) */
  bids?: RideBid[];
  /** Unread messages for me in this ride's chat (passenger or rider) */
  chatUnread?: number;
  note?: string;
  /** The passenger's photo of the pickup spot (gate, landmark) */
  pickupPhoto?: FileRef;
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
  /** Kadou24h's suggested price */
  fare: number;
  /** The most a rider may ask */
  maxFare: number;
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
  suggestedFare: number;
  maxFare: number;
  note?: string;
  pickupPhoto?: FileRef;
  pickupKm: number;
  searchStartedAt: string;
  /** My last price for it */
  myBid?: MyRideBid;
  /** Prices I may still send for it */
  bidsLeft: number;
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
