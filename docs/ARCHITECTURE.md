# Kadou24h App — Architecture

## Stack (decided 2026-10-19)
| Concern | Choice | Notes |
|---|---|---|
| Framework | **Expo SDK 58**, React Native 0.88, React 19.3, TypeScript strict | Always `npx expo install <pkg>`. Check the Expo v58 docs (see AGENTS.md); don't trust memory. |
| Routing | **expo-router** (file-based, `src/app/`), typed routes on | Route groups per mode: `(customer)`, `(vendor)`, `(rider)` |
| Server state | **Redux Toolkit + RTK Query** | Same pattern as the dashboard. One `api` slice, with endpoints injected per feature. |
| Client state | RTK slices: `auth` (tokens, user, mode), `app` (language, onboarding done, selected address) | Persisted via the storage adapter |
| Forms | **react-hook-form + zod** via our own `lib/form.ts` `zodResolver` | `@hookform/resolvers` has peer conflicts with this SDK. Use `useWatch`, not `watch()` (React Compiler). |
| i18n | **i18next + react-i18next + expo-localization** | `fr` default, `en`. Files in `src/locales/{fr,en}/*.json` |
| Realtime | **socket.io-client** | One socket per session, in `SocketProvider` |
| Secure storage | `expo-secure-store` (native) / `localStorage` (web) | `src/lib/storage.ts` + `storage.web.ts` |
| Images | `expo-image` (display), `expo-image-picker` + `expo-image-manipulator` (compress before upload) | |
| Maps | `react-native-maps` (native) + **web fallback** `MapView.web.tsx` (static card + "open in Google Maps") | |
| Location | `expo-location` (rider: foreground, then background later) | Web: `navigator.geolocation` or a mock |
| Push | `expo-notifications` → FCM token → `POST /device-token` | Native only. No-op on web. |
| Social login | Google and Apple native SDKs → `POST /auth/social` | Native only. Hidden on web. |
| Styling | `StyleSheet` + theme tokens in `src/constants/theme.ts` | No UI kit. Our own components in `src/components/ui/` |
| Builds | EAS (`npx eas-cli@latest build`) | Later phase |

## Folder structure
```
src/
  app/                    ROUTES ONLY (screens are thin and compose feature components)
  features/
    auth/                 api.ts (RTK endpoints) · types.ts · components/ · hooks/
    catalog/  cart/  orders/  delivery/  wallet/  chat/  notifications/
    vendor/  rider/  kyc/  jobs/  cv/  support/  ads/  address/  payments/
  components/
    ui/                   Button, Input, PhoneInput, OtpInput, PinDisplay, PinInput, Screen,
                          Header, Card, Chip, StatusBadge, Money, Avatar, BottomSheet,
                          ConfirmDialog, EmptyState, ErrorState, Skeleton, ProgressSteps,
                          ImagePickerField, Toggle, Tabs, OfflineBanner
    map/                  MapView.tsx · MapView.web.tsx
  lib/
    api/                  baseQuery.ts (auth header + refresh + error mapping), api.ts
    socket.ts             connect/disconnect, typed events
    storage.ts / storage.web.ts
    i18n.ts
    format.ts             formatGNF, formatDate, formatPhone, maskPhone
    labels.ts             status → i18n key + colour (APP_SPEC §9)
    upload.ts             compress + POST /upload
  store/                  index.ts, hooks.ts, authSlice.ts, appSlice.ts
  constants/theme.ts      colours, spacing, radius, typography
  locales/fr/*.json, en/*.json
  types/api.ts            shared envelope + enums mirrored from the server
```
Rule: **`src/app/` contains no business logic.** Each screen file imports from `features/*`. Platform-specific files use the `.web.tsx` suffix.

## Routes (as built)
```
src/app/
  _layout.tsx                 fonts, bootstrap (prefs + session), Redux, i18n, SafeArea, Toast, SessionEffects, Stack
  index.tsx                   redirect: !onboarded → /language · signed in → homeFor(user) · guest → /home
  (onboarding)/language.tsx   /language
  (auth)/login, register, verify, forgot-password, reset-password
  (customer)/_layout.tsx      Tabs: /home /search /orders /chat /profile
  vendor/_layout.tsx          Stack + role guard → vendor/(tabs): /vendor/orders /vendor/products /vendor/earnings /vendor/chat /vendor/profile
  rider/_layout.tsx           Stack + role guard → rider/(tabs): /rider/deliveries /rider/earnings /rider/chat /rider/profile
  kyc/vendor.tsx, kyc/rider.tsx
```
Phase 3 added root screens: `product/[id]`, `store/[id]`, `worker/[id]`, `job/[id]`, `category/[id]`, `categories`, `cart`, `notifications`.
Phase 4 added: `addresses` (`?select=1` = deliver-to picker), `address-edit` (`?id=`), `checkout`, `payment/[id]` (`?orderId=`), `order-placed/[id]`, `order/[id]`, `track/[id]` (delivery leg id).
Typed routes list a folder's `index.tsx` as `/folder/index`, so screens without children are plain files (`addresses.tsx`, not `addresses/index.tsx`).
Customer detail screens (product/[id], order/[id]…) go at the root Stack. Vendor/rider detail screens go inside `vendor/` / `rider/` so they push over that mode's tabs.

