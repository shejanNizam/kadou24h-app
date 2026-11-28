# Kadou24h — Mobile App

The mobile app for **Kadou24h**, a marketplace, delivery, moto-taxi and jobs platform built for Guinea (West Africa). It is **one app with three modes**:

- **Customer:** for everyone.
- **Seller:** unlocked after the store is approved.
- **Rider:** moto delivery, moto-taxi, or a bus driver for deliveries to other cities.

**Stack:** Expo SDK 58 · React Native 0.88 · React 19 · TypeScript (strict) · Expo Router · Redux Toolkit + RTK Query · Socket.io · i18next

**Part of a three-project system:**

| Project | What |
|---|---|
| [kadou24h-server](../kadou24h-server) | Node.js / Express / MongoDB API (659 end-to-end checks) |
| **kadou24h-app** (this) | Mobile app for Android and iOS, with a web preview for development |
| [kadou24h-dashboard](../kadou24h-dashboard) | Admin panel: Next.js, Ant Design |

---

## Features

### Customer
- **Shopping:** browse stores and products, search, favourites, cart, promo codes.
- **Checkout:**
  - addresses with map pin, neighbourhood and gate photo;
  - local delivery, delivery to another city, or pickup at a bus station;
  - Orange Money, Mobile Money, card or **cash on delivery**.
- **Order tracking:**
  - live tracking on a map;
  - a 4-digit delivery PIN given to the rider at handover;
  - the refund status shown at the top of the order;
  - "report a problem" only where it applies.
- **Moto-taxi:** see the suggested price, receive riders' offers, choose one or counter-offer, then follow the ride.
- **Jobs and local services:** job offers, CV, worker bookings with reviews.
- **AI help assistant:** instant answers about orders, fees and delivery. One tap sends the conversation to the support team.

### Seller
- **Store application (KYC)** with documents, then the store profile and opening hours.
- **Products** with photos (compressed before upload) and an approval status.
- **Incoming orders:**
  - accept, prepare, ready;
  - a pickup PIN for the rider;
  - a timeline of every delivery leg (moto → bus → moto).
- **Earnings and riders:** held money and the wallet, withdrawals, and their own network of riders.

### Rider
- **Rider application (KYC)** for moto or bus driver.
- **Online/offline switch**, plus location sharing.
- **Delivery offers** with distance and earnings. The first rider to accept takes the job.
- **Delivery steps:** pickup and delivery PIN checks, and the cash to collect on cash orders.
- **Moto-taxi bids** and earnings.

### Shared by every mode
- **Chat:** text, photos and voice notes. Contact details are masked automatically, and people can report or block.
- **Push notifications** and a notification centre.
- **French and English** (French by default).

---

## Engineering highlights

- **One account, many modes.** Everyone signs up as a customer. Seller and rider are **modes** unlocked by admin approval (`roles[]` + `lastActiveMode`). Each mode has its own tab navigator and route guard, and a red dot shows pending work in the other modes.
- **Server is the source of truth:**
  - fees and totals always come from the API, never computed in the app;
  - TypeScript types mirror the server's field names and enums exactly.
- **RTK Query everywhere:**
  - one API slice with endpoints injected per feature;
  - tag-based cache invalidation and infinite queries for lists;
  - optimistic updates (cart, favourites, assistant messages) that roll back on error;
  - a token-refresh mutex in the base query.
- **Real time.** One Socket.io connection per session, with typed events for new messages, typing, delivery status and ride offers. It reconnects with the refreshed token.
- **Built for low-end Android and slow networks:**
  - images resized through the CDN and compressed before upload;
  - cached queries, pull-to-refresh and Retry on every error state;
  - an offline banner, and data refetched on reconnect.
- **The web preview never crashes.** Every native-only module (maps, secure storage, push, location, camera) has a `.web.tsx` / `.web.ts` fallback, so the whole app can be developed in Chrome device mode.
- **Accessible and localised:**
  - every string goes through i18next;
  - layouts are checked against French, which is about 30% longer;
  - text colours meet WCAG AA contrast;
  - controls have accessibility roles and labels.
- **Releases:**
  - EAS builds (APK for testers, AAB for the Play Store);
  - over-the-air updates on `preview` and `production` channels, with a runtime-version policy;
  - Sentry for crash reporting, plus crash reports sent to the API.

---

## Project structure

```
src/
├── app/                 Routes only (Expo Router, file-based). Screens compose feature components.
│   ├── (auth)/          Login, register, OTP verification, password reset
│   ├── (customer)/      Customer tabs: home, search, orders, chat, profile
│   ├── vendor/          Seller mode: own tab navigator + role guard
│   ├── rider/           Rider mode: own tab navigator + role guard
│   └── …                Detail screens: product, store, order, track, checkout, ride, assistant…
├── features/            One folder per domain: api.ts (RTK Query endpoints), types.ts, components/, helpers
│   ├── orders/  cart/  catalog/  vendor/  rider/  ride/  wallet/  chat/
│   └── jobs/  cv/  booking/  address/  notifications/  profile/  assistant/  auth/
├── components/          Shared UI kit (Button, TextField, BottomSheet, ConfirmDialog, Skeleton…), map, media
├── lib/                 API base query, socket, storage (+ .web), upload, image, i18n, push (+ .web)
├── store/               Redux store: auth, preferences
├── constants/theme.ts   Design tokens (colours, spacing, radius, typography)
└── locales/             fr.json, en.json
```

About 90 screens. No UI library: components are built on React Native primitives with shared theme tokens.

---

## Getting started

**Prerequisites:** Node.js 22, and the [Kadou24h API](../kadou24h-server) running locally.

```bash
npm install
npm run web            # Web preview → http://localhost:8081 (Chrome DevTools → device mode)
npm run android        # Android device or emulator (development build)
```

The app reads `EXPO_PUBLIC_API_URL` (default `http://localhost:7000/api/v1`). On a real phone, use the computer's LAN IP.

| Script | What |
|---|---|
| `npm run web` / `npm start` | Development server |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (Expo config + React Compiler rules) |
| `npm run build:apk` / `build:aab` | EAS builds: tester APK / Play Store bundle |
| `npm run update:preview` / `update:production` | Over-the-air update to a channel |

---

## Documentation

| File | What |
|---|---|
| [docs/APP_SPEC.md](docs/APP_SPEC.md) | Screen-by-screen specification for every mode, with the endpoints and UX decisions |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack choices, folder structure, patterns, SDK gotchas |
| [docs/API_MAP.md](docs/API_MAP.md) | Every endpoint and socket event the app uses |
| [docs/RELEASE.md](docs/RELEASE.md) | Builds, over-the-air updates, store release checklist |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | Phases and progress log |
| [CLAUDE.md](CLAUDE.md) | Project rules, also used by AI coding agents |
