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
Customer detail screens (product/[id], order/[id]…) go at the root Stack. Vendor/rider detail screens go inside `vendor/` / `rider/` so they push over that mode's tabs.

## SDK 58 gotchas (checked in node_modules)
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
- **Server errors** are English. `lib/api/errors.ts` maps the known ones (attempts left, wait Ns, invalid credentials, phone taken…) to i18n keys, and falls back to the server text.
- **Socket → cache:** socket handlers call `api.util.invalidateTags([...])` or `updateQueryData`, never duplicate state.
- **Payments:** `usePaymentFlow(purpose, refId)` → initiate → open the provider URL (`expo-web-browser`) → waiting screen (poll `GET /payments/me` + `payment:successful`) → result.
- **Status UI:** always `<StatusBadge domain="subOrder" value={status} />`, with labels and colours from `lib/labels.ts`.
- **Money:** always `<Money value={n} />` / `formatGNF(n)`. Values are integers.
- **Errors:** `getApiErrorMessage(err)` (the same idea as the dashboard `utils/apiError.ts`) → toast or inline.

## Theme (from Figma, provisional; refine from detailed frames)
- Primary purple ≈ `#8B5CF6`, with a light tint for chips/backgrounds ≈ `#F3EEFF`. Auth headers use a purple gradient.
- Success green, warning amber/orange, danger red `#EF4444`, text dark `#1F1F29`, muted grey.
- Rounded cards (radius 12–16) and pill buttons (radius 999). Clean sans font (Figma looks like DM Sans / Inter; confirm with the user).
- Light mode only at first (the Figma is light). Keep tokens so dark mode can be added later.

## Environment
- `EXPO_PUBLIC_API_URL` (default `http://localhost:7000/api/v1`)
- `EXPO_PUBLIC_SOCKET_URL` (default `http://localhost:7000`)
- Put them in `.env` (git-ignored). Commit an `.env.example`.
