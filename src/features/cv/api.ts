/**
 * My CV (professional profile) and subscription plans
 * (server: professional_profile.route.ts, subscription.route.ts).
 */
import type { Payment } from '@/features/orders/types';
import type { FeeMethod } from '@/features/jobs/types';
import { api, unwrap } from '@/lib/api/api';

import type { CvInput, MyCv, MySubscription, Plan, PlanAudience, WorkerListingInput, WorkerSummary } from './types';

export const cvApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyCv: build.query<MyCv, void>({
      query: () => '/professional-profiles/me',
      transformResponse: unwrap<MyCv>,
      providesTags: ['Cv'],
    }),
    saveCv: build.mutation<MyCv, CvInput>({
      query: (body) => ({ url: '/professional-profiles/me', method: 'PUT', body }),
      transformResponse: unwrap<MyCv>,
      // Answer at once: the screen shows what was just saved
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(cvApi.util.upsertQueryData('getMyCv', undefined, data));
        } catch {
          // the screen shows the error
        }
      },
    }),
    setWorkerListing: build.mutation<MyCv, WorkerListingInput>({
      query: (body) => ({ url: '/professional-profiles/me/worker-listing', method: 'PATCH', body }),
      transformResponse: unwrap<MyCv>,
      invalidatesTags: ['Cv'],
    }),
    /** Become a worker: send the profile for the team's review */
    submitWorkerApplication: build.mutation<MyCv, void>({
      query: () => ({ url: '/professional-profiles/me/worker-application/submit', method: 'POST' }),
      transformResponse: unwrap<MyCv>,
      invalidatesTags: ['Cv'],
    }),
    /** Worker home: status, the customers who wrote, rating */
    getWorkerSummary: build.query<WorkerSummary, void>({
      query: () => '/professional-profiles/me/worker-summary',
      transformResponse: unwrap<WorkerSummary>,
      providesTags: ['Cv', 'Conversation'],
    }),
    /** Template-based summary suggestion; saves nothing */
    suggestSummary: build.mutation<{ summary: string }, { targetRole?: string; lang: 'fr' | 'en' }>({
      query: (body) => ({ url: '/professional-profiles/me/generate-ai-cv', method: 'POST', body }),
      transformResponse: unwrap<{ summary: string }>,
    }),

    getPlans: build.query<Plan[], PlanAudience | void>({
      query: (audience) => ({ url: '/subscriptions/plans', params: audience ? { audience } : {} }),
      transformResponse: unwrap<Plan[]>,
      providesTags: ['Subscription'],
    }),
    getMySubscription: build.query<MySubscription | null, void>({
      query: () => '/subscriptions/me',
      transformResponse: unwrap<MySubscription | null>,
      providesTags: ['Subscription'],
    }),
    subscribe: build.mutation<{ subscription: MySubscription; payment: Payment }, { planId: string; paymentMethod: FeeMethod }>({
      query: (body) => ({ url: '/subscriptions/subscribe', method: 'POST', body }),
      transformResponse: unwrap<{ subscription: MySubscription; payment: Payment }>,
      invalidatesTags: ['Subscription', 'Cv'],
    }),
  }),
});

export const {
  useGetMyCvQuery,
  useSaveCvMutation,
  useSetWorkerListingMutation,
  useSubmitWorkerApplicationMutation,
  useGetWorkerSummaryQuery,
  useSuggestSummaryMutation,
  useGetPlansQuery,
  useGetMySubscriptionQuery,
  useSubscribeMutation,
} = cvApi;
