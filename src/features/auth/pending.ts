/**
 * In-memory hand-off between auth screens (phone to verify, reset token).
 * Kept out of route params so phone numbers and tokens never land in the web
 * URL / browser history. Lost on a full page reload → screens send users back.
 */
import type { SignupIntent } from './types';

export interface PendingVerification {
  purpose: 'verify_account' | 'reset_password';
  /** Full E.164 phone (account) or the identifier used (reset). */
  identifier: string;
  maskedPhone?: string;
  maskedEmail?: string;
  resendIn: number;
  sentAt: number;
  intent: SignupIntent;
}

let pending: PendingVerification | null = null;
let resetToken: { token: string; expiresAt: number } | null = null;
let returnTo: string | null = null;

export const pendingAuth = {
  setVerification(value: Omit<PendingVerification, 'sentAt'>) {
    pending = { ...value, sentAt: Date.now() };
  },
  getVerification: () => pending,
  clearVerification() {
    pending = null;
  },
  setResetToken(token: string, expiresIn: number) {
    resetToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  },
  getResetToken: () => (resetToken && resetToken.expiresAt > Date.now() ? resetToken.token : null),
  clearResetToken() {
    resetToken = null;
  },
  /** Screen a guest was on when an action needed an account (back there after sign-in). */
  setReturnTo(path: string | null) {
    returnTo = path;
  },
  takeReturnTo() {
    const path = returnTo;
    returnTo = null;
    return path;
  },
};
