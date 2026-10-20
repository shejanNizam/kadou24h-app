import { useTranslation } from 'react-i18next';

import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { ConversationList } from '@/features/chat/components/ConversationList';
import { useAppSelector } from '@/store/hooks';
import { AppMode } from '@/types/api';

export default function ChatTab() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('tabs.chat')} message={t('guest.chat')} />;
  return <ConversationList mode={AppMode.customer} emptyText={t('chat.emptyCustomer')} />;
}
