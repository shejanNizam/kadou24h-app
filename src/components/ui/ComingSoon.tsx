import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { Screen } from './Screen';

/** Placeholder for tabs whose screens arrive in a later build phase. */
export function ComingSoon({ title, icon }: { title: string; icon?: ComponentProps<typeof Feather>['name'] }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <PageHeader title={title} />
      <EmptyState icon={icon ?? 'clock'} title={t('common.comingSoon')} message={t('common.comingSoonText')} />
    </Screen>
  );
}
