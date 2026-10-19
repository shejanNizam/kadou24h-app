import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 7: vendor chat
export default function VendorChatScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.chat')} icon="message-circle" />;
}
