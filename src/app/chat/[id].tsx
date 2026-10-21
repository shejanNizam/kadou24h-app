import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderIconButton, StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  addMessageToThread,
  useGetConversationQuery,
  useGetMessagesInfiniteQuery,
  useMarkConversationReadMutation,
  useReportMutation,
  useSendMessageMutation,
} from '@/features/chat/api';
import { Composer, type Outgoing } from '@/features/chat/components/Composer';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { dayLabel, sameDay } from '@/features/chat/time';
import { senderIdOf, type Message } from '@/features/chat/types';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { getApiErrorMessage } from '@/lib/api/errors';
import { setActiveChat } from '@/lib/push';
import { connectSocket } from '@/lib/socket';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const REPORT_REASONS = ['contact', 'offPlatformPayment', 'abuse', 'scam', 'other'] as const;
const QUICK_REPLIES = ['coming', 'arrived', 'atGate', 'comeOut'] as const;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.accessToken);
  const conversation = useGetConversationQuery(id);
  const messages = useGetMessagesInfiniteQuery(id);
  const [send] = useSendMessageMutation();
  const [markRead] = useMarkConversationReadMutation();
  const [peerTyping, setPeerTyping] = useState(false);
  const [reportFor, setReportFor] = useState<Message | null>(null);
  const lastTypingSent = useRef(0);
  // Checked when the chat opens (a restriction lasts hours)
  const [openedAt] = useState(() => Date.now());

  const c = conversation.data;
  const myMode = c?.myMode;

  // Live room: new messages, typing, read receipts
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    const join = () => socket.emit('join_conversation', id);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('leave_conversation', id);
    };
  }, [id, token]);

  // No push banner for this chat while it is open
  useEffect(() => {
    setActiveChat(id);
    return () => setActiveChat(null);
  }, [id]);

  // Opening the chat reads it
  useEffect(() => {
    if (myMode) void markRead({ id, mode: myMode });
  }, [id, myMode, markRead]);

  useSocketEvent<Message>('new_message', (m) => {
    if (String(m.conversationId) !== id) return;
    dispatch(addMessageToThread(id, m));
    setPeerTyping(false);
    if (myMode && senderIdOf(m) !== me?._id) void markRead({ id, mode: myMode });
  });
  useSocketEvent<{ conversationId: string; userId: string }>('typing', (p) => {
    if (p.conversationId === id && String(p.userId) !== me?._id) setPeerTyping(true);
  });
  useSocketEvent<{ conversationId: string; userId: string }>('stop_typing', (p) => {
    if (p.conversationId === id && String(p.userId) !== me?._id) setPeerTyping(false);
  });
  // "typing…" never sticks if the stop event is lost
  useEffect(() => {
    if (!peerTyping) return;
    const timer = setTimeout(() => setPeerTyping(false), 6000);
    return () => clearTimeout(timer);
  }, [peerTyping]);

  const onTyping = () => {
    const now = Date.now();
    if (!token || now - lastTypingSent.current < 3000) return;
    lastTypingSent.current = now;
    connectSocket(token).emit('typing', { conversationId: id });
  };

  const onSend = async (m: Outgoing) => {
    try {
      await send({ conversationId: id, ...m }).unwrap();
      if (token) connectSocket(token).emit('stop_typing', { conversationId: id });
      return true;
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
      return false;
    }
  };

  // Pages: [newest, older, …]; each page oldest → newest. Inverted list wants newest first.
  const seen = new Set<string>();
  const list = (messages.data?.pages ?? [])
    .flatMap((p) => [...p.data].reverse())
    .filter((m) => (seen.has(m._id) ? false : (seen.add(m._id), true)));

  const restrictedUntil = me?.moderation?.chatRestrictedUntil;
  const restricted = Boolean(restrictedUntil && new Date(restrictedUntil).getTime() > openedAt);

  if (conversation.isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <StackHeader title={t('chat.title')} />
        </View>
        <ErrorState error={conversation.error} onRetry={conversation.refetch} />
      </SafeAreaView>
    );
  }

  const subtitle = c
    ? peerTyping
      ? t('chat.typing')
      : [t(`chat.peer.${c.peer.mode}`), c.subOrderId?.subOrderNumber && t('chat.aboutOrder', { number: c.subOrderId.subOrderNumber })].filter(Boolean).join(' · ')
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.inner, styles.header]}>
        <StackHeader
          title={c?.peer.name ?? ''}
          right={
            c?.peer.vendorId ? (
              <HeaderIconButton icon="shopping-bag" label={t('chat.viewStore')} onPress={() => router.push({ pathname: '/store/[id]', params: { id: c.peer.vendorId! } })} />
            ) : c?.orderId && myMode === 'customer' ? (
              <HeaderIconButton icon="file-text" label={t('chat.viewOrder')} onPress={() => router.push({ pathname: '/order/[id]', params: { id: c.orderId! } })} />
            ) : undefined
          }
        />
        {c && (
          <View style={styles.peerRow}>
            <View style={styles.avatar}>
              {c.peer.avatar?.url ? (
                <Image source={c.peer.avatar.url} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Feather name={c.peer.mode === 'vendor' ? 'shopping-bag' : 'user'} size={14} color={Colors.primary} />
              )}
            </View>
            <AppText variant="caption" color={peerTyping ? Colors.primary : Colors.textMuted} numberOfLines={1}>
              {subtitle}
            </AppText>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          inverted
          data={list}
          keyExtractor={(m) => m._id}
          contentContainerStyle={[styles.inner, styles.thread]}
          renderItem={({ item, index }) => {
            const older = list[index + 1];
            const mine = senderIdOf(item) === me?._id;
            return (
              <View>
                {(!older || !sameDay(older.createdAt, item.createdAt)) && (
                  <AppText variant="caption" color={Colors.textSubtle} align="center" style={styles.day}>
                    {dayLabel(item.createdAt, i18n.language)}
                  </AppText>
                )}
                <MessageBubble message={item} mine={mine} onLongPress={!mine && item.type !== 'system' ? () => setReportFor(item) : undefined} />
              </View>
            );
          }}
          onEndReached={() => {
            if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={messages.isLoading || messages.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={styles.loading} /> : undefined}
          keyboardShouldPersistTaps="handled"
        />

        {restricted && (
          <View style={styles.inner}>
            <Banner
              tone="warning"
              message={t('chat.restricted', {
                until: new Date(restrictedUntil!).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
              })}
            />
          </View>
        )}
        <View style={styles.composer}>
          {/* Rider → customer: one tap at the door instead of typing on the moto */}
          {myMode === 'rider' && c?.peer.mode === 'customer' && !restricted && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.quick}>
              {QUICK_REPLIES.map((key) => (
                <Chip key={key} label={t(`chat.quick.${key}`)} onPress={() => void onSend({ type: 'text', text: t(`chat.quick.${key}`) })} />
              ))}
            </ScrollView>
          )}
          <Composer allowVoice={Boolean(c?.allowVoice)} disabled={restricted || !c} onSend={onSend} onTyping={onTyping} />
        </View>
      </KeyboardAvoidingView>

      <ReportSheet message={reportFor} conversationId={id} onClose={() => setReportFor(null)} />
    </SafeAreaView>
  );
}

