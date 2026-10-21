import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useUpdateMeMutation } from '@/features/auth/api';
import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useDeleteAccountMutation } from '@/features/profile/api';
import { MenuRow, MenuSection } from '@/features/profile/components/Menu';
import { getApiErrorMessage } from '@/lib/api/errors';
import { pickImage, uploadImage } from '@/lib/upload';
import { signedOut, userUpdated } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { img } from '@/lib/image';

/** Photo, name, phone (OTP), password, delete account. */
export default function AccountScreen() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return <SignInPrompt title={t('account.title')} message={t('guest.profile')} />;
  return <Account />;
}

function Account() {
  const { t } = useTranslation();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const [updateMe, updateState] = useUpdateMeMutation();
  const [deleteAccount, deleteState] = useDeleteAccountMutation();
  const [name, setName] = useState(user.name);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const nameChanged = name.trim() !== user.name && name.trim().length >= 2;

  const save = async (patch: Parameters<typeof updateMe>[0]) => {
    try {
      const updated = await updateMe(patch).unwrap();
      dispatch(userUpdated({ ...user, ...updated }));
      toast.show(t('account.saved'));
      return true;
    } catch (e) {
      toast.show(getApiErrorMessage(e, t), 'danger');
      return false;
    }
  };

  const changePhoto = async (source: 'camera' | 'library') => {
    setPhotoSheet(false);
    try {
      const uri = await pickImage(source);
      if (!uri) return;
      setUploading(true);
      const file = await uploadImage(uri);
      await save({ avatar: { url: file.url, publicId: file.publicId ?? '' } });
    } catch {
      toast.show(t('upload.failed'), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await deleteAccount().unwrap();
      setConfirmDelete(false);
      dispatch(signedOut());
      router.replace('/home');
    } catch (e) {
      setConfirmDelete(false);
      setDeleteError(getApiErrorMessage(e, t));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('account.title')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <Pressable onPress={() => setPhotoSheet(true)} disabled={uploading} accessibilityRole="button" accessibilityLabel={t('account.changePhoto')} style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {uploading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : user.avatar?.url ? (
              <Image source={img(user.avatar.url, 'thumb')} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <AppText variant="h1" color={Colors.primary}>
                {user.name.charAt(0).toUpperCase()}
              </AppText>
            )}
          </View>
          <View style={styles.camera}>
            <Feather name="camera" size={14} color={Colors.textOnPrimary} />
          </View>
        </Pressable>

        <View style={styles.nameRow}>
          <View style={styles.flex}>
            <TextField label={t('account.name')} value={name} onChangeText={setName} maxLength={50} autoCapitalize="words" />
          </View>
          {nameChanged && (
            <Button title={t('common.save')} size="sm" loading={updateState.isLoading} onPress={() => void save({ name: name.trim() })} style={styles.saveBtn} />
          )}
        </View>

        <MenuSection title={t('account.security')}>
          <MenuRow icon="phone" label={t('account.phone')} value={user.phone ?? t('account.noPhone')} onPress={() => router.push('/account-phone')} />
          {user.email ? <MenuRow icon="mail" label={t('account.email')} value={user.email} /> : null}
          <MenuRow icon="lock" label={t('account.password')} onPress={() => router.push('/account-password')} last />
        </MenuSection>

        <MenuSection title={t('account.dangerZone')}>
          <MenuRow icon="trash-2" label={t('account.delete')} danger onPress={() => setConfirmDelete(true)} last />
        </MenuSection>
        {deleteError && (
          <View style={styles.deleteError}>
            <Feather name="alert-circle" size={16} color={Colors.danger} />
            <AppText variant="small" color={Colors.danger} style={styles.flex}>
              {deleteError}
            </AppText>
          </View>
        )}
      </KeyboardScroll>

      <BottomSheet visible={photoSheet} title={t('account.changePhoto')} onClose={() => setPhotoSheet(false)}>
        <Button title={t('upload.camera')} icon="camera" variant="outline" onPress={() => void changePhoto('camera')} />
        <Button title={t('upload.library')} icon="image" variant="outline" onPress={() => void changePhoto('library')} />
      </BottomSheet>

      <ConfirmDialog
        visible={confirmDelete}
        destructive
        icon="trash-2"
        title={t('account.deleteTitle')}
        message={t('account.deleteMessage')}
        confirmLabel={t('account.deleteConfirm')}
        loading={deleteState.isLoading}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.xl, paddingBottom: Spacing.xxl },
  flex: { flex: 1 },
  avatarWrap: { alignSelf: 'center', marginTop: Spacing.md },
  avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 104, height: 104 },
  camera: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  saveBtn: { marginBottom: 3 },
  deleteError: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: 12, backgroundColor: Colors.dangerSoft },
});
