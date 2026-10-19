import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useAppSelector } from '@/store/hooks';

// Phase 4: orders list + live order details
export default function OrdersScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('tabs.orders')} message={t('guest.orders')} />;
  return <ComingSoon title={t('tabs.orders')} icon="file-text" />;
}
