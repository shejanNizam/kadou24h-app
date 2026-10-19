/**
 * App start: read saved preferences + session from the device into the store.
 */
import type { Session } from '@/features/auth/types';
import type { AppDispatch } from '@/store';
import { sessionRestored } from '@/store/authSlice';
import { prefsLoaded } from '@/store/prefsSlice';
import { Language } from '@/types/api';

import i18n, { deviceLanguage } from './i18n';
import { StorageKeys, storage } from './storage';

const parse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export async function bootstrap(dispatch: AppDispatch) {
  const [rawPrefs, rawSession] = await Promise.all([
    storage.get(StorageKeys.prefs),
    storage.get(StorageKeys.session),
  ]);

  const prefs = parse<{ language?: Language; onboarded?: boolean }>(rawPrefs);
  const language = prefs?.language ?? deviceLanguage();
  await i18n.changeLanguage(language);
  dispatch(prefsLoaded({ language, onboarded: Boolean(prefs?.onboarded) }));

  const session = parse<Session>(rawSession);
  const valid = session?.accessToken && session.refreshToken && session.user?._id ? session : null;
  dispatch(sessionRestored(valid));
}
