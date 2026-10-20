# Kadou24h App — Build Plan & Progress

Update the checkboxes and the log at the bottom whenever a step is finished.

Screen details are in [APP_SPEC.md](APP_SPEC.md) and endpoints in [API_MAP.md](API_MAP.md).

## Phase 0 — Setup ✅
- [x] Expo SDK 58 project (default template, `src/app`) — 2026-10-19
- [x] Expo web preview works at `localhost:8081`
- [x] Server CORS: `http://localhost:8081` added to `FRONTEND_URL` in the server `.env`
- [x] Docs: CLAUDE.md, APP_SPEC, API_MAP, ARCHITECTURE, BUILD_PLAN, DESIGNER_REQUIREMENTS_BN

## Phase 1 — Foundation ✅ (2026-10-19)
- [x] Remove the template demo screens
- [x] Theme tokens (colours, spacing, typography) + DM Sans font loading
- [x] i18n (fr/en) + language persistence
- [x] Storage adapter (secure-store / localStorage)
- [x] Redux store + RTK Query base API with refresh-token handling (one shared refresh for parallel 401s)
- [x] Shared types (`types/api.ts`)
- [x] `formatGNF`, phone helpers (`toE164`, `formatNationalPhone`), countdown
- [x] UI kit v1: AppText, Button, TextField, PhoneField, OtpInput, Banner, Divider, TextLink, OptionCard, Screen, PageHeader, EmptyState, ComingSoon, Toast
- [x] UI kit v2 (added in Phases 3–6): Money, Skeleton, BottomSheet, ConfirmDialog, StatusPill + status maps, Switch rows
- [ ] OfflineBanner (needs NetInfo)
- [x] Route groups + 3 tab bars (customer/vendor/rider) with placeholder screens; vendor/rider guarded by role
- [x] Boot redirect by `lastActiveMode` + mode switch (`PATCH /user/me/mode`) in ProfileBasics
- [x] Socket session effects (connect after login, `session:revoked` → sign out)
- [x] `.env.example`; `npx tsc --noEmit` + `npx eslint src` clean; `expo export --platform web` bundles

## Phase 2 — Auth & onboarding ✅ (2026-10-19)
- [x] Splash (purple), language (first launch; also from settings with `?from=settings`)
- [x] Intent: the updated Figma drops the role screen → "or continue as [Vendor] [Rider]" on sign-up (placed above the button; the button label follows it) → after OTP goes to `/kyc/vendor` or `/kyc/rider` (placeholders until Phase 7/8)
- [x] Login (phone or email), register (+ optional referral, live password checklist), OTP (6 digits, SMS auto-fill, auto-submit, resend countdown, attempts left)
- [x] Forgot password → OTP → reset (reset token kept in memory, never in the URL)
- [x] Guest mode: "Continue without an account"; orders/chat/profile show a sign-in prompt
- [x] API contract checked against a throwaway server: 21/21 (scratchpad `app-auth-flow.mjs`)
- [x] `useRequireAuth` guard (toast → login → back to the same screen; used by cart, favorite, chat, apply)
- [ ] Suspended screen (now: the login error shows the reason; session:revoked signs out)
- [ ] Social login (native only; needs Google/Apple client IDs → `EXPO_PUBLIC_GOOGLE_CLIENT_ID`)
- [ ] Real KADOU 24H logo asset (BrandLogo is a temporary icon + wordmark)

