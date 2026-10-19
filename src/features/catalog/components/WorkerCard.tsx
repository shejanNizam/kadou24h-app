import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Rating } from '@/components/ui/Rating';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatGNF } from '@/lib/format';

import type { Worker } from '../types';

/** Photo, name, profession, GNF/h, rating. No discount badge, no phone (chat only). */
export function WorkerCard({ worker, width }: { worker: Worker; width: number }) {
  const { t } = useTranslation();
  const photo = worker.photo?.url ?? worker.userId.avatar?.url;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/worker/[id]', params: { id: worker._id } })}
      accessibilityRole="button"
      accessibilityLabel={`${worker.userId.name}, ${worker.profession ?? ''}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}>
      <View style={styles.photoBox}>
        {photo ? (
          <Image source={photo} style={styles.photo} contentFit="cover" />
        ) : (
          <Feather name="user" size={36} color={Colors.primary} />
        )}
      </View>
      <View style={styles.row}>
        <AppText variant="smallMedium" numberOfLines={1} style={styles.flex}>
          {worker.userId.name}
        </AppText>
        {worker.hourlyRate ? (
          <AppText variant="caption" color={Colors.primary}>
            {t('catalog.perHour', { amount: formatGNF(worker.hourlyRate) })}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
        {worker.profession}
      </AppText>
      <Rating value={worker.ratingAvg} count={worker.ratingCount} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: 3,
  },
  pressed: { opacity: 0.85 },
  photoBox: {
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  photo: { width: '100%', height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
});
