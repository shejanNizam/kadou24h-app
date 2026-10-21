/**
 * Jobs: searching and applying (every mode), my applications, and the
 * recruiter side (my jobs, candidates, CV unlock, interviews). Mirrors
 * kadou24h-server job.interface.ts / job.service.ts.
 */
import type { Job, JobType, WorkplaceType } from '@/features/catalog/types';
import type { Payment } from '@/features/orders/types';
import type { FileRef } from '@/types/api';

export type { Job, JobType, WorkplaceType };

export type JobStatus = 'draft' | 'pending_payment' | 'published' | 'closed' | 'expired';
export type ApplicationStatus =
  | 'pending_payment'
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

/** Online methods only: fees are never paid at the door */
export type FeeMethod = 'orange_money' | 'mobile_money' | 'card';
export const FEE_METHODS: FeeMethod[] = ['orange_money', 'mobile_money', 'card'];

/** GET /jobs/:id: + who is looking */
export interface JobDetails extends Job {
  postedBy: { _id: string; name: string; avatar?: FileRef } | string;
  isOwner?: boolean;
  /** Published and not past its 30 days */
  isOpen?: boolean;
  myApplication?: { _id: string; status: ApplicationStatus; createdAt: string } | null;
  expiresAt?: string;
  stats?: JobStats;
}

export interface JobStats {
  views: number;
  applicants: number;
  shortlisted: number;
  interviews: number;
}

export interface Interview {
  at?: string;
  location?: string;
  mapUrl?: string;
  note?: string;
  confirmedAt?: string;
}

export interface CvSnapshot {
  file?: FileRef;
  profession?: string;
  skills?: string[];
  summary?: string;
}

interface ApplicationJob {
  _id: string;
  title: string;
  organizationName: string;
  organizationLogo?: FileRef;
  city?: string;
  area?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryFrequency?: Job['salaryFrequency'];
  status?: JobStatus;
  expiresAt?: string;
}

/** Candidate side: GET /jobs/applications/my and /applications/:id */
export interface MyApplication {
  _id: string;
  kind: 'offer' | 'spontaneous';
  jobId?: ApplicationJob | null;
  targetVendorId?: { _id: string; storeName: string; logo?: FileRef } | null;
  cvSnapshot: CvSnapshot;
  matchScore: number;
  status: ApplicationStatus;
  interview?: Interview;
  createdAt: string;
  updatedAt: string;
  viewerRole?: 'candidate' | 'recruiter';
}

/** Recruiter side: applicants of my job / my store, behind the CV paywall */
export interface Candidate {
  _id: string;
  kind: 'offer' | 'spontaneous';
  jobId?: string | ApplicationJob | null;
  applicantId: string;
  applicant: { _id: string; name?: string; avatar?: FileRef; phone?: string; email?: string };
  /** The CV file only once unlocked */
  cvSnapshot: CvSnapshot;
  isCvUnlocked: boolean;
  matchScore: number;
  status: ApplicationStatus;
  interview?: Interview;
  createdAt: string;
  viewerRole?: 'recruiter';
}

export type MyJobsTab = 'active' | 'draft' | 'closed';

export interface MyJob extends Job {
  status: JobStatus;
  isOpen: boolean;
  expiresAt?: string;
  stats: JobStats;
  updatedAt: string;
}

export interface MyJobsCounts {
  active: number;
  draft: number;
  closed: number;
  applicants: number;
  views: number;
}

export interface JobInput {
  organizationName: string;
  organizationLogo?: FileRef;
  title: string;
  categoryId?: string;
  jobType: JobType;
  workplace: WorkplaceType;
  country?: string;
  city?: string;
  area?: string;
  location?: { lat: number; lng: number };
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryFrequency?: 'monthly' | 'weekly' | 'hourly';
  about: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  aboutCompany?: string;
  prefExperienceLevel?: string;
  prefMinEducation?: string;
  prefSkills?: string[];
  prefLanguages?: string[];
  applicationDeadline?: string;
  vacancies?: number;
}

/** A fee started on the server: open the payment screen unless already paid */
export interface FeePayment {
  payment: Payment | null;
}
