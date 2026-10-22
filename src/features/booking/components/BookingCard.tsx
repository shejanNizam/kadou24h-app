import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { addressLine } from '@/features/address/api';
import { img } from '@/lib/image';

import { BOOKING_TONE, formatBookingDate, timeLeft } from '../status';
import type { Booking } from '../types';

/** One booking in a list: the other person, the date, the area and the status. */
export function BookingCard({ booking: b }: { booking: Booking }) {
  const { t, i18n } = useTranslation();
  const other = b.role === 'customer' ? b.worker : b.customer;
  const photo = b.role === 'customer' ? (b.worker?.photo?.url ?? b.worker?.avatar?.url) : b.customer?.avatar?.url;
  const subtitle = b.role === 'customer' ? (b.worker?.profession ?? b.profession) : b.description;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: b._id } })}
      accessibilityRole="button"
      accessibilityLabel={`${b.bookingNumber} ${other?.name ?? ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {photo ? (
            <Image source={img(photo, 'thumb')} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Feather name="user" size={18} color={Colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyMedium" numberOfLines={1}>
            {other?.name ?? '—'}
          </AppText>
          {subtitle ? (
            <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <StatusPill label={t(`booking.status.${b.status}`)} tone={BOOKING_TONE[b.status]} />
      </View>
      <View style={styles.meta}>
        <Meta icon="calendar" text={formatBookingDate(b.scheduledAt, i18n.language)} />
        <Meta icon="map-pin" text={addressLine(b.address)} />
      </View>
      {b.status === 'requested' && (
        <AppText variant="caption" color={Colors.warningText}>
          {b.role === 'worker'
            ? t('booking.answerWithin', { time: timeLeft(t, b.respondBy) })
            : t('booking.waitingAnswer', { time: timeLeft(t, b.respondBy) })}
        </AppText>
      )}
      {b.status === 'done' && b.role === 'customer' && (
        <AppText variant="caption" color={Colors.primary}>
          {t('booking.confirmPrompt')}
        </AppText>
      )}
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: 'calendar' | 'map-pin'; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={13} color={Colors.textMuted} />
      <AppText variant="caption" color={Colors.textMuted} numberOfLines={1} style={styles.shrink}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.lg,
    rowGap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    maxWidth: '100%',
  },
});
