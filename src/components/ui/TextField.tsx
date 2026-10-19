import Feather from '@expo/vector-icons/Feather';
import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  icon?: ComponentProps<typeof Feather>['name'];
  /** Fixed text before the input, e.g. "+224" */
  prefix?: string;
  /** Adds the show/hide eye for passwords */
  password?: boolean;
  right?: ReactNode;
}

/** Labelled input from the Figma: rounded border, leading icon, error below. */
export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, optional, error, hint, icon, prefix, password, right, style, onFocus, onBlur, ...props },
  ref,
) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? Colors.danger : focused ? Colors.primary : Colors.border;

  return (
    <View style={styles.wrapper}>
      {label && (
        <AppText variant="label" style={styles.label}>
          {label}
          {optional && (
            <AppText variant="small" color={Colors.textSubtle}>
              {`  (${t('common.optional')})`}
            </AppText>
          )}
        </AppText>
      )}
      <View style={[styles.field, { borderColor }]}>
        {icon && <Feather name={icon} size={18} color={focused ? Colors.primary : Colors.textMuted} />}
        {prefix && (
          <View style={styles.prefix}>
            <AppText variant="bodyMedium">{prefix}</AppText>
          </View>
        )}
        <TextInput
          ref={ref}
          placeholderTextColor={Colors.textSubtle}
          secureTextEntry={password && hidden}
          autoCapitalize={password ? 'none' : props.autoCapitalize}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          style={[styles.input, style]}
          {...props}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('common.showPassword') : t('common.hidePassword')}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={Colors.textMuted} />
          </Pressable>
        )}
        {right}
      </View>
      {error ? (
        <AppText variant="small" color={Colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color={Colors.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs + 2 },
  label: { marginLeft: Spacing.xxs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
  },
  prefix: {
    paddingRight: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.text,
    // Web: no browser focus ring inside our own border
    outlineStyle: 'none',
  } as object,
});
