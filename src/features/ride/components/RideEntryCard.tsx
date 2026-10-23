import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAppSelector } from '@/store/hooks';

import { useGetMyCurrentRideQuery } from '../api';

/** Home: order a moto-taxi, or get back to the ride in progress. */
export function RideEntryCard() {
  const { t } = useTranslation();
  const requireAuth = useRequireAuth();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: current } = useGetMyCurrentRideQuery(undefined, { skip: !signedIn });

  const open = () => requireAuth(() => (current ? router.push({ pathname: '/ride/[id]', params: { id: current._id } }) : router.push('/ride/new')));

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={current ? t('ride.entry.current') : t('ride.entry.title')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Feather name="navigation" size={22} color={Colors.textOnPrimary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="title">{current ? t('ride.entry.current') : t('ride.entry.title')}</AppText>
        <AppText variant="small" color={Colors.textMuted} numberOfLines={2}>
          {current ? t(`ride.status.${current.status}`) : t('ride.entry.text')}
        </AppText>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  pressed: { opacity: 0.85 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
