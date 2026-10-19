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
};
