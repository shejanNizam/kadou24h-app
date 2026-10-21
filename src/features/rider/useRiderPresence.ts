import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { watchPosition } from '@/lib/location';

import { useGetMyRiderQuery, useSendLocationMutation } from './api';

const SEND_EVERY_MS = 20_000;

/**
 * While I'm online and the app is open, my position goes to the server about
 * every 20 s: stores see how far I am, and the server forwards it live to the
 * customers of my running deliveries. Stops when I go offline or the app goes
 * to the background.
 */
export function useRiderPresence() {
  const { data: rider } = useGetMyRiderQuery();
  const [send] = useSendLocationMutation();
  const lastSent = useRef(0);
  const online = Boolean(rider?.isOnline);

  useEffect(() => {
    if (!online) return;
    let stop: (() => void) | null = null;
    let cancelled = false;

    const start = async () => {
      if (stop) return;
      const unwatch = await watchPosition((p) => {
        const now = Date.now();
        if (now - lastSent.current < SEND_EVERY_MS) return;
        lastSent.current = now;
        void send(p);
      }, SEND_EVERY_MS);
      if (cancelled) unwatch?.();
      else stop = unwatch;
    };
    const pause = () => {
      stop?.();
      stop = null;
    };

    void start();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? void start() : pause()));
    return () => {
      cancelled = true;
      sub.remove();
      pause();
    };
  }, [online, send]);
}