## SDK 58 gotchas (checked in node_modules)
- **Keyboard (Android is edge-to-edge, the window never shrinks):** every screen with text fields scrolls with `KeyboardScroll` (`components/ui/KeyboardScroll`, react-native-keyboard-controller), never a plain `ScrollView`. Fixed bottom bars use `KeyboardAvoidingView` from `react-native-keyboard-controller` with `behavior="padding"` (not the RN one with `undefined` on Android). `KeyboardProvider` is in the root layout. Native module: needs a new APK.
- `Tabs` comes from `expo-router/js-tabs` (the `expo-router` export is deprecated). `Stack`, `Link`, `Redirect`, `router` still come from `expo-router`.
- Input refs: `useRef<TextInputInstance>` (RN 0.88 type), not `TextInput`.
- RHF's `handleSubmit` result is not assignable to `onSubmitEditing` → wrap it: `onSubmitEditing={() => void onSubmit()}`.
- Lint with `npx eslint src`. `npx expo lint` mis-detects the ESLint version here.
- No refs or impure calls (`Date.now()`) during render: the React Compiler lint flags them. Use lazy `useState(() => …)`.
- Web output is `single` (SPA); web is only the dev preview.

## Key patterns
- **API calls:** each feature has `api.ts` built with `api.injectEndpoints({...})`. `transformResponse: (r) => r.data` unwraps the envelope. Lists return `{ data, meta }` for pagination. Tags drive cache invalidation (e.g. `Order`, `SubOrder`, `Cart`, `Wallet`).
- **Auth flow:** the `baseQuery` adds the Bearer token. On 401 it calls `/auth/refresh-token` once (a mutex prevents parallel refreshes) and retries. If that fails, it dispatches `logout()`. The socket reconnects with the new token.
- **Mode routing:** `src/app/index.tsx` reads `user.lastActiveMode` and `roles` → `router.replace('/(vendor)/orders')` etc. If the mode's role is missing (suspended), it falls back to customer.
- **Guest gate:** tabs that need an account render `SignInPrompt`. Planned: a `useRequireAuth()` hook that opens a login bottom sheet and resumes the action.
- **Auth hand-off:** `features/auth/pending.ts` keeps the phone to verify and the reset token in memory, never in route params (web URLs). `useCompleteSignIn(session, intent)` saves the session and routes.
- **Infinite lists:** RTK Query `build.infiniteQuery` (`searchProducts`, `searchWorkers`) with `getNextPageParam` from `meta`. Flatten `data.pages`.
- **Cart:** mutations return the whole cart → `upsertQueryData('getCart')` (no refetch). `useCartLine(productId)` powers every Add/stepper.
- **Guest gate:** `useRequireAuth()(action)` → toast + login, and `pendingAuth.setReturnTo(pathname)` brings the user back after sign-in.
- **Localized server text** (`{ fr, en }`): `useLocalized()`.
- **Server errors** are English. `lib/api/errors.ts` maps the known ones (attempts left, wait Ns, invalid credentials, phone taken…) to i18n keys, and falls back to the server text.
- **Socket → cache:** socket handlers call `api.util.invalidateTags([...])` or `updateQueryData`, never duplicate state.
- **Payments:** `initiatePayment({ purpose, refId, method, idempotencyKey: newIdempotencyKey() })` → `/payment/[id]` polls `GET /payments/:id` (4 s) + `payment:successful` → success screen per purpose. No gateway yet: in `__DEV__` the screen shows "Simulate paid / failed" (`POST /payments/:id/dev-confirm`, 404 in production). When a gateway is chosen, open its URL/USSD between initiate and the waiting screen.
- **Live order updates:** `SessionEffects` invalidates `Order`/`SubOrder`/`Delivery`/`Notification`/`Wallet` on `new_notification`, `delivery:*`, `payment:successful`, `refund:issued`; `Wallet` on `withdrawal:*` / `wallet:earning_released`; `RiderLink` on `rider_link:updated`; `Me`/`Store` on `application:reviewed`. Screens just use their queries. One-off listeners: `useSocketEvent(event, handler)` (e.g. the vendor new-order banner).
- **Maps:** `<AppMap>` — react-native-maps on phones, Leaflet + OSM in an iframe on web. Picker mode (`onCenterChange`) shows a fixed centre pin. Location/geocoding: `lib/location.ts` (+ `.web.ts` using the browser + Nominatim).
- **Uploads:** `pickImage()` + `uploadImage(uri)` (`lib/upload.ts`): resize to 1280 px, JPEG 70 %, multipart `files` → `{ url, publicId }`.
- **Chat:** `useOpenChat().open(subject)` finds/creates the chat and opens `/chat/[id]`. Messages are an infinite query (page 1 = newest) shown in an inverted list; `addMessageToThread` merges socket echoes and send responses (dedupe by `_id`). The thread joins `conv:<id>` (`join_conversation`) for `new_message` / `typing`.
- **Push:** `PushEffects` registers the FCM token (`lib/push.ts`, no-op on web) and routes taps through `features/notifications/open.ts` (chat, customer order, vendor order by `mode`+`subOrderId`, withdrawals, application). The notifications list uses the same helper. Needs `google-services.json` in the build; without it push is skipped silently.
- **Wallet (vendor + rider):** `features/wallet` (api, types, `EarningsScreen`, `PayoutMethodForm`). The money screens are shared routes with `?mode=vendor|rider` (`/withdraw`, `/withdrawals`, `/payout-methods`, `/wallet-history`; `useWalletMode()`). Fee previews use `/settings/public`; the server decides.
- **Photos in forms:** `usePhotoUpload(title)` → `choose()` opens camera/gallery and resolves with the uploaded file; `<ImageUploadBox>` is one slot (logo, document). `components/media/`.
- **Tabs above lists:** `<SegmentTabs>` (scrolls sideways, optional count badge).
- **Suspended:** `session:revoked { reason: account_suspended | account_banned }` or a "Your account is suspended" login error → `/suspended` (`blockedAccount()` in `lib/api/errors.ts`).
- **Sheets & dialogs:** `BottomSheet` (title, body, footer) for choices and forms; `ConfirmDialog` for destructive yes/no.
- **Status UI:** `<StatusPill label={t(`status.subOrder.${s}`)} tone={SUB_ORDER_TONE[s]} />` — tones in `features/orders/status.ts` (APP_SPEC §9), labels in i18n `status.*`.
- **Money:** always `<Money value={n} />` / `formatGNF(n)`. Values are integers.
- **Images:** always `source={img(url, 'thumb' | 'card' | 'full')}` (`lib/image.ts`) — Cloudinary resizes to the shown size (WebP when possible); other URLs pass through.
- **Network:** `OfflineBanner` (root layout, above a nested `SafeAreaProvider` so screens measure their safe area below it). RTK Query `refetchOnReconnect` is fed by `lib/network.ts` (NetInfo + AppState) through `setupListeners` in the store.
- **Ads:** `<AdBanner placement>` (carousel) + `<AdInterrupt placement>` (popup / interstitial, once per session, each ad once a day) on home, search and category.
- **Errors:** `getApiErrorMessage(err)` (the same idea as the dashboard `utils/apiError.ts`) → toast or inline.

