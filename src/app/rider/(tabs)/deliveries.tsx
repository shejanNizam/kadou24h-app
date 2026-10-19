import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 8: rider deliveries
export default function RiderDeliveriesScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.deliveries')} icon="truck" />;
}
