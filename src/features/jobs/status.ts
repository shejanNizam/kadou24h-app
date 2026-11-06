/**
 * Application status → colour, the match score (same formula as the server's
 * calculateMatchScore), and starting a fee payment.
 */
import { router } from 'expo-router';

import type { StatusTone } from '@/components/ui/StatusPill';
import type { Payment } from '@/features/orders/types';

import type { ApplicationStatus, Job } from './types';

export const APPLICATION_TONE: Record<ApplicationStatus, StatusTone> = {
  pending_payment: 'amber',
  applied: 'blue',
  under_review: 'blue',
  shortlisted: 'purple',
  interview: 'orange',
  hired: 'green',
  rejected: 'red',
  withdrawn: 'grey',
};

/** The candidate can still take it back */
export const WITHDRAWABLE: ApplicationStatus[] = ['applied', 'under_review', 'shortlisted', 'interview'];

/**
 * 0–100: share of the job's wanted skills (80 %) and languages (20 %) I have.
 * A job that asks for nothing matches everyone.
 */
export function matchScore(job: Pick<Job, 'prefSkills' | 'prefLanguages'>, mine: { skills: string[]; languages: string[] }): number {
  const wantSkills = job.prefSkills ?? [];
  const wantLangs = job.prefLanguages ?? [];
  if (!wantSkills.length && !wantLangs.length) return 100;
  const norm = (list: string[]) => new Set(list.map((s) => s.toLowerCase().trim()));
  const share = (want: string[], have: Set<string>) => Math.round((want.filter((w) => have.has(w.toLowerCase().trim())).length / want.length) * 100);
  const skill = wantSkills.length ? share(wantSkills, norm(mine.skills)) : 100;
  const lang = wantLangs.length ? share(wantLangs, norm(mine.languages)) : 100;
  if (wantSkills.length && wantLangs.length) return Math.round(skill * 0.8 + lang * 0.2);
  return wantSkills.length ? skill : lang;
}

export const MATCH_TONE = (score: number): StatusTone => (score >= 70 ? 'green' : score >= 40 ? 'amber' : 'grey');

/** A fee started on the server: the payment screen, unless it already went through */
export function openFeePayment(payment: Payment | null | undefined, onPaid?: () => void) {
  if (!payment || payment.status === 'success') {
    onPaid?.();
    return;
  }
  router.push({ pathname: '/payment/[id]', params: { id: payment._id } });
}

/** What a job's state means for the recruiter (a published job past its 30 days is "expired") */
export function jobState(job: { status: string; isOpen?: boolean }): {
  key: 'live' | 'draft' | 'unpaid' | 'closed' | 'expired' | 'removed';
  tone: StatusTone;
} {
  if (job.isOpen) return { key: 'live', tone: 'green' };
  if (job.status === 'removed') return { key: 'removed', tone: 'red' };
  if (job.status === 'draft') return { key: 'draft', tone: 'grey' };
  if (job.status === 'pending_payment') return { key: 'unpaid', tone: 'amber' };
  if (job.status === 'closed') return { key: 'closed', tone: 'red' };
  return { key: 'expired', tone: 'grey' };
}
