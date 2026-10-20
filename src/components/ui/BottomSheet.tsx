import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { KeyboardScroll } from './KeyboardScroll';

/** Sheet from the bottom: title, ✕, scrollable body, fixed footer (actions). */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
  onShow,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  onShow?: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={onShow}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.header}>
            <AppText variant="h3" style={styles.flex} accessibilityRole="header">
              {title}
            </AppText>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Feather name="x" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>
          <KeyboardScroll contentContainerStyle={styles.content} bottomOffset={Spacing.lg} showsVerticalScrollIndicator={false}>
            {children}
          </KeyboardScroll>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.lg },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
});
