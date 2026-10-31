import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { pickImage, uploadImage, UploadError } from '@/lib/upload';
import type { FileRef } from '@/types/api';
import { img } from '@/lib/image';

/**
 * Camera-or-gallery sheet + compress + upload. `choose()` opens the sheet and
 * resolves with the uploaded file (null when cancelled or failed).
 */
export function usePhotoUpload(title: string) {
  const { t } = useTranslation();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const resolver = useRef<((file: FileRef | null) => void) | null>(null);

  const finish = (file: FileRef | null) => {
    resolver.current?.(file);
    resolver.current = null;
  };

  const from = async (source: 'camera' | 'library') => {
    setOpen(false);
    try {
      // This sheet can sit inside another (cash declaration): let it close before the camera opens
      await new Promise((resolve) => setTimeout(resolve, 350));
      const uri = await pickImage(source);
      if (!uri) return finish(null);
      setUploading(true);
      finish(await uploadImage(uri));
    } catch (e) {
      toast.show(e instanceof UploadError && e.message === 'permission' ? t('upload.cameraDenied') : t('upload.failed'), 'danger');
      finish(null);
    } finally {
      setUploading(false);
    }
  };

  const choose = () =>
    new Promise<FileRef | null>((resolve) => {
      resolver.current = resolve;
      setOpen(true);
    });

  const sheet = (
    <BottomSheet
      visible={open}
      title={title}
      onClose={() => {
        setOpen(false);
        finish(null);
      }}>
      <Button title={t('upload.camera')} icon="camera" variant="outline" onPress={() => void from('camera')} />
      <Button title={t('upload.library')} icon="image" variant="outline" onPress={() => void from('library')} />
    </BottomSheet>
  );

  return { choose, uploading, sheet };
}

/** One photo slot (logo, document): tap to add or replace, with an optional remove. */
export function ImageUploadBox({
  value,
  onChange,
  title,
  icon = 'camera',
  height = 120,
  removable,
  style,
}: {
  value?: FileRef;
  onChange: (file: FileRef | undefined) => void;
  title: string;
  icon?: ComponentProps<typeof Feather>['name'];
  height?: number;
  removable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const { choose, uploading, sheet } = usePhotoUpload(title);

  const pick = async () => {
    const file = await choose();
    if (file) onChange(file);
  };

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={() => void pick()}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={value ? `${title} — ${t('upload.change')}` : title}
        style={[styles.box, { height }]}>
        {uploading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : value ? (
          <Image source={img(value.url, 'card')} style={styles.image} contentFit="cover" />
        ) : (
          <>
            <Feather name={icon} size={22} color={Colors.primary} />
            <AppText variant="smallMedium" color={Colors.primary} style={styles.center}>
              {t('upload.add')}
            </AppText>
          </>
        )}
      </Pressable>
      {value && removable && !uploading && <Button title={t('upload.remove')} variant="ghost" size="sm" onPress={() => onChange(undefined)} />}
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  box: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  center: { textAlign: 'center' },
});
