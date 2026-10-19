import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Session } from '@/features/auth/types';
import type { User } from '@/types/api';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Set when the server ends the session (suspension, password reset elsewhere…). */
  endedReason: string | null;
}

const initialState: AuthState = {
  status: 'restoring',
  user: null,
  accessToken: null,
  refreshToken: null,
  endedReason: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Boot: whatever was saved on the device (or nothing). */
    sessionRestored(state, action: PayloadAction<Session | null>) {
      if (action.payload) {
        state.status = 'signedIn';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      } else {
        state.status = 'signedOut';
      }
    },
    signedIn(state, action: PayloadAction<Session>) {
      state.status = 'signedIn';
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.endedReason = null;
    },
    tokenRefreshed(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    userUpdated(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    signedOut(state, action: PayloadAction<{ reason?: string } | undefined>) {
      state.status = 'signedOut';
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.endedReason = action.payload?.reason ?? null;
    },
    endedReasonSeen(state) {
      state.endedReason = null;
    },
  },
});

export const { sessionRestored, signedIn, tokenRefreshed, userUpdated, signedOut, endedReasonSeen } =
  authSlice.actions;
export default authSlice.reducer;
