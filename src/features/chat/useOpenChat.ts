import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getApiErrorMessage } from '@/lib/api/errors';

import { useStartConversationMutation } from './api';
import type { StartConversation } from './types';

/** "Message" buttons: find or create the chat for this subject, then open it. */
export function useOpenChat() {
  const { t } = useTranslation();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const [start, { isLoading }] = useStartConversationMutation();

  const open = (subject: StartConversation) =>
    requireAuth(() => {
      void start(subject)
        .unwrap()
        // From an order, the store chat opens on that order: what I write is about it
        .then((c) =>
          router.push({
            pathname: '/chat/[id]',
            params: c.topic ? { id: c._id, topicId: c.topic.subOrderId, topicNumber: c.topic.subOrderNumber } : { id: c._id },
          }),
        )
        .catch((e: unknown) => toast.show(getApiErrorMessage(e, t), 'danger'));
    });

  return { open, opening: isLoading };
}
