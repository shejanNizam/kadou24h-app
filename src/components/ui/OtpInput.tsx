import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Fires once all digits are typed (or pasted / auto-filled from SMS). */
  onComplete?: (code: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
}

/**
 * One hidden input drawn as boxes: paste, SMS auto-fill and backspace all work
 * the same on Android, iOS and web.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  error,
  autoFocus = true,
  accessibilityLabel,
}: OtpInputProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityRole="none">
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const isActive = focused && (i === value.length || (i === length - 1 && value.length === length));
          return (
            <View
              key={i}
              style={[
                styles.box,
                value[i] !== undefined && styles.filled,
                isActive && styles.active,
                error && styles.error,
              ]}>
              <AppText variant="h3">{value[i] ?? ''}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  box: {
    flex: 1,
    maxWidth: 52,
    aspectRatio: 0.9,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySoft },
  active: { borderColor: Colors.primary, borderWidth: 2 },
  error: { borderColor: Colors.danger },
  // Covers the boxes so taps and long-press paste reach the real input
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.011,
    color: 'transparent',
    fontFamily: Fonts.regular,
  },
});
