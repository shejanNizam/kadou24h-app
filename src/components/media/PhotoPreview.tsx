import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Radius } from '@/constants/theme';
import { img } from '@/lib/image';

/** A photo that opens full screen on tap (e.g. the passenger's photo of the pickup spot). */
export function PhotoPreview({ url, label, height = 160, style }: { url: string; label: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel={label} style={[styles.box, { height }, style]}>
        <Image source={img(url, 'card')} style={styles.image} contentFit="cover" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.viewer} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')}>
          <Image source={img(url, 'full')} style={styles.full} contentFit="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  image: { width: '100%', height: '100%' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
});
