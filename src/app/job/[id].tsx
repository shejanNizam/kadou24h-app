import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StackHeader } from '@/components/ui/StackHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetJobQuery } from '@/features/catalog/api';
import { salaryText } from '@/features/catalog/components/JobCard';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useLocalized } from '@/hooks/useLocalized';

/** Read-only job details (applying, CV and match score arrive in Phase 10). */
export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const l = useLocalized();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const { data: job, isLoading, isError, error, refetch } = useGetJobQuery(id);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader />
      </View>
      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={[styles.inner, styles.body]}>
              {isLoading || !job ? (
                <>
                  <Skeleton height={28} width="70%" />
                  <Skeleton height={120} radius={Radius.lg} />
                </>
              ) : (
                <>
                  <View style={styles.gap}>
                    <AppText variant="small" color={Colors.primary}>
                      {job.organizationName}
                    </AppText>
                    <AppText variant="h2">{job.title}</AppText>
                    <View style={styles.tags}>
                      <Tag label={t(`jobs.type.${job.jobType}`)} />
                      <Tag label={t(`jobs.workplace.${job.workplace}`)} />
                      {job.categoryId ? <Tag label={l(job.categoryId.name)} /> : null}
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Row label={t('jobs.salary')} value={salaryText(job, t)} />
                    <Row label={t('jobs.location')} value={[job.area, job.city].filter(Boolean).join(', ')} />
                    {job.vacancies ? <Row label={t('jobs.vacancies')} value={String(job.vacancies)} /> : null}
                    {job.applicationDeadline ? (
                      <Row label={t('jobs.deadline')} value={new Date(job.applicationDeadline).toLocaleDateString(i18n.language)} />
                    ) : null}
                  </View>

                  <Block title={t('jobs.about')} text={job.about} />
                  <List title={t('jobs.responsibilities')} items={job.responsibilities} />
                  <List title={t('jobs.requirements')} items={job.requirements} />
                  <List title={t('jobs.benefits')} items={job.benefits} />
                  {job.aboutCompany ? <Block title={t('jobs.aboutCompany', { org: job.organizationName })} text={job.aboutCompany} /> : null}
                </>
              )}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.inner}>
              <Button
                title={t('jobs.apply')}
                disabled={!job}
                onPress={() => requireAuth(() => toast.show(t('jobs.applySoon'), 'info'))}
              />
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <AppText variant="small" color={Colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="smallMedium" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.gap}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" color={Colors.textMuted}>
        {text}
      </AppText>
    </View>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.gap}>
      <AppText variant="h3">{title}</AppText>
      {items.map((item, i) => (
        <AppText key={item + i} variant="body" color={Colors.textMuted}>
          {`•  ${item}`}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  scroll: { paddingBottom: Spacing.xxl },
  body: { gap: Spacing.xl },
  gap: { gap: Spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  value: { flexShrink: 1, textAlign: 'right' },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.md },
});
