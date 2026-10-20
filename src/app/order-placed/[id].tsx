import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGetOrderQuery } from '@/features/orders/api';
import { formatGNF } from '@/lib/format';

/** "Commande passée" — order number, what happens next, Track / Continue shopping. */
export default function OrderPlacedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data } = useGetOrderQuery(id);
  const order = data?.order;
  const stores = data?.subOrders.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.circle}>
          <Feather name="check" size={48} color={Colors.textOnPrimary} />
        </View>
        <AppText variant="h1" align="center">
          {t('orderPlaced.title')}
        </AppText>
        {order ? (
          <>
            <AppText variant="bodyMedium" color={Colors.textMuted} align="center">
              {t('orderPlaced.number', { number: order.orderNumber })} · {formatGNF(order.total)}
            </AppText>
            <AppText variant="body" color={Colors.textMuted} align="center">
              {stores > 1 ? t('orderPlaced.nextMulti', { count: stores }) : t('orderPlaced.next')}
            </AppText>
            {order.paymentMethod === 'cod' && <Banner tone="info" message={t('orderPlaced.cod')} />}
          </>
        ) : (
          <Skeleton width={200} height={20} />
        )}
      </View>
      <View style={styles.footer}>
        <Button title={t('orderPlaced.track')} icon="map" onPress={() => router.replace({ pathname: '/order/[id]', params: { id } })} />
        <Button title={t('orderPlaced.continue')} variant="ghost" onPress={() => router.replace('/home')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  circle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  footer: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.sm },
});
