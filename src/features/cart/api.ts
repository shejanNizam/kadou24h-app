/**
 * Cart (server: cart.route.ts — login required). The server groups the cart
 * by store; each store becomes one sub-order at checkout.
 */
import { api, unwrap } from '@/lib/api/api';

export interface CartItem {
  _id: string;
  productId: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  /** discountPrice when there is one */
  effectivePrice: number;
  stockQty: number;
  isAvailable: boolean;
  prepTimeMinutes?: number;
  vendorId: string;
  qty: number;
  lineTotal: number;
}

export interface CartStoreGroup {
  vendorId: string;
  storeName: string;
  logo?: string;
  isOpen: boolean;
  city?: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface Cart {
  _id?: string;
  totalItems: number;
  subtotal: number;
  groupedByVendor: CartStoreGroup[];
  /** Out of stock / removed / store closed — kept so the user sees why */
  unavailableItems: CartItem[];
}

export const cartApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query<Cart, void>({
      query: () => '/cart',
      transformResponse: unwrap<Cart>,
      providesTags: ['Cart'],
    }),
    addToCart: build.mutation<Cart, { productId: string; qty: number }>({
      query: (body) => ({ url: '/cart/items', method: 'POST', body }),
      transformResponse: unwrap<Cart>,
      // The response is the new cart: write it to the cache, no refetch
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(cartApi.util.upsertQueryData('getCart', undefined, data));
      },
    }),
    /** qty 0 removes the line */
    updateCartQty: build.mutation<Cart, { productId: string; qty: number }>({
      query: ({ productId, qty }) => ({ url: `/cart/items/${productId}`, method: 'PATCH', body: { qty } }),
      transformResponse: unwrap<Cart>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(cartApi.util.upsertQueryData('getCart', undefined, data));
      },
    }),
    clearCart: build.mutation<Cart, void>({
      query: () => ({ url: '/cart', method: 'DELETE' }),
      transformResponse: unwrap<Cart>,
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const { useGetCartQuery, useAddToCartMutation, useUpdateCartQtyMutation, useClearCartMutation } = cartApi;
