import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MinTouch, Spacing } from '@/constants/theme';
import { getApiErrorMessage } from '@/lib/api/errors';

import { useCancelOrderMutation, useCancelStorePartMutation, useCreateDisputeMutation, useCreateReviewMutation } from '../api';
import type { SubOrder } from '../types';

const CANCEL_REASONS = ['changedMind', 'tooLong', 'wrongItems', 'betterPrice'] as const;
const DISPUTE_REASONS = ['notReceived', 'damaged', 'wrongItem', 'missingItem', 'charged'] as const;

/**
 * Cancel the whole order (server rule: only before any store starts preparing), or —
 * with `part` — only one store's part (the other stores carry on).
 */
export function CancelSheet({
  orderId,
  visible,
  onClose,
  part,
}: {
  orderId: string;
  visible: boolean;
  onClose: () => void;
  part?: { subOrderId: string; storeName: string; paidOnline: boolean } | null;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [chip, setChip] = useState<(typeof CANCEL_REASONS)[number] | 'other' | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cancel, { isLoading }] = useCancelOrderMutation();
  const [cancelPart, partState] = useCancelStorePartMutation();

  const reason = chip && chip !== 'other' ? t(`order.cancelReason.${chip}`) + (text.trim() ? ` — ${text.trim()}` : '') : text.trim();

  const submit = async () => {
    setError(null);
    try {
      if (part) {
        await cancelPart({ id: orderId, subOrderId: part.subOrderId, reason }).unwrap();
        toast.show(t('order.partCancelled', { store: part.storeName }));
      } else {
        await cancel({ id: orderId, reason }).unwrap();
        toast.show(t('order.cancelled'));
      }
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={part ? t('order.cancelPartTitle', { store: part.storeName }) : t('order.cancelTitle')}
      onClose={onClose}
      onShow={() => {
        setChip(null);
        setText('');
        setError(null);
      }}
      footer={
        <>
          <Button
            title={part ? t('order.cancelPartConfirm') : t('order.cancelConfirm')}
            variant="danger"
            loading={isLoading || partState.isLoading}
            disabled={reason.length < 3}
            onPress={() => void submit()}
          />
          <Button title={t('order.keepOrder')} variant="ghost" onPress={onClose} />
        </>
      }>
      <AppText variant="small" color={Colors.textMuted}>
        {part ? t(part.paidOnline ? 'order.cancelPartTextPaid' : 'order.cancelPartText', { store: part.storeName }) : t('order.cancelText')}
      </AppText>
      <View style={styles.chips}>
        {[...CANCEL_REASONS, 'other' as const].map((r) => (
          <Chip key={r} label={t(`order.cancelReason.${r}`)} selected={chip === r} onPress={() => setChip(r)} />
        ))}
      </View>
      <TextField
        label={chip === 'other' ? t('order.reason') : t('order.reasonMore')}
        optional={chip !== 'other'}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={300}
        style={styles.multiline}
      />
      <Banner tone="danger" message={error} />
    </BottomSheet>
  );
}

/** 1–5 stars + comment for one store (one review per delivered sub-order). */
export function ReviewSheet({ subOrder, onClose }: { subOrder: SubOrder | null; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [create, { isLoading }] = useCreateReviewMutation();

  const submit = async () => {
    if (!subOrder) return;
    setError(null);
    try {
      await create({ subOrderId: subOrder._id, rating, comment: comment.trim() || undefined }).unwrap();
      toast.show(t('order.reviewThanks'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={Boolean(subOrder)}
      title={t('order.reviewTitle', { store: subOrder?.vendorId.storeName ?? '' })}
      onClose={onClose}
      onShow={() => {
        setRating(0);
        setComment('');
        setError(null);
      }}
      footer={<Button title={t('order.reviewSend')} loading={isLoading} disabled={rating === 0} onPress={() => void submit()} />}>
      <View style={styles.stars} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: rating }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={t('order.stars', { count: n })} style={styles.star}>
            <Feather name="star" size={34} color={n <= rating ? Colors.warning : Colors.border} />
          </Pressable>
        ))}
      </View>
      {rating > 0 && (
        <AppText variant="bodyMedium" align="center">
          {t(`order.rating.${rating}`)}
        </AppText>
      )}
      <TextField label={t('order.reviewComment')} optional placeholder={t('order.reviewCommentHint')} value={comment} onChangeText={setComment} multiline maxLength={500} style={styles.multiline} />
      <Banner tone="danger" message={error} />
    </BottomSheet>
  );
}

/** "Signaler un problème": goes to the admin team, answer comes back here. */
export function DisputeSheet({
  orderId,
  subOrders,
  visible,
  onClose,
}: {
  orderId: string;
  subOrders: SubOrder[];
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [subOrderId, setSubOrderId] = useState<string | undefined>();
  const [chip, setChip] = useState<(typeof DISPUTE_REASONS)[number] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [create, { isLoading }] = useCreateDisputeMutation();

  const reason = [chip ? t(`order.disputeReason.${chip}`) : '', text.trim()].filter(Boolean).join(' — ');

  const submit = async () => {
    setError(null);
    try {
      await create({ orderId, subOrderId, reason }).unwrap();
      toast.show(t('order.disputeSent'));
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('order.disputeTitle')}
      onClose={onClose}
      onShow={() => {
        setSubOrderId(subOrders.length === 1 ? subOrders[0]._id : undefined);
        setChip(null);
        setText('');
        setError(null);
      }}
      footer={<Button title={t('order.disputeSend')} loading={isLoading} disabled={reason.length < 5} onPress={() => void submit()} />}>
      {subOrders.length > 1 && (
        <>
          <AppText variant="label">{t('order.disputeStore')}</AppText>
          <View style={styles.chips}>
            <Chip label={t('order.wholeOrder')} selected={!subOrderId} onPress={() => setSubOrderId(undefined)} />
            {subOrders.map((s) => (
              <Chip key={s._id} label={s.vendorId.storeName} selected={subOrderId === s._id} onPress={() => setSubOrderId(s._id)} />
            ))}
          </View>
        </>
      )}
      <AppText variant="label">{t('order.disputeWhat')}</AppText>
      <View style={styles.chips}>
        {DISPUTE_REASONS.map((r) => (
          <Chip key={r} label={t(`order.disputeReason.${r}`)} selected={chip === r} onPress={() => setChip(r)} />
        ))}
      </View>
      <TextField label={t('order.disputeDetails')} placeholder={t('order.disputeDetailsHint')} value={text} onChangeText={setText} multiline maxLength={1000} style={styles.multiline} />
      <AppText variant="caption" color={Colors.textMuted}>
        {t('order.disputeInfo')}
      </AppText>
      <Banner tone="danger" message={error} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs },
  star: { minWidth: MinTouch, minHeight: MinTouch, alignItems: 'center', justifyContent: 'center' },
});
