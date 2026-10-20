import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  useGetRiderLinksQuery,
  useInviteRiderMutation,
  useRemoveRiderLinkMutation,
  useRespondRiderLinkMutation,
  useSearchRidersQuery,
} from '@/features/vendor/api';
import type { RiderCard, RiderLink } from '@/features/vendor/types';
import { getApiErrorMessage } from '@/lib/api/errors';

type Tab = 'linked' | 'requests' | 'invite';

/**
 * My delivery partners: moto riders I work with are offered first when I
 * assign a delivery. Invite a rider, answer a rider's request, or remove one.
 */
export default function RidersScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('linked');
  const { data: links = [], isLoading, isError, error, refetch, isFetching } = useGetRiderLinksQuery();
  const linked = links.filter((l) => l.status === 'active');
  const requests = links.filter((l) => l.status === 'invited');
  const incoming = requests.filter((l) => l.initiatedBy === 'rider').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('riders.title')} />
        <SegmentTabs
          tabs={[
            { key: 'linked', label: t('riders.tab.linked', { count: linked.length }) },
            { key: 'requests', label: t('riders.tab.requests'), badge: incoming },
            { key: 'invite', label: t('riders.tab.invite') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'invite' ? (
        <InviteTab links={links} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={tab === 'linked' ? linked : requests}
          keyExtractor={(l) => l._id}
          renderItem={({ item }) => <LinkRow link={item} />}
          contentContainerStyle={[styles.inner, styles.list]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}
          ListHeaderComponent={
            tab === 'linked' ? (
              <AppText variant="small" color={Colors.textMuted}>
                {t('riders.linkedHint')}
              </AppText>
            ) : undefined
          }
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <EmptyState
                icon="users"
                title={t(`riders.empty.${tab}`)}
                message={tab === 'linked' ? t('riders.emptyLinkedText') : undefined}
                actionLabel={tab === 'linked' ? t('riders.inviteAction') : undefined}
                onAction={tab === 'linked' ? () => setTab('invite') : undefined}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function RiderInfo({ rider }: { rider: RiderCard | null }) {
  const { t } = useTranslation();
  if (!rider) return null;
  const details = [
    rider.vehicle?.type ? t(`vehicle.${rider.vehicle.type}`, { defaultValue: rider.vehicle.type }) : null,
    rider.cityArea,
    rider.stats?.ratingAvg ? `★ ${rider.stats.ratingAvg.toFixed(1)}` : null,
    rider.stats?.completed ? t('riders.deliveries', { count: rider.stats.completed }) : null,
  ].filter(Boolean);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {rider.userId?.avatar?.url ? <Image source={rider.userId.avatar.url} style={styles.avatar} contentFit="cover" /> : <Feather name="user" size={18} color={Colors.primary} />}
        <View style={[styles.dot, { backgroundColor: rider.isOnline ? Colors.success : Colors.textSubtle }]} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {rider.userId?.name}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
          {[rider.isOnline ? t('riders.online') : t('riders.offline'), ...details].join(' · ')}
        </AppText>
      </View>
    </View>
  );
}

function LinkRow({ link }: { link: RiderLink }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [respond, respondState] = useRespondRiderLinkMutation();
  const [remove, removeState] = useRemoveRiderLinkMutation();
  const name = link.riderId?.userId?.name ?? '';

  const answer = async (accept: boolean) => {
    try {
      await respond({ id: link._id, accept }).unwrap();
      toast.show(accept ? t('riders.accepted', { name }) : t('riders.declined'));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };
  const onRemove = async () => {
    try {
      await remove(link._id).unwrap();
      setConfirm(false);
      toast.show(link.status === 'active' ? t('riders.removed', { name }) : t('riders.inviteCancelled'));
    } catch (e) {
      setConfirm(false);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={styles.card}>
      <RiderInfo rider={link.riderId} />
      {link.status === 'invited' && link.initiatedBy === 'rider' ? (
        <>
          <AppText variant="caption" color={Colors.primary}>
            {t('riders.wantsToJoin')}
          </AppText>
          <View style={styles.actions}>
            <Button title={t('riders.decline')} variant="outline" size="sm" style={styles.flex} loading={respondState.isLoading && respondState.originalArgs?.accept === false} onPress={() => void answer(false)} />
            <Button title={t('riders.accept')} size="sm" style={styles.flex} loading={respondState.isLoading && respondState.originalArgs?.accept === true} onPress={() => void answer(true)} />
          </View>
        </>
      ) : link.status === 'invited' ? (
        <View style={styles.row}>
          <AppText variant="caption" color={Colors.textMuted} style={styles.flex}>
            {t('riders.invitationSent')}
          </AppText>
          <Button title={t('riders.cancelInvite')} variant="ghost" size="sm" onPress={() => setConfirm(true)} />
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex} />
          <Button title={t('riders.remove')} variant="ghost" size="sm" onPress={() => setConfirm(true)} />
        </View>
      )}
      <ConfirmDialog
        visible={confirm}
        title={link.status === 'active' ? t('riders.removeTitle', { name }) : t('riders.cancelInviteTitle')}
        message={link.status === 'active' ? t('riders.removeText') : undefined}
        confirmLabel={link.status === 'active' ? t('riders.remove') : t('riders.cancelInvite')}
        destructive
        loading={removeState.isLoading}
        onConfirm={() => void onRemove()}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

/** Find a moto rider by name or exact phone (the phone is never shown back). */
function InviteTab({ links }: { links: RiderLink[] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setTerm(text.trim()), 400);
    return () => clearTimeout(id);
  }, [text]);
  const { data, isFetching, isError, error, refetch } = useSearchRidersQuery({ searchTerm: term || undefined });
  const [invite, inviteState] = useInviteRiderMutation();

  const statusOf = (riderId: string) => links.find((l) => l.riderId?._id === riderId && (l.status === 'active' || l.status === 'invited'))?.status;

  const onInvite = async (rider: RiderCard) => {
    try {
      await invite(rider._id).unwrap();
      toast.show(t('riders.invited', { name: rider.userId?.name ?? '' }), 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <FlatList
      data={data?.data ?? []}
      keyExtractor={(r) => r._id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.inner, styles.list]}
      ListHeaderComponent={
        <TextField icon="search" placeholder={t('riders.searchHint')} value={text} onChangeText={setText} autoCorrect={false} accessibilityLabel={t('riders.searchHint')} />
      }
      renderItem={({ item }) => {
        const status = statusOf(item._id);
        return (
          <View style={styles.card}>
            <RiderInfo rider={item} />
            <View style={styles.row}>
              <View style={styles.flex} />
              {status === 'active' ? (
                <AppText variant="smallMedium" color={Colors.success}>
                  {t('riders.linked')}
                </AppText>
              ) : status === 'invited' ? (
                <AppText variant="smallMedium" color={Colors.textMuted}>
                  {t('riders.pending')}
                </AppText>
              ) : (
                <Button
                  title={t('riders.invite')}
                  icon="user-plus"
                  size="sm"
                  loading={inviteState.isLoading && inviteState.originalArgs === item._id}
                  onPress={() => void onInvite(item)}
                />
              )}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        isFetching ? (
          <ActivityIndicator color={Colors.primary} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <EmptyState icon="search" title={t('riders.noResults')} message={t('riders.noResultsText')} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.background },
});
