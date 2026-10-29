/**
 * Tells the server when a JavaScript error hits someone's phone. In an installed app an
 * error outside drawing (a button handler, a socket message, a timer) closes the app with
 * no trace; the report (screen, device, OTA update) is what lets us find and fix it.
 * The team reads them on GET /app-errors. Nothing is sent in development.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { config } from '@/lib/config';

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsShape {
  getGlobalHandler: () => GlobalHandler;
  setGlobalHandler: (handler: GlobalHandler) => void;
}

let currentScreen: string | undefined;
let getToken: () => string | null = () => null;
let installed = false;

/** Kept up to date by the root layout, so a report says where it happened */
export function setCrashScreen(screen: string) {
  currentScreen = screen;
}

export function reportError(error: unknown, fatal: boolean): Promise<void> {
  if (__DEV__) return Promise.resolve();
  const err = error instanceof Error ? error : new Error(String(error));
  const token = getToken();
  const send = fetch(`${config.apiUrl}/app-errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      message: `${err.name}: ${err.message}`,
      stack: err.stack,
      fatal,
      screen: currentScreen,
      platform: Platform.OS,
      osVersion: Device.osVersion ?? undefined,
      device: Device.modelName ?? undefined,
      appVersion: Constants.expoConfig?.version,
      updateId: Updates.updateId ?? 'embedded',
    }),
  })
    .then(() => undefined)
    .catch(() => undefined);
  // Never hold the app longer than this, even on a slow network
  return Promise.race([send, new Promise<void>((resolve) => setTimeout(resolve, 2000))]);
}

/** Wraps React Native's global handler: report first, then let it do what it did before */
export function installCrashReporter(tokenGetter: () => string | null) {
  getToken = tokenGetter;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (installed || !errorUtils) return;
  installed = true;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void reportError(error, Boolean(isFatal)).finally(() => previous(error, isFatal));
  });
}
