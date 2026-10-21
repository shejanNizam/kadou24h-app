import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { MenuRow, MenuSection } from '@/features/profile/components/Menu';
import { useGetEarningsSummaryQuery } from '@/features/wallet/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { useGetMyStoreQuery, useUpdateAvailabilityMutation } from '../api';
import { img } from '@/lib/image';

/** Vendor profile extras: my store at a glance (open switch, rating, today) + store settings. */
export function StoreSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: store, isLoading } = useGetMyStoreQuery();
  const { data: summary } = useGetEarningsSummaryQuery({ mode: 'vendor', range: '7d' });
  const [update, { isLoading: saving }] = useUpdateAvailabilityMutation();

  const toggle = async (isOpen: boolean) => {
    try {
      await update({ isOpen }).unwrap();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <>
      {isLoading || !store ? (
        <Skeleton height={140} radius={Radius.lg} />
      ) : (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.logo}>
              {store.logo?.url ? <Image source={img(store.logo.url, 'thumb')} style={styles.logo} contentFit="cover" /> : <Feather name="shopping-bag" size={22} color={Colors.primary} />}
            </View>
            <View style={styles.flex}>
              <AppText variant="title" numberOfLines={1}>
                {store.storeName}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {store.stats.ratingCount ? `★ ${store.stats.ratingAvg.toFixed(1)} (${store.stats.ratingCount})` : t('store.noRating')}
                {' · '}
                {t('store.products', { count: store.stats.totalProducts })}
              </AppText>
            </View>
            <View style={styles.open}>
              <Switch
                value={store.isOpen}
                onValueChange={(v) => void toggle(v)}
                disabled={saving}
                trackColor={{ true: Colors.success, false: Colors.border }}
                accessibilityLabel={t('store.openSwitch')}
              />
              <AppText variant="caption" color={store.isOpen ? Colors.success : Colors.textMuted}>
                {store.isOpen ? t('store.open') : t('store.closed')}
              </AppText>
            </View>
          </View>
          {summary && (
            <View style={styles.stats}>
              <View style={styles.flex}>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('store.todayEarned')}
                </AppText>
                <AppText variant="title" color={Colors.primary}>
                  {formatGNF(summary.today.earnings)}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('store.todayDelivered')}
                </AppText>
                <AppText variant="title">{summary.today.count}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('store.toAccept')}
                </AppText>
                <AppText variant="title">{summary.counts.newOrders ?? 0}</AppText>
              </View>
            </View>
          )}
        </View>
      )}

      <MenuSection title={t('store.title')}>
        <MenuRow icon="shopping-bag" label={t('store.business')} onPress={() => router.push('/vendor/store')} />
        <MenuRow icon="clock" label={t('store.hours')} onPress={() => router.push('/vendor/hours')} />
        <MenuRow icon="users" label={t('riders.title')} onPress={() => router.push('/vendor/riders')} />
        <MenuRow icon="inbox" label={t('received.title')} onPress={() => router.push('/vendor/applications')} />
        <MenuRow
          icon="star"
          label={t('store.reviews')}
          onPress={() => store && router.push({ pathname: '/store/[id]', params: { id: store._id } })}
        />
        <MenuRow icon="credit-card" label={t('earnings.payoutMethods')} onPress={() => router.push({ pathname: '/payout-methods', params: { mode: 'vendor' } })} last />
      </MenuSection>
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  logo: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  open: { alignItems: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
});
