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
- [x] OfflineBanner (NetInfo)
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
- [x] Suspended screen (app/suspended.tsx)
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
- [x] "Customers also bought" in the cart
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
- [x] Contract test (scratchpad `refunds-contract.mjs`): 30/30 on 2026-10-21 (first run 24/30 = the payment-lookup bug above)

## Phase 8 — Rider (moto) ✅ (2026-10-21)
- [x] KYC `app/kyc/rider.tsx`: partner type (moto / bus driver) → vehicle → identity + documents → routes (bus drivers: station pairs) → payout (optional) → review; draft saved per step; pending / approved (→ open rider mode) / suspended states
- [x] Online toggle (Deliveries header + Profile): asks for location first (settings link if refused); `useRiderPresence` in `app/rider/_layout` sends the position every ~20 s while online and the app is open (the server forwards it live to the customers of my running legs)
- [x] Deliveries tab: New · Ongoing · History (server `type=new|ongoing|completed`, paged); card = route, distance, my fee, cash to collect; Accept / Decline (reason chips) on new ones; cash-vs-limit strip; slide-in alert on `delivery:assigned`
- [x] Step screen `app/rider/delivery/[id].tsx`: one big button (accept → leave → store's code → collect cash + customer's code → done), map, pickup + drop cards (landmark, directions, gate photo), Directions (Google Maps), Message store / customer, wrong-code countdown + lock banner, live refresh on `delivery:status_changed`; customer phone never shown (chat)
- [x] Cash `app/rider/cash.tsx`: owed / declared / limit, declare (Orange Money · MoMo with reference · office · from earnings) + receipt photo, history with rejection reason; withdraw keeps the owed cash back (earnings hero says so)
- [x] Earnings (shared screen, rider mode + cash row), Profile (online, rating, today, completed; cash, my stores, vehicle & identity, payout methods), `app/rider/stores.tsx` (linked · requests · find a store + ask to join), `app/rider/vehicle.tsx` (edit vehicle / vest / area; identity read-only)
- [x] Chat: quick replies for rider → customer (J'arrive · Je suis arrivé · Je suis au portail · Pouvez-vous sortir ?)
- [x] Server: rider list tabs + paging + cash to collect; items + cash on the rider's track; `GET /wallets/me/cod-settlements`; `cashDeclared` in the rider summary; COD rejection needs a reason + rider notified both ways (dashboard: reason modal, proof link); fixed: after the 15-min PIN lock the attempts never reset (one more mistake locked it again)
- [x] Contract test (scratchpad `phase8-contract.mjs`) 47/47; jest 149/149; e2e 129/129; app + dashboard typecheck / lint clean
- [ ] Open: APP_SPEC §10 #8 (COD above the rider cash limit) still waits for the client

## Phase 9 — Bus driver (transit) ✅ (2026-10-21)
- [x] KYC routes (station pairs) — built in Phase 8; now a shared `RoutesEditor`, also on "Vehicle & identity" so an approved bus driver can update routes (`PATCH /riders/me` transitRoutes)
- [x] Line-haul legs use the same Deliveries tabs, cards and step screen as moto riders (rider mode; "My stores" hidden for bus drivers)
- [x] Station relay on the step screen: `ShowCode` (big digits + who to show it to) + the code sheet with the right person to ask. Rule checked in the server (e2e + contract): at a station each side shows one code and types the other's — the receiver shows `incomingHandoverPin` (the giver types it to hand over), the giver shows `outgoingPickupPin` (the receiver types it to pick up). `pickupFrom` / `handoverTo` in `features/rider/status.ts` name the store / customer / bus driver / moto rider
- [x] Station pickup orders: the bus leg ends with the customer at the destination station (their name, their code, the cash)
- [x] Vendor: assigning a bus leg lists the drivers of that exact route first ("Fait ce trajet"); a leg leaving a far station is sorted by distance (linked riders first only for legs leaving the store)
- [x] Privacy (server): the customer's address / phone only reach the rider of the leg that ends with the customer (not the first-mile rider or a relay bus driver)
- [x] Contract test (scratchpad `phase9-contract.mjs`) 30/30 (full intercity COD relay + station pickup); Phase 8 contract re-run 47/47; jest 149/149; e2e 129/129

## Phase 10 — Jobs, CV, subscriptions (shared) ✅ (2026-10-21)
- [x] Jobs `app/jobs.tsx` (search, job categories, "% match" from my CV skills/languages — same formula as the server — or a "fill your CV" prompt), `app/job/[id].tsx` (match card, Apply sheet with the CV that will be sent + note; "Applied" / "Manage" / "Closed" states), `app/jobs/applied.tsx`, `app/jobs/applications.tsx` (status chips), `app/jobs/application/[id].tsx` (progress, interview card: confirm + map link, CV sent, message the recruiter, withdraw)
- [x] CV `app/cv.tsx` + `app/cv/edit.tsx?section=about|experience|education|skills|worker`: completeness, photo, summary suggestion (template, the user edits it), experience / education / skills / languages; the CV PDF is made on the phone (expo-print → upload → `generatedCv`), or the user's own PDF/photo (expo-document-picker → `uploadedResume`); open / share; worker listing (profession, GNF/h, service type)
- [x] Plans `app/subscriptions.tsx` (building a CV and applying are free; a plan boosts the profile — APP_SPEC §10 #1 / #6 built with the recommended default) + shared `PayFeeSheet` (online methods only) → payment screen
- [x] Recruiter `app/recruiter.tsx` (counts, live / drafts / ended), `app/recruiter/job/form.tsx` (4 steps → draft or publish 5 000 GNF), `app/recruiter/job/[id].tsx` (numbers, edit, publish / republish, close, candidates by match or date), `app/recruiter/candidate/[id].tsx` (profile, paid unlock of phone / e-mail / CV, shortlist, interview invite / reschedule, hire, reject, message)
- [x] Spontaneous application from a store page (paid; the store sees it once paid) + vendor inbox `app/vendor/applications.tsx`; Profile "Emploi" section in every mode; home "Jobs near you" → see all
- [x] Server: `GET /jobs/my` (+ counts), `GET /jobs/applications/:id`, withdraw, confirm interview, apply-twice 409, recruiter statuses limited, drafts private, `myApplication` / `isOwner` / `isOpen` on details (optional auth), fees online only, CV-unlock validation, reschedule ≠ new interview, CV generator no longer saves a fake file (summary suggestion only), `generatedCv` + null removes files, subscription retry + renewal stacking, demo plans in the seed
- [x] Contract test (scratchpad `phase10-contract.mjs`) 48/49 — the 1 was a wrong assertion (the notice went to the mode the job was posted from, checked in the DB; assertion fixed); jest 149/149; e2e 129/129; app typecheck / lint clean
- [ ] User: Cloudinary must allow PDF delivery (Settings → Security → "Allow delivery of PDF and ZIP files"), else CV links won't open

## Phase 11 — Polish & release (2026-10-21)
- [x] Ads: `AdInterrupt` (popup card / full-screen interstitial with a 3 s close lock) on home, search and category — at most one per app session, the same ad once a day (`k24.adsSeen`), only while the screen is in front; `AdBanner` is a swipeable carousel (auto every 5 s, one impression per banner). Demo seed: 2 home banners, a home popup, a category interstitial
- [x] Performance: `img(url, 'thumb'|'card'|'full')` (`lib/image.ts`) asks Cloudinary for the shown size in WebP/auto quality — a 64 px thumbnail no longer downloads the 1280 px upload (37 files); every paged list was already a FlatList
- [x] Accessibility: icon-only buttons and tap targets scanned (all labelled, ≥ 44 px or hitSlop); text colours raised to ≥ 4.5:1 (textSubtle, success, danger, info; new `warningText` for amber text). The brand purple (4.2:1 under white text) is unchanged — Figma colour
- [x] Interim app icon / adaptive icon / splash / favicon (purple, "K 24H") instead of the Expo template — replace with the real logo; app name "Kadou24h"
- [x] EAS: channels per profile, production = AAB, OTA updates (`expo-updates`, `runtimeVersion` = app version, `npm run update:preview|production -- "msg"` via `scripts/ota-update.mjs`, API URL from eas.json), Maps key from the `GOOGLE_MAPS_API_KEY` EAS variable (`app.config.ts`). See [RELEASE.md](RELEASE.md)
- [x] Server: `GET /cart/suggestions` (customers also bought) — direct check 12/12 on a throwaway DB; jest 150/150

### Carry-over from Phases 1–6 (do all of these before release; user asked 2026-10-20)
- [x] Suspended account full screen (`app/suspended.tsx`: reason, WhatsApp / call / e-mail) from sign-in and live from the socket — done in Phase 7
- [x] OfflineBanner (NetInfo): strip above every screen (nested SafeAreaProvider, so nothing is covered) + "Back online"; RTK Query `refetchOnReconnect` via `setupListeners` + NetInfo/AppState — 2026-10-21
- [x] "Customers also bought" in the cart — `GET /cart/suggestions` — 2026-10-21
- [ ] Social login — waits for the user: Google Cloud OAuth clients (Web client ID for the app, Android client with the EAS SHA-1), `GOOGLE_CLIENT_IDS` on the server. Then add `@react-native-google-signin/google-signin` (native, new APK), the button when `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set, and the phone step after `requiresPhone`. Not added before: it is not in Expo's tested module list for SDK 58, so it should go in with a test build
- [ ] Real logo asset → BrandLogo, app icon, splash (interim icon in place)
- [ ] User setup: deploy server to nizam7000, Firebase (google-services.json + FIREBASE_SERVICE_ACCOUNT_BASE64), real Google Maps key, then rebuild the APK
- [x] **§10 #8 + #9 fixed (2026-10-21, best-practice options):** COD only up to the rider cash limit per store (summary `cod`, server refusal, greyed COD option); online orders reach the store once paid (`pending_payment`, 30-min window, sweep cancels + cart restore, late payment → refund). e2e 157/157 (28 new checks)
- [ ] Client answers for APP_SPEC §10 #2–5, #7 (defaults stay until then)

## Client feedback after installing (2026-10-23)
- [x] Open dispatch: "Near me" tab for riders (distance, earnings, cash, Take it / Not for me), top banner + push for new offers; store legs show "Looking for a rider" / "Waiting for X until…" / "Still nobody"; the store's pick has 3 min. Server sweep + e2e (22 checks)
- [x] COD: fees (service, tax, delivery) paid online first, products in cash; checkout "Pay the fees with", order "Pay the fees", online / cash split; dashboard order shows it. e2e (COD section + updated promo / part-cancel checks)
- [x] Demo payments in release builds (server `PAYMENT_MODE=demo` until a gateway is connected)
- [x] Worker profile photo optional
- [ ] AI for the CV: only a template today — needs an AI provider account (client to decide)
- [x] Moto-taxi (A → B): home card → pick start + destination on the map → price → order; live ride screen (rider on the map, cancel, rate); rider "Near me" shows passengers too, ride steps screen (call, directions, arrived / start / finish), history for both; dashboard Moto-taxi page + Settings → Moto-taxi prices. Server e2e 30 checks
- [x] Moto-taxi: client chose free first, then a monthly rider subscription (never a commission). Built 2026-10-24, OFF by default: dashboard Settings → Moto-taxi → "Riders need a subscription" + free days; plans with audience moto_driver; rider banner on "Near me" + profile row
- [x] Payment gateway adapter (server modules/payment/gateway): demo now; an aggregator = one gateway file + PAYMENT_MODE=live + PAYMENT_PROVIDER; app opens payment.checkoutUrl
- [x] Client wording (2026-10-24): Offer my services, Publish a job, Invite a friend, Order a moto-taxi, motorbike icons
- [x] Moto-taxi chat (2026-11-19): passenger ↔ rider chat (`type: ride`) with voice notes and photos, open while the ride is accepted / arrived / in progress, read-only after; "Message the rider" on the ride, chat icon on the rider's ride screen, ride number in the chat list, ride safety notice (fare in cash). Optional photo of the pickup spot when ordering, shown on the rider's offer and ride screen and in the dashboard ride details. Server e2e +13 checks (504/504)
- [x] Store order progress (2026-11-19): step-by-step timeline on the store's order (received → accepted → preparing → ready → handed to the rider → on the way → delivered → money in the wallet, with times, rider name, intercity leg, COD "waiting for the rider's cash")

## Promo codes, cancel one store, block in chat (2026-10-22, client agreed)
- [x] Server: coupon module (admin CRUD, checkout evaluation + spread over stores, one use per customer, total limit, released on full cancellation, revenue − discounts); `POST /orders/:id/sub-orders/:subOrderId/cancel` (COD service fee moves); chat block with hidden delivery + `blockedByMe`. e2e 285/285 (39 new)
- [x] Dashboard: Promo codes page (stats, list, create/edit, uses drawer); order details show the code; overview revenue note
- [x] App: checkout promo field (apply / remove, translated reasons), "Cancel this store" on each store card, chat ⋯ menu (block / unblock), blocked banner, Profile → Blocked people
- [ ] WhatsApp support number — the client agreed but hasn't sent it

## Worker bookings (2026-10-22, client rules)
- [x] Server: booking module (request → accept/decline/expire → done → confirm/auto 48 h → review), contacts only after acceptance, booking chat, penalties (rolling 30 days, worker 3 tiers, customer limit, admin lift/soften), worker reviews with photos (rating recomputed), paid visibility (30-day trial, service-provider plans extend `listedUntil`, reminders), work photos, sweep. e2e 246/246 (61 new)
- [x] Dashboard: Bookings page (bookings with details + admin cancel, cancellation penalties with lift/soften, worker reviews hide/show), worker modal shows visibility, penalty and work photos; plan form hint
- [x] App: Book button + `/book/[id]` (day/time chips, address, job, photos), `/booking/[id]` (both sides, all actions), `/bookings` + `/worker-bookings`, worker home (visibility, penalties, requests, upcoming, estimated earnings), worker page reviews + work photos, worker form work photos, safety notices (5 places), worker plans filter, notifications + socket

## Become a worker (2026-10-21)
- [x] Server: worker approval on professional profiles (shared `reviewFields` / `applyReview`), `workingHours`, `idDocument`, `POST /me/worker-application/submit`, `GET /me/worker-summary`, admin list / detail / review, public = listed + approved (ID, CV files and review data never public — the CV files were public before: fixed), chat only with approved workers, legacy listed workers approved at start, demo seed workers submitted + approved. e2e 185/185 (28 new)
- [x] Dashboard: Workers page (counts, status tabs, search) + details modal (profile, ID document, history, review actions)
- [x] App: `/worker-profile` (start / status / dashboard with chats + rating + listing switch), `/worker-profile/edit` (Figma form), Profile "Become a worker" (customer + vendor), CV card links there (old worker form removed), working hours on the public worker page, notification → worker page
- [x] Bookings / "Accept job" / earnings — built 2026-10-22 (see Worker bookings)

## Backend tasks found while planning
- [x] `GET /wallets/me/summary` (today/period earnings, counts, chart series) for vendor and rider — 2026-10-19
- [x] PIN exposure verified + fixed: `deliveryPin` / `pickupPin` added to the order details; middle-leg station PINs no longer leak to the customer or store — 2026-10-19
- [ ] (❓) Block user API, coupon logic — only if the client confirms

## Log
- 2026-10-24 — Client wording + motorbike icons; moto-taxi rider subscription (off by default); payment gateway adapter; phone uploads via XMLHttpRequest (expo/fetch rejects uri parts); voice notes recorded as AAC and played as MP3.
- 2026-10-23 — Moto-taxi (A → B rides): price first, nearest riders, cash, ratings; dashboard page + prices.
- 2026-10-23 — Open dispatch (nearest riders, first to accept), COD fees paid online first, demo payments, worker photo optional.
- 2026-10-22 — Promo codes (Kadou24h pays), cancel one store's part, block in chat (silent).
- 2026-10-22 — Worker bookings with the client's rules: direct payment (no commission), penalties, reviews with photos, paid visibility (30 days free), safety notices.
- 2026-10-21 — Become a worker with admin approval (server, dashboard, app); worker dashboard with real data only. Public worker responses no longer include CV files.
- 2026-10-21 — §10 #8 (COD ≤ rider cash limit per store) and #9 (online orders: pay first, 30-min window, then the store) built in server, app and dashboard. e2e 157/157.
- 2026-10-21 — Phase 11 (polish & release): ads popup/interstitial + banner carousel, offline banner + refetch on reconnect, customers also bought (server `GET /cart/suggestions`), Cloudinary-sized images, contrast fixes, interim icon, OTA updates + channels + Maps key from EAS env. New native modules: netinfo, expo-updates.
- 2026-10-19 — Project created, all 3 roles' Figma reviewed, docs written.
- 2026-10-20 — Phase 7 (vendor). Server: modify order reduce-only, rider list only for the order's store, rejected products can be fixed, unapproved products hidden, product locations follow the store. App: suspended screen.
- 2026-10-20 — Phase 6 (profile & settings). Server: delete-account guard. App: password change keeps this phone signed in.
- 2026-10-20 — Phase 5 (chat + push). Server: chat start by subject, phone leak in chats fixed, newest-first messages, unread count, push channel, own-token delete.
- 2026-10-19 — Phase 4 (customer buy): addresses + map, cart, checkout, payment, orders, tracking, reviews, disputes. Server: payment polling + dev confirm, station route/ETA at checkout, multi-status filter, reviewed flag, rider name on orders.
- 2026-10-19 — Phase 3 (customer browse) built on real demo data; sign-out confirmation dialog.
- 2026-10-19 — Phase 1 foundation + Phase 2 auth built and wired to the API.
- 2026-10-19 — Backend prep done (summary endpoint, PINs in order details, `deliveredAt`, vendor rider populate fix). Server e2e 126/126, jest 149/149.
