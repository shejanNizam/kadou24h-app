# Kadou24h App — Screen Spec (source of truth)

This spec merges three things:
- the user's Figma (3 roles), reviewed on 2026-10-19
- the designer requirements doc ([DESIGNER_REQUIREMENTS_BN.md](DESIGNER_REQUIREMENTS_BN.md))
- the real backend (`../kadou24h-server`)

**Priority when they conflict:** backend behaviour > this spec > Figma visuals.

Legend: 🆕 not in the Figma (we add it) · ✏️ changed from the Figma · ❌ removed from the Figma · ❓ waiting on the client · `METHOD /path` = API under `/api/v1` (full list in [API_MAP.md](API_MAP.md))

---

## 0. Product in one page
- **Market:** Guinea. French is the main language, English second. Currency **GNF** (integers, no decimals). Phone format `+224`.
- **Payments:** Cash on Delivery (COD), Orange Money, MTN Mobile Money, Card.
- **Money rules:**
  - The vendor pays **10% commission per sale (minimum 1 000 GNF)**.
  - The customer pays a **platform fee (1 000 GNF)** per order.
  - The rider earns the **delivery fee**.
  - Customer money is held in **escrow** until delivery.
- **Delivery types:**
  - `local` — moto, inside the city
  - `intercity` — 3 legs: moto → bus → moto
  - `station_pickup` — the customer collects at a bus station
- **PIN handovers:** every handover is confirmed with a 4-digit PIN. The receiver shows a code and the giver types it. A rider never *sees* a PIN, they only type one.
- **Jobs:** any user can post jobs (5 000 GNF to publish) or apply. Unlocking a candidate's CV costs 5 000 GNF. A spontaneous application to a store costs 5 000 GNF. Subscription plans (admin-defined) give CV visibility.
- **Chat:** buyer↔seller, customer↔rider (voice only here), worker chats and job chats. Contacts are masked. 3 violations → 24h chat restriction. 5 → account suspended.

## 1. Users and modes
| Mode | How you get it | Tab bar |
|---|---|---|
| **Customer** (everyone) | Sign up | Home · Search · Orders · Chat · Profile |
| **Vendor** | Vendor application → admin approval | Orders · Products · Earnings · Chat · Profile |
| **Rider — moto** (`partnerType: moto`) | Rider application → approval | Deliveries · Earnings · Chat · Profile |
| **Rider — bus driver** (`partnerType: transit`) | Rider application with routes → approval | Deliveries · Earnings · Chat · Profile |

- **Mode switch:** `PATCH /user/me/mode`. It saves `lastActiveMode`, and the app opens in that mode next time. The entry points are a card at the top of every Profile and a long-press on the Profile tab (optional).
- `roles[]` contains `vendor`/`rider` **only while that profile is approved and active**. Suspension removes the role, so the app must fall back to Customer mode.
- **Application states** (vendor and rider): `draft` · `pending` · `needs_changes` (admin note + "Edit & resubmit") · `approved` · `rejected` (reason) · `suspended` (reason). There's a status card for each one in Profile.

## 2. Global rules (every screen)
1. **i18n:** `fr` default, `en`. Language picker on first launch, preselected from the device language. Changeable in Settings. Saved to the server on the user (`language`).
2. **Money:** `formatGNF(125000)` → `125 000 GNF`. Hide a **Tax** line when it's 0.
3. **Totals come only from the backend.**
4. **Contact privacy:** customers never see a vendor's or rider's phone or email. Vendors may see the customer's name and phone.
5. **Guest browsing** 🆕: Home, Search, Product, Store and Worker pages and the job list are public. Login is asked for (in a bottom sheet, then return to the same place) at: add to cart, favorite, message, apply, checkout, post job.
6. **States on every data screen:**
   - skeleton while loading
   - empty state (one `EmptyState` component: illustration + text + CTA)
   - error with Retry
   - pull-to-refresh
   - global offline banner
7. **Online payment waiting states** 🆕 (one shared flow for all 5 payment purposes: `order`, `subscription`, `job_publish`, `cv_unlock`, `spontaneous_application`):
   `POST /payments/initiate` → provider redirect/USSD → **"Paiement en attente"** screen (poll + `payment:successful` socket) → **Payé** ✅ or **Échec** ❌ + "Try again".
