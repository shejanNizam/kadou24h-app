import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useGetStationsQuery } from '@/features/orders/api';
import type { TransitStation } from '@/features/orders/types';

import type { TransitRoute } from '../types';

export interface RouteDraft {
  from?: TransitStation;
  to?: TransitStation;
}

const MAX_ROUTES = 20;

/** Saved routes come populated (GET /riders/me); a plain id means the station was removed */
export const routesFrom = (saved: TransitRoute[] = []): RouteDraft[] => {
  const station = (s: TransitStation | string) => (typeof s === 'string' ? undefined : s);
  const drafts = saved.map((r) => ({ from: station(r.fromStationId), to: station(r.toStationId) }));
  return drafts.length ? drafts : [{}];
};

/** Complete routes as the API wants them, or an error key */
export function routesPayload(routes: RouteDraft[]): { routes: { fromStationId: string; toStationId: string }[]; error?: 'routeRequired' | 'routeSame' } {
  const complete = routes.filter((r) => r.from && r.to);
  if (!complete.length) return { routes: [], error: 'routeRequired' };
  if (complete.some((r) => r.from!._id === r.to!._id)) return { routes: [], error: 'routeSame' };
  return { routes: complete.map((r) => ({ fromStationId: r.from!._id, toStationId: r.to!._id })) };
}

/** Bus driver: the station → station trips I make regularly (stores pick me for those). */
export function RoutesEditor({ routes, onChange, error }: { routes: RouteDraft[]; onChange: (routes: RouteDraft[]) => void; error?: string }) {
  const { t } = useTranslation();
  const { data: stations = [] } = useGetStationsQuery();
  const [picking, setPicking] = useState<{ index: number; end: 'from' | 'to' } | null>(null);
  const name = (s?: TransitStation) => (s ? `${s.name} (${s.city})` : t('kycRider.pickStation'));

  return (
    <>
      {routes.map((r, i) => (
        <View key={i} style={styles.route}>
          <View style={styles.row}>
            <AppText variant="label" style={styles.flex}>
              {t('kycRider.routeN', { n: i + 1 })}
            </AppText>
            {routes.length > 1 && (
              <Pressable onPress={() => onChange(routes.filter((_, k) => k !== i))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.remove')}>
                <Feather name="trash-2" size={16} color={Colors.danger} />
              </Pressable>
            )}
          </View>
          <StationButton label={t('kycRider.from')} value={name(r.from)} empty={!r.from} onPress={() => setPicking({ index: i, end: 'from' })} />
          <StationButton label={t('kycRider.to')} value={name(r.to)} empty={!r.to} onPress={() => setPicking({ index: i, end: 'to' })} />
        </View>
      ))}
      <Button title={t('kycRider.addRoute')} variant="outline" icon="plus" onPress={() => onChange([...routes, {}])} disabled={routes.length >= MAX_ROUTES} />
      {error ? (
        <AppText variant="caption" color={Colors.danger}>
          {error}
        </AppText>
      ) : null}

      <BottomSheet visible={picking !== null} title={picking?.end === 'to' ? t('kycRider.to') : t('kycRider.from')} onClose={() => setPicking(null)}>
        <ScrollView>
          {stations.map((s) => (
            <Pressable
              key={s._id}
              onPress={() => {
                if (!picking) return;
                onChange(routes.map((r, k) => (k === picking.index ? { ...r, [picking.end]: s } : r)));
                setPicking(null);
              }}
              accessibilityRole="button"
              style={styles.stationRow}>
              <Feather name="home" size={16} color={Colors.primary} />
              <View style={styles.flex}>
                <AppText variant="bodyMedium">{s.name}</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {[s.city, s.region].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

function StationButton({ label, value, empty, onPress }: { label: string; value: string; empty: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={styles.station}>
      <AppText variant="caption" color={Colors.textMuted} style={styles.stationLabel}>
        {label}
      </AppText>
      <AppText variant="body" color={empty ? Colors.textSubtle : Colors.text} style={styles.flex} numberOfLines={1}>
        {value}
      </AppText>
      <Feather name="chevron-down" size={16} color={Colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  route: { gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  station: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface },
  stationLabel: { width: 40 },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
});
