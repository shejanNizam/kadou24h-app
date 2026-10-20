import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { KeyboardScroll } from '@/components/ui/KeyboardScroll';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCreateTicketMutation, type TicketType, type TicketUrgency } from '@/features/profile/api';
import { TICKET_TYPES, TICKET_URGENCIES } from '@/features/profile/ticketStatus';
import { getApiErrorMessage } from '@/lib/api/errors';
import { pickImage, uploadImage } from '@/lib/upload';
import { useAppSelector } from '@/store/hooks';

const MAX_PHOTOS = 3;

/** New support request: what about, how urgent, details, up to 3 screenshots. */
export default function NewTicketScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const mode = useAppSelector((s) => s.auth.user?.lastActiveMode ?? 'customer');
  const [type, setType] = useState<TicketType | null>(null);
  const [urgency, setUrgency] = useState<TicketUrgency>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [create, { isLoading }] = useCreateTicketMutation();

  const canSend = Boolean(type) && description.trim().length >= 5 && !uploading;

  const addPhoto = async () => {
    try {
      const uri = await pickImage('library');
      if (!uri) return;
      setUploading(true);
      const file = await uploadImage(uri);
      setPhotos((p) => [...p, file.url]);
    } catch {
      toast.show(t('upload.failed'), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!type || !canSend) return;
    setError(null);
    try {
      const ticket = await create({
        type,
        urgency,
        subject: subject.trim() || undefined,
        description: description.trim(),
        userMode: mode,
        attachments: photos.length ? photos : undefined,
      }).unwrap();
      toast.show(t('support.sent', { number: ticket.ticketNumber }));
      router.replace({ pathname: '/support/[id]', params: { id: ticket._id } });
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('support.new')} />
      </View>
      <KeyboardScroll contentContainerStyle={[styles.inner, styles.content]}>
        <AppText variant="label">{t('support.typeLabel')}</AppText>
        <View style={styles.chips}>
          {TICKET_TYPES.map((x) => (
            <Chip key={x} label={t(`support.type.${x}`)} selected={type === x} onPress={() => setType(x)} />
          ))}
        </View>

        <AppText variant="label">{t('support.urgencyLabel')}</AppText>
        <View style={styles.chips}>
          {TICKET_URGENCIES.map((u) => (
            <Chip key={u} label={t(`support.urgency.${u}`)} selected={urgency === u} onPress={() => setUrgency(u)} />
          ))}
        </View>

        <TextField label={t('support.subject')} optional value={subject} onChangeText={setSubject} maxLength={120} />
        <TextField
          label={t('support.description')}
          hint={t('support.descriptionHint')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          style={styles.multiline}
        />

        <AppText variant="label">
          {t('support.photos')}{' '}
          <AppText variant="caption" color={Colors.textSubtle}>
            ({t('common.optional')})
          </AppText>
        </AppText>
        <View style={styles.photos}>
          {photos.map((url) => (
            <View key={url}>
              <Image source={url} style={styles.photo} contentFit="cover" />
              <Pressable
                onPress={() => setPhotos((p) => p.filter((x) => x !== url))}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('cart.remove')}
                style={styles.removePhoto}>
                <Feather name="x" size={12} color={Colors.textOnPrimary} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable onPress={() => void addPhoto()} disabled={uploading} accessibilityRole="button" accessibilityLabel={t('support.addPhoto')} style={[styles.photo, styles.addPhoto]}>
              {uploading ? <ActivityIndicator color={Colors.primary} /> : <Feather name="image" size={22} color={Colors.primary} />}
            </Pressable>
          )}
        </View>

        <Banner tone="danger" message={error} />
      </KeyboardScroll>
      <View style={[styles.inner, styles.footer]}>
        <Button title={t('support.send')} loading={isLoading} disabled={!canSend} onPress={() => void submit()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  content: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  photos: { flexDirection: 'row', gap: Spacing.sm },
  photo: { width: 84, height: 84, borderRadius: Radius.md },
  addPhoto: { borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  removePhoto: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
});
