import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/** The picker pin: fixed in the middle, its tip on the chosen point. */
export function CenterPin() {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.pin}>
        <Feather name="map-pin" size={22} color={Colors.textOnPrimary} />
      </View>
      <View style={styles.tip} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The tip (bottom) sits exactly on the centre
  wrap: { position: 'absolute', left: '50%', top: '50%', marginLeft: -22, marginTop: -52, alignItems: 'center' },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  tip: { width: 4, height: 8, backgroundColor: Colors.primary, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
});
