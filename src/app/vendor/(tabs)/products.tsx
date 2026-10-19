import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 7: vendor products
export default function VendorProductsScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.products')} icon="package" />;
}
