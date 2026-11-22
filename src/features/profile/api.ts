/**
 * Account & settings (server: user.route.ts, auth.route.ts, support_ticket,
 * payment, review). Shared by every mode.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { FileRef, NotificationPrefs, Paginated, User } from '@/types/api';

import type { Payment } from '../orders/types';
import type { WithdrawalFee } from '../wallet/types';

export type TicketType =
  | 'order_issue'
  | 'account_access'
  | 'payment_dispute'
  | 'app_bug'
  | 'rider_conduct'
  | 'vendor_inquiry'
  | 'general'
  | 'other';
export type TicketUrgency = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  userMode: string;
  type: TicketType;
  subject?: string;
  urgency: TicketUrgency;
  description: string;
  attachments?: string[];
  status: TicketStatus;
  /** The support team's answer */
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyReview {
  _id: string;
  vendorId?: { _id: string; storeName: string; logo?: FileRef } | null;
  rating: number;
  comment?: string;
  status: string;
  createdAt: string;
}

export interface PublicSettings {
  platformName?: string;
  supportEmail?: string;
  contactNumber?: string;
  whatsappSupportNumber?: string;
  /** Vendor pays max(rate % of the subtotal, min) */
  commission?: { rate: number; min: number };
  withdrawalFees?: WithdrawalFee[];
  /** GNF: job publishing, CV unlock, spontaneous application */
  pricing?: { jobPublishFee: number; cvUnlockFee: number; spontaneousApplicationFee: number };
  /** A store must accept a new order within acceptMinutes, or it is cancelled automatically */
  orders?: { acceptMinutes: number };
  /** Chat messages older than this are deleted (client, 2026-11-22) */
  chat?: { retentionDays: number };
}

const nextPage = <T>(last: Paginated<T>) => (last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined);

export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Account ────────────────────────────────────────────────────
    requestPhoneChange: build.mutation<{ phone?: string; expiresIn: number; resendIn: number }, { phone: string }>({
      query: (body) => ({ url: '/user/me/phone/request', method: 'POST', body }),
      transformResponse: unwrap<{ phone?: string; expiresIn: number; resendIn: number }>,
    }),
    verifyPhoneChange: build.mutation<User, { phone: string; otp: string }>({
      query: (body) => ({ url: '/user/me/phone/verify', method: 'POST', body }),
      transformResponse: unwrap<User>,
      invalidatesTags: ['Me'],
    }),
    /** Returns a new token pair: other devices are signed out */
    changePassword: build.mutation<{ accessToken: string; refreshToken: string }, { oldPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
      transformResponse: unwrap<{ accessToken: string; refreshToken: string }>,
    }),
    deleteAccount: build.mutation<unknown, void>({
      query: () => ({ url: '/user/me', method: 'DELETE' }),
    }),
    updateNotificationPrefs: build.mutation<NotificationPrefs, Partial<NotificationPrefs>>({
      query: (body) => ({ url: '/user/me/notification-preferences', method: 'PATCH', body }),
      transformResponse: unwrap<NotificationPrefs>,
      invalidatesTags: ['Me'],
    }),
    getPublicSettings: build.query<PublicSettings, void>({
      query: () => '/settings/public',
      transformResponse: unwrap<PublicSettings>,
      keepUnusedDataFor: 3600,
    }),

    // ── Support ────────────────────────────────────────────────────
    getMyTickets: build.infiniteQuery<Paginated<SupportTicket>, void, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ pageParam }) => ({ url: '/support-tickets/me', params: { page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<SupportTicket>,
      providesTags: ['Ticket'],
    }),
    getTicket: build.query<SupportTicket, string>({
      query: (id) => `/support-tickets/me/${id}`,
      transformResponse: unwrap<SupportTicket>,
      providesTags: (_r, _e, id) => [{ type: 'Ticket', id }],
    }),
    createTicket: build.mutation<
      SupportTicket,
      { type: TicketType; urgency: TicketUrgency; subject?: string; description: string; userMode: string; attachments?: string[] }
    >({
      query: (body) => ({ url: '/support-tickets', method: 'POST', body }),
      transformResponse: unwrap<SupportTicket>,
      invalidatesTags: ['Ticket'],
    }),

    // ── History ────────────────────────────────────────────────────
    getMyPayments: build.infiniteQuery<Paginated<Payment>, void, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ pageParam }) => ({ url: '/payments/me', params: { page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<Payment>,
    }),
    getMyReviews: build.infiniteQuery<Paginated<MyReview>, void, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ pageParam }) => ({ url: '/reviews/me', params: { page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<MyReview>,
      providesTags: ['Order'],
    }),
    /** "Delete my review" (client, 2026-11-22): the store and product ratings are redone */
    deleteMyReview: build.mutation<unknown, string>({
      query: (id) => ({ url: `/reviews/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Order', 'Product', 'Store'],
    }),
  }),
});

export const {
  useRequestPhoneChangeMutation,
  useDeleteMyReviewMutation,
  useVerifyPhoneChangeMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useUpdateNotificationPrefsMutation,
  useGetPublicSettingsQuery,
  useGetMyTicketsInfiniteQuery,
  useGetTicketQuery,
  useCreateTicketMutation,
  useGetMyPaymentsInfiniteQuery,
  useGetMyReviewsInfiniteQuery,
} = profileApi;
