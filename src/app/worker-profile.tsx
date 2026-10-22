import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill, type StatusTone } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useGetBookingsQuery } from '@/features/booking/api';
import { BookingCard } from '@/features/booking/components/BookingCard';
import { formatDay } from '@/features/booking/status';
import { useGetWorkerSummaryQuery, useSetWorkerListingMutation } from '@/features/cv/api';
import type { WorkerStatus, WorkerSummary } from '@/features/cv/types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';
import { useAppSelector } from '@/store/hooks';

const TONE: Record<WorkerStatus, StatusTone> = {
  draft: 'grey',
  pending: 'amber',
  approved: 'green',
  needs_changes: 'orange',
  rejected: 'red',
  suspended: 'red',
};

/**
 * Become a worker: start, follow the review, and — once approved — the worker home:
 * visibility (free trial, then a plan), penalties, booking requests and upcoming jobs,
 * estimated earnings (prices the worker entered; payments are made outside the app),
 * the customers who wrote and the rating.
 */
export default function WorkerProfileScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('worker.title')} message={t('worker.guest')} />;
  return <WorkerHome />;
}

function WorkerHome() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetWorkerSummaryQuery();
  const approved = data?.approvalStatus === 'approved';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={approved ? t('worker.dashboardTitle') : t('worker.title')} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isError || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.inner, styles.content]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
          <AppText variant="small" color={Colors.textMuted}>
            {approved ? t('worker.dashboardSubtitle') : t('worker.subtitle')}
          </AppText>
          {data.approvalStatus === 'draft' ? <StartCard /> : <StatusCard summary={data} />}
          {approved && <Dashboard summary={data} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StartCard() {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, styles.start]}>
      <View style={styles.bigIcon}>
        <Feather name="tool" size={28} color={Colors.primary} />
      </View>
      <AppText variant="h3" align="center">
        {t('worker.startTitle')}
      </AppText>
      <AppText variant="body" color={Colors.textMuted} align="center">
        {t('worker.startText')}
      </AppText>
      <View style={styles.steps}>
        {(['step1', 'step2', 'step3'] as const).map((k, i) => (
          <View key={k} style={styles.stepRow}>
            <View style={styles.stepNo}>
              <AppText variant="caption" color={Colors.textOnPrimary}>
                {i + 1}
              </AppText>
            </View>
            <AppText variant="small" style={styles.flex}>
              {t(`worker.${k}`)}
            </AppText>
          </View>
        ))}
      </View>
      <Button title={t('worker.create')} icon="arrow-right" onPress={() => router.push('/worker-profile/edit')} />
    </View>
  );
}

