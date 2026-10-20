/**
 * Vendor mode endpoints. The server decides every rule (allowed status steps,
 * what can be modified, who can be assigned); the app only offers the actions
 * that are valid for the current state.
 */
import type { ProductDetails } from '@/features/catalog/types';
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { Paginated } from '@/types/api';

import {
  VENDOR_ORDER_TABS,
  type AvailableRider,
  type ItemChange,
  type LinkStatus,
  type MyProduct,
  type MyStore,
  type ProductInput,
  type ProductsTab,
  type RiderCard,
  type RiderLink,
  type StoreAvailability,
  type StoreInput,
  type VendorOrdersTab,
  type VendorSubOrder,
  type VendorSubOrderDetails,
} from './types';

const nextPage = <T>(last: Paginated<T>) => (last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined);

export const vendorApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── My store / application ─────────────────────────────────────
    /** 404 = no application started yet */
    getMyStore: build.query<MyStore, void>({
      query: () => '/vendors/me',
      transformResponse: unwrap<MyStore>,
      providesTags: ['Store'],
    }),
    /** Draft: any subset of fields, saved on every step */
    saveApplication: build.mutation<MyStore, StoreInput>({
      query: (body) => ({ url: '/vendors/me/application', method: 'PUT', body }),
      transformResponse: unwrap<MyStore>,
      invalidatesTags: ['Store', 'Wallet'],
    }),
    submitApplication: build.mutation<MyStore, void>({
      query: () => ({ url: '/vendors/me/application/submit', method: 'POST' }),
      transformResponse: unwrap<MyStore>,
      invalidatesTags: ['Store', 'Me'],
    }),
    updateStore: build.mutation<MyStore, Omit<StoreInput, 'documents' | 'businessCategoryId'>>({
      query: (body) => ({ url: '/vendors/me', method: 'PATCH', body }),
      transformResponse: unwrap<MyStore>,
      invalidatesTags: ['Store'],
    }),
    updateAvailability: build.mutation<
      { isOpen: boolean; availability: StoreAvailability },
      { isOpen?: boolean; availability?: Partial<StoreAvailability> }
    >({
      query: (body) => ({ url: '/vendors/me/availability', method: 'PATCH', body }),
      transformResponse: unwrap<{ isOpen: boolean; availability: StoreAvailability }>,
      // The open/closed switch answers at once
      async onQueryStarted(body, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          vendorApi.util.updateQueryData('getMyStore', undefined, (draft) => {
            if (body.isOpen !== undefined) draft.isOpen = body.isOpen;
            if (body.availability) draft.availability = { ...draft.availability, ...body.availability };
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),

    // ── Products ───────────────────────────────────────────────────
    getMyProducts: build.infiniteQuery<Paginated<MyProduct>, ProductsTab, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/products/my-products',
        params: { statusTab: queryArg, page: pageParam, limit: 20 },
      }),
      transformResponse: unwrapPage<MyProduct>,
      providesTags: ['Product'],
    }),
    /** My product in any approval state (the server lets the owner open it) */
    getMyProduct: build.query<ProductDetails['product'], string>({
      query: (id) => `/products/${id}`,
      transformResponse: (res: { data: ProductDetails }) => res.data.product,
      providesTags: ['Product'],
    }),
    createProduct: build.mutation<MyProduct, ProductInput>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      transformResponse: unwrap<MyProduct>,
      invalidatesTags: ['Product', 'Store'],
    }),
    updateProduct: build.mutation<MyProduct, Partial<ProductInput> & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap<MyProduct>,
      invalidatesTags: ['Product'],
    }),
    updateStock: build.mutation<MyProduct, { id: string; stockQty?: number; minStockAlert?: number; isAvailable?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/products/${id}/stock`, method: 'PATCH', body }),
      transformResponse: unwrap<MyProduct>,
      invalidatesTags: ['Product'],
    }),
    deleteProduct: build.mutation<void, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product', 'Store'],
    }),

    // ── Orders ─────────────────────────────────────────────────────
    getVendorOrders: build.infiniteQuery<Paginated<VendorSubOrder>, VendorOrdersTab, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/orders/vendor/sub-orders',
        params: { status: VENDOR_ORDER_TABS[queryArg], page: pageParam, limit: 20 },
      }),
      transformResponse: unwrapPage<VendorSubOrder>,
      providesTags: ['SubOrder'],
    }),
    getVendorOrder: build.query<VendorSubOrderDetails, string>({
      query: (id) => `/orders/vendor/sub-orders/${id}`,
      transformResponse: unwrap<VendorSubOrderDetails>,
      providesTags: ['SubOrder'],
    }),
    updateOrderStatus: build.mutation<unknown, { id: string; status: 'accepted' | 'preparing' | 'ready_for_pickup'; estimatedDeliveryMinutes?: number }>({
      query: ({ id, ...body }) => ({ url: `/orders/vendor/sub-orders/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: ['SubOrder', 'Wallet'],
    }),
    modifyOrder: build.mutation<unknown, { id: string; modifications: ItemChange[]; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/orders/vendor/sub-orders/${id}/modify`, method: 'PATCH', body }),
      invalidatesTags: ['SubOrder', 'Wallet', 'Product'],
    }),
    /** Refuse (new) or cancel (accepted / preparing): stock goes back, the customer is told */
    cancelVendorOrder: build.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/orders/vendor/sub-orders/${id}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: ['SubOrder', 'Wallet', 'Product'],
    }),

    // ── Delivery partners ──────────────────────────────────────────
    getAvailableRiders: build.query<AvailableRider[], string>({
      query: (deliveryId) => `/deliveries/${deliveryId}/available-riders`,
      transformResponse: unwrap<AvailableRider[]>,
      keepUnusedDataFor: 0,
    }),
    assignRider: build.mutation<unknown, { deliveryId: string; riderId: string }>({
      query: ({ deliveryId, riderId }) => ({ url: `/deliveries/${deliveryId}/assign`, method: 'POST', body: { riderId } }),
      invalidatesTags: ['SubOrder'],
    }),
    getRiderLinks: build.query<RiderLink[], LinkStatus | void>({
      query: (status) => ({ url: '/vendor-rider-links/me', params: { as: 'vendor', ...(status && { status }) } }),
      transformResponse: unwrap<RiderLink[]>,
      providesTags: ['RiderLink'],
    }),
    searchRiders: build.query<Paginated<RiderCard>, { searchTerm?: string }>({
      query: ({ searchTerm }) => ({ url: '/riders/search', params: { partnerType: 'moto', limit: 30, ...(searchTerm && { searchTerm }) } }),
      transformResponse: unwrapPage<RiderCard>,
      keepUnusedDataFor: 30,
    }),
    inviteRider: build.mutation<RiderLink, string>({
      query: (riderId) => ({ url: '/vendor-rider-links/invite', method: 'POST', body: { riderId } }),
      transformResponse: unwrap<RiderLink>,
      invalidatesTags: ['RiderLink'],
    }),
    respondRiderLink: build.mutation<RiderLink, { id: string; accept: boolean }>({
      query: ({ id, accept }) => ({ url: `/vendor-rider-links/${id}/respond`, method: 'PATCH', body: { accept } }),
      transformResponse: unwrap<RiderLink>,
      invalidatesTags: ['RiderLink'],
    }),
    removeRiderLink: build.mutation<RiderLink, string>({
      query: (id) => ({ url: `/vendor-rider-links/${id}`, method: 'DELETE' }),
      transformResponse: unwrap<RiderLink>,
      invalidatesTags: ['RiderLink'],
    }),
  }),
});

export const {
  useGetMyStoreQuery,
  useSaveApplicationMutation,
  useSubmitApplicationMutation,
  useUpdateStoreMutation,
  useUpdateAvailabilityMutation,
  useGetMyProductsInfiniteQuery,
  useGetMyProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateStockMutation,
  useDeleteProductMutation,
  useGetVendorOrdersInfiniteQuery,
  useGetVendorOrderQuery,
  useUpdateOrderStatusMutation,
  useModifyOrderMutation,
  useCancelVendorOrderMutation,
  useGetAvailableRidersQuery,
  useAssignRiderMutation,
  useGetRiderLinksQuery,
  useSearchRidersQuery,
  useInviteRiderMutation,
  useRespondRiderLinkMutation,
  useRemoveRiderLinkMutation,
} = vendorApi;
