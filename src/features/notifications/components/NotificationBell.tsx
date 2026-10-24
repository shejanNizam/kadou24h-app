import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HeaderIconButton } from '@/components/ui/StackHeader';
import { useAppSelector } from '@/store/hooks';
import { AppMode } from '@/types/api';

import { useGetUnreadCountQuery } from '../api';

/**
 * Bell + unread badge for one role's notifications (store or rider tabs). Opens the
 * list for that same role, whatever mode was last saved on the account.
 */
export function NotificationBell({ mode, color }: { mode: AppMode; color?: string }) {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: unread } = useGetUnreadCountQuery({ mode }, { skip: !signedIn, refetchOnFocus: true, pollingInterval: 60_000 });
  return (
    <HeaderIconButton
      icon="bell"
      color={color}
      label={t('notifications.title')}
      badge={unread}
      onPress={() => router.push({ pathname: '/notifications', params: { mode } })}
    />
  );
}
