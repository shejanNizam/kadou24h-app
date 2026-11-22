import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useSwitchModeMutation } from '@/features/auth/api';
import { homeFor } from '@/features/auth/session';
import { useGetMyRiderQuery } from '@/features/rider/api';
import { APPLICATION_TONE } from '@/features/vendor/status';
import { getApiErrorMessage } from '@/lib/api/errors';
import { userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { AppMode, UserRole, type ApplicationStatus } from '@/types/api';

import { hasAlert, useModeAlerts, type ModeAlert } from '../modeAlerts';

/**
 * Top of every profile: switch to another mode I hold, or see / start my
 * vendor and rider applications (status from GET /user/me).
 * A mode I'm not in shows a red dot and what waits there (client 2026-11-22).
 */
export function ModeCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [switchMode, { isLoading }] = useSwitchModeMutation();
  const { alerts } = useModeAlerts();
  const isRider = Boolean(user?.roles.includes(UserRole.rider));
  const { data: myRider } = useGetMyRiderQuery(undefined, { skip: !isRider });
  if (!user) return null;

  const current = user.lastActiveMode;
  /** What waits in a mode I'm not in: the work first, then messages, then notifications */
  const waiting = (mode: AppMode, alert?: ModeAlert) => {
    if (mode === current || !alert || !hasAlert(alert)) return undefined;
    if (alert.pending > 0) return t(`mode.alert.${mode === AppMode.vendor ? 'vendorPending' : 'riderPending'}`, { count: alert.pending });
    if (alert.messages > 0) return t('mode.alert.messages', { count: alert.messages });
    return t('mode.alert.notifications');
  };
  const go = async (mode: AppMode) => {
    if (mode === current) return;
    try {
      await switchMode(mode).unwrap();
      const updated = { ...user, lastActiveMode: mode };
      dispatch(userUpdated(updated));
      router.replace(homeFor(updated));
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  const rows: {
    key: string;
    icon: 'shopping-cart' | 'shopping-bag' | 'truck';
    title: string;
    hint: string;
    status?: ApplicationStatus;
    onPress?: () => void;
    active?: boolean;
    /** Red dot + what waits there */
    alert?: string;
    /** Online rider in another mode: still gets requests */
    online?: boolean;
  }[] = [];

  rows.push({ key: 'customer', icon: 'shopping-cart', title: t('profile.modeCustomer'), hint: t('mode.customerHint'), active: current === AppMode.customer, alert: waiting(AppMode.customer, alerts?.customer), onPress: () => void go(AppMode.customer) });

  const vendor = user.applications?.vendor;
  if (user.roles.includes(UserRole.vendor)) {
    rows.push({ key: 'vendor', icon: 'shopping-bag', title: t('profile.modeVendor'), hint: t('mode.vendorHint'), active: current === AppMode.vendor, alert: waiting(AppMode.vendor, alerts?.vendor), onPress: () => void go(AppMode.vendor) });
  } else {
    rows.push({
      key: 'vendor',
      icon: 'shopping-bag',
      title: vendor ? t('mode.vendorApplication') : t('mode.becomeVendor'),
      hint: vendor?.status === 'needs_changes' || vendor?.status === 'rejected' ? (vendor.reviewNote ?? t(`mode.status.${vendor.status}Hint`)) : vendor ? t(`mode.status.${vendor.status}Hint`) : t('mode.becomeVendorHint'),
      status: vendor?.status,
      onPress: vendor?.status === 'suspended' ? undefined : () => router.push('/kyc/vendor'),
    });
  }

  const rider = user.applications?.rider;
  if (user.roles.includes(UserRole.rider)) {
    rows.push({ key: 'rider', icon: 'truck', title: t('profile.modeRider'), hint: t('mode.riderHint'), active: current === AppMode.rider, alert: waiting(AppMode.rider, alerts?.rider), online: current !== AppMode.rider && Boolean(myRider?.isOnline), onPress: () => void go(AppMode.rider) });
  } else {
    rows.push({
      key: 'rider',
      icon: 'truck',
      title: rider ? t('mode.riderApplication') : t('mode.becomeRider'),
      hint: rider?.status === 'needs_changes' || rider?.status === 'rejected' ? (rider.reviewNote ?? t(`mode.status.${rider.status}Hint`)) : rider ? t(`mode.status.${rider.status}Hint`) : t('mode.becomeRiderHint'),
      status: rider?.status,
      onPress: rider?.status === 'suspended' ? undefined : () => router.push('/kyc/rider'),
    });
  }

  return (
    <View style={styles.card} accessibilityRole="radiogroup">
      {rows.map((r, i) => (
        <Pressable
          key={r.key}
          onPress={r.onPress}
          disabled={!r.onPress || isLoading}
          accessibilityRole={r.active !== undefined ? 'radio' : 'button'}
          accessibilityState={{ checked: r.active }}
          style={({ pressed }) => [styles.row, i < rows.length - 1 && styles.divider, r.active && styles.active, pressed && styles.pressed]}>
          <View style={[styles.icon, r.active && styles.iconActive]}>
            <Feather name={r.icon} size={18} color={r.active ? Colors.textOnPrimary : Colors.primary} />
            {r.alert ? <View style={styles.dot} accessibilityElementsHidden importantForAccessibility="no" /> : null}
          </View>
          <View style={styles.flex}>
            <AppText variant="title" numberOfLines={1}>
              {r.title}
            </AppText>
            {r.alert ? (
              <AppText variant="smallMedium" color={Colors.danger} numberOfLines={2}>
                {r.alert}
              </AppText>
            ) : r.online ? (
              <AppText variant="caption" color={Colors.success} numberOfLines={2}>
                {t('mode.alert.riderOnline')}
              </AppText>
            ) : (
              <AppText variant="caption" color={Colors.textMuted} numberOfLines={2}>
                {r.hint}
              </AppText>
            )}
          </View>
          {r.status ? (
            <StatusPill label={t(`mode.status.${r.status}`)} tone={APPLICATION_TONE[r.status]} />
          ) : r.active ? (
            <AppText variant="caption" color={Colors.primary}>
              {t('mode.current')}
            </AppText>
          ) : r.onPress ? (
            <Feather name="chevron-right" size={18} color={Colors.textSubtle} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primaryBorder, overflow: 'hidden', backgroundColor: Colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  active: { backgroundColor: Colors.primarySoft },
  pressed: { opacity: 0.85 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: Colors.primary },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  flex: { flex: 1 },
});
