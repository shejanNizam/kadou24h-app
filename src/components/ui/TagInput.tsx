import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { TextField } from './TextField';

/** Type a word + Add (or pick an idea); tap a chip to remove it. Skills, languages… */
export function TagInput({
  label,
  hint,
  values,
  onChange,
  ideas = [],
  max = 30,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  ideas?: string[];
  max?: number;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const add = (value: string) => {
    const v = value.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase()) || values.length >= max) return;
    onChange([...values, v]);
    setText('');
  };
  const missingIdeas = ideas.filter((i) => !values.some((v) => v.toLowerCase() === i.toLowerCase()));
  return (
    <View style={styles.gap}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label={label} hint={hint} value={text} onChangeText={setText} onSubmitEditing={() => add(text)} returnKeyType="done" maxLength={60} />
        </View>
        <Button title={t('tags.add')} size="sm" variant="soft" style={styles.add} onPress={() => add(text)} />
      </View>
      {values.length > 0 && (
        <View style={styles.chips}>
          {values.map((v) => (
            <Pressable key={v} onPress={() => onChange(values.filter((x) => x !== v))} accessibilityRole="button" accessibilityLabel={t('tags.remove', { value: v })} style={styles.tag}>
              <AppText variant="small">{v}</AppText>
              <Feather name="x" size={12} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
      {missingIdeas.length > 0 && (
        <View style={styles.chips}>
          {missingIdeas.map((i) => (
            <Chip key={i} label={`+ ${i}`} onPress={() => add(i)} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Languages people list most in Guinea */
export const LANGUAGE_IDEAS = ['Français', 'Anglais', 'Soussou', 'Pular', 'Malinké', 'Arabe'];

const styles = StyleSheet.create({
  gap: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft },
  add: { marginTop: Spacing.xl },
});
