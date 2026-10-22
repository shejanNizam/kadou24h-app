import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { WorkingHours } from '@/features/cv/types';

const DAYS_AHEAD = 14;
const STEP_MIN = 30;
/** The server wants at least 30 minutes' notice */
const MIN_LEAD_MS = 35 * 60_000;
const DEFAULT_HOURS = { from: '07:00', to: '20:00' };

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/**
 * Day chips (next 14 days) then time chips every 30 min within the worker's hours.
 * Plain JS — no native date picker, works on low-end phones and the web preview.
 * Days outside the worker's usual days stay possible (the worker can decline) but are marked.
 */
export function DayTimePicker({
  hours,
  day,
  time,
  onDay,
  onTime,
}: {
  hours?: WorkingHours | null;
  day: Date | null;
  time: string | null;
  onDay: (d: Date) => void;
  onTime: (hhmm: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const usual = hours?.days?.length ? hours.days : null;
  // When the screen opened (the server checks the 30-minute notice again anyway)
  const [now] = useState(Date.now);

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, []);

  const slots = useMemo(() => {
    if (!day) return [];
    const from = toMin(hours?.from ?? DEFAULT_HOURS.from);
    const to = toMin(hours?.to ?? DEFAULT_HOURS.to);
    const out: string[] = [];
    for (let m = from; m < to; m += STEP_MIN) {
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
      if (at.getTime() - now < MIN_LEAD_MS) continue;
      out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return out;
  }, [day, hours?.from, hours?.to, now]);

  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  return (
    <View style={styles.gap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {days.map((d) => {
          const on = day ? sameDay(d, day) : false;
          const off = usual ? !usual.includes(d.getDay()) : false;
          const top = sameDay(d, today)
            ? t('booking.today')
            : sameDay(d, tomorrow)
              ? t('booking.tomorrow')
              : d.toLocaleDateString(i18n.language, { weekday: 'short' });
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => onDay(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={d.toLocaleDateString(i18n.language, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              style={[styles.day, on && styles.dayOn, off && !on && styles.dayOff]}>
              <AppText variant="caption" color={on ? Colors.textOnPrimary : Colors.textMuted} numberOfLines={1}>
                {top}
              </AppText>
              <AppText variant="title" color={on ? Colors.textOnPrimary : Colors.text}>
                {d.getDate()}
              </AppText>
              <AppText variant="caption" color={on ? Colors.textOnPrimary : Colors.textMuted}>
                {d.toLocaleDateString(i18n.language, { month: 'short' })}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {day && usual && !usual.includes(day.getDay()) && (
        <AppText variant="caption" color={Colors.warningText}>
          {t('booking.usuallyOff')}
        </AppText>
      )}

      {day &&
        (slots.length ? (
          <View style={styles.slots}>
            {slots.map((s) => (
              <Chip key={s} label={s} selected={time === s} onPress={() => onTime(s)} />
            ))}
          </View>
        ) : (
          <AppText variant="small" color={Colors.textMuted}>
            {t('booking.noSlots')}
          </AppText>
        ))}
    </View>
  );
}

/** The chosen day + "HH:mm" → ISO date for the server (phone's local time) */
export const toScheduledAt = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).toISOString();
};

const styles = StyleSheet.create({
  gap: { gap: Spacing.md },
  days: { gap: Spacing.sm, paddingVertical: 2 },
  day: {
    width: 64,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    gap: 2,
  },
  dayOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayOff: { opacity: 0.55 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
