import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { MenuRow, MenuSection } from '@/features/profile/components/Menu';
import { useGetRiderAccessQuery } from '@/features/ride/api';
import { openRidePlans } from '@/features/ride/components/RideAccessBanner';
import { useGetEarningsSummaryQuery } from '@/features/wallet/api';
import { formatGNF } from '@/lib/format';

import { useGetMyRiderQuery, useGetStoreLinksQuery } from '../api';
import { OnlineToggle } from './OnlineToggle';

/** Rider profile extras: online switch + today at a glance, then my rider settings. */
export function RiderSection() {
  const { t, i18n } = useTranslation();
  const { data: rider, isLoading } = useGetMyRiderQuery();
  const { data: summary } = useGetEarningsSummaryQuery({ mode: 'rider', range: '7d' });
  const { data: links = [] } = useGetStoreLinksQuery();
  const invites = links.filter((l) => l.status === 'invited' && l.initiatedBy === 'vendor').length;
  const moto = rider?.partnerType !== 'transit';
  const { data: access } = useGetRiderAccessQuery(undefined, { skip: !rider || !moto });

  return (
    <>
      {isLoading || !rider ? (
        <Skeleton height={140} radius={Radius.lg} />
      ) : (
        <View style={styles.card}>
          <OnlineToggle />
          <View style={styles.stats}>
            <Stat label={t('rider.statRating')} value={rider.stats.ratingCount ? `★ ${rider.stats.ratingAvg.toFixed(1)}` : '—'} />
            <Stat label={t('rider.statToday')} value={formatGNF(summary?.today.earnings ?? 0)} accent />
            <Stat label={t('rider.statDone')} value={String(rider.stats.completed)} />
          </View>
        </View>
      )}

      <MenuSection title={t('rider.menuTitle')}>
        <MenuRow icon="dollar-sign" label={t('cash.title')} value={formatGNF(summary?.balances.cashOwed ?? 0)} onPress={() => router.push('/rider/cash')} />
        {moto && (
          <MenuRow icon="shopping-bag" label={t('riderStores.title')} value={invites ? t('riderStores.invites', { count: invites }) : undefined} onPress={() => router.push('/rider/stores')} />
        )}
        {moto && <MenuRow icon="motorbike" label={t('ride.riderHistory')} onPress={() => router.push('/rider/rides')} />}
        {moto && access?.required && (
          <MenuRow
            icon="award"
            label={t('ride.access.title')}
            value={
              !access.allowed
                ? t('ride.access.ended')
                : access.until
                  ? t('ride.access.until', { date: new Date(access.until).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) })
                  : undefined
            }
            onPress={openRidePlans}
          />
        )}
        <MenuRow icon="truck" label={t('rider.vehicleTitle')} onPress={() => router.push('/rider/vehicle')} />
        <MenuRow icon="credit-card" label={t('earnings.payoutMethods')} onPress={() => router.push({ pathname: '/payout-methods', params: { mode: 'rider' } })} last />
      </MenuSection>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.flex}>
      <AppText variant="caption" color={Colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="title" color={accent ? Colors.primary : Colors.text}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  stats: { flexDirection: 'row', gap: Spacing.md },
  flex: { flex: 1 },
});
