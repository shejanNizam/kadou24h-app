import Feather from '@expo/vector-icons/Feather';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

type Tone = 'success' | 'danger' | 'info';
interface ToastState {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<{ show: (message: string, tone?: Tone) => void }>({ show: () => {} });

/** Short confirmation at the top of the screen ("Code sent", "Saved"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Tone = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast, opacity]);

  const value = useMemo(() => ({ show }), [show]);
  const icon = toast?.tone === 'danger' ? 'alert-circle' : toast?.tone === 'info' ? 'info' : 'check-circle';

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <View pointerEvents="none" style={[styles.host, { top: insets.top + Spacing.sm }]}>
          <Animated.View
            style={[styles.toast, { opacity }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite">
            <Feather
              name={icon}
              size={18}
              color={toast.tone === 'danger' ? Colors.danger : toast.tone === 'info' ? Colors.info : Colors.success}
            />
            <AppText variant="smallMedium" style={styles.text}>
              {toast.message}
            </AppText>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  host: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, alignItems: 'center' },
  toast: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flex: 1 },
});
