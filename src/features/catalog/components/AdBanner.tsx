import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { useGetAdsQuery, useRecordAdClickMutation, useRecordAdImpressionMutation } from '../api';
import type { AdPlacement, Advertisement } from '../types';
import { img } from '@/lib/image';

const AUTO_ADVANCE_MS = 5000;
const MAX_BANNERS = 5;

/**
 * Active banners of a placement: one, or a swipeable carousel that moves on by itself.
 * Each banner counts one impression the first time it is seen. Nothing if none.
 */
export function AdBanner({ placement }: { placement: AdPlacement }) {
  const { data } = useGetAdsQuery(placement);
  const ads = (data ?? []).filter((a) => a.type === 'banner' && a.images.length > 0).slice(0, MAX_BANNERS);
  const [impression] = useRecordAdImpressionMutation();
  const counted = useRef(new Set<string>());
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const current = ads[Math.min(index, ads.length - 1)];

  useEffect(() => {
    if (current && !counted.current.has(current._id)) {
      counted.current.add(current._id);
      void impression(current._id);
    }
  }, [current, impression]);

  const count = ads.length;
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  // Restarts after each swipe, so it never jumps right after the user moved it
  useEffect(() => {
    if (count < 2 || width === 0) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % count;
      scroller.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, width, index]);

  if (count === 0) return null;
  if (count === 1) return <Slide ad={ads[0]} />;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.carousel}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.banner}>
        {ads.map((ad) => (
          <View key={ad._id} style={{ width }}>
            <Slide ad={ad} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots} importantForAccessibility="no-hide-descendants">
        {ads.map((ad, i) => (
          <View key={ad._id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function Slide({ ad }: { ad: Advertisement }) {
  const [click] = useRecordAdClickMutation();
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
      <Image source={img(ad.images[0], 'full')} style={styles.image} contentFit="cover" transition={200} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carousel: { gap: Spacing.sm },
  banner: { borderRadius: Radius.lg, overflow: 'hidden', aspectRatio: 2.4 },
  image: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 16, backgroundColor: Colors.primary },
});
