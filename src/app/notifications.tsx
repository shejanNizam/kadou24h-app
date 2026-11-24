import Feather from '@expo/vector-icons/Feather';
import { Redirect, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextLink } from '@/components/ui/TextLink';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  useDeleteAllNotificationsMutation,
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AppNotification,
  type NotificationType,
} from '@/features/notifications/api';
import { openNotification } from '@/features/notifications/open';
import { useLocalized } from '@/hooks/useLocalized';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAppSelector } from '@/store/hooks';
import { AppMode } from '@/types/api';

const ICONS: Partial<Record<NotificationType, ComponentProps<typeof Feather>['name']>> = {
  order_placed: 'shopping-bag',
  order_accepted: 'check-circle',
  rider_on_the_way: 'truck',
  order_delivered: 'package',
  order_cancelled: 'x-circle',
  refund_update: 'rotate-ccw',
  feedback_request: 'star',
  new_message: 'message-circle',
  special_offer: 'gift',
  moderation_warning: 'alert-triangle',
  account_suspended: 'slash',
  team_message: 'shield',
  job_update: 'briefcase',
};

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/**
 * Read/unread, grouped Today / Earlier, "mark all read". Deep links follow with their screens.
 * Long press deletes one, "Delete all" empties the list (client, 2026-10-30); important ones
 * (lock icon) stay (client, 2026-11-24).
 */
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const l = useLocalized();
  const { status, user } = useAppSelector((s) => s.auth);
  // The bell says which role's list (store / rider tabs); else the mode I was last in
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = Object.values(AppMode).includes(params.mode as AppMode) ? (params.mode as AppMode) : (user?.lastActiveMode ?? AppMode.customer);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetNotificationsQuery({ mode }, { skip: status !== 'signedIn' });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, markAllState] = useMarkAllNotificationsReadMutation();
  const [deleteOne, deleteOneState] = useDeleteNotificationMutation();
  const [deleteAll, deleteAllState] = useDeleteAllNotificationsMutation();
  const toast = useToast();
  // One notification's id, or 'all'
  const [deleting, setDeleting] = useState<string | null>(null);

  if (status !== 'signedIn') return <Redirect href="/login" />;

  const items = data?.data ?? [];
  const sections = [
    { title: t('notifications.today'), data: items.filter((n) => isToday(n.createdAt)) },
    { title: t('notifications.earlier'), data: items.filter((n) => !isToday(n.createdAt)) },
  ].filter((s) => s.data.length > 0);
  const hasUnread = items.some((n) => !n.isRead);
  // Important ones (refund, cancellation, payment, security, team) stay (client, 2026-11-24)
  const canDelete = (n: AppNotification) => n.canDelete !== false;
  const hold = (n: AppNotification) => (canDelete(n) ? setDeleting(n._id) : toast.show(t('notifications.kept')));

  const confirmDelete = async () => {
    try {
      if (deleting === 'all') await deleteAll({ mode }).unwrap();
      else if (deleting) await deleteOne(deleting).unwrap();
      toast.show(t(deleting === 'all' ? 'notifications.deletedAll' : 'notifications.deleted'), 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
    setDeleting(null);
  };

  // Deep link: order, store order, chat, withdrawal, application (features/notifications/open.ts)
  const open = (n: AppNotification) => {
    if (!n.isRead) void markRead(n._id);
    openNotification({ type: n.type, ...n.data }, n.mode ?? mode);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <StackHeader
          title={t('notifications.title')}
          right={
            hasUnread ? (
              <TextLink title={t('notifications.markAll')} onPress={() => markAll({ mode })} disabled={markAllState.isLoading} />
            ) : items.some(canDelete) ? (
              <TextLink title={t('notifications.deleteAll')} onPress={() => setDeleting('all')} />
            ) : undefined
          }
        />
      </View>
      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n._id}
          contentContainerStyle={[styles.inner, styles.list]}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            items.length > 0 ? (
              <AppText variant="caption" color={Colors.textSubtle}>
                {t('notifications.holdHint')}
              </AppText>
            ) : undefined
          }
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={Colors.primary} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="label" color={Colors.textMuted} style={styles.section}>
              {section.title}
            </AppText>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              onLongPress={() => hold(item)}
              delayLongPress={400}
              accessibilityRole="button"
              accessibilityState={{ selected: !item.isRead }}
              style={[styles.item, !item.isRead && styles.unread]}>
              <View style={styles.icon}>
                <Feather name={ICONS[item.type] ?? 'bell'} size={18} color={Colors.primary} />
              </View>
              <View style={styles.flex}>
                {/* Official: written by the Kadou24h team (a scammer can't send this one) */}
                {item.type === 'team_message' && (
                  <View style={styles.team}>
                    <Feather name="check-circle" size={11} color={Colors.textOnPrimary} />
                    <AppText variant="caption" color={Colors.textOnPrimary}>
                      {t('notifications.team')}
                    </AppText>
                  </View>
                )}
                <AppText variant={item.isRead ? 'bodyMedium' : 'title'}>{l(item.title)}</AppText>
                <AppText variant="small" color={Colors.textMuted} numberOfLines={item.type === 'team_message' ? undefined : 2}>
                  {l(item.body)}
                </AppText>
                <AppText variant="caption" color={Colors.textSubtle}>
                  {new Date(item.createdAt).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' })}
                </AppText>
              </View>
              <View style={styles.side}>
                {!item.isRead && <View style={styles.dot} accessibilityLabel={t('notifications.unread')} />}
                {!canDelete(item) && <Feather name="lock" size={12} color={Colors.textSubtle} accessibilityLabel={t('notifications.kept')} />}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={Colors.primary} style={styles.loading} />
            ) : (
              <EmptyState icon="bell" title={t('notifications.emptyTitle')} message={t('notifications.emptyText')} />
            )
          }
        />
      )}
      <ConfirmDialog
        visible={deleting !== null}
        title={t(deleting === 'all' ? 'notifications.deleteAllTitle' : 'notifications.deleteTitle')}
        message={deleting === 'all' ? t('notifications.deleteAllText') : undefined}
        confirmLabel={t('history.delete')}
        destructive
        icon="trash-2"
        loading={deleteOneState.isLoading || deleteAllState.isLoading}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1, gap: 2 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { paddingBottom: Spacing.xxxl, gap: Spacing.sm, flexGrow: 1 },
  section: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  item: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
  },
  unread: { backgroundColor: Colors.primarySoft, borderColor: Colors.primaryBorder },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    marginBottom: 2,
  },
  side: { alignItems: 'center', gap: Spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 6 },
  loading: { marginTop: Spacing.xxxl },
});
