import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useGetChatUnreadQuery } from '@/features/chat/api';
import { useAppSelector } from '@/store/hooks';
import type { AppMode } from '@/types/api';

type IconName = ComponentProps<typeof Feather>['name'];

/** Shared look of the 3 bottom tab bars (Figma: icon + label, purple when active). */
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.textMuted,
  tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
  tabBarStyle: { borderTopColor: Colors.border, backgroundColor: Colors.background, minHeight: 60 },
} as const;

/** `dot`: a small red dot on the icon (Profile: something waits in another of my modes) */
export const tabIcon = (name: IconName, dot = false) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    if (!dot) return <Feather name={name} size={size - 2} color={color as string} />;
    return (
      <View>
        <Feather name={name} size={size - 2} color={color as string} />
        <View style={styles.dot} />
      </View>
    );
  };

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
});

/** Unread chat messages for this mode → Chat tab badge (hidden at 0). */
export function useChatBadge(mode: AppMode) {
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data } = useGetChatUnreadQuery(mode, { skip: !signedIn });
  const count = data?.unreadCount ?? 0;
  return count > 0 ? (count > 99 ? '99+' : count) : undefined;
}
