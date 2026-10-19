import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 3: address bar, categories, ads, jobs, products, workers
export default function HomeScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.home')} icon="home" />;
}
