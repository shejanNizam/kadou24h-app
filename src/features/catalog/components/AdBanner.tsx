import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';

import { useGetAdsQuery, useRecordAdClickMutation, useRecordAdImpressionMutation } from '../api';
import type { AdPlacement } from '../types';

/** First active banner for a placement; counts one impression per mount. Nothing if none. */
export function AdBanner({ placement }: { placement: AdPlacement }) {
  const { data } = useGetAdsQuery(placement);
  const ad = data?.find((a) => a.type === 'banner' && a.images.length > 0);
  const [impression] = useRecordAdImpressionMutation();
  const [click] = useRecordAdClickMutation();
  const counted = useRef<string | null>(null);

  useEffect(() => {
    if (ad && counted.current !== ad._id) {
      counted.current = ad._id;
      void impression(ad._id);
    }
  }, [ad, impression]);

  if (!ad) return null;

  const open = () => {
    void click(ad._id);
    if (ad.linkUrl) void WebBrowser.openBrowserAsync(ad.linkUrl);
  };

  return (
    <Pressable
      onPress={open}
      disabled={!ad.linkUrl}
      accessibilityRole={ad.linkUrl ? 'link' : 'image'}
      accessibilityLabel={ad.description ?? ad.name}
      style={styles.banner}>
      <Image source={ad.images[0]} style={styles.image} contentFit="cover" transition={200} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: Radius.lg, overflow: 'hidden', aspectRatio: 2.4 },
  image: { width: '100%', height: '100%' },
});
