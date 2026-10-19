import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { tabIcon, tabScreenOptions } from '@/components/navigation/tabOptions';

/** Customer mode (also used by guests). */
export default function CustomerTabs() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="search" options={{ title: t('tabs.search'), tabBarIcon: tabIcon('search') }} />
      {/* Receipt icon, not a cart: the cart lives in the home header */}
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders'), tabBarIcon: tabIcon('file-text') }} />
      <Tabs.Screen name="chat" options={{ title: t('tabs.chat'), tabBarIcon: tabIcon('message-circle') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
