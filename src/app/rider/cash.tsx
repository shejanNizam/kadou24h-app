import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ImageUploadBox } from '@/components/media/ImageUploadBox';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useDeclareCodMutation, useGetCodSettlementsInfiniteQuery } from '@/features/rider/api';
import { COD_METHODS, type CodMethod, type CodSettlement } from '@/features/rider/types';
import { useGetEarningsSummaryQuery } from '@/features/wallet/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import type { FileRef } from '@/types/api';

const STATUS_TONE: Record<CodSettlement['status'], StatusTone> = { pending: 'amber', confirmed: 'green', rejected: 'red' };
const METHOD_ICON: Record<CodMethod, 'smartphone' | 'home' | 'repeat'> = {
  orange_money: 'smartphone',
  mobile_money: 'smartphone',
  cash_at_office: 'home',
  earnings_offset: 'repeat',
};

/**
 * Customers' cash I collected (COD) belongs to the stores: I hand it over to
 * Kadou24h and declare it here. Until an admin confirms it, it still counts
 * as owed; my withdrawals and new cash orders depend on it.
 */
export default function RiderCashScreen() {
  const { t } = useTranslation();
  const summary = useGetEarningsSummaryQuery({ mode: 'rider', range: '7d' });
  const history = useGetCodSettlementsInfiniteQuery();
  const [declaring, setDeclaring] = useState(false);
  const rows = history.data?.pages.flatMap((p) => p.data) ?? [];
  const b = summary.data?.balances;
  const owed = b?.cashOwed ?? 0;
  const declared = b?.cashDeclared ?? 0;
  const left = Math.max(0, owed - declared);
  const limit = b?.cashLimit ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('cash.title')} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(s) => s._id}
        renderItem={({ item }) => <SettlementRow settlement={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={
          <RefreshControl
            refreshing={(history.isFetching || summary.isFetching) && !history.isLoading && !history.isFetchingNextPage}
            onRefresh={() => {
              void summary.refetch();
              void history.refetch();
            }}
          />
        }
        ListHeaderComponent={
          summary.isLoading ? (
            <Skeleton height={180} radius={Radius.lg} />
          ) : summary.isError || !b ? (
            <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
          ) : (
            <View style={styles.headerGap}>
              <View style={styles.hero}>
                <AppText variant="small" color={Colors.textOnPrimary}>
                  {t('cash.owed')}
                </AppText>
                <AppText variant="h1" color={Colors.textOnPrimary}>
                  {formatGNF(owed)}
                </AppText>
                {declared > 0 && (
                  <AppText variant="caption" color={Colors.textOnPrimary}>
                    {t('cash.declaredWaiting', { amount: formatGNF(declared) })}
                  </AppText>
                )}
                {limit > 0 && (
                  <>
                    <View style={styles.bar}>
                      <View style={[styles.barFill, { width: `${Math.min(100, (owed / limit) * 100)}%` }]} />
                    </View>
                    <AppText variant="caption" color={Colors.textOnPrimary}>
                      {t('cash.limit', { limit: formatGNF(limit) })}
                    </AppText>
                  </>
                )}
                <Button title={t('cash.declare')} variant="outline" icon="send" disabled={left <= 0} onPress={() => setDeclaring(true)} />
              </View>
              <View style={styles.info}>
                <Feather name="info" size={16} color={Colors.info} />
                <AppText variant="small" style={styles.flex}>
                  {owed > 0 ? t('cash.howTo') : t('cash.nothingOwed')}
                </AppText>
              </View>
              {owed > 0 && (
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('cash.withdrawBlocked')}
                </AppText>
              )}
              <AppText variant="title">{t('cash.history')}</AppText>
            </View>
          )
        }
        ListEmptyComponent={
          history.isLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : history.isError ? (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          ) : (
            <EmptyState icon="dollar-sign" title={t('cash.emptyTitle')} message={t('cash.emptyText')} />
          )
        }
        ListFooterComponent={history.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />

      <DeclareSheet visible={declaring} max={left} available={b?.availableBalance ?? 0} onClose={() => setDeclaring(false)} />
    </SafeAreaView>
  );
}

