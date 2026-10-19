import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppText } from '@/components/ui/AppText';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Show the back arrow (sub-screens like OTP, forgot password). */
  back?: boolean;
  onBack?: () => void;
}

/**
 * Figma auth frame: purple gradient + logo on top, white rounded sheet below.
 * The whole thing scrolls so the keyboard never hides the button.
 */
export function AuthLayout({ title, subtitle, children, back, onBack }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <LinearGradient colors={Colors.gradient} style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={[styles.hero, { paddingTop: insets.top + Spacing.lg }]}>
            {back && (
              <Pressable
                onPress={goBack}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                style={[styles.back, { top: insets.top + Spacing.sm }]}>
                <Feather name="arrow-left" size={24} color={Colors.textOnPrimary} />
              </Pressable>
            )}
            <BrandLogo size={back ? 72 : 96} />
          </View>

          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xxl }]}>
            <View style={styles.sheetInner}>
              <View style={styles.heading}>
                <AppText variant="h2" accessibilityRole="header">
                  {title}
                </AppText>
                {subtitle && (
                  <AppText variant="body" color={Colors.textMuted}>
                    {subtitle}
                  </AppText>
                )}
              </View>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    flexGrow: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xxxl,
  },
  back: { position: 'absolute', left: Spacing.xl, padding: Spacing.xs },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  sheetInner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.lg },
  heading: { gap: Spacing.xs },
});
