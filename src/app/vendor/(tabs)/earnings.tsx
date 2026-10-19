import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 7: vendor earnings
export default function VendorEarningsScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.earnings')} icon="dollar-sign" />;
}
