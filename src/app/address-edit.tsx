import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { AppMap } from '@/components/map/AppMap';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { PhoneField } from '@/components/ui/PhoneField';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import {
  useCreateAddressMutation,
  useGetAddressesQuery,
  useUpdateAddressMutation,
  type Address,
  type AddressLabel,
} from '@/features/address/api';
import { getApiErrorMessage, getFieldErrors } from '@/lib/api/errors';
import { isValidPhone, toE164 } from '@/lib/format';
import { zodResolver } from '@/lib/form';
import { CONAKRY, getCurrentPosition, reverseGeocode, type LatLng } from '@/lib/location';
import { pickImage, uploadImage } from '@/lib/upload';
import { useAppSelector } from '@/store/hooks';
import type { FileRef } from '@/types/api';

const LABELS: AddressLabel[] = ['home', 'office', 'other'];

const schema = (t: TFunction) =>
  z.object({
    label: z.enum(['home', 'office', 'other']),
    customLabel: z.string().trim().max(30),
    fullName: z.string().trim().min(2, t('validation.nameShort')).max(50),
    phone: z.string().refine((v) => isValidPhone(toE164(v)), { message: t('validation.phone') }),
    region: z.string().trim().max(60),
    city: z.string().trim().min(2, t('address.cityRequired')).max(60),
    commune: z.string().trim().max(60),
    neighborhood: z.string().trim().max(80),
    landmark: z.string().trim().max(200),
    directions: z.string().trim().max(500),
    isDefault: z.boolean(),
  });
type Form = z.infer<ReturnType<typeof schema>>;

/**
 * Add / edit an address in 2 steps: 1) put the pin where the parcel must
 * arrive (GPS or drag the map), 2) details: area, landmark, gate photo.
 */
export default function EditAddressScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isLoading, isError, error, refetch } = useGetAddressesQuery();
  const existing = id ? data?.find((a) => a._id === id) : undefined;

  if (id && isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      </SafeAreaView>
    );
  }
  if (id && (isError || !existing)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <StackHeader />
        </View>
        <ErrorState error={error ?? { status: 404 }} onRetry={refetch} />
      </SafeAreaView>
    );
  }
  return <AddressEditor existing={existing} isFirst={(data?.length ?? 0) === 0} />;
}

