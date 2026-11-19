# Release guide (Android first)

## Builds (EAS)
| Command | Profile | Output | Channel |
|---|---|---|---|
| `npm run build:apk` | preview | APK to install directly (testers) | `preview` |
| `npm run build:aab` | production | AAB for the Play Store (`versionCode` goes up by itself) | `production` |

Both point at `EXPO_PUBLIC_API_URL` from `eas.json` (now `https://nizam7000.ilmifygroup.com/api/v1`).

## Over-the-air updates (expo-updates)
JS and image changes reach phones **without a new APK**:
```bash
npm run update:preview -- "Fix cart total"      # phones with a preview APK
npm run update:production -- "Fix cart total"   # Play Store users
```
- The phone downloads the update in the background at launch; it is used from the **next** launch.
- `scripts/ota-update.mjs` takes the API URL from the profile in `eas.json`, never from `.env`, so an update can never point phones at `localhost` or a LAN IP.
- **Only APKs built after 2026-10-21 (Phase 11) can receive updates** (the first one with expo-updates).

### When an update is NOT enough → new build
`runtimeVersion` follows the app `version` (`app.json`). An update only reaches builds with the same version. Make a new build **and raise `version`** (e.g. 1.0.0 → 1.1.0) when:
- a native module is added or updated (`npx expo install …` of a native package),
- `app.json` / `app.config.ts` changes (permissions, plugins, icon, splash, Maps key).

If you raise `version` without building, updates go to nobody until the new build is installed.

## Google Maps key
The real key is never written in the repo. Add it once as an EAS environment variable:
```bash
npx eas-cli env:create --name GOOGLE_MAPS_API_KEY --value <key> --environment preview --environment production --visibility sensitive
```
`app.config.ts` puts it in the Android config at build time. Without it the placeholder stays and maps are blank. In Google Cloud, restrict the key to **Maps SDK for Android** + package `com.ilmify.kadou24h` + the EAS keystore SHA-1 (`npx eas-cli credentials`).

## Before the first store release
- [ ] Real logo → `assets/images/` (icon 1024 px, adaptive foreground/monochrome with the mark inside the centre 66 %, splash mark) and `components/brand/BrandLogo.tsx`. The current purple "K 24H" icon is interim.
- [ ] Server deployed; Firebase `google-services.json` in the app + `FIREBASE_SERVICE_ACCOUNT_BASE64` on the server (push).
- [ ] Maps key (above). Cloudinary: "Allow delivery of PDF and ZIP files" (CV links). Keep Cloudinary "Strict transformations" **off** — the app asks for resized images (`lib/image.ts`).
- [ ] Payment gateway chosen and wired (the dev "simulate paid" button is hidden in release builds).
- [x] APP_SPEC §10 #8 (COD limit) and #9 (pay-first online orders) — built 2026-10-21.
- [ ] Play Console: privacy policy URL, data safety form (location, photos, phone number, payments), content rating, screenshots.
