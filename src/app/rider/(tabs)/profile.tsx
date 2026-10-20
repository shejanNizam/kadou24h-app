import { ProfileScreen } from '@/features/profile/components/ProfileScreen';
import { AppMode } from '@/types/api';

export default function RiderProfileTab() {
  return <ProfileScreen mode={AppMode.rider} />;
}
