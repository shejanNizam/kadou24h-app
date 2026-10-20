import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
import { ImageUploadBox } from '@/components/media/ImageUploadBox';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { PhoneField } from '@/components/ui/PhoneField';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import { useGetMyStoreQuery, useUpdateStoreMutation } from '@/features/vendor/api';
import type { MyStore } from '@/features/vendor/types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { isEmail, isValidPhone, toE164 } from '@/lib/format';
import { CONAKRY, getCurrentPosition, type LatLng } from '@/lib/location';
import type { FileRef } from '@/types/api';

/** Business details of an approved store. The store type and documents need a new review, so they're not here. */
export default function StoreDetailsScreen() {
  const { data, isLoading, isError, error, refetch } = useGetMyStoreQuery();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isError || !data ? (
        <>
          <View style={styles.inner}>
            <StackHeader />
          </View>
          <ErrorState error={error} onRetry={refetch} />
        </>
      ) : (
        <StoreForm store={data} />
      )}
    </SafeAreaView>
  );
}

function StoreForm({ store }: { store: MyStore }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [update, { isLoading }] = useUpdateStoreMutation();
  const [logo, setLogo] = useState<FileRef | undefined>(store.logo);
  const [storeName, setStoreName] = useState(store.storeName ?? '');
  const [marketName, setMarketName] = useState(store.marketName ?? '');
  const [phone, setPhone] = useState((store.businessPhone ?? '').replace(/^\+224/, ''));
  const [email, setEmail] = useState(store.businessEmail ?? '');
  const [city, setCity] = useState(store.address?.city ?? '');
  const [text, setText] = useState(store.address?.text ?? '');
  const [pin, setPin] = useState<LatLng>(store.address?.location ?? CONAKRY);
  const [moved, setMoved] = useState(false);
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | undefined>();
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const locateMe = async () => {
    setLocating(true);
    const here = await getCurrentPosition();
    setLocating(false);
    if (!here) return toast.show(t('address.locationDenied'), 'info');
    setPin(here);
    setMoved(true);
    setFocus({ ...here, zoom: 17 });
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (storeName.trim().length < 2) next.storeName = t('kyc.storeNameRequired');
    if (!isValidPhone(toE164(phone))) next.phone = t('validation.phone');
    if (email.trim() && !isEmail(email)) next.email = t('validation.email');
    if (city.trim().length < 2) next.city = t('address.cityRequired');
    setErrors(next);
    if (Object.keys(next).length) return;

    setFormError(null);
    try {
      await update({
        storeName: storeName.trim(),
        marketName: marketName.trim(),
        businessPhone: toE164(phone),
        ...(email.trim() && { businessEmail: email.trim() }),
        ...(logo && { logo }),
        address: { city: city.trim(), text: text.trim(), ...(moved && { location: pin }) },
      }).unwrap();
      toast.show(t('account.saved'), 'success');
      router.back();
    } catch (e) {
      setFormError(getApiErrorMessage(e, t));
    }
  };

  return (
    <>
      <View style={styles.inner}>
        <StackHeader title={t('store.business')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <Banner tone="danger" message={formError} />
        <View style={styles.row}>
          <ImageUploadBox value={logo} onChange={setLogo} title={t('kyc.logo')} icon="image" height={88} style={styles.logo} />
          <AppText variant="caption" color={Colors.textMuted} style={styles.flex}>
            {t('kyc.logoHint')}
          </AppText>
        </View>
        <TextField label={t('kyc.storeName')} value={storeName} onChangeText={setStoreName} error={errors.storeName} maxLength={80} />
        <TextField label={t('kyc.market')} optional value={marketName} onChangeText={setMarketName} maxLength={80} />
        <PhoneField label={t('kyc.businessPhone')} value={phone} onChangeText={setPhone} error={errors.phone} />
        <AppText variant="caption" color={Colors.textMuted} style={styles.privacy}>
          {t('kyc.phonePrivate')}
        </AppText>
        <TextField label={t('kyc.businessEmail')} optional value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" />

        <AppText variant="title">{t('kyc.steps.location')}</AppText>
        <View>
          <AppMap
            initialCenter={pin}
            initialZoom={16}
            onCenterChange={(c) => {
              setPin(c);
              setMoved(true);
            }}
            focus={focus}
            style={styles.map}
            accessibilityLabel={t('kyc.steps.location')}
          />
          <Pressable onPress={() => void locateMe()} accessibilityRole="button" accessibilityLabel={t('address.useMyLocation')} style={styles.locate}>
            {locating ? <ActivityIndicator color={Colors.primary} /> : <Feather name="crosshair" size={18} color={Colors.primary} />}
          </Pressable>
        </View>
        <TextField label={t('address.city')} value={city} onChangeText={setCity} error={errors.city} maxLength={60} />
        <TextField label={t('kyc.addressText')} optional value={text} onChangeText={setText} maxLength={200} />
        <Banner tone="info" message={t('store.reviewFields')} />
      </KeyboardScroll>
      <View style={[styles.inner, styles.footer]}>
        <Button title={t('common.save')} loading={isLoading} onPress={() => void save()} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { marginTop: Spacing.huge },
  content: { gap: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  flex: { flex: 1 },
  logo: { width: 88 },
  privacy: { marginTop: -Spacing.sm },
  map: { height: 220 },
  locate: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    width: MinTouch,
    height: MinTouch,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingVertical: Spacing.md },
});
