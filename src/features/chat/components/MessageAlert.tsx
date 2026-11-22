import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLocalized } from '@/hooks/useLocalized';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { getActiveChat } from '@/lib/push';

import type { LocalizedText } from '../../catalog/types';

interface Incoming {
  type?: string;
  title?: LocalizedText;
  body?: LocalizedText;
  data?: { conversationId?: string };
}

/**
 * A new chat message while the app is open (client 2026-11-22: "I am at home" went unseen):
 * it slides in at the top on every screen and in every mode, unless that chat is on screen.
 * Tap to open the chat; it hides by itself. When the app is closed, the phone push rings instead.
 */
export function MessageAlert() {
  const { t } = useTranslation();
  const l = useLocalized();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<{ conversationId: string; title: string; body: string } | null>(null);

  useSocketEvent<Incoming>('new_notification', (n) => {
    const conversationId = n.data?.conversationId;
    if (n.type !== 'new_message' || !conversationId || conversationId === getActiveChat()) return;
    setMessage({ conversationId: String(conversationId), title: n.title ? l(n.title) : t('chat.newMessage'), body: n.body ? l(n.body) : '' });
  });

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6_000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
      <View style={styles.banner}>
        <Pressable
          onPress={() => {
            setMessage(null);
            router.push({ pathname: '/chat/[id]', params: { id: message.conversationId } });
          }}
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          style={styles.open}>
          <View style={styles.icon}>
            <Feather name="message-circle" size={18} color={Colors.primary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="title" color={Colors.textOnPrimary} numberOfLines={1}>
              {message.title}
            </AppText>
            {message.body ? (
              <AppText variant="small" color={Colors.textOnPrimary} numberOfLines={2}>
                {message.body}
              </AppText>
            ) : null}
          </View>
        </Pressable>
        <Pressable onPress={() => setMessage(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Feather name="x" size={18} color={Colors.textOnPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.lg, zIndex: 60 },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  banner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
