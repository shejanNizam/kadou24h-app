import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/ui/AppText";
import { Colors, Radius, Spacing } from "@/constants/theme";

import { addressLine, type Address } from "../api";
import { img } from "@/lib/image";

const LABEL_ICON = {
  home: "home",
  office: "briefcase",
  other: "map-pin",
} as const;

/** One saved address: label, area, landmark, gate photo, default badge. */
export function AddressCard({
  address,
  onPress,
  selected,
  right,
}: {
  address: Address;
  onPress?: () => void;
  selected?: boolean;
  right?: ReactNode;
}) {
  const { t } = useTranslation();
  const title =
    address.label === "other" && address.customLabel
      ? address.customLabel
      : t(`address.label.${address.label}`);

  // `right` sits beside the pressable part: on web a button can't hold its buttons.
  return (
    <View style={[styles.card, selected && styles.selected]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={[styles.icon, selected && styles.iconOn]}>
          <Feather
            name={LABEL_ICON[address.label]}
            size={18}
            color={selected ? Colors.textOnPrimary : Colors.primary}
          />
        </View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <AppText
              variant="title"
              numberOfLines={1}
              style={styles.flexShrink}
            >
              {title}
            </AppText>
            {address.isDefault && (
              <View style={styles.badge}>
                <AppText variant="caption" color={Colors.primary}>
                  {t("address.default")}
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
            {addressLine(address)}
          </AppText>
          {address.landmark ? (
            <AppText
              variant="caption"
              color={Colors.textMuted}
              numberOfLines={2}
            >
              {address.landmark}
            </AppText>
          ) : null}
          <AppText variant="caption" color={Colors.textSubtle}>
            {address.fullName}
          </AppText>
        </View>
        {address.placePhoto?.url ? (
          <Image
            source={img(address.placePhoto.url, "card")}
            style={styles.photo}
            contentFit="cover"
          />
        ) : null}
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  selected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOn: { backgroundColor: Colors.primary },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  flexShrink: { flexShrink: 1 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  photo: { width: 52, height: 52, borderRadius: Radius.md },
});
