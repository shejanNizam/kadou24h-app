import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 8: rider earnings
export default function RiderEarningsScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.earnings')} icon="dollar-sign" />;
}
