import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { img } from '@/lib/image';
import type { FileRef } from '@/types/api';

import { usePhotoUpload } from './ImageUploadBox';

/** A row of uploaded photos with remove buttons and an "add" tile (up to `max`). */
export function PhotoStrip({
  value,
  onChange,
  max,
  title,
  size = 76,
}: {
  value: FileRef[];
  onChange: (files: FileRef[]) => void;
  max: number;
  title: string;
  size?: number;
}) {
  const { t } = useTranslation();
  const { choose, uploading, sheet } = usePhotoUpload(title);

  const add = async () => {
    const file = await choose();
    if (file) onChange([...value, file].slice(0, max));
  };

  return (
    <View style={styles.row}>
      {value.map((photo, i) => (
        <View key={photo.url} style={[styles.tile, { width: size, height: size }]}>
          <Image source={img(photo.url, 'thumb')} style={styles.image} contentFit="cover" />
          <Pressable
            onPress={() => onChange(value.filter((_, j) => j !== i))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.remove')}
            style={styles.remove}>
            <Feather name="x" size={12} color={Colors.textOnPrimary} />
          </Pressable>
        </View>
      ))}
      {value.length < max && (
        <Pressable
          onPress={() => void add()}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={title}
          style={[styles.tile, styles.add, { width: size, height: size }]}>
          {uploading ? <ActivityIndicator color={Colors.primary} /> : <Feather name="camera" size={22} color={Colors.primary} />}
        </Pressable>
      )}
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
