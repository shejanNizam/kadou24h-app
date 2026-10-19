import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLocalized } from '@/hooks/useLocalized';

import { useGetCategoriesQuery } from '../api';
import type { ProductSort } from '../types';

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  maxDistance?: number;
  sort: ProductSort;
}

export const DEFAULT_FILTERS: ProductFilters = { sort: 'newest' };

/** How many filters are active (badge on the filter button). Sort doesn't count. */
export const activeFilterCount = (f: ProductFilters) =>
  [f.category, f.minPrice, f.maxPrice, f.rating, f.inStock, f.maxDistance].filter((v) => v !== undefined && v !== false).length;

const SORTS: ProductSort[] = ['newest', 'popular', 'rating', 'price_asc', 'price_desc'];
const toNumber = (text: string) => {
  const n = Number(text.replace(/\D/g, ''));
  return text.trim() && n > 0 ? n : undefined;
};

/** Bottom sheet: category, price, rating, stock, distance, sort. Reset + Apply. */
export function ProductFilterSheet({
  visible,
  value,
  onApply,
  onClose,
  hideCategory,
  canUseDistance,
}: {
  visible: boolean;
  value: ProductFilters;
  onApply: (f: ProductFilters) => void;
  onClose: () => void;
  hideCategory?: boolean;
  /** Only when we know where to deliver (a saved address) */
  canUseDistance?: boolean;
}) {
  const { t } = useTranslation();
  const l = useLocalized();
  const insets = useSafeAreaInsets();
  const categories = useGetCategoriesQuery('product', { skip: hideCategory });
  const [draft, setDraft] = useState<ProductFilters>(value);
  const [minText, setMinText] = useState(value.minPrice ? String(value.minPrice) : '');
  const [maxText, setMaxText] = useState(value.maxPrice ? String(value.maxPrice) : '');

  const set = (patch: Partial<ProductFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const reset = () => {
    setDraft({ ...DEFAULT_FILTERS, ...(hideCategory && { category: value.category }) });
    setMinText('');
    setMaxText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => {
        setDraft(value);
        setMinText(value.minPrice ? String(value.minPrice) : '');
        setMaxText(value.maxPrice ? String(value.maxPrice) : '');
      }}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.header}>
            <AppText variant="h3" style={styles.flex} accessibilityRole="header">
              {t('filters.title')}
            </AppText>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Feather name="x" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {!hideCategory && (
              <Section title={t('filters.category')}>
                <Chip label={t('filters.all')} selected={!draft.category} onPress={() => set({ category: undefined })} />
                {categories.data?.map((c) => (
                  <Chip key={c._id} label={l(c.name)} selected={draft.category === c._id} onPress={() => set({ category: c._id })} />
                ))}
              </Section>
            )}

            <AppText variant="label">{t('filters.price')}</AppText>
            <View style={styles.priceRow}>
              <View style={styles.flex}>
                <TextField
                  placeholder={t('filters.min')}
                  keyboardType="number-pad"
                  value={minText}
                  onChangeText={(v) => setMinText(v.replace(/\D/g, ''))}
                  right={<AppText variant="caption" color={Colors.textMuted}>GNF</AppText>}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  placeholder={t('filters.max')}
                  keyboardType="number-pad"
                  value={maxText}
                  onChangeText={(v) => setMaxText(v.replace(/\D/g, ''))}
                  right={<AppText variant="caption" color={Colors.textMuted}>GNF</AppText>}
                />
              </View>
            </View>

            <Section title={t('filters.rating')}>
              {[undefined, 4, 3].map((r) => (
                <Chip
                  key={String(r)}
                  label={r ? t('filters.ratingAtLeast', { value: r }) : t('filters.any')}
                  selected={draft.rating === r}
                  onPress={() => set({ rating: r })}
                />
              ))}
            </Section>

            <Section title={t('filters.availability')}>
              <Chip label={t('filters.any')} selected={!draft.inStock} onPress={() => set({ inStock: undefined })} />
              <Chip label={t('filters.inStock')} selected={Boolean(draft.inStock)} onPress={() => set({ inStock: true })} />
            </Section>

            {canUseDistance && (
              <Section title={t('filters.distance')}>
                {[undefined, 5, 10, 20].map((km) => (
                  <Chip
                    key={String(km)}
                    label={km ? t('filters.withinKm', { km }) : t('filters.any')}
                    selected={draft.maxDistance === km}
                    onPress={() => set({ maxDistance: km })}
                  />
                ))}
              </Section>
            )}

            <Section title={t('filters.sort')}>
              {SORTS.map((s) => (
                <Chip key={s} label={t(`filters.sorts.${s}`)} selected={draft.sort === s} onPress={() => set({ sort: s })} />
              ))}
            </Section>
          </ScrollView>

          <View style={styles.actions}>
            <Button title={t('filters.reset')} variant="outline" onPress={reset} style={styles.flex} />
            <Button
              title={t('filters.apply')}
              style={styles.flex}
              onPress={() => onApply({ ...draft, minPrice: toNumber(minText), maxPrice: toNumber(maxText) })}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label">{title}</AppText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  content: { gap: Spacing.lg, paddingBottom: Spacing.lg },
  section: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  priceRow: { flexDirection: 'row', gap: Spacing.md, marginTop: -Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.md, paddingTop: Spacing.md },
});
