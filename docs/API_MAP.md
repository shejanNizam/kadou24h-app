# Kadou24h API map (app-facing)

The base URL is `${EXPO_PUBLIC_API_URL}`, which defaults to `http://localhost:7000/api/v1`. Swagger runs at `http://localhost:7000/api/docs` (non-production).
The full backend docs are in `../kadou24h-server/docs/API_DOCUMENTATION.md`, and the Postman collection is at `../kadou24h-server/docs/postman/`.

> The route list below was generated from `kadou24h-server/src/app/routes/index.ts` and each module's `*.route.ts` on 2026-10-19 (admin-only routes removed). If the server changes, regenerate it rather than trusting this list blindly.

## Conventions
- **Response envelope (every endpoint):**
  ```json
  { "statusCode": 200, "success": true, "message": "…", "data": <T>, "meta": { "page": 1, "limit": 10, "total": 42, "totalPage": 5 } }
  ```
  `meta` is only present on paginated lists. Use `page` and `limit` query params.
- **Errors:** `success: false` with a `message` (and validation details). Show `message` to the user (it is already human-readable). 401 → try a refresh once, then logout.
- **Auth:** `Authorization: Bearer <accessToken>`. Login, verify and social return `{ user, accessToken, refreshToken }`. Refresh with `POST /auth/refresh-token` and body `{ refreshToken }` (the access token lasts 1 day by default). Cookies are also set, but the app uses the headers and body.
- **Role tags in the list:**
  - `ALL_ROLES` / `APP_ROLES`: any logged-in app user
  - `UserRole.vendor`: an approved, active vendor
  - `riderRoles` / `vendorRoles`: the rider or vendor (or admin)
  - `parties`: vendor or rider
  - `public`: no auth
  - `optional`: auth used when present
  - Cart and favorites are mounted behind `router.use(checkAuth)`, so they **require login** even though the list says public.
- **Wallet endpoints need `?mode=vendor|rider`** (or `mode` in the body for POST/PATCH). One user can have both wallets.
- **PINs:** the customer's `deliveryPin` is in `GET /orders/:id` (per open sub-order), and the vendor's `pickupPin` is in `GET /orders/vendor/sub-orders/:id`. Riders get station relay codes from `GET /deliveries/:id/track` (`incomingHandoverPin` / `outgoingPickupPin`). A rider never receives the PINs of their own leg.
- **IDs:** Mongo ObjectId strings. **Money:** integer GNF. **Dates:** ISO strings.
- **Field names:** camelCase, exactly as in the server `*.interface.ts`. The dashboard mirrors them in `../kadou24h-dashboard/src/types/api.ts`, so reuse those types.

## Socket.io
Connect to the server origin (without `/api/v1`) with `io(url, { auth: { token: accessToken } })`. Reconnect with the new token after a refresh.

| Direction | Event | Payload / use |
|---|---|---|
| client → server | `join_conversation` / `leave_conversation` | `conversationId` |
| client → server | `typing` / `stop_typing` | `{ conversationId }` |
| client → server | `message_read` | `{ conversationId }` |
| client → server | `join_delivery` / `leave_delivery` | `deliveryId` (customer, vendor or rider of that delivery) |
| client → server | `rider_location` | `{ deliveryId, lat, lng, heading? }` (assigned rider only) |
| server → client | `new_message`, `typing`, `stop_typing`, `message_read`, `conversation_unread` | chat |
| server → client | `new_notification` | notification bell, toast |
| server → client | `rider:location_updated` | `{ deliveryId, lat, lng, heading }` live map |
| server → client | `delivery:assigned`, `delivery:declined`, `delivery:status_changed` | order and delivery screens |
| server → client | `payment:successful`, `refund:issued`, `dispute:resolved` | payment waiting screen, order |
| server → client | `wallet:earning_released`, `withdrawal:requested`, `withdrawal:completed`, `withdrawal:rejected`, `cod_settlement:confirmed` | wallet |
| server → client | `application:reviewed` | KYC status card |
| server → client | `rider_link:updated` | rider network |
| server → client | `job_application:new`, `job_application:status_changed`, `job_application:interview_scheduled` | jobs |
| server → client | `ticket_update` | support |
| server → client | `session:revoked` | `{ reason }` → force logout / Suspended screen |
| server → client | `error_message` | `{ event, message }` join refused |

