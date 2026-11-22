/**
 * Chat (server: chat.route.ts). Conversations are per mode: a vendor's shop
 * chats don't mix with their own shopping chats.
 * Messages page 1 = the newest; older pages load on scroll-up.
 */
import { api, unwrap, unwrapPage } from '@/lib/api/api';
import type { AppMode, Paginated } from '@/types/api';

import type { Conversation, Message, MessageType, StartConversation } from './types';

const nextPage = <T>(last: Paginated<T>) => (last.meta.page < last.meta.totalPage ? last.meta.page + 1 : undefined);

export const MESSAGES_PAGE = 30;

export const chatApi = api.injectEndpoints({
  endpoints: (build) => ({
    getConversations: build.infiniteQuery<Paginated<Conversation>, AppMode, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({ url: '/conversations', params: { mode: queryArg, page: pageParam, limit: 20 } }),
      transformResponse: unwrapPage<Conversation>,
      providesTags: ['Conversation'],
    }),
    getChatUnread: build.query<{ unreadCount: number }, AppMode>({
      query: (mode) => ({ url: '/conversations/unread-count', params: { mode } }),
      transformResponse: unwrap<{ unreadCount: number }>,
      providesTags: ['Conversation'],
    }),
    getConversation: build.query<Conversation, string>({
      query: (id) => `/conversations/${id}`,
      transformResponse: unwrap<Conversation>,
      providesTags: (_r, _e, id) => [{ type: 'Conversation', id }],
    }),
    startConversation: build.mutation<Conversation, StartConversation>({
      query: (body) => ({ url: '/conversations', method: 'POST', body }),
      transformResponse: unwrap<Conversation>,
      invalidatesTags: ['Conversation'],
    }),
    getMessages: build.infiniteQuery<Paginated<Message>, string, number>({
      infiniteQueryOptions: { initialPageParam: 1, getNextPageParam: nextPage },
      query: ({ queryArg, pageParam }) => ({
        url: `/conversations/${queryArg}/messages`,
        params: { page: pageParam, limit: MESSAGES_PAGE },
      }),
      transformResponse: unwrapPage<Message>,
    }),
    sendMessage: build.mutation<
      Message,
      { conversationId: string; type: MessageType; text?: string; mediaUrl?: string; mediaDurationSec?: number; subOrderId?: string }
    >({
      query: ({ conversationId, ...body }) => ({ url: `/conversations/${conversationId}/messages`, method: 'POST', body }),
      transformResponse: unwrap<Message>,
      // The socket echo or this response adds it to the thread (deduped by _id)
      async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(addMessageToThread(conversationId, data));
      },
    }),
    markConversationRead: build.mutation<unknown, { id: string; mode: AppMode }>({
      query: ({ id, mode }) => ({ url: `/conversations/${id}/read`, method: 'PATCH', params: { mode } }),
      invalidatesTags: ['Conversation'],
    }),
    /** "Delete the chat" for me only (client, 2026-11-22): it comes back with a new message */
    deleteConversation: build.mutation<unknown, string>({
      query: (id) => ({ url: `/conversations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Conversation'],
    }),
    /** Their messages are kept for them only; an order / booking in progress still gets through */
    blockPeer: build.mutation<unknown, string>({
      query: (id) => ({ url: `/conversations/${id}/block`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => ['Conversation', { type: 'Conversation', id }],
    }),
    unblockPeer: build.mutation<unknown, string>({
      query: (id) => ({ url: `/conversations/${id}/block`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => ['Conversation', { type: 'Conversation', id }],
    }),
    getBlocked: build.query<{ userId: string; name: string; avatar?: { url: string }; blockedAt: string }[], void>({
      query: () => '/conversations/blocked',
      transformResponse: unwrap<{ userId: string; name: string; avatar?: { url: string }; blockedAt: string }[]>,
      providesTags: ['Conversation'],
    }),
    unblockUser: build.mutation<unknown, string>({
      query: (userId) => ({ url: `/conversations/blocked/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Conversation'],
    }),
    report: build.mutation<
      unknown,
      { targetType: 'user' | 'message' | 'review' | 'order'; targetId: string; conversationId?: string; reason: string; description?: string }
    >({
      query: (body) => ({ url: '/reports', method: 'POST', body }),
    }),
  }),
});

/** Put a message at the newest end of an open thread, once. */
export const addMessageToThread = (conversationId: string, message: Message) =>
  chatApi.util.updateQueryData('getMessages', conversationId, (draft) => {
    if (!draft.pages.length) return;
    if (draft.pages.some((p) => p.data.some((m) => m._id === message._id))) return;
    draft.pages[0].data.push(message);
    draft.pages[0].meta.total += 1;
  });

export const {
  useDeleteConversationMutation,
  useBlockPeerMutation,
  useUnblockPeerMutation,
  useGetBlockedQuery,
  useUnblockUserMutation,
  useGetConversationsInfiniteQuery,
  useGetChatUnreadQuery,
  useGetConversationQuery,
  useStartConversationMutation,
  useGetMessagesInfiniteQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  useReportMutation,
} = chatApi;
