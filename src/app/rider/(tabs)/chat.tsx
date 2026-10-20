import { useTranslation } from 'react-i18next';

import { ConversationList } from '@/features/chat/components/ConversationList';
import { AppMode } from '@/types/api';

export default function RiderChatTab() {
  const { t } = useTranslation();
  return <ConversationList mode={AppMode.rider} emptyText={t('chat.emptyRider')} />;
}
