import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AppText } from "@/components/ui/AppText";
import { Colors, MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { formatGNF } from "@/lib/format";

interface Assigned {
  deliveryId: string;
  fee: number;
  fromName?: string;
  toName?: string;
}

/**
 * In rider mode, a store giving me a delivery slides in at the top (the push
 * also rings when the app is closed). Tap to see it and accept or decline.
 */
export function NewDeliveryAlert() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Assigned | null>(null);

  useSocketEvent<Assigned>("delivery:assigned", (d) => {
    if (d.deliveryId) setJob({ ...d, deliveryId: String(d.deliveryId) });
  });

  useEffect(() => {
    if (!job) return;
    const timer = setTimeout(() => setJob(null), 15_000);
    return () => clearTimeout(timer);
  }, [job]);

  if (!job) return null;
  return (
    <View
      style={[styles.wrap, { top: insets.top + Spacing.sm }]}
      pointerEvents="box-none"
    >
      <View style={styles.banner}>
        <Pressable
          onPress={() => {
            setJob(null);
            router.push({
              pathname: "/rider/delivery/[id]",
              params: { id: job.deliveryId },
            });
          }}
          accessibilityRole="button"
          accessibilityLiveRegion="assertive"
          style={styles.open}
        >
          <View style={styles.icon}>
            <Feather name="truck" size={18} color={Colors.primary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="title" color={Colors.textOnPrimary}>
              {t("rider.newAlert", { amount: formatGNF(job.fee) })}
            </AppText>
            <AppText
              variant="small"
              color={Colors.textOnPrimary}
              numberOfLines={1}
            >
              {[job.fromName, job.toName].filter(Boolean).join(" → ")}
            </AppText>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setJob(null)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        >
          <Feather name="x" size={18} color={Colors.textOnPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    zIndex: 50,
  },
  open: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  banner: {
    width: "100%",
    maxWidth: MaxContentWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
});
