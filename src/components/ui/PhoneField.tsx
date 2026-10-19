import { forwardRef } from 'react';
import type { TextInputInstance } from 'react-native';

import { config } from '@/lib/config';
import { formatNationalPhone } from '@/lib/format';

import { TextField, type TextFieldProps } from './TextField';

/**
 * Guinean phone input: fixed "+224" prefix, digits grouped as "620 12 34 56".
 * The value stays the national digits; convert with toE164() before sending.
 */
export const PhoneField = forwardRef<TextInputInstance, Omit<TextFieldProps, 'prefix' | 'keyboardType'>>(
  function PhoneField({ value, onChangeText, ...props }, ref) {
    return (
      <TextField
        ref={ref}
        icon="phone"
        prefix={config.defaultCountryCode}
        keyboardType="phone-pad"
        inputMode="tel"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="6XX XX XX XX"
        maxLength={12}
        value={formatNationalPhone(value ?? '')}
        onChangeText={(text) => onChangeText?.(text.replace(/\D/g, '').slice(0, 9))}
        {...props}
      />
    );
  },
);