function StatusCard({ summary }: { summary: WorkerSummary }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [setListing, { isLoading }] = useSetWorkerListingMutation();
  const s = summary.approvalStatus;
  const sent = summary.submittedAt
    ? new Date(summary.submittedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' })
    : undefined;

  const toggle = async (isWorkerListed: boolean) => {
    try {
      await setListing({ isWorkerListed }).unwrap();
      toast.show(isWorkerListed ? t('cv.listedOn') : t('cv.listedOff'));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <AppText variant="title" style={styles.flex}>
          {t(`worker.status.${s}.title`)}
        </AppText>
        <StatusPill label={t(`worker.statusLabel.${s}`)} tone={TONE[s]} />
      </View>
      <AppText variant="small" color={Colors.textMuted}>
        {t(`worker.status.${s}.text`, { date: sent ?? '' })}
      </AppText>
      {summary.reviewNote && s !== 'approved' && s !== 'pending' && (
        <Banner tone={s === 'needs_changes' ? 'warning' : 'danger'} message={t('worker.note', { note: summary.reviewNote })} />
      )}

      {s === 'approved' && <Visibility summary={summary} />}
      {s === 'approved' && (
        <View style={[styles.row, styles.switchRow]}>
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{t('worker.visible')}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {summary.isWorkerListed ? t('worker.visibleOn') : t('worker.visibleOff')}
            </AppText>
          </View>
          <Switch
            value={summary.isWorkerListed}
            onValueChange={(v) => void toggle(v)}
            disabled={isLoading}
            trackColor={{ true: Colors.success, false: Colors.border }}
            accessibilityLabel={t('worker.visible')}
          />
        </View>
      )}

      <View style={styles.actions}>
        {s === 'approved' && (
          <Button
            title={t('worker.viewProfile')}
            variant="outline"
            size="sm"
            style={styles.flex}
            onPress={() => router.push({ pathname: '/worker/[id]', params: { id: summary.profileId } })}
          />
        )}
        {s === 'suspended' ? (
          <Button title={t('worker.contactSupport')} variant="outline" size="sm" style={styles.flex} onPress={() => router.push('/support')} />
        ) : (
          <Button
            title={s === 'needs_changes' || s === 'rejected' ? t('worker.fixAndResend') : t('worker.editProfile')}
            size="sm"
            style={styles.flex}
            onPress={() => router.push('/worker-profile/edit')}
          />
        )}
      </View>
    </View>
  );
}

/** Visible until… (trial or plan), or hidden with a "choose a plan" button; running penalties. */
function Visibility({ summary }: { summary: WorkerSummary }) {
  const { t, i18n } = useTranslation();
  const { listing, penalty } = summary;
  const until = listing.listedUntil ? formatDay(listing.listedUntil, i18n.language) : '';
  const [now] = useState(Date.now);
  const daysLeft = listing.listedUntil ? Math.ceil((new Date(listing.listedUntil).getTime() - now) / 86_400_000) : 0;
  const plans = () => router.push({ pathname: '/subscriptions', params: { audience: 'service_provider' } });
  return (
    <>
      {listing.active ? (
        <View style={[styles.visBox, daysLeft <= 3 && styles.visSoon]}>
          <Feather name="eye" size={16} color={daysLeft <= 3 ? Colors.warningText : Colors.success} />
          <AppText variant="small" style={styles.flex} color={daysLeft <= 3 ? Colors.warningText : Colors.text}>
            {t('worker.visibleUntil', { date: until, count: daysLeft })}
          </AppText>
          <Button title={t('worker.extend')} size="sm" variant="soft" onPress={plans} />
        </View>
      ) : (
        <View style={[styles.visBox, styles.visOff]}>
          <Feather name="eye-off" size={16} color={Colors.danger} />
          <AppText variant="small" style={styles.flex} color={Colors.danger}>
            {listing.listedUntil ? t('worker.visibilityEnded') : t('worker.visibilityNone')}
          </AppText>
          <Button title={t('worker.choosePlan')} size="sm" onPress={plans} />
        </View>
      )}
      {penalty.suspendedUntil ? (
        <Banner tone="danger" message={t('worker.penaltySuspended', { date: formatDay(penalty.suspendedUntil, i18n.language), limit: penalty.limitedUntil ? formatDay(penalty.limitedUntil, i18n.language) : '' })} />
      ) : penalty.limitedUntil ? (
        <Banner tone="warning" message={t('worker.penaltyLimited', { date: formatDay(penalty.limitedUntil, i18n.language) })} />
      ) : penalty.lessVisibleUntil ? (
        <Banner tone="warning" message={t('worker.penaltyLessVisible', { date: formatDay(penalty.lessVisibleUntil, i18n.language) })} />
      ) : penalty.strikes.length ? (
        <Banner tone="info" message={t('worker.penaltyCount', { count: penalty.strikes.length })} />
      ) : null}
    </>
  );
}

function Dashboard({ summary }: { summary: WorkerSummary }) {
  const { t, i18n } = useTranslation();
  const { messages, recent, bookings, earnings } = summary;
  const requests = useGetBookingsQuery({ as: 'worker', status: 'requested' });
  const upcoming = useGetBookingsQuery({ as: 'worker', status: 'active' });
  const upcomingJobs = (upcoming.data?.data ?? []).filter((b) => b.status !== 'requested');
  const stats: { icon: 'inbox' | 'calendar' | 'star'; value: string; label: string; onPress?: () => void }[] = [
    { icon: 'inbox', value: String(bookings.requested), label: t('worker.statRequests'), onPress: () => router.push({ pathname: '/worker-bookings', params: { tab: 'requested' } }) },
    { icon: 'calendar', value: String(bookings.accepted + bookings.done), label: t('worker.statUpcoming'), onPress: () => router.push({ pathname: '/worker-bookings', params: { tab: 'upcoming' } }) },
    {
      icon: 'star',
      value: summary.ratingCount ? summary.ratingAvg.toFixed(1) : '—',
      label: summary.ratingCount ? t('worker.statRating', { count: summary.ratingCount }) : t('worker.noRating'),
    },
  ];

  return (
    <>
      <View style={styles.stats}>
        {stats.map((s) => (
          <Pressable
            key={s.icon}
            onPress={s.onPress}
            disabled={!s.onPress}
            accessibilityRole={s.onPress ? 'button' : undefined}
            style={({ pressed }) => [styles.card, styles.stat, pressed && styles.pressed]}>
            <View style={styles.statIcon}>
              <Feather name={s.icon} size={18} color={Colors.primary} />
            </View>
            <AppText variant="h3">{s.value}</AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {s.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, styles.earnings]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="caption" color={Colors.textMuted}>
              {t('worker.earningsMonth')}
            </AppText>
            <AppText variant="h3" color={Colors.primary}>
              {formatGNF(earnings.thisMonth)}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="caption" color={Colors.textMuted}>
              {t('worker.earningsTotal')}
            </AppText>
            <AppText variant="h3">{formatGNF(earnings.total)}</AppText>
          </View>
        </View>
        <AppText variant="caption" color={Colors.textMuted}>
          {t('worker.earningsNote', { count: bookings.completed })}
        </AppText>
      </View>

      <BookingSection
        title={t('worker.requestsTitle')}
        empty={t('worker.requestsEmpty')}
        items={(requests.data?.data ?? []).slice(0, 3)}
        total={bookings.requested}
        onAll={() => router.push({ pathname: '/worker-bookings', params: { tab: 'requested' } })}
      />
      <BookingSection
        title={t('worker.upcomingTitle')}
        empty={t('worker.upcomingEmpty')}
        items={upcomingJobs.slice(0, 3)}
        total={bookings.accepted + bookings.done}
        onAll={() => router.push({ pathname: '/worker-bookings', params: { tab: 'upcoming' } })}
      />

      <View style={styles.gap}>
        <AppText variant="title">{t('worker.recentTitle')}</AppText>
        {recent.length === 0 ? (
          <View style={styles.card}>
            <AppText variant="small" color={Colors.textMuted}>
              {t('worker.recentEmpty')}
            </AppText>
          </View>
        ) : (
          recent.map((c) => (
            <Pressable
              key={c._id}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c._id } })}
              accessibilityRole="button"
              accessibilityLabel={c.peer?.name ?? t('worker.customer')}
              style={({ pressed }) => [styles.card, styles.row, pressed && styles.pressed]}>
              <View style={styles.avatar}>
                {c.peer?.avatar?.url ? (
                  <Image source={img(c.peer.avatar.url, 'thumb')} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Feather name="user" size={18} color={Colors.primary} />
                )}
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyMedium" numberOfLines={1}>
                  {c.peer?.name ?? t('worker.customer')}
                </AppText>
                <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
                  {c.lastMessage?.type === 'voice'
                    ? `🎤 ${t('chat.voiceNote')}`
                    : c.lastMessage?.type === 'image'
                      ? `📷 ${t('chat.photo')}`
                      : c.lastMessage?.type === 'system'
                        ? t('chat.safetyShort')
                        : (c.lastMessage?.text ?? '')}
                </AppText>
              </View>
              <View style={styles.right}>
                {c.lastMessage?.at && (
                  <AppText variant="caption" color={Colors.textSubtle}>
                    {new Date(c.lastMessage.at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                  </AppText>
                )}
                {c.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <AppText variant="caption" color={Colors.textOnPrimary}>
                      {c.unreadCount}
                    </AppText>
                  </View>
                )}
              </View>
            </Pressable>
          ))
        )}
        {messages.conversations > recent.length && (
          <Button title={t('worker.allMessages')} variant="ghost" onPress={() => router.push('/chat')} />
        )}
      </View>
    </>
  );
}

function BookingSection({ title, empty, items, total, onAll }: { title: string; empty: string; items: Parameters<typeof BookingCard>[0]['booking'][]; total: number; onAll: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.gap}>
      <View style={styles.row}>
        <AppText variant="title" style={styles.flex}>
          {title}
        </AppText>
        {total > items.length && <Button title={t('worker.seeAll', { count: total })} variant="ghost" size="sm" onPress={onAll} />}
      </View>
      {items.length === 0 ? (
        <View style={styles.card}>
          <AppText variant="small" color={Colors.textMuted}>
            {empty}
          </AppText>
        </View>
      ) : (
        items.map((b) => <BookingCard key={b._id} booking={b} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  start: { alignItems: 'stretch', gap: Spacing.md, paddingVertical: Spacing.xxl },
  bigIcon: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  steps: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchRow: { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  actions: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.xs },
  flex: { flex: 1 },
  gap: { gap: Spacing.md },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1, gap: Spacing.xs },
  statIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 44, height: 44 },
  right: { alignItems: 'flex-end', gap: Spacing.xs },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  earnings: { gap: Spacing.sm },
  visBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.successSoft },
  visSoon: { backgroundColor: Colors.warningSoft },
  visOff: { backgroundColor: Colors.dangerSoft },
});
