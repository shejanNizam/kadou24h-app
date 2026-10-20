import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import {
  MAX_ADDRESSES,
  useDeleteAddressMutation,
  useGetAddressesQuery,
  useSetDefaultAddressMutation,
  type Address,
} from '@/features/address/api';
import { AddressCard } from '@/features/address/components/AddressCard';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAppSelector } from '@/store/hooks';

/**
 * Saved addresses. With ?select=1 (from Home "Livrer à" or checkout) a tap
 * makes that address the default (= where we deliver) and goes back.
 */
export default function AddressesScreen() {
  const { t } = useTranslation();
  const signedIn = useAppSelector((s) => s.auth.status === 'signedIn');
  if (!signedIn) return <SignInPrompt title={t('address.title')} message={t('guest.address')} />;
  return <Addresses />;
}

function Addresses() {
  const { t } = useTranslation();
  const toast = useToast();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const selecting = select === '1';
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAddressesQuery();
  const [setDefault, defaultState] = useSetDefaultAddressMutation();
  const [remove, removeState] = useDeleteAddressMutation();
  const [menuFor, setMenuFor] = useState<Address | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Address | null>(null);

  const list = data ?? [];
  const full = list.length >= MAX_ADDRESSES;
  const fail = (e: unknown) => toast.show(getApiErrorMessage(e, t), 'danger');

  const choose = async (a: Address) => {
    try {
      if (!a.isDefault) await setDefault(a._id).unwrap();
      if (selecting) router.back();
      else toast.show(t('address.defaultSet'));
    } catch (e) {
      fail(e);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete._id).unwrap();
      setConfirmDelete(null);
      toast.show(t('address.deleted'));
    } catch (e) {
      fail(e);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={selecting ? t('address.deliverTo') : t('address.title')} />
      </View>

      {isLoading ? (
        <View style={[styles.inner, styles.list]}>
          <Skeleton height={96} radius={Radius.lg} />
          <Skeleton height={96} radius={Radius.lg} />
        </View>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="map-pin"
          title={t('address.emptyTitle')}
          message={t('address.emptyText')}
          actionLabel={t('address.add')}
          onAction={() => router.push('/address-edit')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.inner, styles.list]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />}>
          {selecting && (
            <AppText variant="small" color={Colors.textMuted}>
              {t('address.selectHint')}
            </AppText>
          )}
          {list.map((a) => (
            <AddressCard
              key={a._id}
              address={a}
              selected={selecting && a.isDefault}
              onPress={defaultState.isLoading ? undefined : () => void choose(a)}
              right={
                <Pressable
                  onPress={() => setMenuFor(a)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('address.options')}
                  style={styles.more}>
                  <Feather name="more-vertical" size={20} color={Colors.textMuted} />
                </Pressable>
              }
            />
          ))}
          {full && (
            <AppText variant="caption" color={Colors.textMuted} align="center">
              {t('address.max', { count: MAX_ADDRESSES })}
            </AppText>
          )}
        </ScrollView>
      )}

      {list.length > 0 && (
        <View style={[styles.inner, styles.footer]}>
          <Button title={t('address.add')} icon="plus" variant="outline" disabled={full} onPress={() => router.push('/address-edit')} />
        </View>
      )}

      <BottomSheet visible={Boolean(menuFor)} title={t('address.options')} onClose={() => setMenuFor(null)}>
        {menuFor && !menuFor.isDefault && (
          <MenuRow
            icon="check-circle"
            label={t('address.makeDefault')}
            onPress={() => {
              const a = menuFor;
              setMenuFor(null);
              void choose(a);
            }}
          />
        )}
        <MenuRow
          icon="edit-2"
          label={t('common.edit')}
          onPress={() => {
            const id = menuFor?._id;
            setMenuFor(null);
            if (id) router.push({ pathname: '/address-edit', params: { id } });
          }}
        />
        <MenuRow
          icon="trash-2"
          danger
          label={t('common.delete')}
          onPress={() => {
            setConfirmDelete(menuFor);
            setMenuFor(null);
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        visible={Boolean(confirmDelete)}
        icon="trash-2"
        destructive
        title={t('address.deleteTitle')}
        message={confirmDelete?.isDefault ? t('address.deleteDefaultMessage') : t('address.deleteMessage')}
        confirmLabel={t('common.delete')}
        loading={removeState.isLoading}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(null)}
      />
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress, danger }: { icon: 'edit-2' | 'trash-2' | 'check-circle'; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <Feather name={icon} size={20} color={danger ? Colors.danger : Colors.text} />
      <AppText variant="bodyMedium" color={danger ? Colors.danger : Colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingBottom: Spacing.xxl },
  more: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: Spacing.md },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: MinTouch + 4 },
  pressed: { opacity: 0.7 },
});
