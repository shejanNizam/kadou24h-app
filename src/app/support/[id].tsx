import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetTicketQuery } from '@/features/profile/api';
import { TICKET_TONE } from '@/features/profile/ticketStatus';

/** One request: what I wrote, its status, and the support team's answer. */
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { data: x, isLoading, isError, error, refetch, isFetching } = useGetTicketQuery(id);
  const date = (iso: string) => new Date(iso).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={x ? `#${x.ticketNumber}` : t('support.title')} />
      </View>
      {isLoading ? (
        <View style={[styles.inner, styles.content]}>
          <Skeleton height={160} radius={Radius.lg} />
        </View>
      ) : isError || !x ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.inner, styles.content]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
          <View style={styles.row}>
            <StatusPill label={t(`support.status.${x.status}`)} tone={TICKET_TONE[x.status]} />
            <AppText variant="caption" color={Colors.textMuted}>
              {t(`support.urgency.${x.urgency}`)} · {t(`support.type.${x.type}`)}
            </AppText>
          </View>

          <View style={styles.bubble}>
            <AppText variant="caption" color={Colors.textMuted}>
              {t('support.you')} · {date(x.createdAt)}
            </AppText>
            {x.subject ? <AppText variant="title">{x.subject}</AppText> : null}
            <AppText variant="body">{x.description}</AppText>
            {x.attachments?.length ? (
              <View style={styles.photos}>
                {x.attachments.map((url) => (
                  <Image key={url} source={url} style={styles.photo} contentFit="cover" />
                ))}
              </View>
            ) : null}
          </View>

          {x.resolution ? (
            <View style={[styles.bubble, styles.answer]}>
              <View style={styles.row}>
                <Feather name="headphones" size={14} color={Colors.primary} />
                <AppText variant="caption" color={Colors.primary}>
                  {t('support.team')}
                  {x.resolvedAt ? ` · ${date(x.resolvedAt)}` : ''}
                </AppText>
              </View>
              <AppText variant="body">{x.resolution}</AppText>
            </View>
          ) : (
            <View style={styles.waiting}>
              <Feather name="clock" size={16} color={Colors.textMuted} />
              <AppText variant="small" color={Colors.textMuted} style={styles.flex}>
                {t('support.waiting')}
              </AppText>
            </View>
          )}

          {(x.status === 'resolved' || x.status === 'closed') && (
            <Button title={t('support.stillNeedHelp')} variant="outline" onPress={() => router.replace('/support-new')} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  bubble: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  answer: { backgroundColor: Colors.primarySoft, borderColor: Colors.primaryBorder },
  photos: { flexDirection: 'row', gap: Spacing.sm },
  photo: { width: 84, height: 84, borderRadius: Radius.md },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
});