function AddressEditor({ existing, isFirst }: { existing?: Address; isFirst: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState<'pin' | 'details'>(existing ? 'details' : 'pin');
  const [pin, setPin] = useState<LatLng>(existing?.location ?? CONAKRY);
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | undefined>();
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [photo, setPhoto] = useState<FileRef | undefined>(existing?.placePhoto);
  const [uploading, setUploading] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [create, createState] = useCreateAddressMutation();
  const [update, updateState] = useUpdateAddressMutation();

  const { control, handleSubmit, setValue, getValues, setError } = useForm<Form>({
    resolver: zodResolver(schema(t)),
    defaultValues: {
      label: existing?.label ?? 'home',
      customLabel: existing?.customLabel ?? '',
      fullName: existing?.fullName ?? user?.name ?? '',
      phone: (existing?.phone ?? user?.phone ?? '').replace(/^\+224/, ''),
      region: existing?.region ?? '',
      city: existing?.city ?? '',
      commune: existing?.commune ?? '',
      neighborhood: existing?.neighborhood ?? '',
      landmark: existing?.landmark ?? '',
      directions: existing?.directions ?? '',
      isDefault: existing?.isDefault ?? isFirst,
    },
  });
  const label = useWatch({ control, name: 'label' });

  const locateMe = async () => {
    setLocating(true);
    const here = await getCurrentPosition();
    setLocating(false);
    if (!here) return toast.show(t('address.locationDenied'), 'info');
    setPin(here);
    setFocus({ ...here, zoom: 17 });
  };

  const confirmPin = async () => {
    setGeocoding(true);
    const guess = await reverseGeocode(pin);
    setGeocoding(false);
    // Only fill what the user hasn't typed
    (['region', 'city', 'commune', 'neighborhood'] as const).forEach((key) => {
      if (guess[key] && !getValues(key)) setValue(key, guess[key]);
    });
    setStep('details');
  };

  const addPhoto = async (source: 'camera' | 'library') => {
    setPhotoSheet(false);
    try {
      const uri = await pickImage(source);
      if (!uri) return;
      setUploading(true);
      setPhoto(await uploadImage(uri));
    } catch {
      toast.show(t('upload.failed'), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const body = {
      ...values,
      customLabel: values.label === 'other' ? values.customLabel || undefined : undefined,
      phone: toE164(values.phone),
      region: values.region || undefined,
      commune: values.commune || undefined,
      neighborhood: values.neighborhood || undefined,
      landmark: values.landmark || undefined,
      directions: values.directions || undefined,
      location: pin,
      placePhoto: photo,
    };
    try {
      if (existing) await update({ id: existing._id, ...body }).unwrap();
      else await create(body).unwrap();
      toast.show(t('address.saved'));
      router.back();
    } catch (e) {
      const fields = getFieldErrors(e);
      Object.entries(fields).forEach(([key, message]) => {
        if (key in values) setError(key as keyof Form, { message });
      });
      setFormError(getApiErrorMessage(e, t));
    }
  });

  if (step === 'pin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.inner}>
          <StackHeader title={t('address.pinTitle')} />
          <AppText variant="small" color={Colors.textMuted}>
            {t('address.pinHint')}
          </AppText>
        </View>
        <View style={[styles.inner, styles.mapWrap]}>
          <AppMap
            initialCenter={pin}
            initialZoom={existing ? 17 : 13}
            onCenterChange={setPin}
            focus={focus}
            style={styles.map}
            accessibilityLabel={t('address.pinTitle')}
          />
          <Pressable
            onPress={() => void locateMe()}
            accessibilityRole="button"
            accessibilityLabel={t('address.useMyLocation')}
            style={styles.locate}>
            {locating ? <ActivityIndicator color={Colors.primary} /> : <Feather name="crosshair" size={20} color={Colors.primary} />}
            <AppText variant="smallMedium" color={Colors.primary}>
              {t('address.useMyLocation')}
            </AppText>
          </Pressable>
        </View>
        <View style={[styles.inner, styles.footer]}>
          <Button title={t('address.confirmPin')} loading={geocoding} onPress={() => void confirmPin()} />
        </View>
      </SafeAreaView>
    );
  }

  const saving = createState.isLoading || updateState.isLoading;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={existing ? t('address.editTitle') : t('address.newTitle')} />
      </View>
      <ScrollView contentContainerStyle={[styles.inner, styles.form]} keyboardShouldPersistTaps="handled">
        {/* Pin preview: key = new map when the pin moves */}
        <View>
          <AppMap
            key={`${pin.lat},${pin.lng}`}
            initialCenter={pin}
            initialZoom={16}
            markers={[{ id: 'pin', kind: 'customer', ...pin }]}
            style={styles.preview}
            accessibilityLabel={t('address.pinTitle')}
          />
          <Pressable onPress={() => setStep('pin')} accessibilityRole="button" style={styles.movePin}>
            <Feather name="move" size={14} color={Colors.primary} />
            <AppText variant="smallMedium" color={Colors.primary}>
              {t('address.movePin')}
            </AppText>
          </Pressable>
        </View>

        <Banner tone="danger" message={formError} />

        <View style={styles.chips}>
          {LABELS.map((l) => (
            <Chip key={l} label={t(`address.label.${l}`)} selected={label === l} onPress={() => setValue('label', l)} />
          ))}
        </View>
        {label === 'other' && (
          <Controller
            control={control}
            name="customLabel"
            render={({ field, fieldState }) => (
              <TextField label={t('address.customLabel')} placeholder={t('address.customLabelHint')} maxLength={30} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
            )}
          />
        )}

        <Field control={control} name="city" label={t('address.city')} />
        <Field control={control} name="commune" label={t('address.commune')} optional />
        <Field control={control} name="neighborhood" label={t('address.neighborhood')} optional />
        <Field control={control} name="landmark" label={t('address.landmark')} hint={t('address.landmarkHint')} optional multiline />
        <Field control={control} name="directions" label={t('address.directions')} hint={t('address.directionsHint')} optional multiline />

        <View style={styles.gap}>
          <AppText variant="label">
            {t('address.gatePhoto')}{' '}
            <AppText variant="caption" color={Colors.textSubtle}>
              ({t('common.optional')})
            </AppText>
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {t('address.gatePhotoHint')}
          </AppText>
          <Pressable
            onPress={() => setPhotoSheet(true)}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel={photo ? t('address.changePhoto') : t('address.addPhoto')}
            style={styles.photoBox}>
            {uploading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : photo ? (
              <Image source={photo.url} style={styles.photo} contentFit="cover" />
            ) : (
              <>
                <Feather name="camera" size={22} color={Colors.primary} />
                <AppText variant="smallMedium" color={Colors.primary}>
                  {t('address.addPhoto')}
                </AppText>
              </>
            )}
          </Pressable>
          {photo && !uploading && (
            <Button title={t('address.removePhoto')} variant="ghost" size="sm" onPress={() => setPhoto(undefined)} />
          )}
        </View>

        <AppText variant="title">{t('address.receiver')}</AppText>
        <Field control={control} name="fullName" label={t('address.fullName')} />
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <PhoneField label={t('address.phone')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
          )}
        />

        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => (
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <AppText variant="bodyMedium">{t('address.makeDefault')}</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('address.defaultHint')}
                </AppText>
              </View>
              <Switch
                value={field.value}
                onValueChange={field.onChange}
                disabled={existing?.isDefault || isFirst}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                accessibilityLabel={t('address.makeDefault')}
              />
            </View>
          )}
        />
      </ScrollView>
      <View style={[styles.inner, styles.footer]}>
        <Button title={t('common.save')} loading={saving} disabled={uploading} onPress={() => void onSubmit()} />
      </View>

      <BottomSheet visible={photoSheet} title={t('address.gatePhoto')} onClose={() => setPhotoSheet(false)}>
        <Button title={t('upload.camera')} icon="camera" variant="outline" onPress={() => void addPhoto('camera')} />
        <Button title={t('upload.library')} icon="image" variant="outline" onPress={() => void addPhoto('library')} />
      </BottomSheet>
    </SafeAreaView>
  );
}

function Field({
  control,
  name,
  label,
  hint,
  optional,
  multiline,
}: {
  control: ReturnType<typeof useForm<Form>>['control'];
  name: 'city' | 'commune' | 'neighborhood' | 'landmark' | 'directions' | 'fullName';
  label: string;
  hint?: string;
  optional?: boolean;
  multiline?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          hint={hint}
          optional={optional}
          multiline={multiline}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          style={multiline ? styles.multiline : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { marginTop: Spacing.huge },
  flex: { flex: 1 },
  gap: { gap: Spacing.sm },
  mapWrap: { flex: 1, paddingVertical: Spacing.md },
  map: { flex: 1, minHeight: 280 },
  locate: {
    position: 'absolute',
    right: Spacing.xl + Spacing.md,
    bottom: Spacing.md + Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: MinTouch,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  footer: { paddingVertical: Spacing.md },
  form: { gap: Spacing.lg, paddingBottom: Spacing.xxl },
  preview: { height: 150 },
  movePin: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  photoBox: {
    height: 120,
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
  photo: { width: '100%', height: '100%' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
