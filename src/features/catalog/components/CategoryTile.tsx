import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useLocalized } from '@/hooks/useLocalized';

import type { Category } from '../types';

/** Square image + name; opens that category's products. */
export function CategoryTile({ category, size = 72 }: { category: Category; size?: number }) {
  const l = useLocalized();
  const name = l(category.name);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: category._id, name } })}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [styles.tile, { width: size + 8 }, pressed && styles.pressed]}>
      <View style={[styles.imageBox, { width: size, height: size }]}>
        {category.image?.url ? (
          <Image source={category.image.url} style={styles.image} contentFit="contain" />
        ) : (
          <Feather name="grid" size={24} color={Colors.primary} />
        )}
      </View>
      <AppText variant="caption" align="center" numberOfLines={2}>
        {name}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', gap: Spacing.xs },
  pressed: { opacity: 0.8 },
  imageBox: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: Spacing.sm,
  },
  image: { width: '100%', height: '100%' },
});
