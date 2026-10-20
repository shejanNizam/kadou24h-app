import * as Notifications from 'expo-notifications';
import { useEffect, useEffectEvent, useRef } from 'react';

/** Calls onTap with the push data when the user taps a notification (also the one that opened the app). */
export function useNotificationTap(onTap: (data: Record<string, string | undefined>) => void) {
  const handle = useEffectEvent(onTap);
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (lastHandled.current === id) return;
      lastHandled.current = id;
      handle((response.notification.request.content.data ?? {}) as Record<string, string | undefined>);
    };
    // App opened from a notification
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
