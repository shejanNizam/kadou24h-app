/**
 * fetchBaseQuery + Bearer token + one silent refresh on 401.
 * Parallel 401s share a single refresh call; if it fails the user is signed out.
 */
import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';

import { config } from '@/lib/config';
import { signedOut, tokenRefreshed } from '@/store/authSlice';
import type { ApiEnvelope } from '@/types/api';

// Typed loosely to avoid a store ↔ api import cycle
interface StateShape {
  auth: { accessToken: string | null; refreshToken: string | null };
  prefs: { language: string };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: config.apiUrl,
  prepareHeaders: (headers, { getState }) => {
    const { auth, prefs } = getState() as StateShape;
    // Some calls bring their own token (e.g. the password-reset token)
    if (auth.accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${auth.accessToken}`);
    }
    headers.set('Accept-Language', prefs.language);
    return headers;
  },
});

// Auth endpoints answer 401 for wrong credentials — never try a refresh for them
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/verify', '/auth/reset', '/auth/forgot', '/auth/social'];

let refreshing: Promise<boolean> | null = null;

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === 'string' ? args : args.url;
  const hadCustomAuth = typeof args !== 'string' && Boolean((args.headers as Record<string, string> | undefined)?.Authorization);
  if (result.error?.status !== 401 || NO_REFRESH.some((p) => url.startsWith(p)) || hadCustomAuth) {
    return result;
  }

  const { auth } = api.getState() as StateShape;
  if (!auth.refreshToken) return result;

  refreshing ??= (async () => {
    const refresh = await rawBaseQuery(
      { url: '/auth/refresh-token', method: 'POST', body: { refreshToken: auth.refreshToken } },
      api,
      extraOptions,
    );
    const token = (refresh.data as ApiEnvelope<{ accessToken: string }> | undefined)?.data?.accessToken;
    if (token) {
      api.dispatch(tokenRefreshed(token));
      return true;
    }
    api.dispatch(signedOut({ reason: 'expired' }));
    return false;
  })().finally(() => {
    refreshing = null;
  });

  if (await refreshing) {
    result = await rawBaseQuery(args, api, extraOptions);
  }
  return result;
};
