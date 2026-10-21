/**
 * Small key-value storage. Native: encrypted SecureStore (tokens live here).
 * The web version is storage.web.ts.
 */
import * as SecureStore from 'expo-secure-store';

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Storage full or unavailable: the app still works for this session
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Nothing to remove
    }
  },
};

export const StorageKeys = {
  session: 'k24.session',
  prefs: 'k24.prefs',
  /** { [adId]: 'YYYY-MM-DD' } — popup / interstitial ads already shown today */
  adsSeen: 'k24.adsSeen',
} as const;
