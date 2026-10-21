import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetWorkerQuery } from '@/features/catalog/api';
import { useOpenChat } from '@/features/chat/useOpenChat';
import { formatWorkingHours } from '@/features/cv/hours';
import { useLocalized } from '@/hooks/useLocalized';
import { formatGNF } from '@/lib/format';
import { img } from '@/lib/image';

/** Worker profile. Contact only through chat — no phone/email (client rule). */
export default function WorkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const l = useLocalized();
  const { open: openChat, opening } = useOpenChat();
  const { data: worker, isLoading, isError, error, refetch } = useGetWorkerQuery(id);
  const photo = worker?.photo?.url ?? worker?.userId.avatar?.url;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader title={worker?.userId.name} />
      </View>
      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={[styles.inner, styles.body]}>
              {isLoading || !worker ? (
                <>
                  <Skeleton height={240} radius={Radius.lg} />
                  <Skeleton height={24} width="60%" />
                  <Skeleton height={64} />
                </>
              ) : (
                <>
                  <View style={styles.photoBox}>
                    {photo ? (
                      <Image source={img(photo, 'card')} style={styles.photo} contentFit="cover" />
                    ) : (
                      <Feather name="user" size={64} color={Colors.primary} />
                    )}
                  </View>
                  <View style={styles.titleRow}>
                    <View style={styles.flex}>
                      <AppText variant="h2">{worker.userId.name}</AppText>
                      <AppText variant="body" color={Colors.textMuted}>
                        {worker.profession ?? l(worker.serviceCategoryId?.name)}
                      </AppText>
                    </View>
                    {worker.hourlyRate ? (
                      <AppText variant="h3" color={Colors.primary}>
                        {t('catalog.perHour', { amount: formatGNF(worker.hourlyRate) })}
                      </AppText>
                    ) : null}
                  </View>
                  <Rating value={worker.ratingAvg} count={worker.ratingCount} size="medium" />
                  {worker.summary ? <AppText variant="body">{worker.summary}</AppText> : null}

                  <View style={styles.facts}>
                    {worker.experienceYears !== undefined && (
                      <Fact icon="award" label={t('worker.experience')} value={t('worker.years', { count: worker.experienceYears })} />
                    )}
                    {worker.city ? <Fact icon="map-pin" label={t('worker.location')} value={worker.city} /> : null}
                    {formatWorkingHours(t, worker.workingHours) ? (
                      <Fact icon="clock" label={t('worker.hoursLabel')} value={formatWorkingHours(t, worker.workingHours)!} />
                    ) : null}
                    {worker.languages.length > 0 && (
                      <Fact icon="message-square" label={t('worker.languages')} value={worker.languages.join(', ')} />
                    )}
                  </View>

                  {worker.skills.length > 0 && (
                    <View style={styles.gap}>
                      <AppText variant="h3">{t('worker.skills')}</AppText>
                      <View style={styles.tags}>
                        {worker.skills.map((s) => (
                          <Tag key={s} label={s} />
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.inner}>
              <Button
                title={t('worker.message')}
                icon="message-circle"
                disabled={!worker}
                loading={opening}
                onPress={() => openChat({ type: 'worker', workerProfileId: id })}
              />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Fact({ icon, label, value }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Feather name={icon} size={18} color={Colors.primary} />
      <View style={styles.flex}>
        <AppText variant="caption" color={Colors.textMuted}>
          {label}
        </AppText>
        <AppText variant="bodyMedium">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  scroll: { paddingBottom: Spacing.xxl },
  body: { gap: Spacing.lg },
  gap: { gap: Spacing.sm },
  photoBox: {
    height: 260,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  facts: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.md },
});