## Phase 3 — Customer: browse ✅ (2026-10-19)
- [x] Demo data: `npm run seed:demo` + `npm run dev:demo` in the server (separate `kadou24h-demo` DB)
- [x] Home: deliver-to (default address), bell + cart badges, search, categories, home banner, jobs near you, popular products, popular workers; pull-to-refresh
- [x] Search: Products | Workers tabs, debounced text, filter sheet (category, price, rating, stock, distance from the address, sort), infinite scroll, search banner; "See all" from Home switches the tab/sort
- [x] Category page (+ category banner, same filters), all-categories page
- [x] Product details: gallery, price/discount, stock, store card → store page, features, in the box, reviews, ❤ favorite (optimistic), add-to-cart / stepper
- [x] Store page (info, hours, products), worker page (chat button → Phase 5), read-only job page (apply → Phase 10)
- [x] Notifications list (today/earlier, unread, mark all read)
- [x] Add-to-cart from cards (Add → stepper), guest → sign in → back to the same screen
- [x] Contract test 26/26 against the demo DB (scratchpad `phase3-contract.mjs`)
- [x] Server fix: product details and customer tracking no longer leak the store phone (e2e 129/129)
- [x] Notification tap → deep link (done in Phases 4–5: order, chat)
- [x] Ratings/reviews in the demo data (done in the Phase 4 seed)

## Phase 4 — Customer: buy ✅ (2026-10-19)
- [x] Addresses: list (= "Livrer à" picker: tap → default), add/edit in 2 steps (map pin + my location → details, gate photo upload, receiver), delete with confirm
- [x] Map: `components/map/AppMap` (react-native-maps native, Leaflet/OSM iframe on web) with picker pin + markers
- [x] Cart grouped by store: steppers, unavailable items, closed-store block, clear with confirm
- [x] Checkout: address, local / intercity / station pickup (+ station sheet, route + ETA), instructions, 4 payment methods, server summary per store, COD notes
- [x] Payment waiting screen (shared, polls + socket, retry, pay later; dev-only simulate buttons)
- [x] Order placed screen; Orders tab (All / Ongoing / Delivered / Cancelled, infinite)
- [x] Order details: per-store card (progress, PIN, rider without phone, legs timeline, modified notice, COD amount), pay now, cancel sheet (rule), dispute sheet + replies, review sheet
- [x] Live tracking screen (join_delivery + rider:location_updated)
- [x] Live refresh: order/payment/delivery socket events invalidate the cache (SessionEffects)
- [x] Notification tap → order
- [x] Demo seed: 2 delivered + reviewed orders, 1 on its way with the demo rider
- [x] Contract test 37/37 (scratchpad `phase4-contract.mjs`), server jest 149/149, e2e 129/129
- [ ] "Customers also bought" in the cart (no endpoint yet)
- [ ] Android release: Google Maps API key in app.json

## Phase 5 — Chat + notifications + push ✅ (2026-10-20)
- [x] Conversation list per mode (customer / vendor / rider tabs) with unread badges
- [x] Thread: text, photo, voice notes (customer ↔ rider only), day separators, typing…, read, older pages on scroll-up, masked-contact notice, safety notice
- [x] Start chats from: store page, worker page, order card (store / rider)
- [x] Moderation: restriction banner + composer locked (from `/user/me` moderation)
- [x] Report a message (long press)
- [x] Push: FCM token registered after sign-in, removed on logout; tap → chat / order / notifications; no banner for the chat on screen
- [x] Server: chats start by subject (no free recipient, no mode spoofing), no phone/email in chats, store shown as the store, newest-first messages, unread-count endpoint
- [x] Contract test 26/26 (scratchpad `phase5-contract.mjs`), server jest 149/149, e2e 129/129
- [ ] **Firebase setup (user):** google-services.json in the app + FIREBASE_SERVICE_ACCOUNT_BASE64 on the server, then rebuild the APK

