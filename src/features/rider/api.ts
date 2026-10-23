/**
 * Rider mode endpoints. The server decides every rule (cash limit on accept,
 * PIN checks and lock, what is still owed); the app shows the one next action
 * that is valid for the current state.
 */
import type { PublicVendor } from '@/features/catalog/types';
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { Paginated } from '@/types/api';

import type {
  CodInput,
  CodSettlement,
  MyRider,
  OffersResult,
  RiderDelivery,
  RiderDeliveryDetails,
  RiderInput,
  RiderTab,
  RiderUpdate,
  StoreLink,
} from './types';

const nextPage = <T>(last: Paginated<T>) => (last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined);

export const riderApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── My application / profile ───────────────────────────────────
    /** 404 = no application started yet */
    getMyRider: build.query<MyRider, void>({
      query: () => '/riders/me',
      transformResponse: unwrap<MyRider>,
      providesTags: ['Rider'],
    }),
    /** Draft: any subset of fields, saved on every step */
    saveRiderApplication: build.mutation<MyRider, RiderInput>({
      query: (body) => ({ url: '/riders/me/application', method: 'PUT', body }),
      transformResponse: unwrap<MyRider>,
      invalidatesTags: ['Rider', 'Wallet'],
    }),
    submitRiderApplication: build.mutation<MyRider, void>({
      query: () => ({ url: '/riders/me/application/submit', method: 'POST' }),
      transformResponse: unwrap<MyRider>,
      invalidatesTags: ['Rider', 'Me'],
    }),
    updateMyRider: build.mutation<MyRider, RiderUpdate>({
      query: (body) => ({ url: '/riders/me', method: 'PATCH', body }),
      transformResponse: unwrap<MyRider>,
      invalidatesTags: ['Rider'],
    }),

    // ── Online + location ──────────────────────────────────────────
    setOnline: build.mutation<{ isOnline: boolean }, boolean>({
      query: (isOnline) => ({ url: '/deliveries/rider/online-status', method: 'PATCH', body: { isOnline } }),
      transformResponse: unwrap<{ isOnline: boolean }>,
      // The switch answers at once
      async onQueryStarted(isOnline, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          riderApi.util.updateQueryData('getMyRider', undefined, (draft) => {
            draft.isOnline = isOnline;
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
    sendLocation: build.mutation<unknown, { lat: number; lng: number; heading?: number }>({
      query: (body) => ({ url: '/deliveries/rider/location', method: 'PATCH', body }),
    }),

    // ── Deliveries ─────────────────────────────────────────────────
    getMyDeliveries: build.infiniteQuery<Paginated<RiderDelivery>, RiderTab, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/deliveries/rider/my-deliveries',
        params: { type: queryArg, page: pageParam, limit: 20 },
      }),
      transformResponse: unwrapPage<RiderDelivery>,
      providesTags: ['Delivery'],
    }),
    getRiderDelivery: build.query<RiderDeliveryDetails, string>({
      query: (id) => `/deliveries/${id}/track`,
      transformResponse: unwrap<RiderDeliveryDetails>,
      providesTags: (_r, _e, id) => [{ type: 'Delivery', id }, 'Delivery'],
    }),
    // ── Open deliveries near me (first to accept takes it) ─────────
    getOffers: build.query<OffersResult, void>({
      query: () => '/deliveries/rider/offers',
      transformResponse: unwrap<OffersResult>,
      providesTags: ['DeliveryOffer'],
    }),
    claimOffer: build.mutation<RiderDelivery, string>({
      query: (id) => ({ url: `/deliveries/${id}/claim`, method: 'POST' }),
      transformResponse: unwrap<RiderDelivery>,
      invalidatesTags: ['DeliveryOffer', 'Delivery', 'Wallet'],
    }),
    /** "Not for me": leaves my list at once */
    skipOffer: build.mutation<unknown, string>({
      query: (id) => ({ url: `/deliveries/${id}/skip`, method: 'POST' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          riderApi.util.updateQueryData('getOffers', undefined, (draft) => {
            draft.offers = draft.offers.filter((o) => o._id !== id);
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
    acceptDelivery: build.mutation<unknown, string>({
      query: (id) => ({ url: `/deliveries/${id}/accept`, method: 'POST' }),
      invalidatesTags: ['Delivery', 'Wallet'],
    }),
    declineDelivery: build.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/deliveries/${id}/decline`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Delivery', 'Wallet', 'DeliveryOffer'],
    }),
    goingToPickup: build.mutation<unknown, string>({
      query: (id) => ({ url: `/deliveries/${id}/going-to-pickup`, method: 'PATCH' }),
      invalidatesTags: ['Delivery'],
    }),
    /** The store's (or previous rider's) code, typed by me */
    verifyPickup: build.mutation<unknown, { id: string; pin: string }>({
      query: ({ id, pin }) => ({ url: `/deliveries/${id}/verify-pickup`, method: 'POST', body: { pin } }),
      invalidatesTags: ['Delivery'],
    }),
    /** The customer's (or next rider's) code, typed by me */
    verifyHandover: build.mutation<unknown, { id: string; pin: string }>({
      query: ({ id, pin }) => ({ url: `/deliveries/${id}/verify-handover`, method: 'POST', body: { pin } }),
      invalidatesTags: ['Delivery', 'Wallet', 'Rider'],
    }),

    // ── COD cash ───────────────────────────────────────────────────
    getCodSettlements: build.infiniteQuery<Paginated<CodSettlement>, void, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ pageParam }) => ({ url: '/wallets/me/cod-settlements', params: { page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<CodSettlement>,
      providesTags: ['CodSettlement'],
    }),
    declareCod: build.mutation<CodSettlement, CodInput>({
      query: (body) => ({ url: '/wallets/me/cod-settlements', method: 'POST', body }),
      transformResponse: unwrap<CodSettlement>,
      invalidatesTags: ['CodSettlement', 'Wallet'],
    }),

    // ── Stores I deliver for ───────────────────────────────────────
    getStoreLinks: build.query<StoreLink[], void>({
      query: () => ({ url: '/vendor-rider-links/me', params: { as: 'rider' } }),
      transformResponse: unwrap<StoreLink[]>,
      providesTags: ['RiderLink'],
    }),
    searchStores: build.query<Paginated<PublicVendor>, string>({
      query: (searchTerm) => ({ url: '/vendors', params: { limit: 30, ...(searchTerm && { searchTerm }) } }),
      transformResponse: unwrapPage<PublicVendor>,
      keepUnusedDataFor: 30,
    }),
    requestStore: build.mutation<StoreLink, string>({
      query: (vendorId) => ({ url: '/vendor-rider-links/request', method: 'POST', body: { vendorId } }),
      transformResponse: unwrap<StoreLink>,
      invalidatesTags: ['RiderLink'],
    }),
    respondStoreLink: build.mutation<StoreLink, { id: string; accept: boolean }>({
      query: ({ id, accept }) => ({ url: `/vendor-rider-links/${id}/respond`, method: 'PATCH', body: { accept } }),
      transformResponse: unwrap<StoreLink>,
      invalidatesTags: ['RiderLink'],
    }),
    leaveStore: build.mutation<StoreLink, string>({
      query: (id) => ({ url: `/vendor-rider-links/${id}`, method: 'DELETE' }),
      transformResponse: unwrap<StoreLink>,
      invalidatesTags: ['RiderLink'],
    }),
  }),
});

export const {
  useGetMyRiderQuery,
  useSaveRiderApplicationMutation,
  useSubmitRiderApplicationMutation,
  useUpdateMyRiderMutation,
  useSetOnlineMutation,
  useSendLocationMutation,
  useGetMyDeliveriesInfiniteQuery,
  useGetRiderDeliveryQuery,
  useGetOffersQuery,
  useClaimOfferMutation,
  useSkipOfferMutation,
  useAcceptDeliveryMutation,
  useDeclineDeliveryMutation,
  useGoingToPickupMutation,
  useVerifyPickupMutation,
  useVerifyHandoverMutation,
  useGetCodSettlementsInfiniteQuery,
  useDeclareCodMutation,
  useGetStoreLinksQuery,
  useSearchStoresQuery,
  useRequestStoreMutation,
  useRespondStoreLinkMutation,
  useLeaveStoreMutation,
} = riderApi;
