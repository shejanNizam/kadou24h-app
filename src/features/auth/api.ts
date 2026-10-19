/**
 * Auth + "me" endpoints (server: auth.route.ts, user.route.ts).
 */
import { api, unwrap } from '@/lib/api/api';
import type { ApiEnvelope, AppMode, User } from '@/types/api';

import type {
  ForgotPasswordResult,
  LoginResult,
  OtpPurpose,
  OtpSent,
  RegisterBody,
  ResetTokenResult,
  Session,
} from './types';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResult, { identifier: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: unwrap<LoginResult>,
    }),
    register: build.mutation<OtpSent, RegisterBody>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: unwrap<OtpSent>,
    }),
    verifyAccount: build.mutation<Session, { phone: string; otp: string }>({
      query: (body) => ({ url: '/auth/verify-account', method: 'POST', body }),
      transformResponse: unwrap<Session>,
    }),
    resendOtp: build.mutation<OtpSent, { identifier: string; purpose: OtpPurpose }>({
      query: (body) => ({ url: '/auth/resend-otp', method: 'POST', body }),
      transformResponse: unwrap<OtpSent>,
    }),
    forgotPassword: build.mutation<ForgotPasswordResult, { identifier: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
      transformResponse: unwrap<ForgotPasswordResult>,
    }),
    verifyResetOtp: build.mutation<ResetTokenResult, { identifier: string; otp: string }>({
      query: (body) => ({ url: '/auth/verify-reset-otp', method: 'POST', body }),
      transformResponse: unwrap<ResetTokenResult>,
    }),
    resetPassword: build.mutation<null, { newPassword: string; resetToken: string }>({
      // The short-lived reset token replaces the (absent) session token
      query: ({ newPassword, resetToken }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: { newPassword },
        headers: { Authorization: `Bearer ${resetToken}` },
      }),
      transformResponse: unwrap<null>,
    }),
    logout: build.mutation<null, { deviceToken?: string } | void>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body: body ?? {} }),
      transformResponse: unwrap<null>,
    }),
    getMe: build.query<User, void>({
      query: () => '/user/me',
      transformResponse: (res: ApiEnvelope<User>) => res.data,
      providesTags: ['Me'],
    }),
    updateMe: build.mutation<User, Partial<Pick<User, 'name' | 'language' | 'avatar'>>>({
      query: (body) => ({ url: '/user/me', method: 'PATCH', body }),
      transformResponse: unwrap<User>,
      invalidatesTags: ['Me'],
    }),
    /** Customer / vendor / rider — only modes whose role is approved. */
    switchMode: build.mutation<{ mode: AppMode }, AppMode>({
      query: (mode) => ({ url: '/user/me/mode', method: 'PATCH', body: { mode } }),
      transformResponse: unwrap<{ mode: AppMode }>,
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useSwitchModeMutation,
  useLoginMutation,
  useRegisterMutation,
  useVerifyAccountMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useVerifyResetOtpMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMeMutation,
} = authApi;
