import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 8: rider chat
export default function RiderChatScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.chat')} icon="message-circle" />;
}
