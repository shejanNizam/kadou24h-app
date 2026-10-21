import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { APPLICATION_TONE, MATCH_TONE } from '../status';
import type { Candidate } from '../types';
import { img } from '@/lib/image';

/** A candidate in a recruiter list (job applicants, store inbox): contact stays locked until the CV is unlocked. */
export function CandidateRow({ candidate: c }: { candidate: Candidate }) {
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recruiter/candidate/[id]', params: { id: c._id } })}
      accessibilityRole="button"
      accessibilityLabel={c.applicant.name}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {c.applicant.avatar?.url ? <Image source={img(c.applicant.avatar.url, 'thumb')} style={styles.avatar} contentFit="cover" /> : <Feather name="user" size={18} color={Colors.primary} />}
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyMedium" numberOfLines={1}>
            {c.applicant.name}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
            {[c.cvSnapshot.profession, new Date(c.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        {c.kind === 'offer' && <StatusPill label={`${c.matchScore} %`} tone={MATCH_TONE(c.matchScore)} />}
      </View>
      <View style={styles.row}>
        <StatusPill label={t(`applicationStatus.${c.status}`)} tone={APPLICATION_TONE[c.status]} />
        <View style={styles.flex} />
        {c.isCvUnlocked ? (
          <AppText variant="caption" color={Colors.success}>
            {t('candidate.unlocked')}
          </AppText>
        ) : (
          <Feather name="lock" size={14} color={Colors.textSubtle} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft, overflow: 'hidden' },
  pressed: { opacity: 0.9 },
});
