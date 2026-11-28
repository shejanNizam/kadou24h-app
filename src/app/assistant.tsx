import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { HeaderIconButton, StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import {
  useAskAssistantMutation,
  useGetAssistantQuery,
  useHandOffAssistantMutation,
  useResetAssistantMutation,
  type AssistantMessage,
} from '@/features/assistant/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAppSelector } from '@/store/hooks';
import { AppMode } from '@/types/api';

/** Same limit as the server (ai_assistant.validation) */
const MAX_QUESTION = 500;
/** The quota is shown when this few questions are left today */
const SHOW_QUOTA_BELOW = 5;
const SUGGESTIONS: Record<AppMode, string[]> = {
  customer: ['whereOrder', 'cashOnDelivery', 'refund', 'becomeSeller'],
  vendor: ['whenPaid', 'acceptOrder', 'commission'],
  rider: ['getDeliveries', 'withdraw', 'deliveryCode'],
};

/** Help assistant (AI): instant answers about Kadou24h; anything it can't solve goes to the team as a support request. */
export default function AssistantScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('assistant.title')} message={t('guest.profile')} />;
  return <Assistant />;
}

function Assistant() {
  const { t } = useTranslation();
  const toast = useToast();
  const mode = useAppSelector((s) => s.auth.user?.lastActiveMode ?? AppMode.customer);
  const state = useGetAssistantQuery();
  const [ask, asking] = useAskAssistantMutation();
  const [reset, resetting] = useResetAssistantMutation();
  const [handOff, handingOff] = useHandOffAssistantMutation();
  const [text, setText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [handOffOpen, setHandOffOpen] = useState(false);
  const [note, setNote] = useState('');

  const data = state.data;
  const messages = data?.conversation?.messages ?? [];
  const hasQuestion = messages.some((m) => m.role === 'user' && !m.pending);
  const left = data ? Math.max(0, data.quota.limit - data.quota.used) : 0;
  const outOfQuestions = Boolean(data) && left === 0;
  const lastAnswer = [...messages].reverse().find((m) => m.role === 'assistant');

  const send = async (value: string) => {
    const question = value.trim();
    if (question.length < 2 || asking.isLoading) return;
    setText('');
    try {
      await ask({ text: question, mode }).unwrap();
    } catch (e) {
      // The question is given back so nothing typed is lost
      setText(question);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const sendToTeam = async () => {
    try {
      const ticket = await handOff({ note: note.trim() || undefined, mode }).unwrap();
      setHandOffOpen(false);
      setNote('');
      toast.show(t('assistant.handOffSent', { number: ticket.ticketNumber }));
      router.replace({ pathname: '/support/[id]', params: { id: ticket.ticketId } });
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const header = (
    <View style={styles.inner}>
      <StackHeader
        title={t('assistant.title')}
        right={hasQuestion ? <HeaderIconButton icon="rotate-ccw" label={t('assistant.restart')} onPress={() => setConfirmReset(true)} /> : undefined}
      />
    </View>
  );

  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={[styles.inner, styles.loading]}>
          <Skeleton height={72} radius={Radius.lg} />
          <Skeleton height={44} radius={Radius.lg} />
        </View>
      </SafeAreaView>
    );
  }
  if (state.isError || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <ErrorState error={state.error} onRetry={() => void state.refetch()} />
      </SafeAreaView>
    );
  }
  if (!data.available) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <EmptyState
          icon="cpu"
          title={t('assistant.unavailableTitle')}
          message={t('assistant.unavailableText')}
          actionLabel={t('support.new')}
          onAction={() => router.replace('/support-new')}
        />
      </SafeAreaView>
    );
  }

  // Inverted list: newest first
  const list = [...messages].reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          inverted
          data={list}
          keyExtractor={(m) => m._id}
          contentContainerStyle={[styles.inner, styles.thread]}
          renderItem={({ item }) => <Bubble message={item} />}
          // Inverted: the header sits at the bottom, under the newest message
          ListHeaderComponent={
            <View style={styles.after}>
              {asking.isLoading && (
                <View style={[styles.bubble, styles.theirs, styles.typing]}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <AppText variant="small" color={Colors.textMuted}>
                    {t('assistant.thinking')}
                  </AppText>
                </View>
              )}
              {!asking.isLoading && lastAnswer?.needsHuman && (
                <View style={styles.handOffCard}>
                  <AppText variant="small">{t('assistant.needsHuman')}</AppText>
                  <Button title={t('assistant.handOff')} icon="send" size="sm" onPress={() => setHandOffOpen(true)} />
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            <Welcome mode={mode} onPick={(q) => void send(q)} disabled={asking.isLoading || outOfQuestions} showSuggestions={!messages.length} />
          }
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.composer}>
          {hasQuestion && !lastAnswer?.needsHuman && (
            <Pressable onPress={() => setHandOffOpen(true)} accessibilityRole="button" style={styles.humanLink} hitSlop={6}>
              <Feather name="user" size={14} color={Colors.primary} />
              <AppText variant="smallMedium" color={Colors.primary}>
                {t('assistant.talkToPerson')}
              </AppText>
            </Pressable>
          )}
          {left <= SHOW_QUOTA_BELOW && (
            <AppText variant="caption" color={outOfQuestions ? Colors.danger : Colors.textMuted} align="center">
              {outOfQuestions ? t('assistant.noQuestionsLeft') : t('assistant.questionsLeft', { count: left })}
            </AppText>
          )}
          <View style={styles.bar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('assistant.placeholder')}
              placeholderTextColor={Colors.textSubtle}
              editable={!outOfQuestions}
              multiline
              maxLength={MAX_QUESTION}
              style={styles.input}
              accessibilityLabel={t('assistant.placeholder')}
            />
            <Pressable
              onPress={() => void send(text)}
              disabled={asking.isLoading || outOfQuestions || text.trim().length < 2}
              accessibilityRole="button"
              accessibilityLabel={t('chat.send')}
              style={[styles.send, (asking.isLoading || outOfQuestions || text.trim().length < 2) && styles.off]}>
              <Feather name="send" size={18} color={Colors.textOnPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmReset}
        title={t('assistant.restartTitle')}
        message={t('assistant.restartText')}
        confirmLabel={t('assistant.restart')}
        loading={resetting.isLoading}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() =>
          void reset()
            .unwrap()
            .then(() => setConfirmReset(false))
            .catch((e: unknown) => toast.show(getApiErrorMessage(e, t), 'danger'))
        }
      />

      <BottomSheet
        visible={handOffOpen}
        title={t('assistant.handOffTitle')}
        onClose={() => setHandOffOpen(false)}
        footer={<Button title={t('assistant.handOffSend')} icon="send" loading={handingOff.isLoading} onPress={() => void sendToTeam()} />}>
        <AppText variant="body" color={Colors.textMuted}>
          {t('assistant.handOffText')}
        </AppText>
        <TextField
          label={t('assistant.noteLabel')}
          optional
          value={note}
          onChangeText={setNote}
          placeholder={t('assistant.notePlaceholder')}
          multiline
          maxLength={1000}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

/** First assistant message (from the app), a safety note and, before the first question, suggestions */
function Welcome({
  mode,
  onPick,
  disabled,
  showSuggestions,
}: {
  mode: AppMode;
  onPick: (q: string) => void;
  disabled: boolean;
  showSuggestions: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.welcome}>
      <View style={[styles.bubble, styles.theirs]}>
        <AppText variant="body">{t('assistant.welcome')}</AppText>
      </View>
      <View style={styles.notice}>
        <Feather name="shield" size={14} color={Colors.info} />
        <AppText variant="caption" color={Colors.textMuted} style={styles.flexShrink}>
          {t('assistant.notice')}
        </AppText>
      </View>
      {showSuggestions && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
          {SUGGESTIONS[mode].map((key) => (
            <Chip key={key} label={t(`assistant.suggest.${key}`)} onPress={disabled ? undefined : () => onPick(t(`assistant.suggest.${key}`))} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Bubble({ message: m }: { message: AssistantMessage }) {
  const { i18n } = useTranslation();
  const mine = m.role === 'user';
  const time = new Date(m.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs, m.pending && styles.pending]}>
        {!mine && (
          <View style={styles.botLabel}>
            <Feather name="cpu" size={12} color={Colors.primary} />
            <AppText variant="caption" color={Colors.primary}>
              Kadou24h
            </AppText>
          </View>
        )}
        <AppText variant="body" color={mine ? Colors.textOnPrimary : Colors.text} selectable>
          {m.text}
        </AppText>
        <AppText variant="caption" color={mine ? 'rgba(255,255,255,0.75)' : Colors.textSubtle} align="right" style={styles.time}>
          {time}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { gap: Spacing.md, paddingTop: Spacing.lg },
  thread: { paddingVertical: Spacing.md, gap: Spacing.xs, flexGrow: 1, justifyContent: 'flex-end' },
  welcome: { gap: Spacing.sm, marginBottom: Spacing.sm },
  notice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.infoSoft,
  },
  chips: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  after: { gap: Spacing.sm, marginTop: Spacing.xs },
  row: { flexDirection: 'row', marginVertical: 2 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, borderRadius: Radius.lg },
  mine: { backgroundColor: Colors.primary, borderBottomRightRadius: Radius.sm / 2 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm / 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pending: { opacity: 0.6 },
  botLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  time: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.sm },
  handOffCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
  },
  composer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.xs, gap: Spacing.xs },
  humanLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'center', paddingVertical: Spacing.xs },
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },
});
