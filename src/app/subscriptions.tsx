import Feather from '@expo/vector-icons/Feather';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetMySubscriptionQuery, useGetPlansQuery, useSubscribeMutation } from '@/features/cv/api';
import type { Plan, PlanAudience } from '@/features/cv/types';
import { PayFeeSheet } from '@/features/jobs/components/PayFeeSheet';
import { openFeePayment } from '@/features/jobs/status';
import { formatGNF } from '@/lib/format';
import { useAppSelector } from '@/store/hooks';

/**
 * Plans (set by the admin): building a CV is free; a plan puts my profile at
 * the top of the workers list for its duration. A service-provider plan also keeps a
 * worker visible to customers (after the 30 free days). Paid online.
 * ?audience=service_provider shows only the worker plans (from the worker home).
 */
export default function SubscriptionsScreen() {
  const { t, i18n } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const params = useLocalSearchParams<{ audience?: string }>();
  const audience: PlanAudience | undefined = params.audience === 'service_provider' || params.audience === 'job_seeker' ? params.audience : undefined;
  const plans = useGetPlansQuery(audience, { skip: !signedIn });
  const mine = useGetMySubscriptionQuery(undefined, { skip: !signedIn });
  const [subscribe] = useSubscribeMutation();
  const [chosen, setChosen] = useState<Plan | null>(null);
  if (!signedIn) return <Redirect href="/login" />;

  const current = mine.data;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('plans.title')} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.inner, styles.content]}
        refreshControl={<RefreshControl refreshing={plans.isFetching && !plans.isLoading} onRefresh={() => void Promise.all([plans.refetch(), mine.refetch()])} />}>
        <AppText variant="body" color={Colors.textMuted}>
          {audience === 'service_provider' ? t('plans.introWorker') : t('plans.intro')}
        </AppText>

        {current && (
          <View style={[styles.card, styles.current]}>
            <View style={styles.row}>
              <Feather name="check-circle" size={18} color={Colors.success} />
              <AppText variant="title" style={styles.flex}>
                {current.planSnapshot.name}
              </AppText>
            </View>
            <AppText variant="small" color={Colors.textMuted}>
              {t('plans.activeUntil', { date: new Date(current.endsAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </AppText>
          </View>
        )}

        {plans.isLoading ? (
          <>
            <Skeleton height={160} radius={Radius.lg} />
            <Skeleton height={160} radius={Radius.lg} />
          </>
        ) : plans.isError ? (
          <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />
        ) : !plans.data?.length ? (
          <EmptyState icon="star" title={t('plans.none')} message={t('plans.noneText')} />
        ) : (
          plans.data.map((p) => (
            <View key={p._id} style={styles.card}>
              <View style={styles.row}>
                <AppText variant="h3" style={styles.flex}>
                  {p.name}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t(`plans.audience.${p.audience}`)}
                </AppText>
              </View>
              <AppText variant="h2" color={Colors.primary}>
                {formatGNF(p.price)}
                <AppText variant="small" color={Colors.textMuted}>
                  {'  '}
                  {t('plans.forDays', { count: p.durationDays })}
                </AppText>
              </AppText>
              {[
                ...(p.audience === 'service_provider' ? [t('plans.featureListed', { count: p.durationDays })] : []),
                ...(p.features.includes('cv_visibility') ? [t('plans.featureVisibility')] : []),
                ...p.highlights,
              ].map((h) => (
                <View key={h} style={styles.row}>
                  <Feather name="check" size={14} color={Colors.success} />
                  <AppText variant="small" style={styles.flex}>
                    {h}
                  </AppText>
                </View>
              ))}
              <Button title={current ? t('plans.extend') : t('plans.choose')} onPress={() => setChosen(p)} />
            </View>
          ))
        )}
      </ScrollView>

      <PayFeeSheet
        visible={Boolean(chosen)}
        title={chosen?.name ?? ''}
        description={current ? t('plans.extendText') : t('plans.payText', { count: chosen?.durationDays ?? 30 })}
        amount={chosen?.price}
        onClose={() => setChosen(null)}
        onPay={async (method) => {
          if (!chosen) return;
          const { payment } = await subscribe({ planId: chosen._id, paymentMethod: method }).unwrap();
          setChosen(null);
          openFeePayment(payment);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  card: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  current: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
});
