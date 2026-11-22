/**
 * Worker bookings (server: booking.route.ts). The customer requests, the worker
 * accepts or declines; payment is made directly between them, never in the app.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { Paginated } from '@/types/api';

import type {
  Booking,
  BookingInput,
  BookingListFilter,
  BookingRole,
  BookingStatus,
  PenaltyNotice,
  ReviewInput,
  Standing,
  WorkerReview,
} from './types';

export type BookingPage = Paginated<Booking> & {
  meta: { counts?: Partial<Record<BookingStatus, number>> };
};

export const bookingApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBookings: build.query<BookingPage, { as: BookingRole; status?: BookingListFilter; page?: number }>({
      query: (params) => ({
        url: '/bookings',
        params: { limit: 30, ...params },
      }),
      transformResponse: unwrapPage<Booking>,
      providesTags: ['Booking'],
    }),
    getBooking: build.query<Booking, string>({
      query: (id) => `/bookings/${id}`,
      transformResponse: unwrap<Booking>,
      providesTags: (_r, _e, id) => [{ type: 'Booking', id }],
    }),
    getStanding: build.query<Standing, void>({
      query: () => '/bookings/me/standing',
      transformResponse: unwrap<Standing>,
      providesTags: ['Booking'],
    }),
    createBooking: build.mutation<Booking, BookingInput>({
      query: (body) => ({ url: '/bookings', method: 'POST', body }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['Booking'],
    }),
    acceptBooking: build.mutation<Booking, string>({
      query: (id) => ({ url: `/bookings/${id}/accept`, method: 'PATCH' }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['Booking', 'Cv'],
    }),
    declineBooking: build.mutation<Booking, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/bookings/${id}/decline`,
        method: 'PATCH',
        body: { reason },
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['Booking', 'Cv'],
    }),
    cancelBooking: build.mutation<{ booking: Booking; penalty: PenaltyNotice | null }, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/bookings/${id}/cancel`,
        method: 'PATCH',
        body: { reason },
      }),
      transformResponse: unwrap<{
        booking: Booking;
        penalty: PenaltyNotice | null;
      }>,
      invalidatesTags: ['Booking', 'Cv'],
    }),
    markBookingDone: build.mutation<Booking, { id: string; agreedPrice?: number }>({
      query: ({ id, agreedPrice }) => ({
        url: `/bookings/${id}/done`,
        method: 'PATCH',
        body: { agreedPrice },
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['Booking', 'Cv'],
    }),
    confirmBooking: build.mutation<Booking, string>({
      query: (id) => ({ url: `/bookings/${id}/confirm`, method: 'PATCH' }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['Booking'],
    }),
    reportNotDone: build.mutation<Booking, { id: string; note?: string }>({
      query: ({ id, note }) => ({
        url: `/bookings/${id}/not-done`,
        method: 'PATCH',
        body: { note },
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['Booking'],
    }),
    reviewBooking: build.mutation<WorkerReview, { id: string } & ReviewInput>({
      query: ({ id, ...body }) => ({
        url: `/bookings/${id}/review`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap<WorkerReview>,
      invalidatesTags: ['Booking', 'Cv'],
    }),
    /** "Delete my review" (client, 2026-11-22): the worker's rating is redone; I may review again */
    deleteBookingReview: build.mutation<unknown, string>({
      query: (id) => ({ url: `/bookings/${id}/review`, method: 'DELETE' }),
      invalidatesTags: ['Booking', 'Cv'],
    }),
    /** "Delete from my history": a finished booking, hidden for my side only */
    hideBooking: build.mutation<unknown, string>({
      query: (id) => ({ url: `/bookings/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Booking'],
    }),
    /** Public: reviews from completed bookings (meta.stars = count per rating) */
    getWorkerReviews: build.query<Paginated<WorkerReview>, { profileId: string; page?: number }>({
      query: ({ profileId, page }) => ({
        url: `/professional-profiles/workers/${profileId}/reviews`,
        params: { page, limit: 10 },
      }),
      transformResponse: unwrapPage<WorkerReview>,
      providesTags: ['Booking'],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useGetBookingQuery,
  useGetStandingQuery,
  useCreateBookingMutation,
  useAcceptBookingMutation,
  useDeclineBookingMutation,
  useCancelBookingMutation,
  useMarkBookingDoneMutation,
  useConfirmBookingMutation,
  useReportNotDoneMutation,
  useReviewBookingMutation,
  useDeleteBookingReviewMutation,
  useHideBookingMutation,
  useGetWorkerReviewsQuery,
} = bookingApi;
