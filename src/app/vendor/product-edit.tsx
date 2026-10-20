import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { usePhotoUpload } from '@/components/media/ImageUploadBox';
import { AppText } from '@/components/ui/AppText';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { StackHeader } from '@/components/ui/StackHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import type { Product } from '@/features/catalog/types';
import { useGetPublicSettingsQuery } from '@/features/profile/api';
import { useCreateProductMutation, useDeleteProductMutation, useGetMyProductQuery, useUpdateProductMutation } from '@/features/vendor/api';
import type { ProductApprovalStatus, ProductInput } from '@/features/vendor/types';
import { useLocalized } from '@/hooks/useLocalized';
import { getApiErrorMessage, getFieldErrors } from '@/lib/api/errors';
import { formatGNF } from '@/lib/format';
import type { FileRef } from '@/types/api';

const MAX_PHOTOS = 5;

type EditableProduct = Product & {
  subcategoryId?: { _id: string } | null;
  approvalStatus?: ProductApprovalStatus;
  adminReviewNote?: string;
};

/** Add (no id) or edit (?id=) a product. */
export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isLoading, isError, error, refetch } = useGetMyProductQuery(id ?? '', { skip: !id });

  if (id && isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      </SafeAreaView>
    );
  }
  if (id && (isError || !data)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <StackHeader />
        </View>
        <ErrorState error={error ?? { status: 404 }} onRetry={refetch} />
      </SafeAreaView>
    );
  }
  return <ProductEditor existing={data as EditableProduct | undefined} />;
}

/**
 * Step 1: photos (first = cover), name, description, category, price.
 * Step 2: stock, alert level, preparation time, key features, in the box.
 * New products wait for the admin's approval before customers see them.
 */
