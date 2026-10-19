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
- [ ] UI kit, still to add when first needed: StatusBadge, Money, Skeleton, BottomSheet, ConfirmDialog, Toggle, OfflineBanner (needs NetInfo), status labels map
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
- [ ] `useRequireAuth` login bottom sheet (add with the first guarded action: add to cart, Phase 4)
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
- [ ] Notification tap → deep link (with orders/chat screens)
- [ ] Ratings/reviews in the demo data (needs delivered orders: add to the seed in Phase 4)

## Phase 4 — Customer: buy
- [ ] Addresses (map pin first, gate photo, default)
- [ ] Cart (grouped by store)
- [ ] Checkout (delivery type + station picker, payment, summary from the backend)
- [ ] Payment waiting flow (shared)
- [ ] Orders list, order details (per-store blocks, delivery PIN, cancel rule, modified notice)
- [ ] Live tracking (native map + web fallback), intercity 3-leg timeline
- [ ] Reviews per store, dispute ("Signaler un problème")

## Phase 5 — Chat + notifications + push
- [ ] Conversation list + thread (text, image; voice only customer↔rider)
- [ ] Moderation warnings + restriction banner
- [ ] Report
- [ ] Push notifications (native) + deep links

## Phase 6 — Profile & settings (shared)
- [ ] Account, phone change (OTP), change password, delete account
- [ ] Language, notification prefs, share/referral, logout
- [ ] Support tickets (list, detail with admin reply, create)
- [ ] Mode card + KYC status card
- [ ] Payment history, favorites, my reviews

## Phase 7 — Vendor
- [ ] KYC application (multi-step engine, payout method required)
- [ ] Products: list with approval chips, add/edit (2 steps), stock quick edit, commission notice once
- [ ] Orders: tabs, details, status actions, assign rider, pickup PIN, modify order, new-order alert
- [ ] My delivery partners (invite/requests/linked)
- [ ] Earnings + withdraw + payout methods (shared wallet module)
- [ ] Store profile: open toggle, business info, availability
- [ ] Received applications

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

## Backend tasks found while planning
- [x] `GET /wallets/me/summary` (today/period earnings, counts, chart series) for vendor and rider — 2026-10-19
- [x] PIN exposure verified + fixed: `deliveryPin` / `pickupPin` added to the order details; middle-leg station PINs no longer leak to the customer or store — 2026-10-19
- [ ] (❓) Block user API, coupon logic — only if the client confirms

## Log
- 2026-10-19 — Project created, all 3 roles' Figma reviewed, docs written.
- 2026-10-19 — Phase 3 (customer browse) built on real demo data; sign-out confirmation dialog.
- 2026-10-19 — Phase 1 foundation + Phase 2 auth built and wired to the API.
- 2026-10-19 — Backend prep done (summary endpoint, PINs in order details, `deliveredAt`, vendor rider populate fix). Server e2e 126/126, jest 149/149.
