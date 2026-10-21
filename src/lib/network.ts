/**
 * Network state (NetInfo works on Android, iOS and the web preview).
 * Feeds RTK Query so on-screen data reloads when the connection comes back.
 */
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import type { setupListeners } from '@reduxjs/toolkit/query';
import { AppState } from 'react-native';

/** "Connected" to a Wi-Fi without internet counts as offline once NetInfo has checked it. */
export const isOffline = (s: NetInfoState) => s.isConnected === false || s.isInternetReachable === false;

/** Custom handler for RTK's `setupListeners`: NetInfo for online/offline, AppState for focus. */
export const networkListeners: NonNullable<Parameters<typeof setupListeners>[1]> = (dispatch, { onOnline, onOffline, onFocus, onFocusLost }) => {
  let offline = false;
  const stopNet = NetInfo.addEventListener((state) => {
    const now = isOffline(state);
    if (now === offline) return;
    offline = now;
    dispatch(now ? onOffline() : onOnline());
  });
  const appState = AppState.addEventListener('change', (s) => dispatch(s === 'active' ? onFocus() : onFocusLost()));
  return () => {
    stopNet();
    appState.remove();
  };
};