function SettlementRow({ settlement: s }: { settlement: CodSettlement }) {
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={METHOD_ICON[s.method]} size={16} color={Colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{formatGNF(s.amount)}</AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {t(`cash.method.${s.method}`)} · {new Date(s.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
          {s.reference && s.method !== 'earnings_offset' ? ` · ${s.reference}` : ''}
        </AppText>
        {s.status === 'rejected' && s.rejectionReason ? (
          <AppText variant="caption" color={Colors.danger}>
            {s.rejectionReason}
          </AppText>
        ) : null}
      </View>
      <StatusPill label={t(`cash.status.${s.status}`)} tone={STATUS_TONE[s.status]} />
    </View>
  );
}

/** Declare cash I handed over: how, how much (≤ what's left), the reference and a receipt photo. */
function DeclareSheet({ visible, max, available, onClose }: { visible: boolean; max: number; available: number; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [method, setMethod] = useState<CodMethod>('orange_money');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<FileRef | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [declare, { isLoading }] = useDeclareCodMutation();

  const offset = method === 'earnings_offset';
  const cap = offset ? Math.min(max, available) : max;
  const value = Number(amount.replace(/\D/g, '')) || 0;
  const tooBig = value > cap;
  const needsRef = method === 'orange_money' || method === 'mobile_money';
  const valid = value > 0 && !tooBig && (!needsRef || reference.trim().length >= 4);

  const submit = async () => {
    setError(null);
    try {
      await declare({
        amount: value,
        method,
        ...(reference.trim() && !offset && { reference: reference.trim() }),
        ...(proof && !offset && { proofImage: proof }),
      }).unwrap();
      toast.show(offset ? t('cash.offsetDone') : t('cash.declared'), 'success');
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('cash.declare')}
      onClose={onClose}
      onShow={() => {
        setAmount(String(max));
        setReference('');
        setProof(undefined);
        setError(null);
        setMethod('orange_money');
      }}
      footer={<Button title={offset ? t('cash.offsetSubmit') : t('cash.submit')} disabled={!valid} loading={isLoading} onPress={() => void submit()} />}>
      <Banner tone="danger" message={error} />
      <View style={styles.chips}>
        {COD_METHODS.map((m) => (
          <Chip key={m} label={t(`cash.method.${m}`)} selected={method === m} onPress={() => setMethod(m)} />
        ))}
      </View>
      <AppText variant="small" color={Colors.textMuted}>
        {t(`cash.methodHint.${method}`, { amount: formatGNF(available) })}
      </AppText>
      <View>
        <TextField
          label={t('cash.amount')}
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          error={tooBig ? t('cash.tooBig', { amount: formatGNF(cap) }) : undefined}
        />
        <Pressable onPress={() => setAmount(String(cap))} hitSlop={8} accessibilityRole="button" style={styles.all}>
          <AppText variant="smallMedium" color={Colors.primary}>
            {t('cash.all', { amount: formatGNF(cap) })}
          </AppText>
        </Pressable>
      </View>
      {!offset && (
        <>
          <TextField
            label={t('cash.reference')}
            hint={needsRef ? t('cash.referenceHint') : undefined}
            optional={!needsRef}
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
            maxLength={60}
          />
          <View style={styles.proof}>
            <AppText variant="label">
              {t('cash.proof')}{' '}
              <AppText variant="caption" color={Colors.textSubtle}>
                ({t('common.optional')})
              </AppText>
            </AppText>
            <ImageUploadBox value={proof} onChange={setProof} title={t('cash.proof')} icon="file-text" height={100} removable />
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  headerGap: { gap: Spacing.md, marginBottom: Spacing.sm },
  hero: { gap: Spacing.sm, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  bar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: Colors.background },
  info: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.infoSoft },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  all: { alignSelf: 'flex-end', marginTop: Spacing.xs },
  proof: { gap: Spacing.sm },
});
