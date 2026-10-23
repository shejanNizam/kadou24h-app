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
  /** An open delivery near me (first to accept), not one sent to me */
  offer?: boolean;
  /** A moto-taxi passenger (deliveryId holds the ride id) */
  ride?: boolean;
  pickupKm?: number;
}

/**
 * In rider mode, a store giving me a delivery — or an open delivery near me —
 * slides in at the top (the push also rings when the app is closed). Tap to
 * see it: a sent one opens, an open one shows the "Near me" list.
 */
export function NewDeliveryAlert() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Assigned | null>(null);

  useSocketEvent<Assigned>("delivery:assigned", (d) => {
    if (d.deliveryId) setJob({ ...d, deliveryId: String(d.deliveryId) });
  });
  useSocketEvent<Assigned>("delivery:offer", (d) => {
    if (d.deliveryId) setJob({ ...d, deliveryId: String(d.deliveryId), offer: true });
  });
  // A passenger near me (moto-taxi): same banner, opens "Near me"
  useSocketEvent<{ rideId: string; fare: number; pickupKm?: number }>("ride:offer", (r) => {
    if (r.rideId) setJob({ deliveryId: String(r.rideId), fee: r.fare, pickupKm: r.pickupKm, offer: true, ride: true });
  });
  useSocketEvent<{ rideId: string }>("ride:offer_gone", (r) => {
    setJob((current) => (current?.ride && current.deliveryId === String(r.rideId) ? null : current));
  });
  // Someone else took the open delivery I'm being shown
  useSocketEvent<{ deliveryId: string }>("delivery:offer_gone", (d) => {
    setJob((current) => (current?.offer && current.deliveryId === String(d.deliveryId) ? null : current));
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
            if (job.offer) {
              router.push({ pathname: "/rider/deliveries", params: { tab: "offers" } });
            } else {
              router.push({
                pathname: "/rider/delivery/[id]",
                params: { id: job.deliveryId },
              });
            }
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
              {job.ride
                ? t("ride.rider.alert", { amount: formatGNF(job.fee) })
                : job.offer
                  ? t("rider.offer.alert", { amount: formatGNF(job.fee) })
                  : t("rider.newAlert", { amount: formatGNF(job.fee) })}
            </AppText>
            <AppText
              variant="small"
              color={Colors.textOnPrimary}
              numberOfLines={1}
            >
              {job.offer
                ? job.pickupKm !== undefined
                  ? t("rider.offer.alertAway", { km: job.pickupKm.toLocaleString(undefined, { maximumFractionDigits: 1 }) })
                  : t("rider.offer.alertFirst")
                : [job.fromName, job.toName].filter(Boolean).join(" → ")}
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
