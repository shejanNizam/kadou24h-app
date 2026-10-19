/**
 * Runtime config from EXPO_PUBLIC_* env vars (see .env.example).
 * On a real phone, localhost is the phone itself — use the PC's LAN IP instead.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:7000/api/v1';

export const config = {
  apiUrl: apiUrl.replace(/\/$/, ''),
  socketUrl: (process.env.EXPO_PUBLIC_SOCKET_URL ?? apiUrl.replace(/\/api\/v\d+\/?$/, '')).replace(/\/$/, ''),
  /** Google / Apple sign-in buttons appear only once client IDs are configured. */
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  defaultCountryCode: '+224',
} as const;
