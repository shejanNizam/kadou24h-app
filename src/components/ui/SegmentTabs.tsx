import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

export interface SegmentTab<K extends string> {
  key: K;
  label: string;
  /** Count bubble (e.g. new orders); hidden when 0 */
  badge?: number;
}

/** Up to this many tabs share the width, a label taking two lines if needed; more scroll sideways */
const FIT_TABS = 4;

/**
 * Underlined tabs above a list (orders, products, riders). A tab cut at the screen edge
 * looked broken on small phones (client, Samsung A16), so a few tabs always fit.
 */
export function SegmentTabs<K extends string>({ tabs, value, onChange }: { tabs: SegmentTab<K>[]; value: K; onChange: (key: K) => void }) {
  const fit = tabs.length <= FIT_TABS;
  const items = tabs.map((tab) => {
    const on = tab.key === value;
    return (
      <Pressable
        key={tab.key}
        onPress={() => onChange(tab.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={[styles.tab, fit && styles.tabFit, on && styles.tabOn]}>
        <AppText variant="label" color={on ? Colors.primary : Colors.textMuted} numberOfLines={fit ? 2 : 1} align="center" style={styles.label}>
          {tab.label}
        </AppText>
        {tab.badge ? (
          <View style={styles.badge}>
            <AppText variant="caption" color={Colors.textOnPrimary} style={styles.badgeText}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    );
  });

  return fit ? (
    <View accessibilityRole="tablist" style={[styles.bar, styles.fitRow]}>
      {items}
    </View>
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist" style={styles.bar}>
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
  row: { flexGrow: 1 },
  tab: {
    flexGrow: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
    minHeight: MinTouch,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  fitRow: { flexDirection: 'row' },
  tabFit: { flex: 1, flexBasis: 0, paddingHorizontal: Spacing.xs },
  label: { flexShrink: 1 },
  tabOn: { borderBottomColor: Colors.primary },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14 },
});
