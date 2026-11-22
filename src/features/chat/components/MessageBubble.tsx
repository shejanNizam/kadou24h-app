import Feather from '@expo/vector-icons/Feather';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { clock } from '../time';
import type { ConversationType, Message } from '../types';
import { playableAudio } from '@/lib/audio';
import { img } from '@/lib/image';

/**
 * The safety notice at the start of a chat. Workers are paid outside the app, so
 * "always pay via Kadou24h" would contradict the booking notices (client, 2026-10-30).
 */
const SAFETY_NOTICE: Partial<Record<ConversationType, string>> = {
  worker: 'chat.safetyNoticeWorker',
  job_application: 'chat.safetyNoticeJob',
  // The fare is paid in cash to the rider: "pay via Kadou24h" would be wrong here
  ride: 'chat.safetyNoticeRide',
};

/** One message. Mine on the right (purple), theirs on the left, system notices centred. */
export function MessageBubble({
  message,
  mine,
  conversationType,
  onLongPress,
}: {
  message: Message;
  mine: boolean;
  conversationType?: ConversationType;
  onLongPress?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [viewer, setViewer] = useState(false);

  if (message.type === 'system') {
    return (
      <View style={styles.system}>
        <Feather name="shield" size={14} color={Colors.info} />
        <AppText variant="caption" color={Colors.textMuted} style={styles.flexShrink}>
          {t((conversationType && SAFETY_NOTICE[conversationType]) ?? 'chat.safetyNotice')}
        </AppText>
      </View>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const fg = mine ? Colors.textOnPrimary : Colors.text;
  const sub = mine ? 'rgba(255,255,255,0.75)' : Colors.textSubtle;

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityHint={onLongPress ? t('chat.longPressHint') : undefined}
        style={[styles.bubble, mine ? styles.mine : styles.theirs, message.type === 'image' && styles.imageBubble, message.pending && styles.pending]}>
        {/* Store chat: the order this message is about (client, 2026-11-22) */}
        {message.subOrderNumber ? (
          <View style={styles.order}>
            <Feather name="file-text" size={11} color={sub} />
            <AppText variant="caption" color={sub} numberOfLines={1}>
              {t('chat.aboutOrder', { number: message.subOrderNumber })}
            </AppText>
          </View>
        ) : null}
        {message.type === 'image' && message.mediaUrl ? (
          <Pressable onPress={() => setViewer(true)} accessibilityRole="imagebutton" accessibilityLabel={t('chat.photo')}>
            <Image source={img(message.mediaUrl, 'card')} style={styles.image} contentFit="cover" />
          </Pressable>
        ) : message.type === 'voice' && message.mediaUrl ? (
          <VoicePlayer url={message.mediaUrl} duration={message.mediaDurationSec} color={fg} sub={sub} />
        ) : (
          <AppText variant="body" color={fg}>
            {message.text}
          </AppText>
        )}
        {message.moderationStatus === 'masked' && (
          <AppText variant="caption" color={sub} style={styles.masked}>
            <Feather name="eye-off" size={11} color={sub} /> {t('chat.maskedNotice')}
          </AppText>
        )}
        <View style={styles.meta}>
          {/* Voice can't be checked for phone numbers: make reporting one tap away */}
          {message.type === 'voice' && !mine && onLongPress && (
            <Pressable onPress={onLongPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('chat.reportTitle')} style={styles.report}>
              <Feather name="flag" size={11} color={sub} />
              <AppText variant="caption" color={sub} style={styles.time}>
                {t('chat.report')}
              </AppText>
            </Pressable>
          )}
          <AppText variant="caption" color={sub} style={styles.time}>
            {time}
          </AppText>
          {mine && <Feather name={message.pending ? 'clock' : 'check'} size={11} color={sub} />}
        </View>
      </Pressable>

      {message.type === 'image' && message.mediaUrl && (
        <Modal visible={viewer} transparent animationType="fade" onRequestClose={() => setViewer(false)}>
          <Pressable style={styles.viewer} onPress={() => setViewer(false)} accessibilityLabel={t('common.close')}>
            <Image source={img(message.mediaUrl, 'full')} style={styles.full} contentFit="contain" />
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function VoicePlayer({ url, duration, color, sub }: { url: string; duration?: number; color: string; sub: string }) {
  const { t } = useTranslation();
  const player = useAudioPlayer(playableAudio(url));
  const status = useAudioPlayerStatus(player);
  const total = status.duration || duration || 0;
  const progress = total ? Math.min(1, status.currentTime / total) : 0;

  const toggle = () => {
    if (status.playing) return player.pause();
    if (status.didJustFinish || (total && status.currentTime >= total - 0.1)) void player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.voice}>
      <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" accessibilityLabel={status.playing ? t('chat.pause') : t('chat.play')} style={[styles.play, { borderColor: color }]}>
        <Feather name={status.playing ? 'pause' : 'play'} size={16} color={color} />
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.trackBg, { backgroundColor: sub }]} />
        <View style={[styles.trackFill, { backgroundColor: color, width: `${progress * 100}%` }]} />
      </View>
      <AppText variant="caption" color={sub}>
        {clock(status.playing || status.currentTime > 0 ? status.currentTime : total)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flexShrink: { flexShrink: 1 },
  system: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    alignSelf: 'center',
    maxWidth: '92%',
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.infoSoft,
  },
  row: { flexDirection: 'row', marginVertical: 2 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, borderRadius: Radius.lg },
  mine: { backgroundColor: Colors.primary, borderBottomRightRadius: Radius.sm / 2 },
  theirs: { backgroundColor: Colors.surface, borderBottomLeftRadius: Radius.sm / 2, borderWidth: 1, borderColor: Colors.border },
  imageBubble: { paddingHorizontal: Spacing.xs, paddingTop: Spacing.xs },
  pending: { opacity: 0.6 },
  image: { width: 220, height: 220, borderRadius: Radius.md },
  masked: { marginTop: 2, fontStyle: 'italic' },
  order: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  time: { fontSize: 10, lineHeight: 14 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 'auto' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  voice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minWidth: 190, paddingVertical: Spacing.xs },
  play: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 4, justifyContent: 'center' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, opacity: 0.35 },
  trackFill: { height: 4, borderRadius: 2 },
});
