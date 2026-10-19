/**
 * Turns an RTK Query error into something a person can read, in their language.
 * Server messages are English, so the common cases are translated here; anything
 * else falls back to the server's message.
 */
import type { TFunction } from 'i18next';

import type { ApiErrorBody } from '@/types/api';

/** Accepts whatever a mutation .unwrap() threw or a query's `error`. */
const asObject = (error: unknown): Record<string, unknown> | undefined =>
  error && typeof error === 'object' ? (error as Record<string, unknown>) : undefined;

const bodyOf = (error: unknown): ApiErrorBody | undefined =>
  asObject(asObject(error)?.data) as ApiErrorBody | undefined;

export const statusOf = (error: unknown): number | string | undefined =>
  asObject(error)?.status as number | string | undefined;

export const serverMessage = (error: unknown): string | undefined => bodyOf(error)?.message;

export function getApiErrorMessage(error: unknown, t: TFunction): string {
  const status = statusOf(error);
  const message = serverMessage(error) ?? '';

  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') return t('errors.network');
  if (status === 'PARSING_ERROR') return t('errors.server');
  if (typeof status === 'number' && status >= 500) return t('errors.server');

  // OTP / PIN: "Invalid code. 3 attempts remaining."
  const attempts = message.match(/(\d+) attempts? remaining/i);
  if (attempts) return t('errors.attemptsLeft', { count: Number(attempts[1]) });
  if (/too many failed attempts/i.test(message)) return t('errors.tooManyAttempts');
  if (/expired or not found/i.test(message)) return t('errors.codeExpired');
  const wait = message.match(/wait (\d+)s/i);
  if (wait) return t('errors.waitSeconds', { count: Number(wait[1]) });
  if (/invalid phone\/email or password/i.test(message)) return t('errors.invalidCredentials');
  if (/phone number already exists/i.test(message)) return t('errors.phoneTaken');
  if (/email is already in use/i.test(message)) return t('errors.emailTaken');
  if (/invalid referral code/i.test(message)) return t('errors.invalidReferral');
  if (/uses google or apple sign-in/i.test(message)) return t('errors.socialAccount');
  const blocked = message.match(/your account is (suspended|banned)(?::\s*(.+))?/i);
  if (blocked) return t('errors.accountBlocked', { reason: blocked[2] ?? '' });
  if (status === 429) return t('errors.tooManyRequests');

  return message || t('errors.generic');
}

/** Field errors from a 400 validation response: { fieldName: message }. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const source of bodyOf(error)?.errorSources ?? []) {
    const key = String(source.path).split('.').pop();
    if (key && !out[key]) out[key] = source.message;
  }
  return out;
}
