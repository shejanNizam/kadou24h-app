/**
 * Shared API types. Field names and enum values mirror the server exactly
 * (kadou24h-server/src/app/modules/<module>/<module>.interface.ts).
 * Feature-specific types live in src/features/<feature>/types.ts.
 */

/** Every response: { statusCode, success, message, data, meta? } */
export interface ApiEnvelope<T> {
  statusCode: number;
  success: boolean;
  message?: string;
  data: T;
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
  [key: string]: unknown;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/**
 * Error body: { success: false, code, message, errorSources: [{ path, message }], params? }
 * `code` is a stable reason (e.g. OTP_INVALID); `message` is in the language sent as
 * Accept-Language; `params` holds the values in it (e.g. { remaining: 2 }).
 */
export interface ApiErrorBody {
  success: false;
  code?: string;
  message?: string;
  params?: Record<string, string | number>;
  errorSources?: { path: string | number; message: string }[];
}

export interface FileRef {
  url: string;
  publicId?: string;
}

// ── user.interface.ts ──────────────────────────────────────────────
export enum UserRole {
  customer = 'customer',
  vendor = 'vendor',
  rider = 'rider',
  staff = 'staff',
  admin = 'admin',
  super_admin = 'super_admin',
}

export enum AppMode {
  customer = 'customer',
  vendor = 'vendor',
  rider = 'rider',
}

export enum UserStatus {
  active = 'active',
  inactive = 'inactive',
  suspended = 'suspended',
  banned = 'banned',
}

export enum Language {
  fr = 'fr',
  en = 'en',
}

export interface User {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: FileRef;
  roles: UserRole[];
  lastActiveMode: AppMode;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  language: Language;
  country?: string;
  status: UserStatus;
  statusReason?: string;
  referralCode?: string;
  notificationPrefs?: NotificationPrefs;
  /** Vendor / rider applications (GET /user/me): drives the mode card */
  applications?: {
    vendor: { status: ApplicationStatus; reviewNote?: string } | null;
    rider: { status: ApplicationStatus; reviewNote?: string; partnerType?: 'moto' | 'transit' } | null;
  };
  /** Chat moderation: while chatRestrictedUntil is in the future, sending is blocked */
  moderation?: { violationCount: number; chatRestrictedUntil?: string };
  lastLoginAt?: string;
  createdAt?: string;
}

export type ApplicationStatus = 'draft' | 'pending' | 'needs_changes' | 'approved' | 'rejected' | 'suspended';

/** user.interface.ts INotificationPrefs: one switch per kind of notification */
export interface NotificationPrefs {
  orderUpdates: boolean;
  messages: boolean;
  deliveryUpdates: boolean;
  offers: boolean;
  jobPosts: boolean;
  accountAlerts: boolean;
}
