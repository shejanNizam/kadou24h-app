import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/ui/ComingSoon';

// Phase 3: Products | Workers search with filters
export default function SearchScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.search')} icon="search" />;
}
