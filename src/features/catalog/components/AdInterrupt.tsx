import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import { StorageKeys, storage } from '@/lib/storage';

import { useGetAdsQuery, useRecordAdClickMutation, useRecordAdImpressionMutation } from '../api';
import type { AdPlacement, Advertisement } from '../types';
import { img } from '@/lib/image';

/** Seconds before an interstitial can be closed. */
const INTERSTITIAL_LOCK = 3;
/** Let the screen settle before an ad covers it. */
const SHOW_DELAY_MS = 1500;

// At most one popup / interstitial per app session, whatever the screen
let shownThisSession = false;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

async function takeUnseen(ads: Advertisement[]): Promise<Advertisement | null> {
  let seen: Record<string, string> = {};
  try {
    seen = JSON.parse((await storage.get(StorageKeys.adsSeen)) ?? '{}') as Record<string, string>;
  } catch {
    seen = {};
  }
  const day = today();
  const ad = ads.find((a) => seen[a._id] !== day);
  if (!ad) return null;
  // Keep only today's entries so the record never grows
  const kept = Object.fromEntries(Object.entries(seen).filter(([, d]) => d === day));
  await storage.set(StorageKeys.adsSeen, JSON.stringify({ ...kept, [ad._id]: day }));
  return ad;
}

/**
 * Popup / interstitial ads of a placement. Never more than one per app session, and the
 * same ad at most once a day, so it never gets in the way of shopping.
 */
export function AdInterrupt({ placement }: { placement: AdPlacement }) {
  const { data } = useGetAdsQuery(placement);
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [impression] = useRecordAdImpressionMutation();

  // Only while this screen is in front: leaving it cancels the pending ad
  useFocusEffect(
    useCallback(() => {
      const candidates = data?.filter((a) => (a.type === 'popup' || a.type === 'interstitial') && a.images.length > 0) ?? [];
      if (shownThisSession || candidates.length === 0) return;
      let cancelled = false;
      const timer = setTimeout(() => {
        void takeUnseen(candidates).then((next) => {
          if (cancelled || !next || shownThisSession) return;
          shownThisSession = true;
          setAd(next);
          void impression(next._id);
        });
      }, SHOW_DELAY_MS);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [data, impression]),
  );

  if (!ad) return null;
  const close = () => setAd(null);
  return ad.type === 'interstitial' ? <Interstitial ad={ad} onClose={close} /> : <Popup ad={ad} onClose={close} />;
}

function useOpenAd(ad: Advertisement, onClose: () => void) {
  const [click] = useRecordAdClickMutation();
  return () => {
    if (!ad.linkUrl) return;
    void click(ad._id);
    onClose();
    void WebBrowser.openBrowserAsync(ad.linkUrl);
  };
}

function Popup({ ad, onClose }: { ad: Advertisement; onClose: () => void }) {
  const { t } = useTranslation();
  const open = useOpenAd(ad, onClose);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.card} accessibilityViewIsModal>
          <Pressable onPress={open} disabled={!ad.linkUrl} accessibilityRole={ad.linkUrl ? 'link' : 'image'} accessibilityLabel={ad.description ?? ad.name}>
            <Image source={img(ad.images[0], 'full')} style={styles.popupImage} contentFit="cover" transition={200} />
          </Pressable>
          <AdTag />
          <CloseButton onPress={onClose} />
          {(ad.description || ad.linkUrl) && (
            <View style={styles.body}>
              {ad.description ? (
                <AppText variant="body" numberOfLines={3}>
                  {ad.description}
                </AppText>
              ) : null}
              {ad.linkUrl ? <Button title={t('ads.learnMore')} onPress={open} /> : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Interstitial({ ad, onClose }: { ad: Advertisement; onClose: () => void }) {
  const { t } = useTranslation();
  const open = useOpenAd(ad, onClose);
  const [left, setLeft] = useState(INTERSTITIAL_LOCK);
  useEffect(() => {
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  const locked = left > 0;

  return (
    <Modal visible animationType="fade" onRequestClose={() => {
      if (!locked) onClose();
    }} statusBarTranslucent>
      <SafeAreaView style={styles.full} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.fullTop}>
          <AdTag inline />
          {locked ? (
            <View style={[styles.close, styles.closeDark]} accessibilityLabel={t('ads.closeIn', { count: left })}>
              <AppText variant="smallMedium" color={Colors.textOnPrimary}>
                {left}
              </AppText>
            </View>
          ) : (
            <CloseButton onPress={onClose} dark />
          )}
        </View>
        <Pressable
          style={styles.fullImageWrap}
          onPress={open}
          disabled={!ad.linkUrl}
          accessibilityRole={ad.linkUrl ? 'link' : 'image'}
          accessibilityLabel={ad.description ?? ad.name}>
          <Image source={img(ad.images[0], 'full')} style={styles.fullImage} contentFit="contain" transition={200} />
        </Pressable>
        {(ad.description || ad.linkUrl) && (
          <View style={styles.fullBottom}>
            {ad.description ? (
              <AppText variant="body" color={Colors.textOnPrimary} numberOfLines={3} style={styles.center}>
                {ad.description}
              </AppText>
            ) : null}
            {ad.linkUrl ? <Button title={t('ads.learnMore')} onPress={open} /> : null}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function AdTag({ inline }: { inline?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.tag, !inline && styles.tagFloating]}>
      <AppText variant="caption" color={Colors.textOnPrimary}>
        {t('ads.sponsored')}
      </AppText>
    </View>
  );
}

function CloseButton({ onPress, dark }: { onPress: () => void; dark?: boolean }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.close, dark ? styles.closeDark : styles.closeFloating]}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}>
      <Feather name="x" size={20} color={dark ? Colors.textOnPrimary : Colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: { width: '100%', maxWidth: 380, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.background },
  popupImage: { width: '100%', aspectRatio: 4 / 5 },
  body: { gap: Spacing.md, padding: Spacing.lg },
  tag: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.55)' },
  tagFloating: { position: 'absolute', top: Spacing.md, left: Spacing.md },
  close: { width: MinTouch, height: MinTouch, borderRadius: MinTouch / 2, alignItems: 'center', justifyContent: 'center' },
  closeFloating: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.92)' },
  closeDark: { backgroundColor: 'rgba(255,255,255,0.18)' },
  full: { flex: 1, backgroundColor: '#000' },
  fullTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  fullImageWrap: { flex: 1 },
  fullImage: { width: '100%', height: '100%' },
  fullBottom: { gap: Spacing.md, padding: Spacing.xl },
  center: { textAlign: 'center' },
});
