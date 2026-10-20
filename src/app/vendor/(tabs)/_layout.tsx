import { Tabs } from "expo-router/js-tabs";
import { useTranslation } from "react-i18next";

import {
  tabIcon,
  tabScreenOptions,
  useChatBadge,
} from "@/components/navigation/tabOptions";
import { AppMode } from "@/types/api";

/** Figma had a centre "Create" tab; Products replaces it (the list has its own "+"). */
export default function VendorTabs() {
  const { t } = useTranslation();
  const chatBadge = useChatBadge(AppMode.vendor);
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="orders"
        options={{ title: t("tabs.orders"), tabBarIcon: tabIcon("file-text") }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: t("tabs.products"), tabBarIcon: tabIcon("package") }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t("tabs.earnings"),
          tabBarIcon: tabIcon("dollar-sign"),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chat"),
          tabBarIcon: tabIcon("message-circle"),
          tabBarBadge: chatBadge,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t("tabs.profile"), tabBarIcon: tabIcon("user") }}
      />
    </Tabs>
  );
}
