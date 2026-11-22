/**
 * Red dot on the modes I'm not in (client 2026-11-22): a seller or rider shopping as a
 * customer still sees that an order, a delivery or a ride waits (server: GET /user/me/alerts).
 * Refreshed by the socket events that already refresh orders, offers, rides and chats.
 */
import { api, unwrap } from '@/lib/api/api';
import { useAppSelector } from '@/store/hooks';
import { AppMode, UserRole } from '@/types/api';

export interface ModeAlert {
  /** Work to answer: new orders to accept (vendor); deliveries and rides near me to answer (rider) */
  pending: number;
  /** Unread notifications of this mode */
  unread: number;
  /** Unread chat messages of this mode */
  messages: number;
}

export type ModeAlerts = Partial<Record<AppMode, ModeAlert>>;

const modeAlertsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getModeAlerts: build.query<ModeAlerts, void>({
      query: () => '/user/me/alerts',
      transformResponse: unwrap<ModeAlerts>,
      providesTags: ['Notification', 'Conversation', 'SubOrder', 'Delivery', 'DeliveryOffer', 'Ride', 'RideOffer'],
    }),
  }),
});

export const hasAlert = (alert?: ModeAlert) => Boolean(alert && alert.pending + alert.unread + alert.messages > 0);

/** The alerts of every mode I hold; nothing to ask for a customer-only account */
export function useModeAlerts() {
  const user = useAppSelector((s) => (s.auth.status === 'signedIn' ? s.auth.user : null));
  const otherModes = Boolean(user?.roles.some((r) => r === UserRole.vendor || r === UserRole.rider));
  const { data } = modeAlertsApi.useGetModeAlertsQuery(undefined, { skip: !otherModes });
  return { alerts: otherModes ? data : undefined, current: user?.lastActiveMode ?? AppMode.customer };
}

/** True when a mode other than `mode` has something waiting (dot on the Profile tab) */
export function useOtherModesAlert(mode: AppMode) {
  const { alerts } = useModeAlerts();
  return Object.values(AppMode).some((m) => m !== mode && hasAlert(alerts?.[m]));
}
