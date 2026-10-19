import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type IconName = ComponentProps<typeof Feather>['name'];

/** Shared look of the 3 bottom tab bars (Figma: icon + label, purple when active). */
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.textMuted,
  tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
  tabBarStyle: { borderTopColor: Colors.border, backgroundColor: Colors.background, minHeight: 60 },
} as const;

export const tabIcon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Feather name={name} size={size - 2} color={color as string} />;
  };
