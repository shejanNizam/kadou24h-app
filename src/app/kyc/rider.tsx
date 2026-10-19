import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { useAppSelector } from '@/store/hooks';

// Phase 8: the multi-step rider application (KYC engine)
export default function RiderApplicationScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <Screen>
      <PageHeader title={t('kyc.riderTitle')} />
      <EmptyState
        icon="truck"
        title={t('common.comingSoon')}
        message={t('kyc.placeholder')}
        actionLabel={t('kyc.goHome')}
        onAction={() => router.replace('/home')}
      />
    </Screen>
  );
}
