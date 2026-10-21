import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import type { SubOrderItem } from '@/features/orders/types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';

import { useAssignRiderMutation, useCancelVendorOrderMutation, useGetAvailableRidersQuery, useModifyOrderMutation } from '../api';
import type { AvailableRider, ItemChange } from '../types';

const CANCEL_REASONS = ['outOfStock', 'closed', 'tooFar', 'customerAsked'] as const;

/** Refuse a new order, or cancel one being prepared. Stock goes back; the customer is told. */
export function CancelOrderSheet({ subOrderId, refuse, visible, onClose }: { subOrderId: string; refuse: boolean; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [reason, setReason] = useState<(typeof CANCEL_REASONS)[number] | 'other' | null>(null);
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cancel, { isLoading }] = useCancelVendorOrderMutation();

  const text = reason === 'other' ? other.trim() : reason ? t(`vendorOrders.cancelReason.${reason}`) : '';
  const submit = async () => {
    setError(null);
    try {
      await cancel({ id: subOrderId, reason: text }).unwrap();
      toast.show(refuse ? t('vendorOrders.refused') : t('vendorOrders.cancelled'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={refuse ? t('vendorOrders.refuseTitle') : t('vendorOrders.cancelTitle')}
      onClose={onClose}
      onShow={() => {
        setReason(null);
        setOther('');
        setError(null);
      }}
      footer={
        <Button title={refuse ? t('vendorOrders.refuse') : t('vendorOrders.cancel')} variant="danger" disabled={text.length < 3} loading={isLoading} onPress={() => void submit()} />
      }>
      <AppText variant="small" color={Colors.textMuted}>
        {t('vendorOrders.cancelHint')}
      </AppText>
      <Banner tone="danger" message={error} />
      <View style={styles.chips}>
        {[...CANCEL_REASONS, 'other' as const].map((r) => (
          <Chip key={r} label={t(`vendorOrders.cancelReason.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {reason === 'other' && <TextField label={t('vendorOrders.reason')} value={other} onChangeText={setOther} maxLength={300} multiline />}
    </BottomSheet>
  );
}

/**
 * Online riders for this delivery leg, in the server's order: bus leg → the
 * drivers of this route first; leg from my store → my linked riders first;
 * then the nearest. No phone numbers.
 */
export function AssignRiderSheet({ deliveryId, onClose }: { deliveryId: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useGetAvailableRidersQuery(deliveryId ?? '', { skip: !deliveryId });
  const [assign, { isLoading: assigning, originalArgs }] = useAssignRiderMutation();

  const pick = async (rider: AvailableRider) => {
    if (!deliveryId) return;
    try {
      await assign({ deliveryId, riderId: rider._id }).unwrap();
      toast.show(t('vendorOrders.riderAssigned', { name: rider.name }), 'success');
      onClose();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
      void refetch();
    }
  };

  return (
    <BottomSheet visible={Boolean(deliveryId)} title={t('vendorOrders.assignTitle')} onClose={onClose}>
      <AppText variant="small" color={Colors.textMuted}>
        {t('vendorOrders.assignHint')}
      </AppText>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon="users"
          title={t('vendorOrders.noRiders')}
          message={t('vendorOrders.noRidersText')}
          actionLabel={t('riders.title')}
          onAction={() => {
            onClose();
            router.push('/vendor/riders');
          }}
        />
      ) : (
        data.map((r) => (
          <Pressable
            key={r._id}
            onPress={() => void pick(r)}
            disabled={assigning}
            accessibilityRole="button"
            accessibilityLabel={t('vendorOrders.assignTo', { name: r.name })}
            style={({ pressed }) => [styles.rider, pressed && styles.pressed]}>
            <View style={styles.avatar}>
              {r.avatar ? <Image source={r.avatar} style={styles.avatar} contentFit="cover" /> : <Feather name="user" size={18} color={Colors.primary} />}
            </View>
            <View style={styles.flex}>
              <View style={styles.row}>
                <AppText variant="bodyMedium" numberOfLines={1} style={styles.shrink}>
                  {r.name}
                </AppText>
                {r.servesRoute ? (
                  <AppText variant="caption" color={Colors.success} style={styles.linked}>
                    {t('vendorOrders.runsRoute')}
                  </AppText>
                ) : r.isLinked && r.partnerType === 'moto' ? (
                  <AppText variant="caption" color={Colors.primary} style={styles.linked}>
                    {t('riders.linked')}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
                {[
                  t(`vehicle.${r.vehicleType}`, { defaultValue: r.vehicleType }),
                  r.distanceKm !== undefined ? t('vendorOrders.km', { km: r.distanceKm.toFixed(1) }) : null,
                  r.ratingAvg ? `★ ${r.ratingAvg.toFixed(1)}` : null,
                  r.activeDeliveryCount ? t('vendorOrders.busy', { count: r.activeDeliveryCount }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
            {assigning && originalArgs?.riderId === r._id ? <ActivityIndicator color={Colors.primary} /> : <Feather name="chevron-right" size={18} color={Colors.textSubtle} />}
          </Pressable>
        ))
      )}
    </BottomSheet>
  );
}

/**
 * Change the order after agreeing with the customer in chat: remove items or
 * lower quantities (never raise — the customer accepted the original total).
 */
export function ModifyOrderSheet({ subOrderId, items, visible, onClose }: { subOrderId: string; items: SubOrderItem[]; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const live = items.filter((i) => !i.removed);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modify, { isLoading }] = useModifyOrderMutation();

  const changes: ItemChange[] = live
    .filter((i) => qty[i.productId] !== undefined && qty[i.productId] < i.qty)
    .map((i) => (qty[i.productId] === 0 ? { productId: i.productId, action: 'remove' } : { productId: i.productId, action: 'update_qty', newQty: qty[i.productId] }));
  const removedValue = live.reduce((sum, i) => sum + (i.qty - (qty[i.productId] ?? i.qty)) * i.unitPrice, 0);
  const allGone = live.every((i) => qty[i.productId] === 0);

  const submit = async () => {
    setError(null);
    try {
      await modify({ id: subOrderId, modifications: changes, reason: reason.trim() || undefined }).unwrap();
      toast.show(t('vendorOrders.modified'), 'success');
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('vendorOrders.modifyTitle')}
      onClose={onClose}
      onShow={() => {
        setQty({});
        setReason('');
        setError(null);
      }}
      footer={<Button title={t('vendorOrders.modifySave')} disabled={!changes.length || allGone} loading={isLoading} onPress={() => void submit()} />}>
      <AppText variant="small" color={Colors.textMuted}>
        {t('vendorOrders.modifyHint')}
      </AppText>
      <Banner tone="danger" message={error} />
      {live.map((i) => {
        const n = qty[i.productId] ?? i.qty;
        return (
          <View key={i._id} style={styles.item}>
            <View style={styles.flex}>
              <AppText variant="bodyMedium" numberOfLines={2} style={n === 0 ? styles.struck : undefined}>
                {i.name}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {formatGNF(i.unitPrice)} · {t('vendorOrders.ordered', { count: i.qty })}
              </AppText>
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setQty((q) => ({ ...q, [i.productId]: Math.max(0, n - 1) }))}
                disabled={n === 0}
                accessibilityRole="button"
                accessibilityLabel={t('vendorOrders.less', { name: i.name })}
                style={[styles.stepBtn, n === 0 && styles.disabled]}>
                <Feather name={n === 1 ? 'trash-2' : 'minus'} size={16} color={n === 1 ? Colors.danger : Colors.primary} />
              </Pressable>
              <AppText variant="title" style={styles.qty}>
                {n}
              </AppText>
              <Pressable
                onPress={() => setQty((q) => ({ ...q, [i.productId]: Math.min(i.qty, n + 1) }))}
                disabled={n >= i.qty}
                accessibilityRole="button"
                accessibilityLabel={t('vendorOrders.more', { name: i.name })}
                style={[styles.stepBtn, n >= i.qty && styles.disabled]}>
                <Feather name="plus" size={16} color={Colors.primary} />
              </Pressable>
            </View>
          </View>
        );
      })}
      {allGone ? (
        <Banner tone="warning" message={t('vendorOrders.modifyAllGone')} />
      ) : removedValue > 0 ? (
        <AppText variant="smallMedium" color={Colors.primaryDark}>
          {t('vendorOrders.removedValue', { amount: formatGNF(removedValue) })}
        </AppText>
      ) : null}
      <TextField label={t('vendorOrders.modifyReason')} optional hint={t('vendorOrders.modifyReasonHint')} value={reason} onChangeText={setReason} maxLength={300} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  linked: { paddingHorizontal: Spacing.sm, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  struck: { textDecorationLine: 'line-through', color: Colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: MinTouch - 4, height: MinTouch - 4, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  qty: { minWidth: 24, textAlign: 'center' },
});