## Phase 6 — Profile & settings (shared) ✅ (2026-10-20)
- [x] One profile screen for all modes (`features/profile/components/ProfileScreen`): account header, mode card, customer extras, settings, help, sign out, version
- [x] Mode card: switch to a mode I hold, or vendor / rider application status (draft, pending, to fix + admin note, rejected, suspended) → KYC (Phase 7/8)
- [x] Account: photo (upload), name, phone change with SMS code, change password (this phone stays signed in, others signed out), delete account with confirm + clear blockers
- [x] Notification settings (6 switches, saved instantly), language, share with referral code
- [x] Support: my requests, new request (topic, urgency, details, 3 screenshots), detail with the team's answer, WhatsApp if configured, live `ticket_update`
- [x] Favorites, payment history (online payments), my reviews
- [x] Server: delete-account guard (orders/deliveries in progress, COD cash, wallet money)
- [x] Contract test 25/25 (scratchpad `phase6-contract.mjs`), server jest 149/149, e2e 129/129

## Phase 7 — Vendor ✅ (2026-10-20)
- [x] "Become a vendor" (`app/kyc/vendor.tsx`): 5 steps (store, map pin, documents, payout, review), draft saved per step, then pending / approved (→ switch to vendor mode) / suspended screens; admin note shown when sent back
- [x] Products tab: All / Live / To review / Out of stock, approval chips + admin note, low-stock badge, "for sale" switch, quick stock sheet
- [x] Add/edit product (`app/vendor/product-edit.tsx`): 2 steps, ≤ 5 photos (first = cover), category + subcategory, price/promo with live "you get ≈" line, stock, alert, prep time, features, in the box, delete; commission notice on new products
- [x] Orders tab: New (count badge) / In progress / Delivered / Cancelled, payment chip (COD / paid / payment pending), open/closed switch in the header
- [x] Order details (`app/vendor/order/[id].tsx`): pickup PIN card, customer (call + chat), address map + gate photo, legs with assign / chat / track, items + modify sheet (reduce only), money (commission, you get, COD note), refuse/cancel sheet with reasons, next step button
- [x] New-order banner in vendor mode (socket) + push tap → the order
- [x] My riders (`app/vendor/riders.tsx`): linked / requests / invite (search by name or number), accept, decline, remove
- [x] Earnings (shared `features/wallet`): withdrawable hero, in escrow / awaiting rider cash / total / commission with explanations, 7d–12m bar chart, today; withdraw (fee + "you receive" live), withdrawals history, payout methods, wallet history — all take `?mode=` for the rider later
- [x] Store profile: store card (open switch, rating, today), store details (`/vendor/store`), opening hours (`/vendor/hours`), riders, reviews, payout methods
- [x] Server: vendor order tabs (multi-status + payment info), modify order (reduce only, never empty, settings commission, customer notified), available riders only for the order's store, rejected product → back to review when fixed, unapproved products hidden from others, products follow the store's map pin, `/products/my-products?statusTab=in_review`
- [x] Demo seed: TechHub has 1 new + 1 preparing order, 1 pending + 1 rejected product; 4 more store types
- [x] Contract test 61/61 (scratchpad `phase7-contract.mjs`), server jest 149/149, e2e 129/129
- [ ] Received job applications → Phase 10 (jobs)

## Refunds with admin approval ✅ (2026-10-20, between Phase 7 and 8)
- [x] Server: cancellations (store / customer / admin) and store item changes of online-paid orders open ONE pending refund request per order (lines add up; whole order cancelled → service fee + tax too); never more than paid − refunded − requested; COD / unpaid → nothing
- [x] Server: `PATCH /payments/admin/refunds/:id` approve (amount ≤ requested, transfer reference) or reject (reason); atomic; customer notified (`refund_update`); order → refunded / partially refunded
- [x] Dashboard: Payments → "Refunds to approve" card + tab (default filter), reason lines, Decide modal; manual refund takes a reference
- [x] App: refund card on the order (being checked / refunded + reference / declined + reason); cancel texts no longer promise an instant refund
- [x] Fixed: the payment lookup never matched (order id stored as a string), so refunds fell back to the order total, which shrinks after store changes
- [ ] Contract test (scratchpad `refunds-contract.mjs`): first run 24/30, the failures were the payment-lookup bug above, now fixed; re-run blocked today by the OTP daily limit in the shared cloud Redis (see memory)

