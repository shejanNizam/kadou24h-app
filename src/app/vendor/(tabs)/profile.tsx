import { ProfileScreen } from '@/features/profile/components/ProfileScreen';
import { AppMode } from '@/types/api';

export default function VendorProfileTab() {
  return <ProfileScreen mode={AppMode.vendor} />;
}
