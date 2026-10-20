import { ProfileScreen } from '@/features/profile/components/ProfileScreen';
import { AppMode } from '@/types/api';

export default function CustomerProfileTab() {
  return <ProfileScreen mode={AppMode.customer} />;
}
