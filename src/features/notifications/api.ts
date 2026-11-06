/**
 * In-app notifications (server: notification.route.ts). Per mode: a vendor's
 * order alerts don't mix with their customer notifications.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { AppMode, Paginated } from '@/types/api';

import type { LocalizedText } from '../catalog/types';

export type NotificationType =
  | 'order_placed'
  | 'order_accepted'
  | 'rider_on_the_way'
  | 'order_delivered'
  | 'order_cancelled'
  | 'feedback_request'
  | 'new_message'
  | 'special_offer'
  | 'new_delivery_assigned'
  | 'ready_for_pickup'
  | 'collect_payment'
  | 'earnings_updated'
  | 'withdrawal_update'
  | 'refund_update'
  | 'application_update'
  // The Kadou24h team removed or restored my job offer
  | 'job_update'
  | 'booking_update'
  | 'profile_approved'
  | 'moderation_warning'
  | 'account_suspended'
  | 'system_alert'
  // Written by the Kadou24h team to this user (dashboard)
  | 'team_message';

export interface AppNotification {
  _id: string;
  mode?: AppMode;
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText;
  /** Deep-link data: orderId, subOrderId, conversationId, deliveryId… */
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Paginated<AppNotification>, { mode: AppMode }>({
      query: ({ mode }) => ({ url: '/notifications', params: { mode, limit: 50 } }),
      transformResponse: unwrapPage<AppNotification>,
      providesTags: ['Notification'],
    }),
    getUnreadCount: build.query<number, { mode: AppMode }>({
      query: ({ mode }) => ({ url: '/notifications/unread-count', params: { mode } }),
      transformResponse: (res: { data: { unreadCount: number } }) => res.data.unreadCount,
      providesTags: ['Notification'],
    }),
    markNotificationRead: build.mutation<unknown, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      transformResponse: unwrap,
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: build.mutation<unknown, { mode: AppMode }>({
      query: ({ mode }) => ({ url: '/notifications/read-all', method: 'PATCH', params: { mode } }),
      transformResponse: unwrap,
      invalidatesTags: ['Notification'],
    }),
    // The user's own notifications: really deleted (client, 2026-10-30)
    deleteNotification: build.mutation<unknown, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notification'],
    }),
    deleteAllNotifications: build.mutation<unknown, { mode: AppMode }>({
      query: ({ mode }) => ({ url: '/notifications', method: 'DELETE', params: { mode } }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
} = notificationsApi;