function ProductEditor({ existing }: { existing?: EditableProduct }) {
  const { t } = useTranslation();
  const l = useLocalized();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { choose, uploading, sheet } = usePhotoUpload(t('products.photos'));
  const { data: categories } = useGetCategoriesQuery('product');
  const { data: settings } = useGetPublicSettingsQuery();
  const [create, createState] = useCreateProductMutation();
  const [update, updateState] = useUpdateProductMutation();
  const [remove, removeState] = useDeleteProductMutation();

  const [images, setImages] = useState<FileRef[]>(existing?.images ?? []);
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId?._id ?? '');
  const [subcategoryId, setSubcategoryId] = useState(existing?.subcategoryId?._id ?? '');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [discount, setDiscount] = useState(existing?.discountPrice ? String(existing.discountPrice) : '');
  const [stock, setStock] = useState(existing ? String(existing.stockQty) : '');
  const [minAlert, setMinAlert] = useState(existing ? String(existing.minStockAlert) : '5');
  const [prep, setPrep] = useState(existing?.prepTimeMinutes ? String(existing.prepTimeMinutes) : '15');
  const [features, setFeatures] = useState<string[]>(existing?.features ?? []);
  const [inTheBox, setInTheBox] = useState<string[]>(existing?.inTheBox ?? []);
  const [available, setAvailable] = useState(existing?.isAvailable ?? true);

  const roots = categories?.filter((c) => !c.parentId) ?? [];
  const children = categories?.filter((c) => c.parentId === categoryId) ?? [];
  const num = (v: string) => Number.parseInt(v, 10);
  const sellPrice = num(discount) > 0 ? num(discount) : num(price);

  // Preview only: the server computes the real commission on each order
  const rate = settings?.commission?.rate ?? 10;
  const minCommission = settings?.commission?.min ?? 1000;
  const commission =
    sellPrice > 0
      ? Math.min(Math.max(Math.round((rate / 100) * sellPrice), Math.min(minCommission, Math.round(sellPrice * 0.9))), Math.round(sellPrice * 0.9))
      : 0;

  const addPhoto = async () => {
    const file = await choose();
    if (file) setImages((list) => [...list, file].slice(0, MAX_PHOTOS));
  };
  const makeCover = (i: number) => setImages((list) => [list[i], ...list.filter((_, j) => j !== i)]);
  const removePhoto = (i: number) => setImages((list) => list.filter((_, j) => j !== i));

  const checkStep1 = () => {
    const next: Record<string, string> = {};
    if (!images.length) next.images = t('products.photoRequired');
    if (name.trim().length < 2) next.name = t('products.nameRequired');
    if (!categoryId) next.categoryId = t('products.categoryRequired');
    if (!(num(price) > 0)) next.price = t('products.priceRequired');
    if (discount && !(num(discount) > 0 && num(discount) < num(price))) next.discount = t('products.discountInvalid');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (!(num(stock) >= 0)) next.stock = t('products.stockRequired');
    setErrors(next);
    if (Object.keys(next).length) return;

    const body: ProductInput = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      subcategoryId: subcategoryId || (existing ? null : undefined),
      price: num(price),
      discountPrice: num(discount) > 0 ? num(discount) : existing ? null : undefined,
      images,
      features,
      inTheBox,
      stockQty: num(stock),
      minStockAlert: Math.max(0, num(minAlert) || 0),
      prepTimeMinutes: Math.max(0, num(prep) || 0),
      isAvailable: available,
    };
    setFormError(null);
    try {
      if (existing) {
        await update({ id: existing._id, ...body }).unwrap();
        toast.show(existing.approvalStatus === 'rejected' ? t('products.resubmitted') : t('products.saved'), 'success');
      } else {
        await create(body).unwrap();
        toast.show(t('products.created'), 'success');
      }
      router.back();
    } catch (e) {
      const fields = getFieldErrors(e);
      if (Object.keys(fields).some((k) => ['name', 'price', 'discountPrice', 'categoryId', 'images'].includes(k))) setStep(1);
      setErrors({
        ...fields,
        ...(fields.discountPrice && { discount: fields.discountPrice }),
      });
      setFormError(getApiErrorMessage(e, t));
    }
  };

  const onDelete = async () => {
    if (!existing) return;
    try {
      await remove(existing._id).unwrap();
      setConfirmDelete(false);
      toast.show(t('products.deleted'));
      router.back();
    } catch (e) {
      setConfirmDelete(false);
      toast.show(getApiErrorMessage(e, t), 'danger');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.inner}>
        <StackHeader
          title={existing ? t('products.editTitle') : t('products.newTitle')}
          right={
            existing ? (
              <Pressable
                onPress={() => setConfirmDelete(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('products.delete')}
                style={styles.headerIcon}>
                <Feather name="trash-2" size={20} color={Colors.danger} />
              </Pressable>
            ) : undefined
          }
        />
        <AppText variant="caption" color={Colors.textMuted}>
          {t('kyc.step', { current: step, total: 2 })} · {step === 1 ? t('products.step1') : t('products.step2')}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.inner, styles.content]} keyboardShouldPersistTaps="handled">
        {existing?.approvalStatus === 'rejected' && (
          <Banner tone="warning" message={`${t('products.rejectedNote')}${existing.adminReviewNote ? `\n« ${existing.adminReviewNote} »` : ''}`} />
        )}
        {!existing && (
          <Banner
            tone="info"
            message={t('products.approvalNotice', {
              rate,
              min: formatGNF(minCommission),
            })}
          />
        )}
        <Banner tone="danger" message={formError} />

        {step === 1 ? (
          <>
            <View style={styles.gap}>
              <AppText variant="label">
                {t('products.photos')} ({images.length}/{MAX_PHOTOS})
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {t('products.photosHint')}
              </AppText>
              <View style={styles.photos}>
                {images.map((img, i) => (
                  <View key={img.url} style={styles.photo}>
                    <Pressable
                      onPress={() => makeCover(i)}
                      accessibilityRole="button"
                      accessibilityLabel={t('products.makeCover')}
                      style={styles.photo}>
                      <Image source={img.url} style={styles.photo} contentFit="cover" />
                    </Pressable>
                    {i === 0 && (
                      <View style={styles.cover}>
                        <AppText variant="caption" color={Colors.textOnPrimary}>
                          {t('products.cover')}
                        </AppText>
                      </View>
                    )}
                    <Pressable
                      onPress={() => removePhoto(i)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={t('upload.remove')}
                      style={styles.removePhoto}>
                      <Feather name="x" size={14} color={Colors.textOnPrimary} />
                    </Pressable>
                  </View>
                ))}
                {images.length < MAX_PHOTOS && (
                  <Pressable
                    onPress={() => void addPhoto()}
                    disabled={uploading}
                    accessibilityRole="button"
                    accessibilityLabel={t('upload.add')}
                    style={[styles.photo, styles.addPhoto]}>
                    {uploading ? <ActivityIndicator color={Colors.primary} /> : <Feather name="plus" size={24} color={Colors.primary} />}
                  </Pressable>
                )}
              </View>
              {errors.images ? (
                <AppText variant="caption" color={Colors.danger}>
                  {errors.images}
                </AppText>
              ) : null}
            </View>

            <TextField label={t('products.name')} value={name} onChangeText={setName} error={errors.name} maxLength={120} />
            <TextField
              label={t('products.description')}
              optional
              multiline
              value={description}
              onChangeText={setDescription}
              style={styles.multiline}
              maxLength={2000}
            />

            <View style={styles.gap}>
              <AppText variant="label">{t('products.category')}</AppText>
              <View style={styles.chips}>
                {roots.map((c) => (
                  <Chip
                    key={c._id}
                    label={l(c.name)}
                    selected={categoryId === c._id}
                    onPress={() => {
                      setCategoryId(c._id);
                      setSubcategoryId('');
                    }}
                  />
                ))}
              </View>
              {errors.categoryId ? (
                <AppText variant="caption" color={Colors.danger}>
                  {errors.categoryId}
                </AppText>
              ) : null}
            </View>
            {children.length > 0 && (
              <View style={styles.gap}>
                <AppText variant="label">
                  {t('products.subcategory')}{' '}
                  <AppText variant="caption" color={Colors.textSubtle}>
                    ({t('common.optional')})
                  </AppText>
                </AppText>
                <View style={styles.chips}>
                  {children.map((c) => (
                    <Chip
                      key={c._id}
                      label={l(c.name)}
                      selected={subcategoryId === c._id}
                      onPress={() => setSubcategoryId(subcategoryId === c._id ? '' : c._id)}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.twoCols}>
              <View style={styles.flex}>
                <TextField
                  label={t('products.price')}
                  prefix="GNF"
                  value={price}
                  onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  error={errors.price}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('products.discountPrice')}
                  optional
                  prefix="GNF"
                  value={discount}
                  onChangeText={(v) => setDiscount(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  error={errors.discount}
                />
              </View>
            </View>
            {sellPrice > 0 && (
              <View style={styles.earnLine}>
                <Feather name="info" size={14} color={Colors.primary} />
                <AppText variant="caption" color={Colors.primaryDark} style={styles.flex}>
                  {t('products.earnLine', {
                    pays: formatGNF(sellPrice),
                    get: formatGNF(sellPrice - commission),
                    rate,
                    min: formatGNF(minCommission),
                  })}
                </AppText>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.twoCols}>
              <View style={styles.flex}>
                <TextField
                  label={t('products.stockQty')}
                  value={stock}
                  onChangeText={(v) => setStock(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  error={errors.stock}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('products.minStockAlert')}
                  value={minAlert}
                  onChangeText={(v) => setMinAlert(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <TextField
              label={t('products.prepTime')}
              hint={t('products.prepTimeHint')}
              value={prep}
              onChangeText={(v) => setPrep(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />
            <ListInput label={t('products.features')} hint={t('products.featuresHint')} values={features} onChange={setFeatures} />
            <ListInput label={t('products.inTheBox')} hint={t('products.inTheBoxHint')} values={inTheBox} onChange={setInTheBox} />
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <AppText variant="bodyMedium">{t('products.forSale')}</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {t('products.forSaleHint')}
                </AppText>
              </View>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                accessibilityLabel={t('products.forSale')}
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.inner, styles.footer]}>
        {step === 2 && <Button title={t('common.back')} variant="outline" style={styles.flex} onPress={() => setStep(1)} />}
        {step === 1 ? (
          <Button title={t('common.continue')} style={styles.flex} disabled={uploading} onPress={() => checkStep1() && setStep(2)} />
        ) : (
          <Button
            title={existing ? t('common.save') : t('products.publish')}
            style={styles.flex}
            loading={createState.isLoading || updateState.isLoading}
            onPress={() => void save()}
          />
        )}
      </View>

      {sheet}
      <ConfirmDialog
        visible={confirmDelete}
        title={t('products.deleteTitle')}
        message={t('products.deleteText')}
        confirmLabel={t('products.delete')}
        destructive
        icon="trash-2"
        loading={removeState.isLoading}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

/** Short lines as removable chips ("Garantie 1 an", "Câble USB-C"). */
function ListInput({ label, hint, values, onChange }: { label: string; hint: string; values: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v].slice(0, 20));
    setDraft('');
  };
  return (
    <View style={styles.gap}>
      <TextField
        label={label}
        optional
        hint={hint}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        returnKeyType="done"
        maxLength={60}
        right={
          <Pressable onPress={add} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.add')}>
            <AppText variant="smallMedium" color={Colors.primary}>
              {t('common.add')}
            </AppText>
          </Pressable>
        }
      />
      {values.length > 0 && (
        <View style={styles.chips}>
          {values.map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange(values.filter((x) => x !== v))}
              accessibilityRole="button"
              accessibilityLabel={`${t('upload.remove')} ${v}`}
              style={styles.valueChip}>
              <AppText variant="small">{v}</AppText>
              <Feather name="x" size={14} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loading: { marginTop: Spacing.huge },
  content: {
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  headerIcon: { padding: Spacing.sm },
  flex: { flex: 1 },
  gap: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photo: { width: 84, height: 84, borderRadius: Radius.md, overflow: 'hidden' },
  addPhoto: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 2,
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  twoCols: { flexDirection: 'row', gap: Spacing.md },
  earnLine: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
});
