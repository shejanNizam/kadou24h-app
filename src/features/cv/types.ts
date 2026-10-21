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
  updatedAt: string;
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
