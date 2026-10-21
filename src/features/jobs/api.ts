/**
 * Jobs endpoints (server: job.route.ts). Fees (publish, CV unlock,
 * spontaneous application) return a payment: open the shared payment screen
 * unless it already succeeded.
 */
import type { Payment } from '@/features/orders/types';
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { Paginated } from '@/types/api';

import type {
  ApplicationStatus,
  Candidate,
  FeeMethod,
  Job,
  JobDetails,
  JobInput,
  MyApplication,
  MyJob,
  MyJobsCounts,
  MyJobsTab,
} from './types';

const nextPage = <T>(last: Paginated<T>) => (last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined);

export interface JobsQuery {
  search?: string;
  categoryId?: string;
  jobType?: string;
  workplace?: string;
  city?: string;
}

export const jobsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Candidate ──────────────────────────────────────────────────
    searchJobs: build.infiniteQuery<Paginated<Job>, JobsQuery, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/jobs',
        params: { ...Object.fromEntries(Object.entries(queryArg).filter(([, v]) => v)), page: pageParam, limit: 20 },
      }),
      transformResponse: unwrapPage<Job>,
      providesTags: ['Job'],
    }),
    getJobDetails: build.query<JobDetails, string>({
      query: (id) => `/jobs/${id}`,
      transformResponse: unwrap<JobDetails>,
      providesTags: (_r, _e, id) => [{ type: 'Job', id }, 'Application'],
    }),
    applyToJob: build.mutation<MyApplication, { jobId: string; resume?: { url: string; publicId: string }; coverNote?: string }>({
      query: (body) => ({ url: '/jobs/apply', method: 'POST', body }),
      transformResponse: unwrap<MyApplication>,
      invalidatesTags: ['Application', 'Job'],
    }),
    getMyApplications: build.infiniteQuery<Paginated<MyApplication>, ApplicationStatus | 'all', number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/jobs/applications/my',
        params: { page: pageParam, limit: 20, ...(queryArg !== 'all' && { status: queryArg }) },
      }),
      transformResponse: unwrapPage<MyApplication>,
      providesTags: ['Application'],
    }),
    /** Mine as candidate, or one I received as recruiter (viewerRole says which) */
    getApplication: build.query<MyApplication | Candidate, string>({
      query: (id) => `/jobs/applications/${id}`,
      transformResponse: unwrap<MyApplication | Candidate>,
      providesTags: (_r, _e, id) => [{ type: 'Application', id }, 'Application'],
    }),
    withdrawApplication: build.mutation<MyApplication, string>({
      query: (id) => ({ url: `/jobs/applications/${id}/withdraw`, method: 'PATCH' }),
      invalidatesTags: ['Application', 'Job'],
    }),
    confirmInterview: build.mutation<MyApplication, string>({
      query: (id) => ({ url: `/jobs/applications/${id}/interview/confirm`, method: 'POST' }),
      invalidatesTags: ['Application'],
    }),
    applySpontaneous: build.mutation<
      { application: MyApplication; payment: Payment },
      { targetVendorId: string; resume?: { url: string; publicId: string }; coverNote?: string; paymentMethod: FeeMethod }
    >({
      query: (body) => ({ url: '/jobs/apply-spontaneous', method: 'POST', body }),
      transformResponse: unwrap<{ application: MyApplication; payment: Payment }>,
      invalidatesTags: ['Application'],
    }),

    // ── Recruiter ──────────────────────────────────────────────────
    getMyJobs: build.infiniteQuery<Paginated<MyJob> & { meta: { counts?: MyJobsCounts } }, MyJobsTab, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({ url: '/jobs/my', params: { tab: queryArg, page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<MyJob>,
      providesTags: ['Job'],
    }),
    createJob: build.mutation<MyJob, JobInput>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      transformResponse: unwrap<MyJob>,
      invalidatesTags: ['Job'],
    }),
    updateJob: build.mutation<MyJob, Partial<JobInput> & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap<MyJob>,
      invalidatesTags: ['Job'],
    }),
    publishJob: build.mutation<{ job: MyJob; payment: Payment }, { id: string; paymentMethod: FeeMethod }>({
      query: ({ id, paymentMethod }) => ({ url: `/jobs/${id}/publish`, method: 'POST', body: { paymentMethod } }),
      transformResponse: unwrap<{ job: MyJob; payment: Payment }>,
      invalidatesTags: ['Job'],
    }),
    closeJob: build.mutation<MyJob, string>({
      query: (id) => ({ url: `/jobs/${id}/close`, method: 'POST' }),
      invalidatesTags: ['Job'],
    }),
    getJobCandidates: build.infiniteQuery<
      Paginated<Candidate>,
      { jobId: string; status?: ApplicationStatus; sortBy?: 'match' | 'date' },
      number
    >({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg: { jobId, ...q }, pageParam }) => ({
        url: `/jobs/${jobId}/applicants`,
        params: { ...Object.fromEntries(Object.entries(q).filter(([, v]) => v)), page: pageParam, limit: 20 },
      }),
      transformResponse: unwrapPage<Candidate>,
      providesTags: ['Application'],
    }),
    /** Store inbox of paid spontaneous applications (vendor) */
    getReceivedApplications: build.infiniteQuery<Paginated<Candidate>, ApplicationStatus | 'all', number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: '/jobs/applications/received',
        params: { page: pageParam, limit: 20, ...(queryArg !== 'all' && { status: queryArg }) },
      }),
      transformResponse: unwrapPage<Candidate>,
      providesTags: ['Application'],
    }),
    setApplicationStatus: build.mutation<unknown, { id: string; status: 'under_review' | 'shortlisted' | 'hired' | 'rejected' }>({
      query: ({ id, status }) => ({ url: `/jobs/applications/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Application', 'Job'],
    }),
    scheduleInterview: build.mutation<unknown, { id: string; at: string; location?: string; mapUrl?: string; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/jobs/applications/${id}/interview`, method: 'POST', body }),
      invalidatesTags: ['Application', 'Job'],
    }),
    unlockCv: build.mutation<{ unlocked: boolean; payment: Payment | null }, { applicantId: string; paymentMethod: FeeMethod }>({
      query: ({ applicantId, paymentMethod }) => ({ url: `/jobs/candidates/${applicantId}/unlock-cv`, method: 'POST', body: { paymentMethod } }),
      transformResponse: unwrap<{ unlocked: boolean; payment: Payment | null }>,
      invalidatesTags: ['Application'],
    }),
  }),
});

export const {
  useSearchJobsInfiniteQuery,
  useGetJobDetailsQuery,
  useApplyToJobMutation,
  useGetMyApplicationsInfiniteQuery,
  useGetApplicationQuery,
  useWithdrawApplicationMutation,
  useConfirmInterviewMutation,
  useApplySpontaneousMutation,
  useGetMyJobsInfiniteQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  usePublishJobMutation,
  useCloseJobMutation,
  useGetJobCandidatesInfiniteQuery,
  useGetReceivedApplicationsInfiniteQuery,
  useSetApplicationStatusMutation,
  useScheduleInterviewMutation,
  useUnlockCvMutation,
} = jobsApi;
