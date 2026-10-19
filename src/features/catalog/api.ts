/**
 * Public catalogue: categories, products, stores, reviews, workers, jobs, ads,
 * favorites. Lists that scroll use RTK Query infinite queries.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { Paginated } from '@/types/api';

import type {
  AdPlacement,
  Advertisement,
  Category,
  CategoryType,
  Job,
  Product,
  ProductDetails,
  ProductQuery,
  PublicVendor,
  Review,
  Worker,
  WorkerQuery,
} from './types';

const PAGE_SIZE = 20;

/** Drop empty filters so the URL (and the cache key) stays clean. */
const clean = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false));

const nextPage = <T>(last: Paginated<T>) =>
  last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined;

export const catalogApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<Category[], CategoryType>({
      query: (type) => ({ url: '/categories', params: { type } }),
      transformResponse: unwrap<Category[]>,
      keepUnusedDataFor: 3600, // rarely changes
    }),

    getProducts: build.query<Paginated<Product>, ProductQuery & { limit?: number }>({
      query: ({ limit = 10, ...q }) => ({ url: '/products', params: clean({ ...q, limit }) }),
      transformResponse: unwrapPage<Product>,
      providesTags: ['Product'],
    }),
    searchProducts: build.infiniteQuery<Paginated<Product>, ProductQuery, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/products',
        params: clean({ ...queryArg, page: pageParam, limit: PAGE_SIZE }),
      }),
      transformResponse: unwrapPage<Product>,
      providesTags: ['Product'],
    }),
    getProduct: build.query<ProductDetails, string>({
      query: (idOrSlug) => `/products/${idOrSlug}`,
      transformResponse: unwrap<ProductDetails>,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),

    getVendor: build.query<PublicVendor, string>({
      query: (id) => `/vendors/${id}`,
      transformResponse: unwrap<PublicVendor>,
    }),

    getProductReviews: build.query<Paginated<Review>, { productId: string; limit?: number }>({
      query: ({ productId, limit = 5 }) => ({ url: `/reviews/product/${productId}`, params: { limit } }),
      transformResponse: unwrapPage<Review>,
    }),
    getVendorReviews: build.query<Paginated<Review>, { vendorId: string; limit?: number }>({
      query: ({ vendorId, limit = 5 }) => ({ url: `/reviews/vendor/${vendorId}`, params: { limit } }),
      transformResponse: unwrapPage<Review>,
    }),

    getWorkers: build.query<Paginated<Worker>, WorkerQuery & { limit?: number }>({
      query: ({ limit = 10, ...q }) => ({ url: '/professional-profiles/workers', params: clean({ ...q, limit }) }),
      transformResponse: unwrapPage<Worker>,
    }),
    searchWorkers: build.infiniteQuery<Paginated<Worker>, WorkerQuery, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/professional-profiles/workers',
        params: clean({ ...queryArg, page: pageParam, limit: PAGE_SIZE }),
      }),
      transformResponse: unwrapPage<Worker>,
    }),
    getWorker: build.query<Worker, string>({
      query: (id) => `/professional-profiles/workers/${id}`,
      transformResponse: unwrap<Worker>,
    }),

    getJobs: build.query<Paginated<Job>, { limit?: number; search?: string; categoryId?: string }>({
      query: ({ limit = 10, ...q }) => ({ url: '/jobs', params: clean({ ...q, limit }) }),
      transformResponse: unwrapPage<Job>,
    }),
    getJob: build.query<Job, string>({
      query: (id) => `/jobs/${id}`,
      transformResponse: unwrap<Job>,
    }),

    getAds: build.query<Advertisement[], AdPlacement>({
      query: (placement) => ({ url: '/advertisements', params: { placement } }),
      transformResponse: unwrap<Advertisement[]>,
    }),
    recordAdImpression: build.mutation<unknown, string>({
      query: (id) => ({ url: `/advertisements/${id}/impression`, method: 'POST' }),
    }),
    recordAdClick: build.mutation<unknown, string>({
      query: (id) => ({ url: `/advertisements/${id}/click`, method: 'POST' }),
    }),

    toggleFavorite: build.mutation<{ isFavorite: boolean; productId: string }, string>({
      query: (productId) => ({ url: '/favorites/toggle', method: 'POST', body: { productId } }),
      transformResponse: unwrap<{ isFavorite: boolean; productId: string }>,
      // Flip the heart instantly; roll back if the request fails
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          catalogApi.util.updateQueryData('getProduct', productId, (draft) => {
            draft.isFavorite = !draft.isFavorite;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['Favorite'],
    }),
    getFavorites: build.query<Paginated<Product>, void>({
      query: () => ({ url: '/favorites/my-favorites', params: { limit: 50 } }),
      transformResponse: unwrapPage<Product>,
      providesTags: ['Favorite'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetProductsQuery,
  useSearchProductsInfiniteQuery,
  useGetProductQuery,
  useGetVendorQuery,
  useGetProductReviewsQuery,
  useGetVendorReviewsQuery,
  useGetWorkersQuery,
  useSearchWorkersInfiniteQuery,
  useGetWorkerQuery,
  useGetJobsQuery,
  useGetJobQuery,
  useGetAdsQuery,
  useRecordAdImpressionMutation,
  useRecordAdClickMutation,
  useToggleFavoriteMutation,
  useGetFavoritesQuery,
} = catalogApi;
