/**
 * My CV (professional profile), the worker listing and subscription plans.
 * Mirrors kadou24h-server professional_profile and subscription.
 */
import type { CategoryRef } from '@/features/catalog/types';
import type { GeoPoint } from '@/features/orders/types';
import type { FileRef } from '@/types/api';

export interface Education {
  _id?: string;
  degree: string;
  institution: string;
  year: string;
}

export interface Experience {
  _id?: string;
  title: string;
  company?: string;
  location?: string;
  /** ISO date */
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

/** GET /professional-profiles/me (created empty on first read) */
export interface MyCv {
  _id: string;
  userId: string;
  profession?: string;
  summary?: string;
  photo?: FileRef;
  city?: string;
  location?: GeoPoint;
  /** A CV the user uploaded (PDF or photo) */
  uploadedResume?: FileRef;
  /** The PDF the app made from this profile */
  generatedCv?: FileRef;
  generatedAt?: string;
  skills: string[];
  languages: string[];
  achievements: string[];
  profileEducation: Education[];
  profileExperience: Experience[];
  isWorkerListed: boolean;
  hourlyRate?: number;
  experienceYears?: number;
  serviceCategoryId?: string | CategoryRef;
  /** Paid visibility (a plan with cv_visibility) */
  cvVisible: boolean;
  visibleUntil?: string;
  ratingAvg: number;
  ratingCount: number;
  /** When I work (worker profile) */
  workingHours?: WorkingHours;
  /** ID card photo — only the Kadou24h team sees it */
  idDocument?: FileRef;
  /** Photos of past work, public (max 10) */
  workPhotos?: FileRef[];
  listedUntil?: string;
  /** Worker listing approval: customers see me only once approved */
  approvalStatus: WorkerStatus;
  reviewNote?: string;
  submittedAt?: string;
  updatedAt: string;
}

export type WorkerStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'needs_changes' | 'suspended';

/** days 0 (Sunday) … 6 (Saturday); hours "HH:mm" */
export interface WorkingHours {
  days: number[];
  from: string;
  to: string;
}

/** GET /professional-profiles/me/worker-summary — real data only (no bookings or earnings exist) */
export interface WorkerSummary {
  profileId: string;
  approvalStatus: WorkerStatus;
  reviewNote?: string;
  submittedAt?: string;
  isWorkerListed: boolean;
  /** Shown to customers right now (approved, listed, paid or trial, not suspended) */
  isVisible: boolean;
  /** Free 30 days after the first approval, then a service-provider plan */
  listing: { listedUntil?: string; active: boolean; trialUsed: boolean };
  /** Cancellation penalties still running, and the cancellations counted in the last 30 days */
  penalty: {
    lessVisibleUntil?: string;
    suspendedUntil?: string;
    limitedUntil?: string;
    strikes: { _id: string; tier: number; penalty: string; createdAt: string }[];
  };
  bookings: { requested: number; accepted: number; done: number; completed: number };
  /** Prices the worker entered when finishing (payments never go through the app) */
  earnings: { total: number; thisMonth: number; pricedJobs: number };
  ratingAvg: number;
  ratingCount: number;
  messages: { conversations: number; unread: number; unreadChats: number };
  recent: {
    _id: string;
    peer: { _id: string; name: string; avatar?: FileRef } | null;
    lastMessage?: { text?: string; type: 'text' | 'image' | 'voice' | 'system'; at: string };
    unreadCount: number;
  }[];
}

export interface CvInput {
  profession?: string;
  summary?: string;
  photo?: FileRef | null;
  city?: string;
  location?: { lat: number; lng: number };
  uploadedResume?: FileRef | null;
  generatedCv?: FileRef | null;
  skills?: string[];
  languages?: string[];
  achievements?: string[];
  profileEducation?: Education[];
  profileExperience?: Experience[];
  hourlyRate?: number;
  experienceYears?: number;
  serviceCategoryId?: string;
  /** null clears it */
  workingHours?: WorkingHours | null;
  idDocument?: FileRef | null;
  workPhotos?: FileRef[];
}

export interface WorkerListingInput {
  isWorkerListed: boolean;
  hourlyRate?: number;
  experienceYears?: number;
  serviceCategoryId?: string;
}

/** The CV a job application sends: my upload first, else the generated PDF */
export const cvFileOf = (cv?: Pick<MyCv, 'uploadedResume' | 'generatedCv'> | null) => cv?.uploadedResume ?? cv?.generatedCv;

// ── Subscriptions ────────────────────────────────────────────────────
export type PlanAudience = 'job_seeker' | 'service_provider';

export interface Plan {
  _id: string;
  name: string;
  audience: PlanAudience;
  price: number;
  durationDays: number;
  features: 'cv_visibility'[];
  highlights: string[];
}

export interface MySubscription {
  _id: string;
  planId: string;
  planSnapshot: { name: string; price: number; features: string[] };
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startsAt: string;
  endsAt: string;
}
