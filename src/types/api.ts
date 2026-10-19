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

/** Error body: { success: false, message, errorSources: [{ path, message }] } */
export interface ApiErrorBody {
  success: false;
  message?: string;
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
  lastLoginAt?: string;
  createdAt?: string;
}
