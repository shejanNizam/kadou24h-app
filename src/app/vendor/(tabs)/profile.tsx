import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { ProfileBasics } from '@/features/profile/components/ProfileBasics';

// Phase 7: store profile (business info, availability, delivery partners…)
export default function VendorProfileScreen() {
  const { t } = useTranslation();
  return (
    <Screen scroll>
      <PageHeader title={t('tabs.profile')} />
      <ProfileBasics />
    </Screen>
  );
}
