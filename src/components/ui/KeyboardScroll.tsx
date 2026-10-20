import type { ComponentProps } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/**
 * ScrollView for every screen with text fields: when a field gets focus it
 * scrolls so the field (and a little space under it) sits above the keyboard.
 * Plain `ScrollView` + `KeyboardAvoidingView` no longer works on Android
 * (edge-to-edge: the window does not shrink for the keyboard).
 */
export function KeyboardScroll({ bottomOffset = 48, ...props }: ComponentProps<typeof KeyboardAwareScrollView>) {
  return <KeyboardAwareScrollView bottomOffset={bottomOffset} keyboardShouldPersistTaps="handled" {...props} />;
}
