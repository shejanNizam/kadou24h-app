/**
 * Help assistant (AI). Mirrors kadou24h-server ai_assistant: the app never talks to
 * OpenAI; the server holds the key, the limits and the conversation.
 */
import { api, unwrap } from '@/lib/api/api';
import type { AppMode } from '@/types/api';

export interface AssistantMessage {
  _id: string;
  role: 'user' | 'assistant';
  text: string;
  /** The assistant suggests writing to the support team */
  needsHuman?: boolean;
  createdAt: string;
  /** App only: my question while the answer is on its way */
  pending?: boolean;
}

export interface AssistantConversation {
  _id: string;
  status: 'active' | 'closed' | 'handed_off';
  messages: AssistantMessage[];
  lastMessageAt: string;
}

export interface AssistantQuota {
  used: number;
  limit: number;
}

/** GET /assistant/conversation */
export interface AssistantState {
  available: boolean;
  conversation: AssistantConversation | null;
  quota: AssistantQuota;
}

export const assistantApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAssistant: build.query<AssistantState, void>({
      query: () => '/assistant/conversation',
      transformResponse: unwrap<AssistantState>,
      providesTags: ['Assistant'],
    }),

    // My question shows at once; the answer replaces it with the saved turn (undone on error)
    askAssistant: build.mutation<{ conversation: AssistantConversation; quota: AssistantQuota }, { text: string; mode: AppMode }>({
      query: (body) => ({ url: '/assistant/messages', method: 'POST', body }),
      transformResponse: unwrap<{ conversation: AssistantConversation; quota: AssistantQuota }>,
      async onQueryStarted({ text }, { dispatch, queryFulfilled }) {
        const pending: AssistantMessage = { _id: `pending-${Date.now()}`, role: 'user', text, createdAt: new Date().toISOString(), pending: true };
        const patch = dispatch(
          assistantApi.util.updateQueryData('getAssistant', undefined, (draft) => {
            if (draft.conversation) draft.conversation.messages.push(pending);
            else draft.conversation = { _id: 'pending', status: 'active', messages: [pending], lastMessageAt: pending.createdAt };
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            assistantApi.util.updateQueryData('getAssistant', undefined, (draft) => {
              draft.conversation = data.conversation;
              draft.quota = data.quota;
            }),
          );
        } catch {
          patch.undo();
        }
      },
    }),

    /** Start again (the old conversation is kept for the team) */
    resetAssistant: build.mutation<unknown, void>({
      query: () => ({ url: '/assistant/conversation', method: 'DELETE' }),
      invalidatesTags: ['Assistant'],
    }),

    /** Sends the conversation to the support team: a support request is created */
    handOffAssistant: build.mutation<{ ticketId: string; ticketNumber: string }, { note?: string; mode: AppMode }>({
      query: (body) => ({ url: '/assistant/conversation/hand-off', method: 'POST', body }),
      transformResponse: unwrap<{ ticketId: string; ticketNumber: string }>,
      invalidatesTags: ['Assistant', 'Ticket'],
    }),
  }),
});

export const { useGetAssistantQuery, useAskAssistantMutation, useResetAssistantMutation, useHandOffAssistantMutation } = assistantApi;