function ReportSheet({ message, conversationId, onClose }: { message: Message | null; conversationId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [details, setDetails] = useState('');
  const [report, { isLoading }] = useReportMutation();

  const submit = async () => {
    if (!message || !reason) return;
    try {
      await report({
        targetType: 'message',
        targetId: message._id,
        conversationId,
        reason: t(`chat.reportReason.${reason}`),
        description: details.trim() || undefined,
      }).unwrap();
      toast.show(t('chat.reported'));
      onClose();
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <BottomSheet
      visible={Boolean(message)}
      title={t('chat.reportTitle')}
      onClose={onClose}
      onShow={() => {
        setReason(null);
        setDetails('');
      }}
      footer={<Button title={t('chat.reportSend')} variant="danger" loading={isLoading} disabled={!reason} onPress={() => void submit()} />}>
      {message?.text ? (
        <AppText variant="small" color={Colors.textMuted} numberOfLines={3}>
          “{message.text}”
        </AppText>
      ) : null}
      <View style={styles.chips}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r} label={t(`chat.reportReason.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <TextField label={t('chat.reportDetails')} optional value={details} onChangeText={setDetails} multiline maxLength={500} />
      <AppText variant="caption" color={Colors.textMuted}>
        {t('chat.reportInfo')}
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  header: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm },
  peerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: -Spacing.sm, paddingLeft: 52 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 22, height: 22 },
  thread: { paddingVertical: Spacing.md, flexGrow: 1 },
  day: { marginVertical: Spacing.md },
  loading: { marginVertical: Spacing.lg },
  composer: { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  quick: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
