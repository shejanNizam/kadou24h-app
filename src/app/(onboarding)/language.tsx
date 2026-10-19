import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { Spacing } from '@/constants/theme';
import { useUpdateMeMutation } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import i18n from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { languageChosen } from '@/store/prefsSlice';
import { Language } from '@/types/api';

/** First launch (then → sign in), or opened from settings with ?from=settings. */
export default function LanguageScreen() {
  const { t } = useTranslation();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.prefs.language);
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const [updateMe] = useUpdateMeMutation();
  const [selected, setSelected] = useState<Language>(current);

  // Preview the choice right away so the person reads the screen in that language
  const choose = (lang: Language) => {
    setSelected(lang);
    void i18n.changeLanguage(lang);
  };

  const confirm = () => {
    dispatch(languageChosen(selected));
    // Notifications, SMS and emails from the server follow the account language
    if (signedIn) void updateMe({ language: selected });
    if (from === 'settings' && router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <AuthLayout title={t('language.title')} subtitle={t('language.subtitle')} back={from === 'settings'}>
      <View style={styles.options} accessibilityRole="radiogroup">
        <OptionCard
          icon="globe"
          title={t('language.fr')}
          description={t('language.frHint')}
          selected={selected === Language.fr}
          onPress={() => choose(Language.fr)}
        />
        <OptionCard
          icon="globe"
          title={t('language.en')}
          description={t('language.enHint')}
          selected={selected === Language.en}
          onPress={() => choose(Language.en)}
        />
      </View>
      <Button title={t('common.next')} onPress={confirm} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  options: { gap: Spacing.md },
});