## Phase 8 — Rider (moto)
- [ ] KYC (partner type, vehicle, ID)
- [ ] Online toggle + location updates
- [ ] Deliveries list (new/active/history), accept/decline
- [ ] Active delivery step screen (going → pickup PIN → navigate → handover PIN, COD amount)
- [ ] Cash to hand over + COD declaration + history; withdraw blocked while owing
- [ ] Earnings, profile, my stores, quick-reply chat chips

## Phase 9 — Bus driver (transit)
- [ ] KYC routes (station pairs)
- [ ] Line-haul deliveries list
- [ ] Show code / Enter code relay screens (confirm the PIN ownership rules in the server first)

## Phase 10 — Jobs, CV, subscriptions (shared)
- [ ] Job list/details/apply, my applications + detail (interview)
- [ ] CV builder + upload + "generate" (template) + download/share
- [ ] Subscription plans (admin data) + subscribe via the payment flow
- [ ] Worker listing toggle
- [ ] Recruiter: job operations, 4-step create, publish (5 000 GNF), candidates, unlock CV, actions, interview invite
- [ ] Spontaneous application

## Phase 11 — Polish & release
- [ ] Ads popup/interstitial
- [ ] Performance pass (lists, images), accessibility (tap targets, contrast)
- [ ] App icon, splash (purple), app name "Kadou24h"
- [ ] EAS builds (Android first), OTA updates

### Carry-over from Phases 1–6 (do all of these before release; user asked 2026-10-20)
- [x] Suspended account full screen (`app/suspended.tsx`: reason, WhatsApp / call / e-mail) from sign-in and live from the socket — done in Phase 7
- [ ] OfflineBanner (NetInfo)
- [ ] "Customers also bought" in the cart (needs a server endpoint)
- [ ] Social login (needs Google/Apple client IDs from the user)
- [ ] Real logo asset → BrandLogo, app icon, splash
- [ ] User setup: deploy server to pagla7000, Firebase (google-services.json + FIREBASE_SERVICE_ACCOUNT_BASE64), real Google Maps key, then rebuild the APK
- [ ] Client answers for APP_SPEC §10 (#1–9); **#8 COD above the rider cash limit** and **#9 unpaid online orders** are real bugs, so fix them once the client picks an option

## Backend tasks found while planning
- [x] `GET /wallets/me/summary` (today/period earnings, counts, chart series) for vendor and rider — 2026-10-19
- [x] PIN exposure verified + fixed: `deliveryPin` / `pickupPin` added to the order details; middle-leg station PINs no longer leak to the customer or store — 2026-10-19
- [ ] (❓) Block user API, coupon logic — only if the client confirms

## Log
- 2026-10-19 — Project created, all 3 roles' Figma reviewed, docs written.
- 2026-10-20 — Phase 7 (vendor). Server: modify order reduce-only, rider list only for the order's store, rejected products can be fixed, unapproved products hidden, product locations follow the store. App: suspended screen.
- 2026-10-20 — Phase 6 (profile & settings). Server: delete-account guard. App: password change keeps this phone signed in.
- 2026-10-20 — Phase 5 (chat + push). Server: chat start by subject, phone leak in chats fixed, newest-first messages, unread count, push channel, own-token delete.
- 2026-10-19 — Phase 4 (customer buy): addresses + map, cart, checkout, payment, orders, tracking, reviews, disputes. Server: payment polling + dev confirm, station route/ETA at checkout, multi-status filter, reviewed flag, rider name on orders.
- 2026-10-19 — Phase 3 (customer browse) built on real demo data; sign-out confirmation dialog.
- 2026-10-19 — Phase 1 foundation + Phase 2 auth built and wired to the API.
- 2026-10-19 — Backend prep done (summary endpoint, PINs in order details, `deliveredAt`, vendor rider populate fix). Server e2e 126/126, jest 149/149.
