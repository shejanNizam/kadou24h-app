import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { tabIcon, tabScreenOptions } from '@/components/navigation/tabOptions';

export default function RiderTabs() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="deliveries" options={{ title: t('tabs.deliveries'), tabBarIcon: tabIcon('truck') }} />
      <Tabs.Screen name="earnings" options={{ title: t('tabs.earnings'), tabBarIcon: tabIcon('dollar-sign') }} />
      <Tabs.Screen name="chat" options={{ title: t('tabs.chat'), tabBarIcon: tabIcon('message-circle') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
