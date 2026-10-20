import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSocketEvent } from '@/hooks/useSocketEvent';

interface Incoming {
  type?: string;
  mode?: string;
  data?: { subOrderId?: string; subOrderNumber?: string };
}

/**
 * In vendor mode, a new order slides in at the top (the push also rings when
 * the app is closed). Tap to open it; it hides by itself after a while.
 */
export function NewOrderAlert() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<{ id: string; number?: string } | null>(null);

  useSocketEvent<Incoming>('new_notification', (n) => {
    if (n.type === 'order_placed' && n.mode === 'vendor' && n.data?.subOrderId) {
      setOrder({ id: n.data.subOrderId, number: n.data.subOrderNumber });
    }
  });

  useEffect(() => {
    if (!order) return;
    const timer = setTimeout(() => setOrder(null), 12_000);
    return () => clearTimeout(timer);
  }, [order]);

  if (!order) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          setOrder(null);
          router.push({ pathname: '/vendor/order/[id]', params: { id: order.id } });
        }}
        accessibilityRole="button"
        accessibilityLiveRegion="assertive"
        style={styles.banner}>
        <View style={styles.icon}>
          <Feather name="bell" size={18} color={Colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" color={Colors.textOnPrimary}>
            {t('vendorOrders.newAlert')}
          </AppText>
          <AppText variant="small" color={Colors.textOnPrimary}>
            {order.number ? `#${order.number} · ` : ''}
            {t('vendorOrders.newAlertOpen')}
          </AppText>
        </View>
        <Pressable onPress={() => setOrder(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Feather name="x" size={18} color={Colors.textOnPrimary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.lg, zIndex: 50 },
  banner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
