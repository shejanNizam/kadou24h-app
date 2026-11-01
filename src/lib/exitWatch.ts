/**
 * Reports an app that stopped while on screen. Android killing the app, or JavaScript stuck
 * until the app is closed, leaves no Sentry report (client's Samsung A16, 2026-11-01). While
 * the app is open it notes that it is alive; leaving normally clears the note. A note found
 * at the next launch means the app stopped without leaving, and that launch reports it.
 */
import { AppState } from 'react-native';

import { Sentry } from './sentry';
import { StorageKeys, storage } from './storage';

const BEAT_MS = 15_000;

interface Alive {
  at: number;
  startedAt: number;
  screen: string;
}

let lastScreen = '';

export const setLastScreen = (screen: string) => {
  lastScreen = screen;
};

const report = (raw: string | null, launchedAt: number) => {
  if (!raw) return;
  try {
    const alive = JSON.parse(raw) as Alive;
    Sentry.captureMessage(`App stopped unexpectedly on ${alive.screen}`, {
      level: 'warning',
      extra: {
        lastAliveAt: new Date(alive.at).toISOString(),
        ranForSeconds: Math.round((alive.at - alive.startedAt) / 1000),
        reopenedAfterSeconds: Math.round((launchedAt - alive.at) / 1000),
      },
    });
  } catch {
    // An unreadable note says nothing
  }
};

export function startExitWatch() {
  if (__DEV__ || !process.env.EXPO_PUBLIC_SENTRY_DSN) return;
  const startedAt = Date.now();
  const beat = () => void storage.set(StorageKeys.appAlive, JSON.stringify({ at: Date.now(), startedAt, screen: lastScreen } satisfies Alive));

  void storage.get(StorageKeys.appAlive).then((raw) => {
    report(raw, startedAt);
    void storage.remove(StorageKeys.appAlive).then(() => {
      if (AppState.currentState === 'active') beat();
      setInterval(() => {
        if (AppState.currentState === 'active') beat();
      }, BEAT_MS);
      AppState.addEventListener('change', (state) => {
        if (state === 'active') beat();
        else void storage.remove(StorageKeys.appAlive);
      });
    });
  });
}
