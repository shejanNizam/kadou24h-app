/**
 * Web preview storage (localStorage). Private windows or blocked site data can
 * throw, so every call is guarded and the app keeps working without it.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage blocked: the app still works for this session
    }
  },
  async remove(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
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
  /** See lib/exitWatch */
  appAlive: 'k24.appAlive',
} as const;