## Endpoints
```
POST   /auth/register  [public]
POST   /auth/verify-account  [public]
POST   /auth/resend-otp  [public]
POST   /auth/login  [public]
POST   /auth/social  [public]
POST   /auth/refresh-token  [public]
POST   /auth/logout  [public]
POST   /auth/logout-all  [...ALL_ROLES]
POST   /auth/change-password  [...ALL_ROLES]
POST   /auth/set-password  [...ALL_ROLES]
POST   /auth/forgot-password  [public]
POST   /auth/verify-reset-otp  [public]
POST   /auth/reset-password  [public]
GET    /user/me  [...ALL_ROLES]
PATCH  /user/me  [...ALL_ROLES]
DELETE /user/me  [...ALL_ROLES]
PATCH  /user/me/mode  [...ALL_ROLES]
GET    /user/me/alerts  [...ALL_ROLES]  → red dot on my other modes (features/profile/modeAlerts.ts)
PATCH  /user/me/notification-preferences  [...ALL_ROLES]
POST   /user/me/phone/request  [...ALL_ROLES]
POST   /user/me/phone/verify  [...ALL_ROLES]
POST   /device-token  [...allRoles]
DELETE /device-token  [...allRoles]
POST   /upload  [...allRoles]
GET    /settings/public  [public]
GET    /addresses  [...APP_ROLES]
POST   /addresses  [...APP_ROLES]
PATCH  /addresses/:addressId  [...APP_ROLES]
PATCH  /addresses/:addressId/default  [...APP_ROLES]
DELETE /addresses/:addressId  [...APP_ROLES]
GET    /categories  [public]
GET    /categories/tree  [public]
GET    /categories/:id  [public]
GET    /transit-stations  [public]
GET    /vendors/me  [...APP_ROLES]
PUT    /vendors/me/application  [...APP_ROLES]
POST   /vendors/me/application/submit  [...APP_ROLES]
PATCH  /vendors/me  [UserRole.vendor]
PATCH  /vendors/me/availability  [UserRole.vendor]
GET    /vendors  [public]
GET    /vendors/:id  [public]
GET    /riders/me  [...APP_ROLES]
PUT    /riders/me/application  [...APP_ROLES]
POST   /riders/me/application/submit  [...APP_ROLES]
PATCH  /riders/me  [UserRole.rider]
GET    /riders/search  [UserRole.vendor]
GET    /vendor-rider-links/me  [...parties]
POST   /vendor-rider-links/invite  [UserRole.vendor]
POST   /vendor-rider-links/request  [UserRole.rider]
PATCH  /vendor-rider-links/:id/respond  [...parties]
DELETE /vendor-rider-links/:id  [...parties]
GET    /wallets/me  [...APP_ROLES]
GET    /wallets/me/summary  [...APP_ROLES]   ?mode=vendor|rider&range=7d|30d|6m|12m
POST   /wallets/me/payout-methods  [...APP_ROLES]
PATCH  /wallets/me/payout-methods/:methodId  [...APP_ROLES]
DELETE /wallets/me/payout-methods/:methodId  [...APP_ROLES]
POST   /wallets/me/withdrawals  [...APP_ROLES]
GET    /wallets/me/withdrawals  [...APP_ROLES]
GET    /wallets/me/transactions  [...APP_ROLES]
POST   /wallets/me/cod-settlements  [...APP_ROLES]
GET    /products  [public]
POST   /products  [UserRole.vendor,...ADMIN_ROLES]
GET    /products/my-products  [UserRole.vendor,...ADMIN_ROLES]
GET    /products/:idOrSlug  [optional]
PATCH  /products/:id  [UserRole.vendor,...ADMIN_ROLES]
DELETE /products/:id  [UserRole.vendor,...ADMIN_ROLES]
PATCH  /products/:id/stock  [UserRole.vendor,...ADMIN_ROLES]
GET    /favorites/my-favorites  [public]
GET    /favorites/check/:productId  [public]
POST   /favorites/toggle  [public]
GET    /delivery-rates/calculate  [public]
GET    /delivery-rates  [...ALL_ROLES]
GET    /delivery-rates/:id  [...ALL_ROLES]
GET    /cart  [public]
DELETE /cart  [public]
POST   /cart/items  [public]
PATCH  /cart/items/:productId  [public]
DELETE /cart/items/:productId  [public]
POST   /orders/checkout-summary  [...ALL_ROLES]
POST   /orders  [...ALL_ROLES]
GET    /orders/my-orders  [...ALL_ROLES]
GET    /orders/vendor/sub-orders  [...vendorRoles]
GET    /orders/vendor/sub-orders/:id  [...vendorRoles]
PATCH  /orders/vendor/sub-orders/:id/status  [...vendorRoles]
PATCH  /orders/vendor/sub-orders/:id/modify  [...vendorRoles]
POST   /orders/vendor/sub-orders/:id/cancel  [...vendorRoles]
GET    /orders/:id  [...ALL_ROLES]
POST   /orders/:id/cancel  [...ALL_ROLES]
PATCH  /deliveries/rider/location  [...riderRoles]
PATCH  /deliveries/rider/online-status  [...riderRoles]
GET    /deliveries/rider/my-deliveries  [...riderRoles]
GET    /deliveries/:id/available-riders  [...vendorRoles]
POST   /deliveries/:id/assign  [...vendorRoles]
POST   /deliveries/:id/accept  [...riderRoles]
POST   /deliveries/:id/decline  [...riderRoles]
PATCH  /deliveries/:id/going-to-pickup  [...riderRoles]
POST   /deliveries/:id/verify-pickup  [...riderRoles]
POST   /deliveries/:id/verify-handover  [...riderRoles]
GET    /deliveries/:id/track  [...ALL_ROLES]
POST   /payments/initiate  [...APP_ROLES]
POST   /payments/webhook  [public]
GET    /payments/me  [...APP_ROLES]
POST   /payments/disputes  [...APP_ROLES]
GET    /payments/disputes  [...APP_ROLES]
GET    /professional-profiles/workers  [public]
GET    /professional-profiles/workers/:id  [public]
GET    /professional-profiles/me  [...APP_ROLES]
PUT    /professional-profiles/me  [...APP_ROLES]
PATCH  /professional-profiles/me/worker-listing  [...APP_ROLES]
DELETE /professional-profiles/me/cv  [...APP_ROLES]  → "Supprimer mon CV" (a worker keeps trade, photo, city)
POST   /professional-profiles/me/generate-ai-cv  [...APP_ROLES]
GET    /jobs  [public]
GET    /jobs/:id  [public]
POST   /jobs  [...APP_ROLES]
PATCH  /jobs/:id  [...APP_ROLES]
POST   /jobs/:id/publish  [...APP_ROLES]
POST   /jobs/:id/close  [...APP_ROLES]
DELETE /jobs/:id  [...APP_ROLES]  → draft / closed / expired offer only
GET    /jobs/:id/applicants  [...APP_ROLES]
PATCH  /jobs/applications/:applicationId/status  [...APP_ROLES]
POST   /jobs/applications/:applicationId/interview  [...APP_ROLES]
POST   /jobs/candidates/:applicantId/unlock-cv  [...APP_ROLES]
POST   /jobs/apply  [...APP_ROLES]
POST   /jobs/apply-spontaneous  [...APP_ROLES]
GET    /jobs/applications/my  [...APP_ROLES]
GET    /jobs/applications/received  [UserRole.vendor]
GET    /subscriptions/plans  [public]
GET    /subscriptions/me  [...APP_ROLES]
POST   /subscriptions/subscribe  [...APP_ROLES]
POST   /conversations  [...ALL_ROLES]
GET    /conversations  [...ALL_ROLES]
GET    /conversations/:id  [...ALL_ROLES]
PATCH  /conversations/:id/read  [...ALL_ROLES]
DELETE /conversations/:id  [...ALL_ROLES]  → delete the chat for me only (comes back with a new message)
GET    /conversations/:id/messages  [...ALL_ROLES]
POST   /conversations/:id/messages  [...ALL_ROLES]  (store chat: + subOrderId → the message keeps its order number)
POST   /reports  [...ALL_ROLES]
GET    /reports/me  [...ALL_ROLES]
GET    /notifications  [...ALL_ROLES]
GET    /notifications/unread-count  [...ALL_ROLES]
PATCH  /notifications/read-all  [...ALL_ROLES]
PATCH  /notifications/:id/read  [...ALL_ROLES]
POST   /support-tickets  [...ALL_ROLES]
GET    /support-tickets/me  [...ALL_ROLES]
GET    /support-tickets/me/:id  [...ALL_ROLES]
GET    /advertisements  [public]
POST   /advertisements/:id/impression  [public]
POST   /advertisements/:id/click  [public]
POST   /reviews  [...APP_ROLES]
GET    /reviews/me  [...ALL_ROLES]
POST   /reviews/:id/report  [...ALL_ROLES]
DELETE /reviews/:id  [...ALL_ROLES]  → my review (ratings redone)
GET    /reviews/vendor/:vendorId  [public]
GET    /reviews/product/:productId  [public]
```

