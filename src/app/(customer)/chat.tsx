import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useAppSelector } from '@/store/hooks';

// Phase 5: conversations
export default function ChatScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('tabs.chat')} message={t('guest.chat')} />;
  return <ComingSoon title={t('tabs.chat')} icon="message-circle" />;
}
