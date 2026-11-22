/**
 * Moto-taxi endpoints. The server fixes the price, finds the riders and checks
 * every step; the app shows the one next action for the current state.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { FileRef, Paginated } from '@/types/api';

import type { Ride, RideAccess, RideEstimate, RideOffer, RidePlaceInput } from './types';

const nextPage = <T>(last: Paginated<T>) => (last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined);

export const rideApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Passenger ───────────────────────────────────────────────────
    estimateRide: build.query<RideEstimate, { pickup: { lat: number; lng: number }; dropoff: { lat: number; lng: number } }>({
      query: (body) => ({ url: '/rides/estimate', method: 'POST', body }),
      transformResponse: unwrap<RideEstimate>,
      keepUnusedDataFor: 30,
    }),
    requestRide: build.mutation<Ride, { pickup: RidePlaceInput; dropoff: RidePlaceInput; note?: string; pickupPhoto?: FileRef }>({
      query: (body) => ({ url: '/rides', method: 'POST', body }),
      transformResponse: unwrap<Ride>,
      invalidatesTags: ['Ride'],
    }),
    getRide: build.query<Ride, string>({
      query: (id) => `/rides/${id}`,
      transformResponse: unwrap<Ride>,
      // Conversation: the unread count on the chat button follows new messages
      providesTags: (_r, _e, id) => [{ type: 'Ride', id }, 'Ride', 'Conversation'],
    }),
    getMyCurrentRide: build.query<Ride | null, void>({
      query: () => '/rides/my/current',
      transformResponse: unwrap<Ride | null>,
      providesTags: ['Ride', 'Conversation'],
    }),
    getMyRides: build.infiniteQuery<Paginated<Ride>, void, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ pageParam }) => ({ url: '/rides/my', params: { page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<Ride>,
      providesTags: ['Ride'],
    }),
    cancelRide: build.mutation<Ride, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/rides/${id}/cancel`, method: 'POST', body: { reason } }),
      transformResponse: unwrap<Ride>,
      invalidatesTags: ['Ride'],
    }),
    /** "Delete from my history": hidden for me only, a finished ride (client, 2026-10-30) */
    hideRide: build.mutation<unknown, string>({
      query: (id) => ({ url: `/rides/my/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Ride'],
    }),
    // "Share my trip": a link a close one opens in the browser (closes when the ride ends)
    shareRide: build.mutation<{ token: string; url: string }, string>({
      query: (id) => ({ url: `/rides/${id}/share`, method: 'POST' }),
      transformResponse: unwrap<{ token: string; url: string }>,
    }),
    /** I choose this rider at their price */
    acceptBid: build.mutation<Ride, { id: string; bidId: string }>({
      query: ({ id, bidId }) => ({ url: `/rides/${id}/bids/${bidId}/accept`, method: 'POST' }),
      transformResponse: unwrap<Ride>,
      invalidatesTags: ['Ride'],
    }),
    declineBid: build.mutation<Ride, { id: string; bidId: string }>({
      query: ({ id, bidId }) => ({ url: `/rides/${id}/bids/${bidId}/decline`, method: 'POST' }),
      transformResponse: unwrap<Ride>,
      invalidatesTags: ['Ride'],
    }),
    /** Once per price: between the suggested fare and the rider's price */
    counterBid: build.mutation<Ride, { id: string; bidId: string; price: number }>({
      query: ({ id, bidId, price }) => ({ url: `/rides/${id}/bids/${bidId}/counter`, method: 'POST', body: { price } }),
      transformResponse: unwrap<Ride>,
      invalidatesTags: ['Ride'],
    }),
    rateRide: build.mutation<Ride, { id: string; stars: number; comment?: string }>({
      query: ({ id, ...body }) => ({ url: `/rides/${id}/rate`, method: 'POST', body }),
      transformResponse: unwrap<Ride>,
      invalidatesTags: ['Ride'],
    }),

    // ── Rider ───────────────────────────────────────────────────────
    getRideOffers: build.query<RideOffer[], void>({
      query: () => '/rides/rider/offers',
      transformResponse: unwrap<RideOffer[]>,
      providesTags: ['RideOffer'],
    }),
    getRiderAccess: build.query<RideAccess, void>({
      query: () => '/rides/rider/access',
      transformResponse: unwrap<RideAccess>,
      providesTags: ['Subscription'],
    }),
    getRiderCurrentRide: build.query<Ride | null, void>({
      query: () => '/rides/rider/current',
      transformResponse: unwrap<Ride | null>,
      providesTags: ['Ride', 'Conversation'],
    }),
    getRiderRides: build.infiniteQuery<Paginated<Ride>, void, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ pageParam }) => ({ url: '/rides/rider/history', params: { page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<Ride>,
      providesTags: ['Ride'],
    }),
    // Negotiable price (client, 2026-11-21): I answer with a price (default the suggested one)
    placeBid: build.mutation<{ rideId: string; price: number; expiresAt: string }, { id: string; price?: number }>({
      query: ({ id, price }) => ({ url: `/rides/${id}/bid`, method: 'POST', body: price === undefined ? {} : { price } }),
      transformResponse: unwrap<{ rideId: string; price: number; expiresAt: string }>,
      invalidatesTags: ['RideOffer'],
    }),
    withdrawBid: build.mutation<unknown, string>({
      query: (id) => ({ url: `/rides/${id}/bid`, method: 'DELETE' }),
      invalidatesTags: ['RideOffer'],
    }),
    /** My answer to the passenger's counter-offer: yes takes the ride at their price */
    answerCounter: build.mutation<unknown, { id: string; accept: boolean }>({
      query: ({ id, accept }) => ({ url: `/rides/${id}/bid/answer`, method: 'POST', body: { accept } }),
      invalidatesTags: ['Ride', 'RideOffer', 'DeliveryOffer'],
    }),
    skipRide: build.mutation<unknown, string>({
      query: (id) => ({ url: `/rides/${id}/skip`, method: 'POST' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(rideApi.util.updateQueryData('getRideOffers', undefined, (draft) => draft.filter((o) => o._id !== id)));
        queryFulfilled.catch(patch.undo);
      },
    }),
    /** arrived → start → complete */
    rideStep: build.mutation<Ride, { id: string; step: 'arrived' | 'start' | 'complete' }>({
      query: ({ id, step }) => ({ url: `/rides/${id}/${step}`, method: 'POST' }),
      transformResponse: unwrap<Ride>,
      invalidatesTags: ['Ride', 'RideOffer', 'DeliveryOffer'],
    }),
    releaseRide: build.mutation<unknown, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/rides/${id}/release`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Ride', 'RideOffer'],
    }),
  }),
});

export const {
  useHideRideMutation,
  useEstimateRideQuery,
  useRequestRideMutation,
  useGetRideQuery,
  useGetMyCurrentRideQuery,
  useGetMyRidesInfiniteQuery,
  useCancelRideMutation,
  useRateRideMutation,
  useShareRideMutation,
  useGetRideOffersQuery,
  useGetRiderCurrentRideQuery,
  useGetRiderAccessQuery,
  useGetRiderRidesInfiniteQuery,
  usePlaceBidMutation,
  useWithdrawBidMutation,
  useAnswerCounterMutation,
  useAcceptBidMutation,
  useDeclineBidMutation,
  useCounterBidMutation,
  useSkipRideMutation,
  useRideStepMutation,
  useReleaseRideMutation,
} = rideApi;
