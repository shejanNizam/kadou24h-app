/**
 * The one RTK Query API. Features add endpoints with `api.injectEndpoints`
 * in src/features/<feature>/api.ts. Use `unwrap` to drop the response envelope.
 */
import { createApi } from '@reduxjs/toolkit/query/react';

import type { ApiEnvelope, Paginated } from '@/types/api';

import { baseQueryWithReauth } from './baseQuery';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Cart', 'Order', 'SubOrder', 'Delivery', 'Wallet', 'Product', 'Notification', 'Conversation'],
  endpoints: () => ({}),
});

/** `{ statusCode, success, data }` → `data` */
export const unwrap = <T>(res: ApiEnvelope<T>): T => res.data;

/** Paginated lists keep their meta. */
export const unwrapPage = <T>(res: ApiEnvelope<T[]>): Paginated<T> => ({
  data: res.data,
  meta: res.meta ?? { page: 1, limit: res.data.length, total: res.data.length, totalPage: 1 },
});
