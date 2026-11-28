import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useGetMyTicketsInfiniteQuery, useGetPublicSettingsQuery, type SupportTicket } from '@/features/profile/api';
import { TICKET_TONE } from '@/features/profile/ticketStatus';
import { useAppSelector } from '@/store/hooks';

/** My support requests + "New request". WhatsApp only if the admin set a number. */
export default function SupportScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('support.title')} message={t('guest.profile')} />;
  return <Support />;
}

function Support() {
  const { t } = useTranslation();
  const result = useGetMyTicketsInfiniteQuery();
  const settings = useGetPublicSettingsQuery();
  const tickets = result.data?.pages.flatMap((p) => p.data) ?? [];
  const whatsapp = settings.data?.whatsappSupportNumber?.replace(/\D/g, '');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('support.title')} />
      </View>
      <FlatList
        data={tickets}
        keyExtractor={(x) => x._id}
        renderItem={({ item }) => <TicketRow ticket={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="body" color={Colors.textMuted}>
              {t('support.intro')}
            </AppText>
            {settings.data?.assistant?.available && (
              <Pressable
                onPress={() => router.push('/assistant')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.assistant, pressed && styles.pressed]}>
                <View style={styles.assistantIcon}>
                  <Feather name="cpu" size={20} color={Colors.primary} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="title">{t('assistant.entryTitle')}</AppText>
                  <AppText variant="small" color={Colors.textMuted}>
                    {t('assistant.entryText')}
                  </AppText>
                </View>
                <Feather name="chevron-right" size={20} color={Colors.textMuted} />
              </Pressable>
            )}
            {whatsapp ? (
              <Button title={t('support.whatsapp')} variant="outline" icon="message-circle" onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}`)} />
            ) : null}
            {tickets.length > 0 && (
              <AppText variant="title" style={styles.subtitle}>
                {t('support.myRequests')}
              </AppText>
            )}
          </View>
        }
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.list}>
              {[0, 1].map((i) => (
                <Skeleton key={i} height={84} radius={Radius.md} />
              ))}
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="life-buoy" title={t('support.emptyTitle')} message={t('support.emptyText')} />
          )
        }
        ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
      <View style={[styles.inner, styles.footer]}>
        <Button title={t('support.new')} icon="plus" onPress={() => router.push('/support-new')} />
      </View>
    </SafeAreaView>
  );
}

function TicketRow({ ticket: x }: { ticket: SupportTicket }) {
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/support/[id]', params: { id: x._id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <AppText variant="caption" color={Colors.textMuted} style={styles.flex}>
          #{x.ticketNumber} · {new Date(x.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
        </AppText>
        <StatusPill label={t(`support.status.${x.status}`)} tone={TICKET_TONE[x.status]} />
      </View>
      <AppText variant="title" numberOfLines={1}>
        {x.subject || t(`support.type.${x.type}`)}
      </AppText>
      <AppText variant="small" color={Colors.textMuted} numberOfLines={2}>
        {x.resolution ? `${t('support.answer')} : ${x.resolution}` : x.description}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingBottom: Spacing.xxl, flexGrow: 1 },
  header: { gap: Spacing.md },
  subtitle: { marginTop: Spacing.sm },
  card: { gap: Spacing.xs, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  assistant: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySoft },
  assistantIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
});
