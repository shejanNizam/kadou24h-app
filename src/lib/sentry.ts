/**
 * Sentry catches what lib/crashReport can't: Android crashes and freezes outside
 * JavaScript (client's Samsung A16, 2026-10-30). On in installed builds that have a
 * DSN (eas.json), off in development. Only the account id is sent, never a name or phone.
 */
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { AppState } from 'react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__ && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment: Updates.channel ?? 'development',
  sendDefaultPii: false,
  tracesSampleRate: 0,
});

/**
 * Sentry's freeze detection (ANR) only watches Android's main thread. When JavaScript itself
 * is stuck the screen stops answering too, so a timer that ran late reports it, once the
 * app recovers. A freeze that ends with the app being closed is not seen.
 */
const STALL_MS = 5000;
if (!__DEV__ && process.env.EXPO_PUBLIC_SENTRY_DSN) {
  let last = Date.now();
  AppState.addEventListener('change', () => {
    last = Date.now();
  });
  setInterval(() => {
    const now = Date.now();
    if (AppState.currentState === 'active' && now - last > STALL_MS) {
      Sentry.captureMessage(`JavaScript stalled for ${Math.round((now - last) / 1000)} s`, 'warning');
    }
    last = now;
  }, 1000);
}

export { Sentry };
