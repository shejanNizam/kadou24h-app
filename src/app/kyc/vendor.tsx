import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppMap } from '@/components/map/AppMap';
import { ImageUploadBox } from '@/components/media/ImageUploadBox';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PhoneField } from '@/components/ui/PhoneField';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import { useSwitchModeMutation } from '@/features/auth/api';
import { homeFor } from '@/features/auth/session';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { APPLICATION_TONE } from '@/features/vendor/status';
import { useGetMyStoreQuery, useSaveApplicationMutation, useSubmitApplicationMutation } from '@/features/vendor/api';
import type { MyStore, VendorDocumentType } from '@/features/vendor/types';
import { useGetWalletQuery } from '@/features/wallet/api';
import { PAYOUT_ICON, PayoutMethodForm, payoutAccountLabel } from '@/features/wallet/components/PayoutMethodForm';
import { useLocalized } from '@/hooks/useLocalized';
import { getApiErrorMessage, isNotFound } from '@/lib/api/errors';
import { isEmail, isValidPhone, toE164 } from '@/lib/format';
import { CONAKRY, getCurrentPosition, reverseGeocode, type LatLng } from '@/lib/location';
import { userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppMode, UserRole, type FileRef } from '@/types/api';
import { img } from '@/lib/image';

const STEPS = ['store', 'location', 'documents', 'payout', 'review'] as const;
type Step = (typeof STEPS)[number];
const DOCS: VendorDocumentType[] = ['business_license', 'national_id'];

/**
 * "Become a vendor": a 5-step application saved as a draft after each step
 * (PUT /vendors/me/application), then submitted for the admin's review.
 * The same screen shows the state afterwards: pending, approved, suspended.
 */
export default function VendorApplicationScreen() {
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: store, isLoading, isError, error, refetch } = useGetMyStoreQuery(undefined, { skip: !signedIn });
  if (!signedIn) return <Redirect href="/login" />;

  // 404 = nothing started yet: an empty form
  const notStarted = isError && isNotFound(error);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isError && !notStarted ? (
        <>
          <View style={styles.inner}>
            <StackHeader />
          </View>
          <ErrorState error={error} onRetry={refetch} />
        </>
      ) : store?.approvalStatus === 'pending' || store?.approvalStatus === 'approved' || store?.approvalStatus === 'suspended' ? (
        <ApplicationState store={store} />
      ) : (
        <ApplicationForm store={store} />
      )}
    </SafeAreaView>
  );
}

