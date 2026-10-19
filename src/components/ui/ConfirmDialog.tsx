import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Red confirm button for destructive actions (delete account, cancel order, sign out). */
  destructive?: boolean;
  icon?: ComponentProps<typeof Feather>['name'];
  loading?: boolean;
}

/**
 * Smooth confirmation modal with spring animation, soft backdrop overlay,
 * and elegant elevated card.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
  icon = 'alert-circle',
  loading,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.92));
  const [translateYAnim] = useState(() => new Animated.Value(12));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.92);
      translateYAnim.setValue(12);
    }
  }, [visible, opacityAnim, scaleAnim, translateYAnim]);

  if (!visible) return null;

  const tint = destructive ? Colors.danger : Colors.primary;
  const iconBg = destructive ? Colors.dangerSoft : Colors.primarySoft;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel ?? t('common.cancel')} />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
          ]}
          accessibilityViewIsModal
          accessibilityRole="alert">
          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
              <Feather name={icon} size={22} color={tint} />
            </View>
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel ?? t('common.cancel')}>
              <Feather name="x" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <AppText variant="h3">{title}</AppText>
            {message ? (
              <AppText variant="body" color={Colors.textMuted} style={styles.message}>
                {message}
              </AppText>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
            />
            <Button
              title={cancelLabel ?? t('common.cancel')}
              variant="outline"
              onPress={onCancel}
              disabled={loading}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  content: {
    gap: Spacing.xs,
  },
  message: {
    lineHeight: 20,
  },
  actions: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
});
