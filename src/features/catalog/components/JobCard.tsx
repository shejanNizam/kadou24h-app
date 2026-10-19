import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatGNF } from '@/lib/format';

import type { Job } from '../types';

export const salaryText = (job: Job, t: TFunction) => {
  if (!job.salaryMin && !job.salaryMax) return t('jobs.salaryNegotiable');
  const range =
    job.salaryMin && job.salaryMax
      ? `${formatGNF(job.salaryMin).replace(/ GNF$/, '')} – ${formatGNF(job.salaryMax)}`
      : formatGNF((job.salaryMin ?? job.salaryMax) as number);
  return job.salaryFrequency ? `${range} / ${t(`jobs.per.${job.salaryFrequency}`)}` : range;
};

/** Home "Popular jobs near you" card. */
export function JobCard({ job, width }: { job: Job; width: number }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/job/[id]', params: { id: job._id } })}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${job.organizationName}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}>
      <AppText variant="small" color={Colors.primary} numberOfLines={1}>
        {t('jobs.isHiring', { org: job.organizationName })}
      </AppText>
      <AppText variant="title" numberOfLines={2} style={styles.title}>
        {job.title}
      </AppText>
      <View style={styles.chips}>
        <View style={styles.chip}>
          <AppText variant="caption">{t(`jobs.type.${job.jobType}`)}</AppText>
        </View>
        {job.area || job.city ? (
          <View style={styles.chip}>
            <AppText variant="caption">{job.area ?? job.city}</AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="smallMedium" numberOfLines={1}>
        {salaryText(job, t)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
  title: { minHeight: 44 },
  chips: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
});
