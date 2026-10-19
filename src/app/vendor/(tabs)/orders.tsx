import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 7: vendor orders
export default function VendorOrdersScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.orders')} icon="file-text" />;
}
