/**
 * Buying: checkout summary → place order → (online) payment → order details,
 * tracking, cancel, dispute, review. Totals always come from the server.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { Paginated } from '@/types/api';

import type {
  CheckoutInput,
  CheckoutSummary,
  Dispute,
  Order,
  OrderDetails,
  OrderListItem,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentPurpose,
  SubOrder,
  TrackedDelivery,
  TransitStation,
} from './types';

/** Orders tab filters → server statuses (several = comma-separated) */
export const ORDER_TABS = {
  all: undefined,
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled,partially_cancelled',
} as const satisfies Record<string, string | undefined>;
export type OrdersTab = keyof typeof ORDER_TABS;

const nextPage = <T>(last: Paginated<T>) =>
  last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined;

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Checkout ───────────────────────────────────────────────────
    getStations: build.query<TransitStation[], void>({
      query: () => '/transit-stations',
      transformResponse: unwrap<TransitStation[]>,
      keepUnusedDataFor: 3600,
    }),
    /** A POST, but read-only: a query so it re-runs whenever the choices change */
    getCheckoutSummary: build.query<CheckoutSummary, CheckoutInput>({
      query: (body) => ({ url: '/orders/checkout-summary', method: 'POST', body }),
      transformResponse: unwrap<CheckoutSummary>,
      providesTags: ['Cart'],
      keepUnusedDataFor: 0,
    }),
    placeOrder: build.mutation<{ order: Order; subOrders: SubOrder[] }, CheckoutInput>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      transformResponse: unwrap<{ order: Order; subOrders: SubOrder[] }>,
      invalidatesTags: ['Cart', 'Order', 'Product'],
    }),

    // ── Payments ───────────────────────────────────────────────────
    initiatePayment: build.mutation<
      Payment,
      { purpose: PaymentPurpose; refId: string; method: Exclude<PaymentMethod, 'cod'>; idempotencyKey: string }
    >({
      query: (body) => ({ url: '/payments/initiate', method: 'POST', body }),
      transformResponse: unwrap<Payment>,
    }),
    getPayment: build.query<Payment, string>({
      query: (id) => `/payments/${id}`,
      transformResponse: unwrap<Payment>,
      keepUnusedDataFor: 0,
    }),
    /** Development only (404 in production): finish a payment like the gateway would */
    devConfirmPayment: build.mutation<Payment, { id: string; status: 'success' | 'failed' }>({
      query: ({ id, status }) => ({ url: `/payments/${id}/dev-confirm`, method: 'POST', body: { status } }),
      transformResponse: unwrap<Payment>,
      invalidatesTags: ['Order'],
    }),

    // ── Orders ─────────────────────────────────────────────────────
    getMyOrders: build.infiniteQuery<Paginated<OrderListItem>, OrdersTab, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/orders/my-orders',
        params: { page: pageParam, limit: 10, ...(ORDER_TABS[queryArg] && { status: ORDER_TABS[queryArg] }) },
      }),
      transformResponse: unwrapPage<OrderListItem>,
      providesTags: ['Order'],
    }),
    getOrder: build.query<OrderDetails, string>({
      query: (id) => `/orders/${id}`,
      transformResponse: unwrap<OrderDetails>,
      providesTags: (_r, _e, id) => [{ type: 'Order', id }, 'Order'],
    }),
    cancelOrder: build.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/orders/${id}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Order', 'Product'],
    }),
    /** "Delete from my history": hidden for me only, a finished order (client, 2026-10-30) */
    hideOrder: build.mutation<unknown, string>({
      query: (id) => ({ url: `/orders/my-orders/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Order'],
    }),
    /** One store's part only (while that store has not started preparing) */
    cancelStorePart: build.mutation<unknown, { id: string; subOrderId: string; reason: string }>({
      query: ({ id, subOrderId, reason }) => ({ url: `/orders/${id}/sub-orders/${subOrderId}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Order', 'Product'],
    }),

    // ── After delivery ─────────────────────────────────────────────
    createReview: build.mutation<unknown, { subOrderId: string; rating: number; comment?: string }>({
      query: (body) => ({ url: '/reviews', method: 'POST', body }),
      invalidatesTags: ['Order', 'Product'],
    }),
    getMyDisputes: build.query<Paginated<Dispute>, void>({
      query: () => ({ url: '/payments/disputes', params: { limit: 50 } }),
      transformResponse: unwrapPage<Dispute>,
      providesTags: ['Dispute'],
    }),
    createDispute: build.mutation<Dispute, { orderId: string; subOrderId?: string; reason: string }>({
      query: (body) => ({ url: '/payments/disputes', method: 'POST', body }),
      transformResponse: unwrap<Dispute>,
      invalidatesTags: ['Dispute'],
    }),

    // ── Tracking ───────────────────────────────────────────────────
    trackDelivery: build.query<TrackedDelivery, string>({
      query: (id) => `/deliveries/${id}/track`,
      transformResponse: unwrap<TrackedDelivery>,
      providesTags: (_r, _e, id) => [{ type: 'Delivery', id }, 'Order'],
    }),
  }),
});

export const {
  useGetStationsQuery,
  useGetCheckoutSummaryQuery,
  usePlaceOrderMutation,
  useInitiatePaymentMutation,
  useGetPaymentQuery,
  useDevConfirmPaymentMutation,
  useGetMyOrdersInfiniteQuery,
  useGetOrderQuery,
  useCancelOrderMutation,
  useHideOrderMutation,
  useCancelStorePartMutation,
  useCreateReviewMutation,
  useGetMyDisputesQuery,
  useCreateDisputeMutation,
  useTrackDeliveryQuery,
} = ordersApi;

/** Sub-orders that can still be cancelled by the buyer (server rule: before "preparing"). */
export const canCancelOrder = (order: Order, subOrders: Pick<SubOrder, 'status'>[]) =>
  order.status === 'active' && subOrders.every((s) => ['pending_payment', 'new', 'accepted', 'cancelled'].includes(s.status));

/** A store's part the customer can cancel alone: not prepared yet, and not the only part left */
export const canCancelPart = (order: Order, subOrders: Pick<SubOrder, 'status'>[], part: Pick<SubOrder, 'status'>) =>
  order.status === 'active' && ['new', 'accepted'].includes(part.status) && subOrders.filter((s) => s.status !== 'cancelled').length > 1;

export const isOnlinePayment = (m: PaymentMethod): m is Exclude<PaymentMethod, 'cod'> => m !== 'cod';

/** Still to pay online: an online order, or the fees of a cash-on-delivery order (client, 2026-10-23) */
export const needsOnlinePayment = (order: Pick<Order, 'paymentMethod' | 'paymentStatus' | 'status' | 'upfrontAmount' | 'feesPaidAt'>) =>
  order.status === 'active' &&
  order.paymentStatus === 'unpaid' &&
  (isOnlinePayment(order.paymentMethod) || (Boolean(order.upfrontAmount) && !order.feesPaidAt));

/** A fresh key per payment attempt: retries of the same tap never charge twice */
export const newIdempotencyKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type { OrderStatus };
