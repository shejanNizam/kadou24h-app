/**
 * Phone push (FCM). The server sends to every device token saved with
 * POST /device-token; logout removes this phone's token.
 * Android needs google-services.json (Firebase) in the build — without it we
 * simply skip push (the in-app notifications still work).
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { config } from '@/lib/config';

let currentToken: string | null = null;
let activeConversationId: string | null = null;

/** The chat on screen: its own new messages don't pop a banner. */
export const setActiveChat = (id: string | null) => {
  activeConversationId = id;
};

// While the app is open: show the banner too, except for the chat being read
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = notification.request.content.data?.conversationId !== activeConversationId || !activeConversationId;
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
  },
});

/** Asks permission, gets the FCM token, saves it on the server. Never throws. */
export async function registerForPush(accessToken: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // The server sends with channelId "default"
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Kadou24h',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 200, 120, 200],
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (typeof token !== 'string' || !token) return;
    currentToken = token;

    await fetch(`${config.apiUrl}/device-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    // No Firebase config in this build, or offline: push is optional
  }
}

/** This phone's token (sent with logout so the server forgets it). */
export const getPushToken = () => currentToken;
