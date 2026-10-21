/**
 * Build-time config on top of app.json. The real Google Maps key comes from the
 * GOOGLE_MAPS_API_KEY environment variable (an EAS environment variable for builds:
 * `eas env:create --name GOOGLE_MAPS_API_KEY --value <key> --environment preview --environment production`),
 * so it is never written in the repo. Without it, app.json's placeholder stays and maps show blank.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey) return config as ExpoConfig;

  return {
    ...config,
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } },
    },
    plugins: config.plugins?.map((plugin) =>
      Array.isArray(plugin) && plugin[0] === 'react-native-maps' ? [plugin[0], { ...plugin[1], androidGoogleMapsApiKey: mapsKey }] : plugin,
    ),
  } as ExpoConfig;
};
