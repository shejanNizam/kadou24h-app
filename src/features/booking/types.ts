/**
 * Worker bookings — mirrors kadou24h-server booking.interface.ts / booking.service present().
 * Payment is made directly between the customer and the worker (cash / Orange Money).
 */
import type { FileRef } from '@/types/api';

export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'done' | 'completed';
export type BookingActor = 'customer' | 'worker' | 'admin' | 'system';
export type BookingRole = 'customer' | 'worker';

export interface BookingPerson {
  _id: string;
  name?: string;
  avatar?: FileRef;
  /** Only once the worker accepted */
  phone?: string;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  /** Who I am in this booking */
  role: BookingRole;
  status: BookingStatus;
  scheduledAt: string;
  description: string;
  photos: FileRef[];
  profession?: string;
  hourlyRate?: number;
  customer: BookingPerson | null;
  worker:
    | (BookingPerson & {
        profileId?: string;
        profession?: string;
        photo?: FileRef;
        ratingAvg?: number;
        ratingCount?: number;
      })
    | null;
  /** Before acceptance the worker gets the area only */
  address: {
    fullName?: string;
    phone?: string;
    city: string;
    commune?: string;
    neighborhood?: string;
    landmark?: string;
    directions?: string;
    location?: { lat: number; lng: number };
    placePhoto?: FileRef;
  };
  contactShared: boolean;
  respondBy: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  expiredAt?: string;
  cancelledAt?: string;
  cancelledBy?: BookingActor;
  cancelReason?: string;
  cancelCounted?: boolean;
  doneAt?: string;
  agreedPrice?: number;
  confirmBy?: string;
  completedAt?: string;
  completedBy?: BookingActor;
  reviewId?: string;
  canReview: boolean;
  history: {
    status: BookingStatus;
    by: BookingActor;
    at: string;
    note?: string;
  }[];
  createdAt: string;
  review?: WorkerReview | null;
}

export interface BookingInput {
  workerProfileId: string;
  scheduledAt: string;
  addressId?: string;
  description: string;
  photos?: FileRef[];
}

export type PenaltyType = 'warning' | 'less_visible' | 'suspension' | 'limited';

/** Returned right after a cancellation that counted */
export interface PenaltyNotice {
  role: 'worker' | 'customer';
  tier: number;
  penalty: PenaltyType;
  lessVisibleUntil?: string;
  suspendedUntil?: string;
  limitedUntil?: string;
}

export interface Standing {
  customer: { strikes30d: number; limitedUntil?: string };
}

export interface WorkerReview {
  _id: string;
  rating: number;
  comment?: string;
  photos: FileRef[];
  status?: 'visible' | 'hidden';
  createdAt: string;
  authorId?: { _id: string; name?: string; avatar?: FileRef };
}

export interface ReviewInput {
  rating: number;
  comment?: string;
  photos?: FileRef[];
}

export type BookingListFilter = 'active' | 'history' | BookingStatus;
