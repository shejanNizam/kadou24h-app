/**
 * Auth request/response types — mirror kadou24h-server auth.validation.ts / auth.service.ts.
 */
import type { User } from '@/types/api';

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** Sent after register / resend / an unverified login: where the code went. */
export interface OtpSent {
  phone?: string; // masked, e.g. "+224 ••• •• 56"
  email?: string; // masked
  expiresIn: number; // seconds
  resendIn: number; // seconds before a new code can be asked
}

/** Login of an account that never entered its code: no tokens, a code is (re)sent. */
export interface LoginNeedsVerification extends OtpSent {
  requiresVerification: true;
}

export type LoginResult = Session | LoginNeedsVerification;

export const isSession = (r: LoginResult): r is Session => 'accessToken' in r;

export type OtpPurpose = 'verify_account' | 'reset_password';

export interface RegisterBody {
  name: string;
  phone: string;
  email?: string;
  password: string;
  language?: 'fr' | 'en';
  referralCode?: string;
}

export interface ForgotPasswordResult {
  message: string;
  expiresIn: number;
  resendIn: number;
}

export interface ResetTokenResult {
  resetToken: string;
  expiresIn: number;
}

/** "What brings you here?" — vendor / rider go to their application after OTP. */
export type SignupIntent = 'customer' | 'vendor' | 'rider';
