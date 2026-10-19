import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, MinTouch, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

/** Back arrow + title (+ actions) for pushed screens. Falls back to Home on web deep links. */
export function StackHeader({ title, right, transparent }: { title?: string; right?: ReactNode; transparent?: boolean }) {
  const { t } = useTranslation();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  return (
    <View style={[styles.row, transparent && styles.transparent]}>
      <Pressable
        onPress={back}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={[styles.icon, transparent && styles.iconOnImage]}>
        <Feather name="arrow-left" size={22} color={Colors.text} />
      </Pressable>
      <AppText variant="title" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title ?? ''}
      </AppText>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

/** Round icon button for headers (favorite, share, cart…). */
export function HeaderIconButton({
  icon,
  onPress,
  label,
  badge,
  color = Colors.text,
  filled,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  label: string;
  badge?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label} (${badge})` : label}
      style={[styles.icon, filled && styles.iconOnImage]}>
      <Feather name={icon} size={22} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="caption" color={Colors.textOnPrimary} style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, minHeight: 56 },
  transparent: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, paddingHorizontal: Spacing.lg },
  title: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  icon: { width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center', borderRadius: MinTouch / 2 },
  iconOnImage: { backgroundColor: 'rgba(255,255,255,0.92)' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
