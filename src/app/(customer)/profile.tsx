import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { ProfileBasics } from '@/features/profile/components/ProfileBasics';

// Phase 6: full profile & settings (addresses, favorites, support…)
export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <PageHeader title={t('tabs.profile')} />
      <ProfileBasics />
    </Screen>
  );
}
