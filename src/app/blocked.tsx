import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackHeader } from '@/components/ui/StackHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetBlockedQuery, useUnblockUserMutation } from '@/features/chat/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { img } from '@/lib/image';

/** People I blocked in the chat. They were never told; unblocking is just as silent. */
export default function BlockedScreen() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useGetBlockedQuery();
  const [unblock, { isLoading: unblocking, originalArgs }] = useUnblockUserMutation();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={t('chat.blockedTitle')} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(b) => b.userId}
          contentContainerStyle={[styles.inner, styles.list]}
          ListHeaderComponent={
            <AppText variant="small" color={Colors.textMuted}>
              {t('chat.blockedIntro')}
            </AppText>
          }
          ListEmptyComponent={<EmptyState icon="slash" title={t('chat.blockedEmpty')} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                {item.avatar?.url ? (
                  <Image source={img(item.avatar.url, 'thumb')} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Feather name="user" size={18} color={Colors.primary} />
                )}
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyMedium" numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('chat.blockedSince', {
                    date: new Date(item.blockedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }),
                  })}
                </AppText>
              </View>
              <Button
                title={t('chat.unblock')}
                size="sm"
                variant="outline"
                loading={unblocking && originalArgs === item.userId}
                onPress={() =>
                  void unblock(item.userId)
                    .unwrap()
                    .then(() => toast.show(t('chat.unblocked', { name: item.name })))
                    .catch((e: unknown) => toast.show(getApiErrorMessage(e, t), 'danger'))
                }
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl },
  list: { gap: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flex: { flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
});
