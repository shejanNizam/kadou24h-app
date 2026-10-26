import Feather from '@expo/vector-icons/Feather';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ImageUploadBox } from '@/components/media/ImageUploadBox';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSwitchModeMutation } from '@/features/auth/api';
import { homeFor } from '@/features/auth/session';
import { useGetMyRiderQuery, useSaveRiderApplicationMutation, useSubmitRiderApplicationMutation } from '@/features/rider/api';
import { RoutesEditor, routesFrom, routesPayload, type RouteDraft } from '@/features/rider/components/RoutesEditor';
import { RIDER_DOCS, safetyIdsNeeded, VEHICLES_BY_PARTNER, type MyRider, type PartnerType, type RiderDocumentType, type VehicleType } from '@/features/rider/types';
import { APPLICATION_TONE } from '@/features/vendor/status';
import { useGetWalletQuery } from '@/features/wallet/api';
import { PAYOUT_ICON, PayoutMethodForm, payoutAccountLabel } from '@/features/wallet/components/PayoutMethodForm';
import { getApiErrorMessage, isNotFound } from '@/lib/api/errors';
import { userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppMode, UserRole, type FileRef } from '@/types/api';

type Step = 'type' | 'vehicle' | 'identity' | 'routes' | 'payout' | 'review';

/**
 * "Become a delivery partner": moto rider (local deliveries) or bus driver
 * (station → station). Saved as a draft after each step
 * (PUT /riders/me/application), then submitted for the admin's review.
 * The same screen shows the state afterwards: pending, approved, suspended.
 */
export default function RiderApplicationScreen() {
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  const { data: rider, isLoading, isError, error, refetch } = useGetMyRiderQuery(undefined, { skip: !signedIn });
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
      ) : rider?.approvalStatus === 'pending' || rider?.approvalStatus === 'approved' || rider?.approvalStatus === 'suspended' ? (
        <ApplicationState rider={rider} />
      ) : (
        <ApplicationForm rider={rider} />
      )}
    </SafeAreaView>
  );
}

