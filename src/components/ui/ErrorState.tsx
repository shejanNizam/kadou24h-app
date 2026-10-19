import { useTranslation } from 'react-i18next';

import { getApiErrorMessage } from '@/lib/api/errors';

import { EmptyState } from './EmptyState';

/** A failed request: readable reason + Retry (offline, server down…). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="wifi-off"
      title={t('errors.title')}
      message={getApiErrorMessage(error, t)}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
    />
  );
}
