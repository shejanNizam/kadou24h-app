import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { ProfileBasics } from '@/features/profile/components/ProfileBasics';

// Phase 8: rider profile (online toggle, vehicle, my stores…)
export default function RiderProfileScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <PageHeader title={t('tabs.profile')} />
      <ProfileBasics />
    </Screen>
  );
}
