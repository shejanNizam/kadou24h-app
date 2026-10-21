import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import type { FileRef } from '@/types/api';
import { img } from '@/lib/image';

/** Swipeable photos with page dots (product page). */
export function ImageGallery({ images, height = 320 }: { images: FileRef[]; height?: number }) {
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen, MaxContentWidth);
  const [index, setIndex] = useState(0);

  return (
    <View style={[styles.box, { height }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={64}>
        {images.map((image, i) => (
          <Image
            key={image.url + i}
            source={img(image.url, 'full')}
            style={{ width, height }}
            contentFit="contain"
            transition={150}
            accessibilityLabel={`${i + 1}/${images.length}`}
          />
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((img, i) => (
            <View key={img.url + i} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: Colors.surface },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.border },
  dotOn: { width: 18, backgroundColor: Colors.primary },
});
