import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';

/** What a guest sees on screens that need an account (orders, chat, profile). */
export function SignInPrompt({ title, message }: { title: string; message: string }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <PageHeader title={title} />
      <EmptyState
        icon="lock"
        title={t('guest.title')}
        message={message}
        actionLabel={t('common.signIn')}
        onAction={() => router.push('/login')}
      />
    </Screen>
  );
}
