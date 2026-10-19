import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Scroll + keyboard handling (forms, long content). Lists use their own FlatList. */
  scroll?: boolean;
  padded?: boolean;
  background?: string;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}

/** Safe-area page with the readable max width (tablets / web preview). */
export function Screen({
  children,
  scroll,
  padded = true,
  background = Colors.background,
  edges = ['top', 'left', 'right'],
  contentStyle,
  footer,
}: ScreenProps) {
  const inner = [styles.content, padded && styles.padded, contentStyle];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, inner]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, inner]}>{children}</View>
        )}
        {footer && <View style={[styles.footer, padded && styles.padded]}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: Spacing.xl },
  footer: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingVertical: Spacing.md },
});
