import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
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
import type { PublicVendor } from '@/features/catalog/types';
import { useGetStoreLinksQuery, useLeaveStoreMutation, useRequestStoreMutation, useRespondStoreLinkMutation, useSearchStoresQuery } from '@/features/rider/api';
import type { StoreLink } from '@/features/rider/types';
import { useDebounced } from '@/hooks/useDebounced';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { FileRef } from '@/types/api';
import { img } from '@/lib/image';

type Tab = 'linked' | 'requests' | 'find';

/**
 * Stores I deliver for: they offer me their deliveries first. A store invites
 * me (I answer here) or I ask to join one; either side can end it.
 */
export default function RiderStoresScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('linked');
  const { data: links = [], isLoading, isError, error, refetch, isFetching } = useGetStoreLinksQuery();
  const linked = links.filter((l) => l.status === 'active');
  const requests = links.filter((l) => l.status === 'invited');
  const incoming = requests.filter((l) => l.initiatedBy === 'vendor').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('riderStores.title')} />
        <SegmentTabs
          tabs={[
            { key: 'linked', label: t('riderStores.tab.linked', { count: linked.length }) },
            { key: 'requests', label: t('riderStores.tab.requests'), badge: incoming },
            { key: 'find', label: t('riderStores.tab.find') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'find' ? (
        <FindTab links={links} />
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
                {t('riderStores.linkedHint')}
              </AppText>
            ) : undefined
          }
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <EmptyState
                icon="shopping-bag"
                title={t(`riderStores.empty.${tab}`)}
                message={tab === 'linked' ? t('riderStores.emptyLinkedText') : undefined}
                actionLabel={tab === 'linked' ? t('riderStores.findAction') : undefined}
                onAction={tab === 'linked' ? () => setTab('find') : undefined}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function StoreInfo({ name, logo, city, rating }: { name: string; logo?: FileRef; city?: string; rating?: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        {logo?.url ? <Image source={img(logo.url, 'thumb')} style={styles.logo} contentFit="cover" /> : <Feather name="shopping-bag" size={18} color={Colors.primary} />}
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
          {[city, rating ? `★ ${rating.toFixed(1)}` : null].filter(Boolean).join(' · ')}
        </AppText>
      </View>
    </View>
  );
}

function LinkRow({ link }: { link: StoreLink }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [respond, respondState] = useRespondStoreLinkMutation();
  const [leave, leaveState] = useLeaveStoreMutation();
  const store = link.vendorId;
  const name = store?.storeName ?? '';

  const answer = async (accept: boolean) => {
    try {
      await respond({ id: link._id, accept }).unwrap();
      toast.show(accept ? t('riderStores.joined', { name }) : t('riderStores.declined'));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };
  const onLeave = async () => {
    try {
      await leave(link._id).unwrap();
      setConfirm(false);
      toast.show(link.status === 'active' ? t('riderStores.left', { name }) : t('riderStores.requestCancelled'));
    } catch (e) {
      setConfirm(false);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={styles.card}>
      <StoreInfo name={name} logo={store?.logo} city={store?.address?.city} rating={store?.stats?.ratingAvg} />
      {link.status === 'invited' && link.initiatedBy === 'vendor' ? (
        <>
          <AppText variant="caption" color={Colors.primary}>
            {t('riderStores.invitesYou')}
          </AppText>
          <View style={styles.row}>
            <Button title={t('riderStores.decline')} variant="outline" size="sm" style={styles.flex} loading={respondState.isLoading && respondState.originalArgs?.accept === false} onPress={() => void answer(false)} />
            <Button title={t('riderStores.accept')} size="sm" style={styles.flex} loading={respondState.isLoading && respondState.originalArgs?.accept === true} onPress={() => void answer(true)} />
          </View>
        </>
      ) : link.status === 'invited' ? (
        <View style={styles.row}>
          <AppText variant="caption" color={Colors.textMuted} style={styles.flex}>
            {t('riderStores.requestSent')}
          </AppText>
          <Button title={t('riderStores.cancelRequest')} variant="ghost" size="sm" onPress={() => setConfirm(true)} />
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex} />
          <Button title={t('riderStores.leave')} variant="ghost" size="sm" onPress={() => setConfirm(true)} />
        </View>
      )}
      <ConfirmDialog
        visible={confirm}
        title={link.status === 'active' ? t('riderStores.leaveTitle', { name }) : t('riderStores.cancelRequestTitle')}
        message={link.status === 'active' ? t('riderStores.leaveText') : undefined}
        confirmLabel={link.status === 'active' ? t('riderStores.leave') : t('riderStores.cancelRequest')}
        destructive
        loading={leaveState.isLoading}
        onConfirm={() => void onLeave()}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

/** Search approved stores by name and ask to join */
function FindTab({ links }: { links: StoreLink[] }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState('');
  const term = useDebounced(text.trim());
  const { data, isFetching, isError, error, refetch } = useSearchStoresQuery(term);
  const [request, requestState] = useRequestStoreMutation();

  const statusOf = (vendorId: string) => links.find((l) => l.vendorId?._id === vendorId && (l.status === 'active' || l.status === 'invited'))?.status;

  const onRequest = async (store: PublicVendor) => {
    try {
      await request(store._id).unwrap();
      toast.show(t('riderStores.requested', { name: store.storeName }), 'success');
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <FlatList
      data={data?.data ?? []}
      keyExtractor={(s) => s._id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.inner, styles.list]}
      ListHeaderComponent={
        <TextField icon="search" placeholder={t('riderStores.searchHint')} value={text} onChangeText={setText} autoCorrect={false} accessibilityLabel={t('riderStores.searchHint')} />
      }
      renderItem={({ item }) => {
        const status = statusOf(item._id);
        return (
          <View style={styles.card}>
            <StoreInfo name={item.storeName} logo={item.logo} city={item.address?.city} rating={item.stats?.ratingAvg} />
            <View style={styles.row}>
              <View style={styles.flex} />
              {status === 'active' ? (
                <AppText variant="smallMedium" color={Colors.success}>
                  {t('riderStores.linked')}
                </AppText>
              ) : status === 'invited' ? (
                <AppText variant="smallMedium" color={Colors.textMuted}>
                  {t('riderStores.pending')}
                </AppText>
              ) : (
                <Button
                  title={t('riderStores.askToJoin')}
                  icon="user-plus"
                  size="sm"
                  loading={requestState.isLoading && requestState.originalArgs === item._id}
                  onPress={() => void onRequest(item)}
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
          <EmptyState icon="search" title={t('riderStores.noResults')} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  logo: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
