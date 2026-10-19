import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { useAppSelector } from '@/store/hooks';

// Phase 7: the multi-step vendor application (KYC engine)
export default function VendorApplicationScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <Redirect href="/login" />;

  return (
    <Screen>
      <PageHeader title={t('kyc.vendorTitle')} />
      <EmptyState
        icon="shopping-bag"
        title={t('common.comingSoon')}
        message={t('kyc.placeholder')}
        actionLabel={t('kyc.goHome')}
        onAction={() => router.replace('/home')}
      />
    </Screen>
  );
}
