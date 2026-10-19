import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import { api } from '@/lib/api/api';
import { StorageKeys, storage } from '@/lib/storage';

import authReducer, { signedIn, signedOut, tokenRefreshed, userUpdated } from './authSlice';
import prefsReducer, { languageChosen } from './prefsSlice';

/** Saves the session and preferences to the device whenever they change. */
const persistence = createListenerMiddleware();

persistence.startListening({
  matcher: isAnyOf(signedIn, tokenRefreshed, userUpdated),
  effect: async (_action, listenerApi) => {
    const { auth } = listenerApi.getState() as RootState;
    if (!auth.user || !auth.accessToken || !auth.refreshToken) return;
    await storage.set(
      StorageKeys.session,
      JSON.stringify({ user: auth.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken }),
    );
  },
});

persistence.startListening({
  actionCreator: signedOut,
  effect: async (_action, listenerApi) => {
    await storage.remove(StorageKeys.session);
    // Cached data belongs to the previous user
    listenerApi.dispatch(api.util.resetApiState());
  },
});

persistence.startListening({
  actionCreator: languageChosen,
  effect: async (_action, listenerApi) => {
    const { prefs } = listenerApi.getState() as RootState;
    await storage.set(
      StorageKeys.prefs,
      JSON.stringify({ language: prefs.language, onboarded: prefs.onboarded }),
    );
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    prefs: prefsReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefault) =>
    getDefault().prepend(persistence.middleware).concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