## Added for the app (2026-10-19)
- `GET /wallets/me/summary`: balances explained (vendor `inEscrow` / `awaitingCod`; rider `cashOwed` / `cashLimit` / `withdrawable`), `counts`, `today`, `period` and `series` (daily for 7d/30d, monthly for 6m/12m).
- `deliveryPin` on the customer's order detail, and `pickupPin` + `currentRiderId` (vehicle, rating, name) on the vendor's sub-order detail.
- `subOrder.deliveredAt`.
- Fix: the customer and the store no longer receive station PINs of middle intercity legs from `/deliveries/:id/track`.

## Added for the app, Phase 4 (2026-10-19)
- `GET /payments/:id` — my payment (the waiting screen polls it).
- `POST /payments/:id/dev-confirm` `{ status: "success" | "failed" }` — **development only** (404 in production): finishes my pending payment like the gateway webhook.
- `POST /payments/initiate` now refuses COD orders and cancelled orders.
- `GET /orders/my-orders?status=` accepts several statuses, comma-separated (`cancelled,partially_cancelled`).
- `GET /orders/:id` (customer): `subOrders[].reviewed`, and `currentRiderId.userId { name, avatar }` (never the phone). `GET /deliveries/:id/track` has the same rider name.
- Checkout: `intercity` and `station_pickup` require `destinationStationId` (clear 400 otherwise, and when that station is the store's own nearest station). Each split has `stationRoute { fromStationName, fromCity, toStationName, toCity, estimatedHours }`. Station pickup costs the intercity rate minus the last moto leg (min 10 000 GNF) — it used to be a flat 10 000 that left the bus driver 0.

## Changed for the app, Phase 5 (2026-10-20)
- `POST /conversations` takes the **subject**, never a recipient: `{ type: "buyer_seller", vendorId }` · `{ type: "worker", workerProfileId }` · `{ type: "order", subOrderId, with: "vendor" | "rider" | "customer" }` · `{ type: "job_application", applicationId }`. The server finds the other person and both modes; voice is allowed only for buyer ↔ rider of that order.
- Conversations never contain a phone or email. Each one has `peer { userId, mode, name, avatar, vendorId? }` (a store shows as the store), `myMode`, `myUnread`, and `subOrderId { subOrderNumber }` for order chats.
- `GET /conversations/unread-count?mode=` → `{ unreadCount }` (Chat tab badge).
- `GET /conversations/:id/messages`: page 1 = the newest messages, oldest → newest inside a page.
- `DELETE /device-token` only removes the caller's own token. Push uses Android channel `default` (the app creates it).

## Changed for the app — Moto-taxi (2026-10-23)
- Passenger: `POST /rides/estimate`, `POST /rides`, `GET /rides/my`, `GET /rides/my/current`, `GET /rides/:id`, `POST /rides/:id/cancel`, `POST /rides/:id/rate`.
- Rider: `GET /rides/rider/offers`, `GET /rides/rider/current`, `GET /rides/rider/history`, `POST /rides/:id/skip | arrived | start | complete | release`.
- Negotiable price (2026-11-21): rider `POST /rides/:id/bid { price? }`, `DELETE /rides/:id/bid`, `POST /rides/:id/bid/answer { accept }`; passenger `POST /rides/:id/bids/:bidId/accept | decline`, `POST /rides/:id/bids/:bidId/counter { price }`. `GET /rides/:id` → `suggestedFare`, `maxFare`, `bids[]` (passenger, while searching); offers rows → `suggestedFare`, `maxFare`, `myBid`, `bidsLeft`. (`POST /rides/:id/accept` is gone.)
- Sockets `ride:offer`, `ride:offer_gone`, `ride:updated`, `ride:location`; push type `ride_update` (`data.kind: "ride"`, `rideId`, `offer`). Public settings `rides`.

## Changed for the app — Open dispatch, COD fees, demo payments (2026-10-23)
- `GET /deliveries/rider/offers` → `{ isOnline, offers[] }`; `POST /deliveries/:id/claim` (409 = someone was faster); `POST /deliveries/:id/skip`. Sockets `delivery:offer`, `delivery:offer_gone`, `delivery:withdrawn`. Push `data.offer: true` → "Near me" tab.
- Rider delivery rows: `reservedUntil` (a store's pick: answer before). Vendor legs: `offerOpenedAt`, `reservedUntil`, `noRiderAlertedAt`.
- Checkout summary `pricing.payNow`, `pricing.payOnDelivery`; orders `upfrontAmount`, `feesPaidAt`. COD orders start `pending_payment` until the fees are paid (`POST /payments/initiate` with an online method).
- Payments carry `demo` (server `PAYMENT_MODE=demo`): show "Simulate: paid / failed" (`POST /payments/:id/dev-confirm`).

## Changed for the app — Promo codes, cancel one store, block (2026-10-22)
- `couponCode` on checkout-summary / place order; summary `coupon { code, valid, discount, description?, message? }`, splits `discountShare`.
- `POST /orders/:id/sub-orders/:subOrderId/cancel { reason }` (store not preparing yet; not unpaid online).
- `POST|DELETE /conversations/:id/block`, `GET /conversations/blocked`, `DELETE /conversations/blocked/:userId`; conversation `blockedByMe`.

## Changed for the app — Worker bookings (2026-10-22)
- `/bookings`: `POST` (book), `GET ?as=&status=` (meta.counts), `GET /:id`, `GET /me/standing`, `PATCH /:id/accept|decline|cancel|done|confirm|not-done`, `POST /:id/review`, `DELETE /:id/review` (my review), `DELETE /:id` (finished booking out of my history, my side only). Cancel returns `{ booking, penalty }`.
- `GET /professional-profiles/workers/:id/reviews` (public). Worker summary adds `isVisible`, `listing`, `penalty`, `bookings`, `earnings`. Profile: `workPhotos` (≤ 10).
- `POST /conversations { type: "worker", bookingId }`. Socket `booking:updated`. Notification type `booking_update`; data kinds `booking`, `booking_penalty`, `worker_listing`.
- Public workers: only while visibility is paid (trial / service-provider plan) and not suspended; penalised workers sort last.

## Changed for the app — Become a worker (2026-10-21)
- Professional profile adds `approvalStatus` (draft | pending | approved | rejected | needs_changes | suspended), `reviewNote`, `submittedAt`, `workingHours { days 0–6, from, to "HH:mm" }`, `idDocument`. `PUT /professional-profiles/me` takes `workingHours` / `idDocument` (null clears).
- `POST /professional-profiles/me/worker-application/submit` (400 lists missing fields; 409 when pending/approved/suspended). `GET /professional-profiles/me/worker-summary` → status, note, isWorkerListed, rating, `messages { conversations, unread, unreadChats }`, `recent[5]`.
- `PATCH /me/worker-listing` with `isWorkerListed: true` → 400 unless approved. Public `/workers` and `/workers/:id` and worker chats: approved only; never `idDocument`, `uploadedResume`, `generatedCv`, review data.
- Socket `application:reviewed { kind: "worker", status, note }`; notification data `{ kind: "worker", status }`.

## Changed for the app — COD limit and pay-first online orders (2026-10-21)
- `POST /orders/checkout-summary` → also `cod: { allowed, limit }`. `POST /orders` with `cod` above the limit → 400 "Cash on delivery is not available above … GNF per store".
- Online orders: sub-orders `pending_payment` until paid (then `new`); `order.paymentDueAt` (placed + 30 min). `POST /payments/initiate` after it → 400 "The time to pay for this order is over". Expired orders: `cancellation.by = "system"`, items back in the cart, notification `order_cancelled` (data.cancelledBy "system").
- `POST /conversations` type order on an unpaid sub-order → 400. Store endpoints never return `pending_payment` sub-orders.

## Added for the app, Phase 11 — polish (2026-10-21)
- `GET /cart/suggestions?limit=` (≤ 20, default 10) → products (same shape as `GET /products` items): bought in the same accepted/delivered orders as the cart's products, most often first, then best sellers of the cart's categories. Approved and in stock only; never the cart's own products; `[]` for an empty cart.
- Ads: the app now also shows `popup` and `interstitial` types (`GET /advertisements?placement=`), counting impressions and clicks.

## Changed for the app, Phase 10 — jobs, CV, plans (2026-10-21)
- `GET /jobs/my?tab=active|draft|closed` (meta.counts), `GET /jobs/applications/:id` (viewerRole candidate | recruiter), `PATCH /jobs/applications/:id/withdraw`, `POST /jobs/applications/:id/interview/confirm`.
- `GET /jobs/:id` (optional auth): `isOwner`, `isOpen`, `myApplication`; drafts only for their poster.
- Recruiter `PATCH …/status`: under_review | shortlisted | hired | rejected only. Fees (publish, CV unlock, spontaneous, plans): orange_money | mobile_money | card.
- `POST /professional-profiles/me/generate-ai-cv` `{ lang }` → `{ summary }` (saves nothing). `PUT /me` takes `generatedCv`; `null` removes photo / uploadedResume / generatedCv.
- Socket `job_application:new | status_changed | interview_scheduled`; notifications carry `applicationId`.

## Changed for the app, Phase 9 — bus driver / relay (2026-10-21)
- `GET /deliveries/:id/available-riders`: bus legs add `servesRoute` and list the drivers of that station → station route first; legs leaving the store list linked riders first; legs leaving a station are by distance.
- Rider list / track: `orderId.deliveryType`; `orderId.addressSnapshot` and `toPhone` only when the leg ends with the customer (door, or the bus leg of a `station_pickup` order).

## Changed for the app, Phase 8 — rider (2026-10-21)
- `GET /deliveries/rider/my-deliveries?type=new|ongoing|completed|active&page&limit` → paged `{ data, meta }`; running tabs oldest first, history by last update. Rows: `subOrderId { subOrderNumber, total, items[name, qty, removed], codAmountToCollect }`, `orderId { orderNumber, paymentMethod, addressSnapshot }`. No PINs.
- `GET /deliveries/:id/track` (rider): `subOrderId` now has `items` and `codAmountToCollect`.
- PIN lock: 5 wrong codes → 429 "Too many wrong codes. Try again in N min."; after the lock a fresh round of 5.
- `GET /wallets/me/cod-settlements?status&page&limit` (rider history; `rejectionReason` when rejected). `GET /wallets/me/summary?mode=rider` → `balances.cashDeclared` (pending declarations, still inside `cashOwed`).
- `PATCH /wallets/admin/cod-settlements/:id` → `{ status, rejectionReason }` (reason required to reject). Rider notified (`earnings_updated`, data `settlementId`); socket `cod_settlement:confirmed` / `cod_settlement:rejected`.

## Refunds (2026-10-20)
- `GET /orders/:id` now also returns `refunds: [{ amount, requestedAmount, status: pending | completed | rejected, source, transactionId, rejectionReason, processedAt, createdAt }]`.
- Socket `refund:requested` (customer) when a request opens or grows; `refund:issued` when approved. Notification type `refund_update` (data `orderId`).

## Changed for the app, Phase 7 (2026-10-20)
- `GET /orders/vendor/sub-orders?status=a,b` takes several statuses (unknown → 400) and populates `orderId { orderNumber, deliveryType, paymentMethod, paymentStatus }` and `currentRiderId { userId { name, avatar }, vehicle.type }`.
- `PATCH /orders/vendor/sub-orders/:id/modify` only **reduces** (`newQty` < ordered, or `remove`); an unknown item or removing every item → 400 ("cancel instead"). Commission minimum from settings. The customer gets an "Order changed" notification.
- `GET /deliveries/:id/available-riders` → 404 unless the leg belongs to the caller's store.
- `GET /products/my-products?statusTab=in_review` (pending + rejected). Editing a rejected product's content (not stock) sets it back to `pending`.
- `GET /products/:idOrSlug`: a product that isn't approved is 404 except for its store and admins.
- `PATCH /vendors/me` with `address.location` also moves the store's products (`vendorLocation`) for "near me" search.
- New notification for vendors: `order_placed` socket `new_notification` → in-app banner; push data `{ mode: "vendor", subOrderId }` → `/vendor/order/[id]`.

## Changed for the app, Phase 6 (2026-10-20)
- `DELETE /user/me` → 409 with a clear message while the account has orders in progress (as buyer or store), deliveries in progress, COD cash to hand over, or money in a wallet.
- `POST /auth/change-password` returns a new `{ accessToken, refreshToken }` and emits `session:revoked { reason: "password_changed" }` to every socket of the user. The app ignores that event on the phone that made the change (`pendingAuth.markPasswordChangedHere()`).

## Missing on the backend (to add when the app needs them)
| Need | Proposed endpoint | For |
|---|---|---|
| Block user in chat | — | ❓ the client hasn't decided |
| Coupon discount logic | — | ❓ the client hasn't decided |
