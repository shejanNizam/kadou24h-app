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
  // A request the server never answers ends in an error instead of loading forever
  timeout: 30_000,
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

/**
 * One silent token refresh, shared by every caller that got a 401 at the same time
 * (RTK Query here, plain fetch uploads in lib/upload). Signs out when it fails.
 */
export function refreshSession(getState: () => unknown, dispatch: (action: unknown) => unknown): Promise<boolean> {
  refreshing ??= (async () => {
    const { auth } = getState() as StateShape;
    if (!auth.refreshToken) return false;
    const res = await fetch(`${config.apiUrl}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    }).catch(() => null);
    // Offline: keep the session, the next call can try again
    if (!res) return false;
    const json = (await res.json().catch(() => null)) as ApiEnvelope<{ accessToken: string }> | null;
    const token = json?.data?.accessToken;
    if (token) {
      dispatch(tokenRefreshed(token));
      return true;
    }
    dispatch(signedOut({ reason: 'expired' }));
    return false;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

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

  if (await refreshSession(api.getState, api.dispatch)) {
    result = await rawBaseQuery(args, api, extraOptions);
  }
  return result;
};