/** After submit: waiting, approved (→ switch to rider mode) or suspended. */
function ApplicationState({ rider }: { rider: MyRider }) {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [switchMode, { isLoading }] = useSwitchModeMutation();
  const status = rider.approvalStatus;
  const canOpen = status === 'approved' && user?.roles.includes(UserRole.rider);

  const openRiderMode = async () => {
    if (!user) return;
    try {
      await switchMode(AppMode.rider).unwrap();
      const updated = { ...user, lastActiveMode: AppMode.rider };
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
        <StackHeader title={t('kyc.riderTitle')} />
      </View>
      <EmptyState
        icon={icon}
        title={t(`kycRider.state.${status}.title`)}
        message={status === 'suspended' && rider.reviewNote ? rider.reviewNote : t(`kycRider.state.${status}.text`)}
        actionLabel={canOpen ? (isLoading ? t('common.loading') : t('kycRider.openRiderMode')) : status === 'suspended' ? t('support.contact') : t('kyc.goHome')}
        onAction={canOpen ? () => void openRiderMode() : status === 'suspended' ? () => router.replace('/support') : () => router.replace('/home')}
      />
    </>
  );
}

function ApplicationForm({ rider }: { rider?: MyRider }) {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState<Step>('type');
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, saveState] = useSaveRiderApplicationMutation();
  const [submit, submitState] = useSubmitRiderApplicationMutation();

  // Step 1 — partner type
  const [partnerType, setPartnerType] = useState<PartnerType | undefined>(rider?.partnerType);
  // Step 2 — vehicle
  const [vehicleType, setVehicleType] = useState<VehicleType | undefined>(rider?.vehicle?.type);
  const [brand, setBrand] = useState(rider?.vehicle?.brand ?? '');
  const [color, setColor] = useState(rider?.vehicle?.color ?? '');
  const [plate, setPlate] = useState(rider?.vehicle?.plateNumber ?? '');
  const [vest, setVest] = useState(rider?.vestNumber ?? '');
  const needs = safetyIdsNeeded(partnerType, vehicleType);
  // Step 3 — identity
  const [cityArea, setCityArea] = useState(rider?.cityArea ?? '');
  const [nationalId, setNationalId] = useState(rider?.nationalIdNumber ?? '');
  const [docs, setDocs] = useState<Partial<Record<RiderDocumentType, FileRef>>>(Object.fromEntries((rider?.documents ?? []).map((d) => [d.type, d.file])));
  // Step 4 — routes (bus drivers)
  const [routes, setRoutes] = useState<RouteDraft[]>(() => routesFrom(rider?.transitRoutes));
  // Step 5 — payout (lives in the rider wallet, created with the first draft)
  const { data: wallet, isFetching: walletLoading } = useGetWalletQuery('rider', { skip: !rider });
  const [payoutSheet, setPayoutSheet] = useState(false);
  const methods = wallet?.payoutMethods ?? [];

  const steps: Step[] = partnerType === 'transit' ? ['type', 'vehicle', 'identity', 'routes', 'payout', 'review'] : ['type', 'vehicle', 'identity', 'payout', 'review'];
  const index = steps.indexOf(step);
  const go = (next: Step) => {
    setFormError(null);
    setErrors({});
    setStep(next);
  };

  const choosePartner = (type: PartnerType) => {
    setPartnerType(type);
    // A bus driver can't keep a bicycle (and the other way round)
    if (vehicleType && !VEHICLES_BY_PARTNER[type].includes(vehicleType)) setVehicleType(undefined);
  };

  /** Saves this step's fields as the draft, then moves on */
  const saveAndNext = async () => {
    const next: Record<string, string> = {};
    let body = {};
    if (step === 'type') {
      if (!partnerType) next.partnerType = t('kycRider.partnerRequired');
      body = { partnerType };
    } else if (step === 'vehicle') {
      if (!vehicleType) next.vehicleType = t('kycRider.vehicleRequired');
      if (needs.plate && !plate.trim()) next.plate = t('kycRider.plateRequired');
      if (needs.vest && !vest.trim()) next.vest = t('kycRider.vestRequired');
      body = {
        vehicle: { type: vehicleType, brand: brand.trim(), color: color.trim(), plateNumber: plate.trim().toUpperCase() },
        vestNumber: vest.trim(),
      };
    } else if (step === 'identity') {
      if (cityArea.trim().length < 2) next.cityArea = t('kycRider.cityRequired');
      if (nationalId.trim().length < 4) next.nationalId = t('kycRider.nationalIdRequired');
      body = {
        cityArea: cityArea.trim(),
        nationalIdNumber: nationalId.trim(),
        documents: RIDER_DOCS.filter((d) => docs[d]).map((type) => ({ type, file: docs[type]! })),
      };
    } else if (step === 'routes') {
      const payload = routesPayload(routes);
      if (payload.error) next.routes = t(`kycRider.${payload.error}`);
      body = { transitRoutes: payload.routes };
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setFormError(null);
    try {
      await save(body).unwrap();
      go(steps[index + 1]);
    } catch (e) {
      setFormError(getApiErrorMessage(e, t));
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


  return (
    <>
      <View style={styles.inner}>
        <StackHeader title={t('kyc.riderTitle')} />
        <AppText variant="caption" color={Colors.textMuted}>
          {t('kyc.step', { current: index + 1, total: steps.length })} · {t(`kycRider.steps.${step}`)}
        </AppText>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((index + 1) / steps.length) * 100}%` }]} />
        </View>
      </View>

      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        {rider && (rider.approvalStatus === 'needs_changes' || rider.approvalStatus === 'rejected') && (
          <View style={styles.note}>
            <StatusPill label={t(`mode.status.${rider.approvalStatus}`)} tone={APPLICATION_TONE[rider.approvalStatus]} />
            <AppText variant="small">{rider.reviewNote ?? t(`mode.status.${rider.approvalStatus}Hint`)}</AppText>
          </View>
        )}
        <Banner tone="danger" message={formError} />

        {step === 'type' && (
          <>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kycRider.typeHint')}
            </AppText>
            {(['moto', 'transit'] as PartnerType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => choosePartner(type)}
                accessibilityRole="radio"
                accessibilityState={{ checked: partnerType === type }}
                style={[styles.option, partnerType === type && styles.optionOn]}>
                <View style={[styles.optionIcon, partnerType === type && styles.optionIconOn]}>
                  <Feather name={type === 'moto' ? 'zap' : 'truck'} size={20} color={partnerType === type ? Colors.textOnPrimary : Colors.primary} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="title">{t(`kycRider.partner.${type}`)}</AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    {t(`kycRider.partnerHint.${type}`)}
                  </AppText>
                </View>
              </Pressable>
            ))}
            <FieldError text={errors.partnerType} />
          </>
        )}

        {step === 'vehicle' && partnerType && (
          <>
            <View style={styles.gap}>
              <AppText variant="label">{t('kycRider.vehicleType')}</AppText>
              <View style={styles.chips}>
                {VEHICLES_BY_PARTNER[partnerType].map((v) => (
                  <Chip key={v} label={t(`vehicle.${v}`)} selected={vehicleType === v} onPress={() => setVehicleType(v)} />
                ))}
              </View>
              <FieldError text={errors.vehicleType} />
            </View>
            <TextField label={t('kycRider.brand')} hint={t('kycRider.brandHint')} optional value={brand} onChangeText={setBrand} maxLength={40} />
            <TextField label={t('kycRider.color')} optional value={color} onChangeText={setColor} maxLength={30} />
            <TextField
              label={t('kycRider.plate')}
              hint={needs.plate ? t('kycRider.safetyHint') : undefined}
              optional={!needs.plate}
              value={plate}
              onChangeText={setPlate}
              error={errors.plate}
              autoCapitalize="characters"
              maxLength={20}
            />
            {partnerType === 'moto' && (
              <TextField
                label={t('kycRider.vest')}
                hint={needs.vest ? t('kycRider.safetyHint') : t('kycRider.vestHint')}
                optional={!needs.vest}
                value={vest}
                onChangeText={setVest}
                error={errors.vest}
                maxLength={20}
              />
            )}
          </>
        )}

        {step === 'identity' && (
          <>
            <TextField label={t('kycRider.cityArea')} hint={t('kycRider.cityAreaHint')} value={cityArea} onChangeText={setCityArea} error={errors.cityArea} maxLength={80} />
            <TextField label={t('kycRider.nationalId')} value={nationalId} onChangeText={setNationalId} error={errors.nationalId} autoCapitalize="characters" maxLength={40} />
            <AppText variant="caption" color={Colors.textMuted} style={styles.privacy}>
              {t('kycRider.idPrivate')}
            </AppText>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kycRider.documentsHint')}
            </AppText>
            {RIDER_DOCS.map((type) => {
              const saved = rider?.documents.find((d) => d.type === type);
              return (
                <View key={type} style={styles.gap}>
                  <View style={styles.row}>
                    <AppText variant="label" style={styles.flex}>
                      {t(`kycRider.doc.${type}`)}{' '}
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
                  <ImageUploadBox value={docs[type]} onChange={(file) => setDocs((d) => ({ ...d, [type]: file }))} title={t(`kycRider.doc.${type}`)} icon="file-text" removable />
                </View>
              );
            })}
          </>
        )}

        {step === 'routes' && (
          <>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kycRider.routesHint')}
            </AppText>
            <RoutesEditor routes={routes} onChange={setRoutes} error={errors.routes} />
          </>
        )}

        {step === 'payout' && (
          <>
            <AppText variant="small" color={Colors.textMuted}>
              {t('kycRider.payoutHint')}
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
            <Button title={methods.length ? t('payout.addAnother') : t('payout.add')} variant={methods.length ? 'outline' : 'primary'} icon="plus" onPress={() => setPayoutSheet(true)} />
          </>
        )}

        {step === 'review' && (
          <>
            <View style={styles.summary}>
              <AppText variant="title">{partnerType ? t(`kycRider.partner.${partnerType}`) : ''}</AppText>
              <SummaryRow
                icon="truck"
                text={[vehicleType && t(`vehicle.${vehicleType}`), brand, color, plate.toUpperCase()].filter(Boolean).join(' · ')}
                onEdit={() => go('vehicle')}
              />
              <SummaryRow icon="map-pin" text={cityArea} onEdit={() => go('identity')} />
              <SummaryRow icon="file-text" text={t('kyc.docsCount', { count: RIDER_DOCS.filter((d) => docs[d]).length })} onEdit={() => go('identity')} />
              {partnerType === 'transit' && (
                <SummaryRow
                  icon="navigation"
                  text={routes
                    .filter((r) => r.from && r.to)
                    .map((r) => `${r.from!.city} → ${r.to!.city}`)
                    .join(', ')}
                  onEdit={() => go('routes')}
                />
              )}
              <SummaryRow icon="credit-card" text={methods.length ? methods.map((m) => t(`payout.type.${m.type}`)).join(', ') : t('kyc.noPayout')} onEdit={() => go('payout')} />
            </View>
            <Banner tone="info" message={t('kycRider.reviewNote')} />
          </>
        )}
      </KeyboardScroll>

      <View style={[styles.inner, styles.footer]}>
        {index > 0 && <Button title={t('common.back')} variant="outline" style={styles.flex} onPress={() => go(steps[index - 1])} />}
        {step === 'payout' ? (
          <Button title={t('common.continue')} style={styles.flex} onPress={() => go('review')} />
        ) : step === 'review' ? (
          <Button title={t('kyc.submit')} style={styles.flex} loading={submitState.isLoading} onPress={() => void onSubmit()} />
        ) : (
          <Button title={t('common.continue')} style={styles.flex} loading={saveState.isLoading} onPress={() => void saveAndNext()} />
        )}
      </View>

      <BottomSheet visible={payoutSheet} title={t('payout.add')} onClose={() => setPayoutSheet(false)}>
        <PayoutMethodForm mode="rider" defaultName={user?.name} onDone={() => setPayoutSheet(false)} />
      </BottomSheet>

    </>
  );
}

function FieldError({ text }: { text?: string }) {
  return text ? (
    <AppText variant="caption" color={Colors.danger}>
      {text}
    </AppText>
  ) : null;
}

function SummaryRow({ icon, text, onEdit }: { icon: 'map-pin' | 'truck' | 'file-text' | 'credit-card' | 'navigation'; text: string; onEdit: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={Colors.textMuted} />
      <AppText variant="small" style={styles.flex} numberOfLines={2}>
        {text || '—'}
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
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  loading: { marginTop: Spacing.huge },
  content: { gap: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },
  progress: { height: 4, borderRadius: 2, backgroundColor: Colors.surface, marginTop: Spacing.sm, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Colors.primary },
  note: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.warningSoft },
  flex: { flex: 1 },
  gap: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  privacy: { marginTop: -Spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  optionOn: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primarySoft },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  optionIconOn: { backgroundColor: Colors.primary },
  method: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  methodIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  summary: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  footer: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md },
});
