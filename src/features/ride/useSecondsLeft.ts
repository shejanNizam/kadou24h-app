import { useEffect, useState } from 'react';

const secondsUntil = (iso: string | undefined, now: number) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : 0);

/** Seconds until a ride price must be answered, ticking every second (0 once over) */
export function useSecondsLeft(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (secondsUntil(expiresAt, current) === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return secondsUntil(expiresAt, now);
}