/** After submit: waiting, approved (→ switch to vendor mode) or suspended. */
function ApplicationState({ store }: { store: MyStore }) {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [switchMode, { isLoading }] = useSwitchModeMutation();
  const status = store.approvalStatus;

  const openVendorMode = async () => {
    if (!user) return;
    try {
      await switchMode(AppMode.vendor).unwrap();
      const updated = { ...user, lastActiveMode: AppMode.vendor };
      dispatch(userUpdated(updated));
      router.replace(homeFor(updated));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const icon = status === 'approved' ? 'check-circle' : status === 'pending' ? 'clock' : 'slash';
  return (
    <>
      <View style={styles.inner}>
        <StackHeader title={t('kyc.vendorTitle')} />
      </View>
      <EmptyState
        icon={icon}
        title={t(`kyc.state.${status}.title`)}
        message={status === 'suspended' && store.reviewNote ? store.reviewNote : t(`kyc.state.${status}.text`, { store: store.storeName ?? '' })}
        actionLabel={
          status === 'approved' && user?.roles.includes(UserRole.vendor)
            ? isLoading
              ? t('common.loading')
              : t('kyc.openVendorMode')
            : status === 'suspended'
              ? t('support.contact')
              : t('kyc.goHome')
        }
        onAction={
          status === 'approved' && user?.roles.includes(UserRole.vendor)
            ? () => void openVendorMode()
            : status === 'suspended'
              ? () => router.replace('/support')
              : () => router.replace('/home')
        }
      />
    </>
  );
}

function ApplicationForm({ store }: { store?: MyStore }) {
  const { t } = useTranslation();
  const l = useLocalized();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState<Step>('store');
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, saveState] = useSaveApplicationMutation();
  const [submit, submitState] = useSubmitApplicationMutation();
  const { data: categories } = useGetCategoriesQuery('business');
  const storeTypes = categories?.filter((c) => !c.parentId) ?? [];

  // Step 1 — store
  const [logo, setLogo] = useState<FileRef | undefined>(store?.logo);
  const [storeName, setStoreName] = useState(store?.storeName ?? '');
  const [categoryId, setCategoryId] = useState(store?.businessCategoryId ?? '');
  const [marketName, setMarketName] = useState(store?.marketName ?? '');
  const [phone, setPhone] = useState((store?.businessPhone ?? user?.phone ?? '').replace(/^\+224/, ''));
  const [email, setEmail] = useState(store?.businessEmail ?? '');
  // Step 2 — location
  const [pin, setPin] = useState<LatLng>(store?.address?.location ?? CONAKRY);
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | undefined>();
  const [locating, setLocating] = useState(false);
  const [city, setCity] = useState(store?.address?.city ?? '');
  const [addressText, setAddressText] = useState(store?.address?.text ?? '');
  // Step 3 — documents (optional)
  const [docs, setDocs] = useState<Partial<Record<VendorDocumentType, FileRef>>>(
    Object.fromEntries((store?.documents ?? []).map((d) => [d.type, d.file])),
  );
  // Step 4 — payout (lives in the vendor wallet, created with the first draft)
  const { data: wallet, isFetching: walletLoading } = useGetWalletQuery('vendor', { skip: !store });
  const [payoutSheet, setPayoutSheet] = useState(false);
  const methods = wallet?.payoutMethods ?? [];

  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    setFormError(null);
    setErrors({});
    setStep(next);
  };

  const locateMe = async () => {
    setLocating(true);
    const here = await getCurrentPosition();
    setLocating(false);
    if (!here) return toast.show(t('address.locationDenied'), 'info');
    setPin(here);
    setFocus({ ...here, zoom: 17 });
  };

  /** Saves this step's fields as the draft, then moves on */
  const saveAndNext = async () => {
    const next: Record<string, string> = {};
    let body = {};
    if (step === 'store') {
      if (storeName.trim().length < 2) next.storeName = t('kyc.storeNameRequired');
      if (!categoryId) next.categoryId = t('kyc.categoryRequired');
      if (!isValidPhone(toE164(phone))) next.phone = t('validation.phone');
      if (email.trim() && !isEmail(email)) next.email = t('validation.email');
      body = {
        storeName: storeName.trim(),
        businessCategoryId: categoryId,
        marketName: marketName.trim(),
        businessPhone: toE164(phone),
        ...(email.trim() && { businessEmail: email.trim() }),
        ...(logo && { logo }),
      };
    } else if (step === 'location') {
      if (city.trim().length < 2) next.city = t('address.cityRequired');
      body = {
        address: {
          city: city.trim(),
          text: addressText.trim(),
          country: 'GN',
          location: pin,
        },
      };
    } else if (step === 'documents') {
      body = {
        documents: DOCS.filter((d) => docs[d]).map((type) => ({
          type,
          file: docs[type]!,
        })),
      };
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setFormError(null);
    try {
      await save(body).unwrap();
      go(STEPS[index + 1]);
    } catch (e) {
      setFormError(getApiErrorMessage(e, t));
    }
  };

  /** Fill the city from the pin when the user hasn't typed one */
  const confirmPin = async () => {
    if (!city.trim()) {
      const guess = await reverseGeocode(pin);
      if (guess.city) setCity(guess.city);
      if (!addressText.trim()) setAddressText([guess.neighborhood, guess.commune].filter(Boolean).join(', '));
    }
  };

  const onSubmit = async () => {
    setFormError(null);
    try {
      await submit().unwrap();
      toast.show(t('kyc.submitted'), 'success');
    } catch (e) {
      setFormError(getApiErrorMessage(e, t));
    }
  };

  const storeType = storeTypes.find((c) => c._id === categoryId);
  return (
    <>
      <View style={styles.inner}>
        <StackHeader title={t('kyc.vendorTitle')} />
        <AppText variant="caption" color={Colors.textMuted}>
          {t('kyc.step', { current: index + 1, total: STEPS.length })} · {t(`kyc.steps.${step}`)}
        </AppText>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((index + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        {store && (store.approvalStatus === 'needs_changes' || store.approvalStatus === 'rejected') && (
          <View style={styles.note}>
            <StatusPill label={t(`mode.status.${store.approvalStatus}`)} tone={APPLICATION_TONE[store.approvalStatus]} />
            <AppText variant="small">{store.reviewNote ?? t(`mode.status.${store.approvalStatus}Hint`)}</AppText>
          </View>
        )}
        <Banner tone="danger" message={formError} />

        {step === 'store' && (
          <>
            <View style={styles.logoRow}>
              <ImageUploadBox value={logo} onChange={setLogo} title={t('kyc.logo')} icon="image" height={88} style={styles.logo} />
              <View style={styles.flex}>
                <AppText variant="label">{t('kyc.logo')}</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('kyc.logoHint')}
                </AppText>
              </View>
            </View>
            <TextField label={t('kyc.storeName')} value={storeName} onChangeText={setStoreName} error={errors.storeName} maxLength={80} />
            <View style={styles.gap}>
              <AppText variant="label">{t('kyc.category')}</AppText>
              <View style={styles.chips}>
                {storeTypes.map((c) => (
                  <Chip key={c._id} label={l(c.name)} selected={categoryId === c._id} onPress={() => setCategoryId(c._id)} />
                ))}
              </View>
              {errors.categoryId ? (
                <AppText variant="caption" color={Colors.danger}>
                  {errors.categoryId}
                </AppText>
              ) : null}
            </View>
            <TextField label={t('kyc.market')} hint={t('kyc.marketHint')} optional value={marketName} onChangeText={setMarketName} maxLength={80} />
            <PhoneField label={t('kyc.businessPhone')} value={phone} onChangeText={setPhone} error={errors.phone} />
            <AppText variant="caption" color={Colors.textMuted} style={styles.privacy}>
              {t('kyc.phonePrivate')}
            </AppText>
            <TextField
              label={t('kyc.businessEmail')}
              optional
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}

        {step === 'location' && (
          <>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kyc.locationHint')}
            </AppText>
            <View>
              <AppMap
                initialCenter={pin}
                initialZoom={store?.address?.location ? 17 : 13}
                onCenterChange={setPin}
                focus={focus}
                style={styles.map}
                accessibilityLabel={t('kyc.steps.location')}
              />
              <Pressable
                onPress={() => void locateMe()}
                accessibilityRole="button"
                accessibilityLabel={t('address.useMyLocation')}
                style={styles.locate}>
                {locating ? <ActivityIndicator color={Colors.primary} /> : <Feather name="crosshair" size={18} color={Colors.primary} />}
                <AppText variant="smallMedium" color={Colors.primary}>
                  {t('address.useMyLocation')}
                </AppText>
              </Pressable>
            </View>
            <Button title={t('kyc.fillFromPin')} variant="ghost" size="sm" icon="map-pin" onPress={() => void confirmPin()} />
            <TextField label={t('address.city')} value={city} onChangeText={setCity} error={errors.city} maxLength={60} />
            <TextField
              label={t('kyc.addressText')}
              hint={t('kyc.addressTextHint')}
              optional
              value={addressText}
              onChangeText={setAddressText}
              maxLength={200}
            />
          </>
        )}

        {step === 'documents' && (
          <>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kyc.documentsHint')}
            </AppText>
            {DOCS.map((type) => {
              const saved = store?.documents.find((d) => d.type === type);
              return (
                <View key={type} style={styles.gap}>
                  <View style={styles.row}>
                    <AppText variant="label" style={styles.flex}>
                      {t(`kyc.doc.${type}`)}{' '}
                      <AppText variant="caption" color={Colors.textSubtle}>
                        ({t('common.optional')})
                      </AppText>
                    </AppText>
                    {saved?.status === 'rejected' && <StatusPill label={t('kyc.docRejected')} tone="red" />}
                  </View>
                  {saved?.status === 'rejected' && saved.note ? (
                    <AppText variant="caption" color={Colors.danger}>
                      {saved.note}
                    </AppText>
                  ) : null}
                  <ImageUploadBox
                    value={docs[type]}
                    onChange={(file) => setDocs((d) => ({ ...d, [type]: file }))}
                    title={t(`kyc.doc.${type}`)}
                    icon="file-text"
                    removable
                  />
                </View>
              );
            })}
          </>
        )}

        {step === 'payout' && (
          <>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kyc.payoutHint')}
            </AppText>
            {walletLoading && !wallet ? <ActivityIndicator color={Colors.primary} /> : null}
            {methods.map((m) => (
              <View key={m._id} style={styles.method}>
                <View style={styles.methodIcon}>
                  <Feather name={PAYOUT_ICON[m.type]} size={18} color={Colors.primary} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyMedium">{t(`payout.type.${m.type}`)}</AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    {m.accountName} · {payoutAccountLabel(m)}
                  </AppText>
                </View>
                {m.isDefault && <StatusPill label={t('payout.default')} tone="purple" />}
              </View>
            ))}
            <Button
              title={methods.length ? t('payout.addAnother') : t('payout.add')}
              variant={methods.length ? 'outline' : 'primary'}
              icon="plus"
              onPress={() => setPayoutSheet(true)}
            />
          </>
        )}

        {step === 'review' && (
          <>
            <View style={styles.summary}>
              <View style={styles.row}>
                {logo ? <Image source={img(logo.url, 'thumb')} style={styles.summaryLogo} contentFit="cover" /> : null}
                <View style={styles.flex}>
                  <AppText variant="title">{storeName}</AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    {[storeType && l(storeType.name), marketName].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
              </View>
              <SummaryRow icon="map-pin" text={[addressText, city].filter(Boolean).join(', ')} onEdit={() => go('location')} />
              <SummaryRow icon="phone" text={toE164(phone)} onEdit={() => go('store')} />
              <SummaryRow
                icon="file-text"
                text={t('kyc.docsCount', {
                  count: DOCS.filter((d) => docs[d]).length,
                })}
                onEdit={() => go('documents')}
              />
              <SummaryRow
                icon="credit-card"
                text={methods.length ? methods.map((m) => t(`payout.type.${m.type}`)).join(', ') : t('kyc.noPayout')}
                onEdit={() => go('payout')}
              />
            </View>
            <Banner tone="info" message={t('kyc.reviewNote')} />
          </>
        )}
      </KeyboardScroll>

      <View style={[styles.inner, styles.footer]}>
        {index > 0 && <Button title={t('common.back')} variant="outline" style={styles.flex} onPress={() => go(STEPS[index - 1])} />}
        {step === 'payout' ? (
          <Button title={t('common.continue')} style={styles.flex} disabled={methods.length === 0} onPress={() => go('review')} />
        ) : step === 'review' ? (
          <Button title={t('kyc.submit')} style={styles.flex} loading={submitState.isLoading} onPress={() => void onSubmit()} />
        ) : (
          <Button title={t('common.continue')} style={styles.flex} loading={saveState.isLoading} onPress={() => void saveAndNext()} />
        )}
      </View>

      <BottomSheet visible={payoutSheet} title={t('payout.add')} onClose={() => setPayoutSheet(false)}>
        <PayoutMethodForm mode="vendor" defaultName={user?.name} onDone={() => setPayoutSheet(false)} />
      </BottomSheet>
    </>
  );
}

function SummaryRow({ icon, text, onEdit }: { icon: 'map-pin' | 'phone' | 'file-text' | 'credit-card'; text: string; onEdit: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={Colors.textMuted} />
      <AppText variant="small" style={styles.flex} numberOfLines={2}>
        {text}
      </AppText>
      <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.edit')}>
        <AppText variant="smallMedium" color={Colors.primary}>
          {t('common.edit')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loading: { marginTop: Spacing.huge },
  content: {
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  progress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: Colors.primary },
  note: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.warningSoft,
  },
  flex: { flex: 1 },
  gap: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  logo: { width: 88 },
  privacy: { marginTop: -Spacing.sm },
  map: { height: 260 },
  locate: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
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
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLogo: { width: 48, height: 48, borderRadius: Radius.md },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
