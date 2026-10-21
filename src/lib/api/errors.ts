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

/** "Your account is suspended: <reason>" (login / any call) → the Suspended screen */
export function blockedAccount(error: unknown): { status: 'suspended' | 'banned'; reason?: string } | null {
  const match = serverMessage(error)?.match(/your account is (suspended|banned)(?::\s*(.+))?/i);
  return match ? { status: match[1].toLowerCase() as 'suspended' | 'banned', reason: match[2] } : null;
}

/** 404: e.g. "no vendor application yet" — a normal empty state, not an error */
export const isNotFound = (error: unknown) => statusOf(error) === 404;

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
  // Account & settings
  if (/old password does not match/i.test(message)) return t('errors.oldPasswordWrong');
  if (/new password cannot be the same/i.test(message)) return t('errors.samePassword');
  if (/no password set yet/i.test(message)) return t('errors.noPassword');
  if (/already used by another account/i.test(message)) return t('errors.phoneTaken');
  if (/already your verified phone/i.test(message)) return t('errors.samePhone');
  if (/you have orders in progress/i.test(message)) return t('errors.deleteOrders');
  if (/your store has orders in progress/i.test(message)) return t('errors.deleteStoreOrders');
  if (/you have deliveries in progress/i.test(message)) return t('errors.deleteDeliveries');
  if (/cash on delivery money/i.test(message)) return t('errors.deleteCash');
  if (/wallet still has money/i.test(message)) return t('errors.deleteWallet');
  // Rider: deliveries and COD cash
  const locked = message.match(/try again in (\d+) min/i);
  if (locked) return t('errors.pinLocked', { count: Number(locked[1]) });
  const cashLimit = message.match(/exceeds authorized partner limit \(([\d\s,. ]+) GNF\)/i);
  if (cashLimit) return t('errors.cashLimit', { limit: `${cashLimit[1].trim()} GNF` });
  if (/no assigned delivery found|no longer assigned to you|assigned delivery not found/i.test(message)) return t('errors.deliveryGone');
  if (/already updated\. please refresh|cannot verify (pickup|handover) while/i.test(message)) return t('errors.deliveryChanged');
  const owedCap = message.match(/cannot exceed the cash you still owe \((\d+) GNF\)/i);
  if (owedCap) return t('errors.codTooMuch', { amount: `${Number(owedCap[1]).toLocaleString('fr-FR')} GNF` });
  if (/insufficient available balance for offset/i.test(message)) return t('errors.offsetTooMuch');
  if (/unremitted COD cash/i.test(message)) return t('errors.withdrawCashOwed');
  if (/currently offline/i.test(message)) return t('errors.riderOffline');
  if (/only local delivery partners can join/i.test(message)) return t('errors.onlyMotoJoin');
  // Chat
  if (/no rider is assigned/i.test(message)) return t('errors.noRiderYet');
  if (/not part of this/i.test(message)) return t('errors.notYourOrder');
  if (/chat is temporarily restricted/i.test(message)) return t('errors.chatRestricted');
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