## Theme (from Figma, provisional; refine from detailed frames)
- Primary purple ≈ `#8B5CF6`, with a light tint for chips/backgrounds ≈ `#F3EEFF`. Auth headers use a purple gradient.
- Success green `#15803D`, warning amber `#F59E0B` (icons only; amber text uses `warningText` `#B45309`), danger red `#DC2626`, info `#2563EB`, text dark `#1F1F29`, muted grey. Text colours keep ≥ 4.5:1 on white (2026-10-21).
- Rounded cards (radius 12–16) and pill buttons (radius 999). Clean sans font (Figma looks like DM Sans / Inter; confirm with the user).
- Light mode only at first (the Figma is light). Keep tokens so dark mode can be added later.

## Environment
- `EXPO_PUBLIC_API_URL` (default `http://localhost:7000/api/v1`)
- `EXPO_PUBLIC_SOCKET_URL` (default `http://localhost:7000`)
- Put them in `.env` (git-ignored). Commit an `.env.example`.
- Builds take the API URL from `eas.json`; OTA updates too (`scripts/ota-update.mjs`). `GOOGLE_MAPS_API_KEY` is an EAS environment variable read by `app.config.ts`. Expo CLI here loads only `.env` (not `.env.production`), and real environment variables win over it. Release steps: [RELEASE.md](RELEASE.md).
