import Feather from '@expo/vector-icons/Feather';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Colors, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { pickImage, uploadFile, uploadImage } from '@/lib/upload';

import { clock } from '../time';

const MAX_VOICE_SECONDS = 120;
const MAX_TEXT = 2000;

export type Outgoing =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaUrl: string }
  | { type: 'voice'; mediaUrl: string; mediaDurationSec: number };

/** Text + photo (+ voice note when allowed: buyer ↔ rider only). */
export function Composer({
  allowVoice,
  disabled,
  onSend,
  onTyping,
}: {
  allowVoice: boolean;
  disabled?: boolean;
  onSend: (message: Outgoing) => Promise<boolean>;
  onTyping?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [recording, setRecording] = useState(false);

  const send = async (message: Outgoing) => {
    setBusy(true);
    const ok = await onSend(message);
    setBusy(false);
    return ok;
  };

  const sendText = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setText('');
    if (!(await send({ type: 'text', text: value }))) setText(value);
  };

  const sendPhoto = async (source: 'camera' | 'library') => {
    setPhotoSheet(false);
    try {
      const uri = await pickImage(source);
      if (!uri) return;
      setBusy(true);
      const file = await uploadImage(uri);
      await send({ type: 'image', mediaUrl: file.url });
    } catch {
      toast.show(t('upload.failed'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  if (recording) {
    return (
      <VoiceRecorder
        onCancel={() => setRecording(false)}
        onDone={async (uri, seconds) => {
          setRecording(false);
          setBusy(true);
          try {
            const web = Platform.OS === 'web';
            const file = await uploadFile(uri, web ? { name: 'voice.webm', type: 'audio/webm' } : { name: 'voice.m4a', type: 'audio/mp4' });
            await send({ type: 'voice', mediaUrl: file.url, mediaDurationSec: seconds });
          } catch {
            toast.show(t('upload.failed'), 'danger');
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  const canSend = text.trim().length > 0;
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => setPhotoSheet(true)}
        disabled={disabled || busy}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t('chat.sendPhoto')}
        style={[styles.icon, (disabled || busy) && styles.off]}>
        <Feather name="image" size={22} color={Colors.textMuted} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(v) => {
          setText(v);
          onTyping?.();
        }}
        placeholder={disabled ? t('chat.restrictedPlaceholder') : t('chat.placeholder')}
        placeholderTextColor={Colors.textSubtle}
        editable={!disabled}
        multiline
        maxLength={MAX_TEXT}
        style={styles.input}
        accessibilityLabel={t('chat.placeholder')}
      />
      {busy ? (
        <View style={styles.icon}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : canSend || !allowVoice ? (
        <Pressable
          onPress={() => void sendText()}
          disabled={disabled || !canSend}
          accessibilityRole="button"
          accessibilityLabel={t('chat.send')}
          style={[styles.send, (disabled || !canSend) && styles.off]}>
          <Feather name="send" size={18} color={Colors.textOnPrimary} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setRecording(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t('chat.recordVoice')}
          style={[styles.send, disabled && styles.off]}>
          <Feather name="mic" size={18} color={Colors.textOnPrimary} />
        </Pressable>
      )}

      <BottomSheet visible={photoSheet} title={t('chat.sendPhoto')} onClose={() => setPhotoSheet(false)}>
        <Button title={t('upload.camera')} icon="camera" variant="outline" onPress={() => void sendPhoto('camera')} />
        <Button title={t('upload.library')} icon="image" variant="outline" onPress={() => void sendPhoto('library')} />
      </BottomSheet>
    </View>
  );
}

/** Tap mic → records (max 2 min) → send or cancel. */
function VoiceRecorder({ onDone, onCancel }: { onDone: (uri: string, seconds: number) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [ready, setReady] = useState(false);
  const finishing = useRef(false);
  const seconds = Math.round(state.durationMillis / 1000);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!granted) {
        toast.show(t('chat.micDenied'), 'danger');
        onCancel();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelled) return;
      recorder.record();
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (!finishing.current) void recorder.stop().catch(() => undefined);
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
    // Starts once when the recorder opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const duration = Math.max(1, seconds);
    await recorder.stop();
    if (recorder.uri) onDone(recorder.uri, duration);
    else onCancel();
  };

  // Auto-send at the limit
  useEffect(() => {
    if (ready && seconds >= MAX_VOICE_SECONDS) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, seconds]);

  return (
    <View style={styles.bar}>
      <Pressable onPress={onCancel} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('common.cancel')} style={styles.icon}>
        <Feather name="trash-2" size={22} color={Colors.danger} />
      </Pressable>
      <View style={styles.recording} accessibilityLiveRegion="polite">
        <View style={styles.dot} />
        <AppText variant="bodyMedium">{ready ? clock(seconds) : t('chat.preparing')}</AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {t('chat.voiceMax', { count: MAX_VOICE_SECONDS / 60 })}
        </AppText>
      </View>
      <Pressable onPress={() => void finish()} disabled={!ready} accessibilityRole="button" accessibilityLabel={t('chat.send')} style={[styles.send, !ready && styles.off]}>
        <Feather name="send" size={18} color={Colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },
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
  recording: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.xl, backgroundColor: Colors.dangerSoft },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger },
});