8. **Suspended account** 🆕: on `session:revoked` socket or a 401/403 "suspended" response → full-screen Suspended page (reason + Contact support) → logout.
9. **Notifications:** list with read/unread state, grouped by date (Today / Earlier), "Mark all read". Tapping one deep-links to the order, chat, job or withdrawal. Push via FCM device token (`POST /device-token`).
10. **Ads** 🆕: `GET /advertisements?placement=` with types `banner` / `popup` / `interstitial` and placements `home` / `category` / `search`. Track impressions and clicks.
11. **Images:** compress before `POST /upload`. Max 5 MB, JPG/PNG.

## 3. Navigation map (expo-router)
```
src/app/
  _layout.tsx                 providers: Redux, i18n, Socket, Theme, SafeArea
  index.tsx                   boot: restore session → redirect by mode
  (onboarding)/language.tsx, intent.tsx ("What brings you here?")
  (auth)/login, register, verify-otp, forgot-password, reset-password
  (customer)/(tabs)/index (home), search, orders, chat, profile
  (vendor)/(tabs)/orders, products, earnings, chat, profile
  (rider)/(tabs)/deliveries, earnings, chat, profile
  product/[id]  store/[id]  worker/[id]  category/[id]
  cart  checkout  payment/[paymentId]  order/[id]  order/[id]/track  order/[id]/review  order/[id]/dispute
  chat/[conversationId]  notifications
  kyc/vendor/*  kyc/rider/*  (multi-step application)
  vendor/order/[id]  vendor/product/new|[id]  vendor/riders  vendor/store-settings
  rider/delivery/[id]  rider/cash  rider/stores
  wallet/withdraw  wallet/withdrawals/[id]  wallet/payout-methods
  jobs/index  jobs/[id]  jobs/my-applications  jobs/application/[id]
  recruiter/index  recruiter/job/new|[id]  recruiter/job/[id]/candidates  recruiter/candidate/[id]
  cv/index  cv/edit  subscriptions
  settings/account  settings/addresses  settings/address/[id]  settings/language  settings/notifications
  support/index  support/new  support/[id]  favorites  payments-history
```

---

## 4. Shared modules (built once, used by every role)

### 4.1 Auth (Figma: User → Auth)
| Screen | Endpoint | Notes |
|---|---|---|
| Splash | — | Restore tokens → `GET /user/me` → redirect to `lastActiveMode` |
| Language (first launch only) ✏️ | — | Preselect the device locale |
| Intent "What brings you here?" ✏️ | — | The Figma's role screen. Customer / Vendor / Delivery partner. **Doesn't set a role**: after signup and OTP, Vendor or Rider goes straight to the KYC form. |
| Login ✏️ | `POST /auth/login` `{identifier, password}` | One **"Phone or email"** field (+224 hint). Google and Apple via `POST /auth/social` (native ID token, so **mobile only** and hidden on web). |
| Register ✏️ | `POST /auth/register` | Name, phone (required), **email (optional)**, password (8+ chars, a letter and a digit), 🆕 referral code (optional) |
| Verify OTP | `POST /auth/verify-account`, `POST /auth/resend-otp` | 6 digits, sent by SMS + email. Resend after 60 s, max 10/day. Shows "X attempts remaining". SMS auto-fill. Auto-submits on the 6th digit. |
| Forgot / reset | `POST /auth/forgot-password` → `/auth/verify-reset-otp` → `/auth/reset-password` | By phone |
| Token refresh | `POST /auth/refresh-token` `{refreshToken}` | Silent, inside baseQuery |

### 4.2 KYC application engine (vendor + rider) 🆕
One multi-step form component with a progress bar ("Step 2 of 3"). It saves a draft on every step (`PUT /vendors/me/application` or `PUT /riders/me/application`) and submits with `POST …/application/submit`. After submit → the "Pending approval" screen. The status card lives in Profile.

