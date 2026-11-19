import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { AppMode } from '@/types/api';

import { useGetConversationsInfiniteQuery } from '../api';
import { peerLabel, subjectOf } from '../labels';
import type { Conversation } from '../types';
import { chatTime } from '../time';
import { img } from '@/lib/image';

/** "Messages" tab — the same list in every mode (customer, vendor, rider). */
export function ConversationList({ mode, emptyText }: { mode: AppMode; emptyText: string }) {
  const { t } = useTranslation();
  const result = useGetConversationsInfiniteQuery(mode);
  const conversations = result.data?.pages.flatMap((p) => p.data) ?? [];

  // New messages refresh this list through SessionEffects (conversation_unread)

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <AppText variant="h2" style={styles.title} accessibilityRole="header">
          {t('chat.title')}
        </AppText>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => <Row conversation={item} />}
        contentContainerStyle={[styles.inner, styles.list]}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={result.isFetching && !result.isLoading && !result.isFetchingNextPage} onRefresh={() => void result.refetch()} />}
        ListEmptyComponent={
          result.isLoading ? (
            <View style={styles.skeletons}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={64} radius={Radius.md} />
              ))}
            </View>
          ) : result.isError ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : (
            <EmptyState icon="message-circle" title={t('chat.emptyTitle')} message={emptyText} />
          )
        }
        ListFooterComponent={result.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : undefined}
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage) void result.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function Row({ conversation: c }: { conversation: Conversation }) {
  const { t, i18n } = useTranslation();
  const unread = c.myUnread > 0;
  const last = c.lastMessage;
  const preview =
    last?.type === 'voice' ? `🎤 ${t('chat.voiceNote')}` : last?.type === 'image' ? `📷 ${t('chat.photo')}` : last?.type === 'system' ? t('chat.safetyShort') : (last?.text ?? '');
  const context = subjectOf(c, t);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c._id } })}
      accessibilityRole="button"
      accessibilityLabel={`${c.peer.name}${unread ? `, ${t('chat.unread', { count: c.myUnread })}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        {c.peer.avatar?.url ? (
          <Image source={img(c.peer.avatar.url, 'thumb')} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Feather name={c.peer.mode === 'vendor' ? 'shopping-bag' : c.peer.mode === 'rider' ? 'navigation' : 'user'} size={20} color={Colors.primary} />
        )}
      </View>
      <View style={styles.flex}>
        <View style={styles.line}>
          <AppText variant="title" numberOfLines={1} style={styles.flex}>
            {c.peer.name}
          </AppText>
          {last && (
            <AppText variant="caption" color={unread ? Colors.primary : Colors.textSubtle}>
              {chatTime(last.at, i18n.language)}
            </AppText>
          )}
        </View>
        <AppText variant="caption" color={Colors.textSubtle} numberOfLines={1}>
          {peerLabel(c, t)} · {context}
        </AppText>
        <View style={styles.line}>
          <AppText variant={unread ? 'smallMedium' : 'small'} color={unread ? Colors.text : Colors.textMuted} numberOfLines={1} style={styles.flex}>
            {preview}
          </AppText>
          {unread && (
            <View style={styles.badge}>
              <AppText variant="caption" color={Colors.textOnPrimary} style={styles.badgeText}>
                {c.myUnread > 99 ? '99+' : c.myUnread}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  title: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  list: { paddingBottom: Spacing.xxxl, flexGrow: 1 },
  skeletons: { gap: Spacing.md, paddingTop: Spacing.md },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  pressed: { opacity: 0.7 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 52, height: 52 },
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, lineHeight: 14 },
});