### 4.3 Chat (Figma: Chat in all roles)
- **List:** `GET /conversations`. Each row shows the counterpart, the **context** (order #, product, job) and a role label (Seller / Rider / Customer / Worker), plus unread counts.
- **Thread:** `GET /conversations/:id/messages`, `POST /conversations/:id/messages`. Socket events: `join_conversation`, `new_message`, `typing`, `message_read`. Mark read with `PATCH /conversations/:id/read`.
- **Voice notes only in customer ↔ rider chats.** Hide the mic elsewhere. Text and images work everywhere.
- **Moderation:** masked content (`•••`) gets a warning under the message: *"Pour votre sécurité, les coordonnées ne sont pas autorisées"*. When restricted, a banner replaces the input: *"Vous pourrez écrire à nouveau le … à …"*.
- **Chat details:** order link, the counterpart's public info (rider: name, photo, vehicle, rating; **no phone or email**), **Report** (`POST /reports`).
- ❌ **Block user**: there's no API ❓
- Rider quick-reply chips 🆕: "J'arrive" · "Je suis arrivé" · "Je suis au portail" · "Pouvez-vous sortir ?"

### 4.4 Notifications
`GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, socket `new_notification`. Settings: `PATCH /user/me/notification-preferences`.

### 4.5 Profile and settings (every role)
- **Account:** photo, name, email, phone change (`/user/me/phone/request` → `/verify`, SMS OTP), **"Change password" row** (`POST /auth/change-password`), ✏️ not a masked password field. Delete account (`DELETE /user/me`) with a red confirmation.
- **Language, Notifications, Share app (referral link), Logout** (`POST /auth/logout`).
- **Support:** ticket list with status (Open · In progress · Resolved · Closed) and the admin reply 🆕 (`GET /support-tickets/me`, `/me/:id`, socket `ticket_update`). New ticket form: type (Order issue · Account access · Payment dispute · App bug · Rider conduct · Vendor inquiry · General · Other), urgency (Low · Medium · High · Critical), description, attachments. A WhatsApp support link only if the client gives a number ❓.
- **Mode card** 🆕 at the top: "Devenir vendeur / livreur", the application status, or "Passer en mode Vendeur/Livreur/Client".

### 4.6 Wallet: earnings and withdraw (vendor + rider)
- `GET /wallets/me` → `availableBalance` (withdrawable), `heldBalance` (escrow), `totalEarned`, `totalCommission`, `totalWithdrawn`, `cashOwed` (riders).
- Earnings home: balance cards with ⓘ explanations, a chart, recent items, withdrawals. Use **`GET /wallets/me/summary?mode=&range=`** for the balances (vendor: `withdrawable`, `inEscrow`, `awaitingCod`; rider: `withdrawable`, `cashOwed`, `cashLimit`), today's numbers, the chart `series` and the header `counts`.
- **Withdraw:** amount ≥ **5 000 GNF**. Shows the fee and **"Vous recevrez: X GNF"** live (fees from `GET /settings/public`). Pick a saved payout method. `POST /wallets/me/withdrawals` → Pending screen.
- **History:** `GET /wallets/me/withdrawals` with text status chips: Pending · Approved · Completed (receipt image + transaction ID) · Rejected (reason). Socket `withdrawal:completed` / `withdrawal:rejected`.
- **Payout methods:** `POST/PATCH/DELETE /wallets/me/payout-methods`. Types: Orange Money / Mobile Money / Bank account ✏️ (the Figma calls it "Bank Card").
- **Ledger:** `GET /wallets/me/transactions`.

### 4.7 Jobs, CV, recruiter (every role)
**Job seeker**
- Job list (`GET /jobs`, search, category chips, location). "% match" shows only when the user has a CV; otherwise show "Create your CV to see your match".
- Job details → **Apply** (`POST /jobs/apply`). No CV → prompt to create or upload one first. A confirmation sheet before sending.
- Success screen (confetti).
- My applications (`GET /jobs/applications/my`) with **status chips**:
  - applied
  - under_review
  - shortlisted
  - interview
  - hired
  - rejected
  - withdrawn
  - pending_payment
- Application detail: messages + interview info (date, time, place, map link) + Reply / Confirm interview.
- Spontaneous application to a store (`POST /jobs/apply-spontaneous`, 5 000 GNF → payment flow).

**CV and professional profile** (`GET/PUT /professional-profiles/me`)
- Fields: summary, uploaded CV, city, map pin (a ✏️ map picker that shows the area name, not raw coordinates), education[], experience[], skills, languages, photo.
- "Generate with AI" (`POST /professional-profiles/me/generate-ai-cv`) is **template-based**, so the copy must not promise real AI.
- Download and share.
- Subscription plans: `GET /subscriptions/plans` (admin data, one or more cards, GNF) → `POST /subscriptions/subscribe` → payment flow. `GET /subscriptions/me`.
- ❓ Paywall position. Recommended: building a CV is free; pay for visibility/AI.
- **Become a worker** ✅ (2026-10-21, designer's "Provider profile creation", user approved): Profile → "Become a worker" (customer and vendor modes) → `/worker-profile`.
  - Form `/worker-profile/edit`: photo, full name, service type, profession, years, GNF/h rate, working days + hours (optional), service area (+ "use my location"), description (≥ 20 chars), skills, **ID document** (only admins see it), link to My CV → "Submit for review".
  - **Admin approval** (Dashboard → Workers): pending → approved / needs changes / rejected; approved → suspended → reinstated. Customers see a worker (list, page, chat) only when approved. A new ID document on an approved profile goes back to review. The "visible to customers" switch only works once approved.
  - Status screens: start card, under review, changes requested / rejected (with the team's note, "fix and send again"), suspended (contact support).
  - **Worker dashboard** (approved): customers who wrote, unread messages, rating, the latest 5 worker chats. **No bookings, "Accept job" or earnings** — they don't exist in the backend; waiting for the client (see §10 #11).
  - Free (§10 #1); a plan only boosts the order.

**Recruiter (Post Job)**
- Job operations home: active, total and application stats, plus my jobs.
- **Create job:** a 4-step form (basic info + location → compensation + details → candidate preferences + application settings → preview). Saved as `draft` (`POST /jobs`, `PATCH /jobs/:id`).
- **Publish:** the button reads "Publier — 5 000 GNF" → `POST /jobs/:id/publish` → payment flow → `published`. Close with `POST /jobs/:id/close`.
- **Candidates:** `GET /jobs/:id/applicants`. Contact details are locked 🔒 until `POST /jobs/candidates/:applicantId/unlock-cv` (5 000 GNF).
- **Candidate actions** ✏️: Shortlist · Invite to interview (`POST /jobs/applications/:id/interview`: date, time, place, map link, note) · Hire · Reject (with confirmation). These map to `PATCH /jobs/applications/:id/status`.
- **Received applications** 🆕 (vendor only): `GET /jobs/applications/received`.

---

## 5. Customer

### 5.1 Home (Figma: Home)
- Header: **"Livrer à <address> ▾"** opens the address picker sheet ("Add your address" if there is none). Also bell (unread badge), **cart icon with count**, ✏️ jobs shortcut.
- Search bar → Search tab.
- Top categories (`GET /categories`), ad banner (home placement), popular jobs nearby (`GET /jobs`), popular products (`GET /products?sort=popular`), popular workers (`GET /professional-profiles/workers`).
- **Product card** ✏️: shows only an "Ajouter" button, which turns into a `– n +` stepper once the item is in the cart (`POST /cart/items`, `PATCH /cart/items/:productId`). Badges come from `tags` (new / popular / discount %).
- **Worker card** ✏️: ❌ no discount badge. Button: "Message".
- ✏️ The **Orders tab icon is a receipt/bag**, not a cart.

### 5.2 Search and categories
- **Tabs: Products | Workers** ✏️ (the Figma mixes Workers in as a category).
- Product search: `GET /products` with `searchTerm`, `category`, `minPrice`, `maxPrice`, `inStock`, `rating`, `lat`/`lng`/`maxDistance` (from the selected address), `sort` (`price_asc`, `price_desc`, `rating`, `popular`, `newest`).
- Filter sheet with **Reset** and an active-filter count badge 🆕.
- Category grid → category product list (ads with category placement).

### 5.3 Product details
`GET /products/:idOrSlug`. Shows:
- image gallery
- name, price/discount
- stock status 🆕
- seller → **store page** 🆕 (`GET /vendors/:id`, `GET /reviews/vendor/:vendorId`)
- rating → **review list** 🆕 (`GET /reviews/product/:productId`)
- features chips, "What's in the box"
- ❤ **favorite** 🆕 (`POST /favorites/toggle`), share
- qty stepper + Add to cart
- Store closed → "Boutique fermée", and add is disabled

### 5.4 Cart
`GET /cart`.
- ✏️ **Grouped by store** (each store becomes one sub-order).
- Item stepper, remove, clear.
- "Customers also bought" add-ons.
- Totals come from the checkout summary.
- ❌ GST line.

### 5.5 Checkout ✏️
`POST /orders/checkout-summary` (re-runs whenever the address, delivery type or payment changes) → `POST /orders`.
1. **Address:** map preview + Change (address sheet).
2. **Delivery method:** `local` (Home delivery, fee by distance) / `intercity` (🆕 **destination station picker**, `GET /transit-stations`; ETA in hours/days; "3 étapes: moto → bus → moto") / `station_pickup` (🆕 station picker).
3. Special instructions.
4. **Payment:** COD · Orange Money · MTN Mobile Money · Card.
5. **Summary (in this order):** Subtotal · Delivery fee · Tax (hidden if 0) · Platform fee · **Total**.
6. ❌ **Coupon field hidden.** The backend stores `couponCode` but applies no discount ❓.
7. **Place order:** COD → success. Online → payment waiting flow → success.

**Success screen:** order #, "Track order" / "Continue shopping".

### 5.6 Orders list
`GET /orders/my-orders`. ✏️ Tabs: **Tous · En cours (active) · Livrées (completed) · Annulées (cancelled, partially_cancelled)**. Each card shows the stores, item thumbs, total and status.

### 5.7 Order details ✏️ (one live screen, replacing the Figma's separate Preparing / On the way / Delivered pages)
`GET /orders/:id` + socket `delivery:status_changed`.
- **One block per store (sub-order):** items, sub-order status timeline (New → Accepted → Preparing → Ready for pickup → In delivery → Delivered / Cancelled), rider (name, photo, vehicle, rating, **no phone**), **Track** and **Chat with seller** / **Chat with rider** (rider chat only once one is assigned).
- 🆕 **Delivery PIN card per sub-order:** big 4 digits + *"Donnez ce code au livreur à la réception"*. Only the customer sees it. Source: `subOrders[].deliveryPin` in `GET /orders/:id` (absent once delivered).
- 🆕 **Intercity:** a 3-leg timeline (moto → bus → moto) with the partner name and status per leg. The live map is shown only on moto legs.
- 🆕 **Order modified notice:** "Votre commande a été modifiée — nouveau total: X GNF" + reason.
- Payment status: Unpaid · Paid · Partially refunded · Refunded.
- **Cancel** ✏️: visible **only while no sub-order has reached `preparing`** (otherwise disabled, with the reason shown). Reason chips + text (min 3 chars). `POST /orders/:id/cancel` cancels the **whole order**.
- 🆕 **"Signaler un problème" (dispute):** `POST /payments/disputes` (reason min 5 chars, optional sub-order, optional amount). Status Open · Resolved · Rejected plus the admin reply (`GET /payments/disputes`, socket `dispute:resolved`).
- Delivered → **Review per store** (1–5 stars + comment, `POST /reviews`). Reorder.

### 5.8 Live tracking
`GET /deliveries/:id/track` + socket `join_delivery` → `rider:location_updated`. Native: react-native-maps. **Web: fallback card** (rider status + "open in Google Maps" link).

### 5.9 Workers
Worker list (`GET /professional-profiles/workers`), worker detail (`GET /professional-profiles/workers/:id`): photo, rate GNF/h, bio, profession, experience, location, rating, skills, languages, **Message** (`POST /conversations`). There is no phone.

### 5.10 Profile extras (customer)
- **Addresses** ✏️ (`/addresses`): start with the **map pin**, which auto-fills region/city/commune. Then neighborhood, landmark, directions, **gate photo**, label (Home/Office/Other + custom), name + phone (prefilled), **Default** toggle (`PATCH /addresses/:id/default`). Fix the "My Autos" title to "Adresses".
- **Favorites** 🆕 (`GET /favorites/my-favorites`)
- **Payment history** 🆕 (`GET /payments/me`)
- **My reviews** (`GET /reviews/me`)
- My CV, My applications, Post job

---

## 6. Vendor

### 6.1 Become a vendor (KYC) ✏️ (Figma: Vendor-Auth; the auth screens are ❌ removed)
1. **Business info:** store name, business category, market name, business phone/email, logo.
2. **Address:** map pin + text + city (the geo point is needed for distance search).
3. **Documents:** business licence (optional).
4. **Payout method** (required before submit): pick Orange Money / Mobile Money / Bank first, then only that type's fields.
5. Submit → Pending. Approved → "Passer en mode Vendeur".

### 6.2 Products
- `GET /products/my-products`. ✏️ Tabs: **Tous · En ligne · En attente (approval pending) · Rupture (out of stock)**.
- 🆕 **Approval chip** on each card: Waiting for approval · Live · Rejected (admin note, `adminReviewNote`).
- Quick actions on the card 🆕: "Available for sale" toggle, **quick stock edit** (`PATCH /products/:id/stock`), low-stock badge (stock ≤ `minStockAlert`).
- **Add/edit product** (2 steps):
  1. **Photos first** (≤5, the first is the cover), name, description, category, price, discount price (< price), with a live line under the price: "Le client paie X · Vous recevez Y (commission 10%, min 1 000 GNF)".
  2. Stock qty, min stock alert, prep time (minutes), tags, 🆕 **Key features[]**, 🆕 **What's in the box[]**, available toggle.
  - `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`.
- **Commission notice:** shown **once**, before the first product: "Commission 10% (minimum 1 000 GNF)".

### 6.3 Orders (the most important vendor flow)
- `GET /orders/vendor/sub-orders`. ✏️ Tabs: **Nouvelles (new, count badge) · En cours · Terminées · Annulées**.
- **New-order alert:** push + sound + in-app banner.
- **Details:** `GET /orders/vendor/sub-orders/:id`. Shows:
  - customer name + phone (allowed)
  - address + map
  - items
  - money breakdown: subtotal · delivery fee · customer paid · commission · **net earning**
- **Action buttons by status** (`PATCH /orders/vendor/sub-orders/:id/status`):
  - `new` → **Accepter** / Refuser (`POST …/cancel`, reason chips)
  - `accepted` → **Commencer la préparation**
  - `preparing` → **Prête pour l'enlèvement**
  - `ready_for_pickup` / `in_delivery` / `delivered` → **status only** ❌ (the vendor can't mark picked up or delivered; the rider does that with a PIN)
- **Assign rider** (any time after the order arrives): `GET /deliveries/:id/available-riders` → `POST /deliveries/:id/assign`. The list shows linked riders first, with name, vehicle, distance, active deliveries and rating. **No phone.**
- 🆕 **Pickup PIN card:** 4 digits + *"Donnez ce code au livreur quand il récupère la commande"*. Source: `pickupPin` in `GET /orders/vendor/sub-orders/:id` (absent once picked up).
- 🆕 **Modify order:** remove an item or reduce a quantity, with a reason (`PATCH /orders/vendor/sub-orders/:id/modify`). Shows the new total.
- Chat with customer, chat with rider, track the rider on the map.

### 6.4 My delivery partners 🆕 (rider network)
`GET /vendor-rider-links/me`. Tabs: **Liés · Demandes · Inviter**.
- Invite: search riders (`GET /riders/search`) → `POST /vendor-rider-links/invite`. **Moto riders only.**
- Respond: `PATCH /vendor-rider-links/:id/respond`. Remove: `DELETE /vendor-rider-links/:id`.
- Statuses: Invited · Active · Declined · Removed. Socket `rider_link:updated`.

### 6.5 Earnings (shared wallet module, §4.6)
Vendor balance cards:
- **Disponible**
- **En attente (escrow)**: "you get it after delivery"
- 🆕 **"En attente du cash du livreur"**: COD delivered but not yet settled by the rider
- Total earned / commission paid

### 6.6 Store profile
- Header: logo, store name, **Open/Closed toggle** (`isOpen`, `PATCH /vendors/me`), rating, today's earnings + completed orders (needs the summary endpoint).
- ✏️ Settings are split into: **Personal** (shared account), **Business** (`PATCH /vendors/me`: name, logo, category, address, business phone/email), **Payout methods** (list), **Availability** (`PATCH /vendors/me/availability`: days + open/close time). When closed, customers can't order.
- Menu extras 🆕: My delivery partners · Store reviews · Received applications · Switch to Customer.

---

## 7. Rider — moto (`partnerType: moto`)

### 7.1 Become a rider (KYC) ✏️ (Figma: DP-Auth; the auth screens are ❌ removed)
0. 🆕 **Partner type:** 🏍 Moto rider or 🚌 Bus driver (→ §8).
1. Vehicle: type (motorbike/bicycle/car), color, brand, 🆕 plate number, vest number.
2. City/area, national ID number, ID/licence upload.
3. Payout method (needed before the first withdrawal, not for submit).
4. Submit → Pending.

### 7.2 Online / Offline 🆕 (missing in the Figma, required)
A big toggle at the top of Deliveries and in the Profile header. `PATCH /deliveries/rider/online-status`. While online:
- location every ~15–30 s (`PATCH /deliveries/rider/location`; plus the `rider_location` socket during an active delivery)
- needs location permission (with a guidance screen if denied)
- Vendors only see online riders

### 7.3 Deliveries list ✏️
`GET /deliveries/rider/my-deliveries`. Tabs: **Nouvelles · En cours · Historique**.
- New card: store → drop area, distance, **your earning**, and for COD **"Montant à encaisser: X GNF"**.
- **Accepter** (`POST /deliveries/:id/accept`) / **Refuser** (`POST /deliveries/:id/decline` + reason).
- A cash-limit error shows a clear message.
- Socket `delivery:assigned`.

### 7.4 Active delivery: one step screen ✏️ (replaces "Order tracking 1/2/3" and "Mark as picked up")
A big bottom button always shows the next action:

| Status | Button | API |
|---|---|---|
| `accepted` | **Je pars récupérer** | `PATCH /deliveries/:id/going-to-pickup` |
| `going_to_pickup` | **Saisir le code d'enlèvement** (vendor's PIN) | `POST /deliveries/:id/verify-pickup` |
| `picked_up` / `in_transit` | **Naviguer** → **Saisir le code du client** | `POST /deliveries/:id/verify-handover` |
| `delivered` | Done → back to the list | — |

- COD: before the handover PIN, a big **"Montant à encaisser: X GNF"**.
- The drop card shows the address, **landmark, directions and gate photo**, plus Navigate (opens Google Maps). ❌ No raw coordinates. The customer's phone isn't shown; use chat/voice.
- Wrong PIN → "X tentatives restantes". There's a lock after too many wrong tries (`pinLockedUntil`).
- ❌ **"Select & assign delivery partner" is removed.** Riders can't reassign; only the vendor or admin assigns.

### 7.5 Cash (COD) 🆕 (missing in the Figma)
- Card **"Cash à reverser: X GNF"** (`cashOwed`) + cash limit progress (warning near the limit).
- **"Déclarer un versement"** form: amount (≤ owed), method, reference, proof photo → `POST /wallets/me/cod-settlements`. Only one pending declaration at a time.
- History: Pending · Confirmed · Rejected (socket `cod_settlement:confirmed`).
- **Withdraw is blocked while cash is owed**, and the withdraw screen explains: withdrawable = balance − cash owed.

### 7.6 Earnings
Shared wallet module. Rider earning = delivery fee. Total, today, delivery count, daily chart (summary endpoint), recent deliveries, withdrawals.

### 7.7 Profile
- Header: online toggle, rating, today's earnings, completed deliveries.
- Identity and vehicle info: read-only after approval, with "Update & resubmit" (goes back to review).
- Delivery history (date filter).
- 🆕 **My stores** (vendor links + invitations; `POST /vendor-rider-links/request` to ask to join a store).
- Switch to Customer.

---

## 8. Bus driver (`partnerType: transit`) 🆕 (whole flow is new)
- **KYC:** same as the rider, plus **routes**: one or more station → station pairs (`GET /transit-stations`), e.g. "Gare Madina (Conakry) → Gare de Labé".
- **Deliveries:** only `line_haul` legs. Each card shows from station → to station and the parcel count.
- **Station relay (two codes per handover):**
  - **Rule: the person receiving shows a code, and the person giving types it.**
  - At the origin station (moto → bus): the bus driver **shows** the receive code and the moto rider **types** it. The moto rider shows the hand-off code and the bus driver types it to confirm pickup.
  - At the destination station (bus → moto): the same, with the roles reversed.
- **Two shared screens:** 🆕 **"Show code"** (big 4 digits + who to show it to) and 🆕 **"Enter code"** (the counterpart's name + PIN input).
- ✅ Confirmed (2026-10-19, covered by the e2e): on their own leg, `GET /deliveries/:id/track` gives the rider `incomingHandoverPin` (show it to the rider arriving with the parcel, who types it to hand over) and `outgoingPickupPin` (show it to the next rider, who types it to pick up).

---

## 9. Status → label and colour map (use everywhere)
| Domain | Value | FR label | Colour |
|---|---|---|---|
| SubOrder | new | Nouvelle | blue |
| | accepted | Acceptée | blue |
| | preparing | En préparation | amber |
| | ready_for_pickup | Prête | amber |
| | in_delivery | En livraison | purple |
| | delivered | Livrée | green |
| | cancelled | Annulée | red |
| Order | active / completed / cancelled / partially_cancelled | En cours / Terminée / Annulée / Partiellement annulée | purple / green / red / orange |
| Payment | unpaid / paid / partially_refunded / refunded | Non payée / Payée / Part. remboursée / Remboursée | amber / green / orange / grey |
| Delivery | pending_assignment, assigned, accepted, declined, going_to_pickup, picked_up, in_transit, delivered, cancelled | — | — |
| Product approval | pending / approved / rejected | En attente / En ligne / Refusé | amber / green / red |
| Application (KYC) | draft / pending / needs_changes / approved / rejected / suspended | Brouillon / En attente / À corriger / Approuvé / Refusé / Suspendu | grey / amber / orange / green / red / red |
| Withdrawal | pending / approved / completed / rejected | — | amber / blue / green / red |
| Job | draft / pending_payment / published / closed / expired | — | — |
| Job application | applied, under_review, shortlisted, interview, hired, rejected, withdrawn, pending_payment | — | — |

Keep the labels in i18n files (`status.subOrder.new`, …), never inline.

## 10. Open questions (❓ client). Build these as hidden or default until answered
1. Worker listing: free, or does it need a subscription? (Built free, 2026-10-21; a plan only boosts the order.)
2. Coupon codes: needed? (hidden now)
3. Block user in chat: needed? (Report only now; needs a backend API)
4. Can a customer cancel a single store's part of an order? (Now: the whole order only)
5. Tax in the future? (0 now, line hidden)
6. CV paywall position (recommended: free to build, pay for visibility) — built that way 2026-10-21; plans are admin data.
7. WhatsApp support number for Help & Support?
8. ✅ **Decided 2026-10-21 (user: "follow the best practice"): COD only up to the rider cash limit per store.** Built: `POST /orders/checkout-summary` returns `cod { allowed, limit }` (limit = settings `riderCashLimitDefault`, edited in Dashboard → Settings → Fees); each store's cash part (the first also carries the service fee + tax) must be ≤ the limit; the app greys out "Cash on delivery" with the reason and the server refuses such a COD order (400). Online payment stays available. Original question — **COD vs the rider cash limit** (found 2026-10-19): a rider may carry at most 1 000 000 GNF of COD cash, so a COD order above that can be placed but no rider can accept it. Options: hide COD above the limit at checkout, or let the store/admin raise the limit per order.
9. ✅ **Decided 2026-10-21 (user: "follow the best practice"): pay first, then the store.** Built: an online order's sub-orders start as `pending_payment` (stock reserved; the store sees nothing; no escrow, no delivery legs, no chat); the payment confirms → `new` + escrow + legs + "new order" for the store; not paid within 30 min (`paymentDueAt`) → cancelled by a minute-by-minute server sweep, stock released, items back in the cart, one notice to the customer (the store is never told); a payment arriving after that → refund request for the admin. The customer can still cancel it themselves. Original question — **Unpaid online orders** (found 2026-10-19): an Orange Money / MoMo / card order is created before payment, so the store gets "new order" and the stock is held while it is still unpaid. Options: show it to the store only once paid, and auto-cancel (stock back) after N minutes unpaid.
10. ✅ **Decided 2026-10-20 (user): refunds need admin approval.** Built: cancellations and store changes of online-paid orders open one pending refund request per order; the admin sends the money, then approves with the transfer reference (or rejects with a reason); the customer sees the status on the order and gets notified. Original question — **Refunds after a store cancels or changes a paid order** (found 2026-10-20): the store's pending money is reversed automatically, but money the customer paid online (Orange Money / MoMo / card) is only returned when an admin issues the refund in the dashboard. The customer cancel sheet says "you will be refunded". Options: keep refunds manual (admin list of "to refund"), or refund automatically through the payment gateway.
11. **Worker bookings** (designer's Worker Dashboard, 2026-10-21): "New job requests → Accept job → ongoing / completed" and "Total earnings". Today a customer only messages a worker. Needs the client: should customers book and pay a worker through the app (commission? escrow? cancellation?) or keep chat-only? Until then the dashboard shows real data only (messages, rating).
