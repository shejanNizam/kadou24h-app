# Kadou24h — Designer-এর জন্য Requirement ও Figma Mismatch তালিকা

> এটা user-এর আগের তৈরি document। 2026-10-19-এ এখানে রাখা হলো, শুধু formatting ঠিক করা হয়েছে। Backend তৈরির পরে এটা লেখা, তাই নিয়মগুলো backend-এর সাথে মেলে। App build-এর মূল spec হলো [APP_SPEC.md](APP_SPEC.md), এই document আর Figma review মিলিয়ে বানানো।

## এই document কেন
Backend আর Admin Dashboard বানানো হয়ে গেছে। বানানোর সময় client-এর business rule আর নিরাপত্তার কারণে কিছু নিয়ম যোগ হয়েছে বা বদলেছে, যা বর্তমান Figma-তে নেই। কিছু ক্ষেত্রে Figma-র সাথে মেলেও না।

এই document-এ শুধু **mobile app**-এর কথা আছে। Admin Dashboard আলাদাভাবে তৈরি, সেটায় হাত দেওয়ার দরকার নেই।

চিহ্নের মানে:
- 🆕 **নতুন screen বা অংশ:** Figma-তে নেই, যোগ করতে হবে
- ✏️ **পরিবর্তন:** Figma-তে আছে, কিন্তু বদলাতে হবে
- ❌ **বাদ দিন:** Figma-তে আছে, কিন্তু backend-এ নেই বা নিয়মের বিরুদ্ধে
- ❓ **সিদ্ধান্ত বাকি:** client-এর কাছ থেকে জানতে হবে

## ১. সব screen-এ প্রযোজ্য নিয়ম

### ১.১ ভাষা ও মুদ্রা
- ✏️ **মূল ভাষা French**, দ্বিতীয় ভাষা English। সব text দুই ভাষাতেই লাগবে। ফরাসি লেখা সাধারণত ২০–৩০% লম্বা হয়, তাই button আর label-এ জায়গা রাখুন।
- ✏️ **মুদ্রা সবসময় GNF**, দশমিক নেই। লেখার ধরন: **"100 000 GNF"**। Figma-র যেসব জায়গায় `$` আছে (যেমন CV plan "$10/month", order total "$470"), সব GNF-এ বদলান।

### ১.২ একটাই app, একাধিক mode
- ✏️ Backend-এ **সবাই প্রথমে customer হিসেবে sign up করে।** Vendor বা Rider হতে চাইলে পরে আলাদা আবেদন করতে হয়, আর admin approve করলে সেই mode চালু হয়।
- Figma-র শুরুর "role selection" screen রাখা যাবে, তবে flow হবে এরকম:
  - "Vendor" বাছলে: account তৈরি → OTP → **vendor আবেদন form**
  - "Delivery Partner" বাছলে: account তৈরি → OTP → **rider আবেদন form**
- 🆕 **Profile-এ "Become a Vendor" আর "Become a Delivery Partner"**, পরে আবেদন করার জন্য।
- 🆕 **Mode switch:** একজন user একসাথে customer, vendor আর rider হতে পারে। Profile বা header-এ mode বদলানোর জায়গা লাগবে, যেমন "Customer / My Store / Delivery"।

### ১.৩ Contact লুকানো (client-এর কঠোর নিয়ম)
- ❌ **Customer-এর কাছে** vendor বা rider-এর phone আর email কোথাও দেখানো যাবে না: store page, product page, rider info, chat details — কোথাও না।
- ❌ Chat details-এ "Delivery partner details: phone, email" আছে। **Phone আর email বাদ দিন।** নাম, ছবি, গাড়ির ধরন আর rating রাখুন।
- Vendor-এর rider list-এও rider-এর phone থাকবে না।
- ✅ Vendor নিজের order-এ customer-এর নাম আর phone দেখতে পায়, এটা ঠিক আছে।

### ১.৪ Online payment-এর অপেক্ষার অবস্থা
Orange Money, MTN Mobile Money বা Card দিয়ে payment দিলে টাকা সাথে সাথে নিশ্চিত হয় না।
- 🆕 প্রতিটা online payment-এর জন্য ৩টা অবস্থা design করুন:
  - **"Paiement en attente / Waiting for payment"**
  - **"Payé / Paid"**
  - **"Échec / Failed"**, সাথে "Try again" বাটন
- এটা লাগবে order payment, subscription, job publish, CV unlock আর spontaneous application — সবগুলোতে।

### ১.৫ OTP
- Code **6 সংখ্যার**, একসাথে phone (SMS) আর email-এ যায়।
- একবার পাঠালে **60 সেকেন্ড** পর আবার পাঠানো যায়। দিনে সর্বোচ্চ 10 বার।
- ভুল code দিলে দেখাবে: "X attempts remaining"।
- 🆕 Sign up form-এ **Referral code (optional)** field।

### ১.৬ Account-এর অবস্থা
- 🆕 **Suspended screen:** admin suspend করলে user সব জায়গা থেকে logout হয়ে যায়। তখন কারণসহ একটা screen দেখাতে হবে, সাথে "Contact support"।
- 🆕 **Chat restricted banner:** নিচে অধ্যায় ৭ দেখুন।

## ২. Customer

### ২.১ Product page
- ✅ Features আর "What's in the box" backend-এ আছে। Figma-র customer product page ঠিক আছে।
- ✅ Discount price, stock, rating, ছবি, tags।

### ২.২ Cart ও Checkout
- ✅ একাধিক দোকানের product এক cart-এ রাখা যায়।
- ✏️ **Delivery method-এর ৩টা option:**
  - **Home delivery (local):** শহরের ভিতরে, দূরত্ব অনুযায়ী fee।
  - **Intercity:** 🆕 অবশ্যই **গন্তব্যের bus station বাছতে হবে** (station picker: নাম আর শহর, যেমন "Gare de Labé")। Delivery-র আনুমানিক সময় ঘণ্টা বা দিনে দেখাবে।
  - **Station pickup:** 🆕 station picker লাগবে। Customer নিজে station থেকে পার্সেল নেবে।
- ✏️ **মূল্যের হিসাব (এই ক্রমে):** Subtotal → Delivery fee → Tax (**এখন 0, তাই 0 হলে লাইনটা লুকান**) → Platform fee (1 000 GNF) → **Total**
- ❌ **Coupon code:** backend-এ coupon system নেই। Field-টা সরান, অথবা "coming soon" হিসেবে রাখুন। ❓ client-কে জিজ্ঞেস করুন।
- ✅ Payment method: Cash on Delivery, Orange Money, MTN Mobile Money, Card।
- ✅ Special instructions, address।

### ২.৩ Order — একটা order, একাধিক দোকান
- ✏️ একটা order-এ ৩টা দোকানের product থাকলে order ৩টা **ভাগে** (sub-order) হয়। প্রতিটা ভাগের **আলাদা status, আলাদা rider, আলাদা tracking আর আলাদা chat** থাকে। Figma-তে item-ভিত্তিক দেখানো আছে, তবে **ভাগটা দোকান-ভিত্তিক হবে**।
- **Order status** (পুরো order-এর জন্য): Active · Completed · Cancelled · Partially cancelled
- **প্রতিটা দোকানের ভাগের status (timeline):** New (Placed) → Accepted (Confirmed) → Preparing → Ready for pickup → In delivery → Delivered, অথবা Cancelled
- **Payment status:** Unpaid · Paid · Partially refunded · Refunded

### ২.৪ 🆕 Delivery PIN (খুবই গুরুত্বপূর্ণ, Figma-তে নেই)
- Customer-এর order tracking screen-এ প্রতিটা ভাগের জন্য একটা **4-digit PIN** বড় করে দেখাতে হবে।
- নির্দেশনা: "Donnez ce code au livreur à la réception" (Rider পৌঁছালে তাকে এই code দিন)।
- Rider এই PIN নিজের app-এ দিলে তবেই delivery সম্পন্ন হয়। COD হলে cash-ও তখন দেওয়া হয়।
- PIN শুধু customer দেখতে পাবে। Rider কখনো দেখতে পাবে না।

### ২.৫ Intercity tracking
- 🆕 Intercity order-এ **৩ ধাপের timeline**:
  1. Moto: দোকান থেকে bus station
  2. Bus: station থেকে station
  3. Moto: station থেকে বাড়ি
- প্রতিটা ধাপে partner-এর নাম আর status দেখাবে। Live map শুধু moto-র ধাপে।

### ২.৬ Cancel ও পরিবর্তন
- ✏️ Customer **শুধু তখনই cancel করতে পারে যখন কোনো দোকান এখনো "Preparing" শুরু করেনি।** তার পরে Cancel বাটন disabled থাকবে, সাথে কারণ লেখা।
- Cancel করলে কারণ লিখতে হবে (কমপক্ষে ৩ অক্ষর)।
- Customer **পুরো order** cancel করে, এক দোকানের ভাগ আলাদা করে না।
- 🆕 **Vendor order বদলালে** (item সরানো বা সংখ্যা কমানো), customer-এর order-এ একটা notice দেখাবে: "Votre commande a été modifiée — nouveau total: X GNF", সাথে কারণ।

### ২.৭ 🆕 সমস্যা জানানো (Dispute) — Figma-তে নেই
- Order detail-এ **"Signaler un problème / Report a problem"** বাটন।
- Form: কারণ (কমপক্ষে ৫ অক্ষর), কোন দোকানের ভাগ (optional), কত টাকা ফেরত চায় (optional)।
- Status: Open · Resolved · Rejected। Admin-এর উত্তর দেখাবে।
- Refund হলে order-এ দেখাবে: "Partially refunded / Refunded"।

### ২.৮ Review
- ✅ Delivered হওয়ার পর **প্রতিটা দোকানের ভাগের জন্য আলাদা** review: ১–৫ তারা আর মন্তব্য।
- ✅ অন্য user-এর review report করা যায়।

### ২.৯ Address
✅ Figma প্রায় ঠিক আছে। Field-এর পুরো তালিকা:
- Label: Home / Office / Other (Other হলে নিজের নাম লেখা যায়)
- পুরো নাম, phone
- Region, City, Commune, Neighborhood
- Landmark, Directions (পথনির্দেশ)
- **গেটের ছবি**
- Map pin
- "Default address" toggle

### ২.১০ অন্যান্য
- ✅ Favorites (wishlist)
- ✅ Search ও filter: category, দামের পরিসর, দূরত্ব, rating, stock-এ আছে কিনা, sort

## ৩. Vendor (দোকান)

### ৩.১ আবেদন ও approval
✏️ Figma-তে শুধু "Pending" আর "Approved" আছে। **Backend-এ ৬টা অবস্থা**, প্রতিটার screen বা state লাগবে:
- **Draft:** form পূরণ চলছে
- **Pending:** admin দেখছে
- 🆕 **Needs changes:** admin-এর note দেখাবে, সাথে "Edit & resubmit" বাটন
- **Approved**
- 🆕 **Rejected:** কারণসহ
- 🆕 **Suspended:** কারণসহ; দোকান বন্ধ, product যোগ করা যাবে না

- ✏️ **Payout method (Orange Money / Mobile Money / Bank) ছাড়া আবেদন জমা দেওয়া যাবে না।** Submit বাটনের আগে এটা বাধ্যতামূলক দেখাতে হবে।
- ✅ Store name, business category, ঠিকানা আর map, market name, business phone, logo, document (license, optional)।

### ৩.২ Product
- ✏️ **Add product form-এ ২টা field যোগ করুন:** **"Key features"** (তালিকা) আর **"What's in the box"** (তালিকা)। Customer page-এ এগুলো দেখায়, কিন্তু vendor-এর form-এ নেই।
- 🆕 **Product approval status:** প্রতিটা নতুন product আগে admin approve করে।
  - Vendor-এর product list-এ badge: **Waiting for approval · Live · Rejected** (admin-এর কারণসহ)
  - Tabs: All · Active · Out of stock · **Pending**
- ✅ Stock, low-stock alert, preparation time, tags, ছবি (প্রায় ৫টা), "Available for sale" toggle।
- ✅ প্রথম product-এর আগের commission popup। Text হবে: **"Commission 10% (minimum 1 000 GNF)"**।

### ৩.৩ Order
- ✏️ **Vendor-এর ধাপ:** New → Accept (অথবা Cancel, কারণসহ) → Start preparing → Mark ready for pickup।
- ❌ **Vendor নিজে "Picked up" বা "Delivered" দিতে পারে না।** এই দুটো rider PIN দিয়ে করে। Vendor-এর screen-এ এগুলো শুধু দেখার জন্য status হিসেবে থাকবে, বাটন হিসেবে না।
- ✅ **Rider assign:** order আসার পর যেকোনো সময় করা যায়। List-এ দেখাবে নাম, গাড়ি, দূরত্ব, চলমান delivery-র সংখ্যা আর rating। Phone থাকবে না।
- 🆕 **Pickup PIN:** vendor-এর order detail-এ একটা **4-digit PIN** দেখাবে। Rider মাল নিতে এলে vendor এটা rider-কে বলবে। নির্দেশনা: "Donnez ce code au livreur quand il récupère la commande"।
- 🆕 **Order modify:** item সরানো বা সংখ্যা কমানো, সাথে কারণ। নতুন total দেখাবে।
- ✅ Money breakdown: subtotal, delivery fee, customer-এর মোট payment, platform commission, vendor-এর নিট আয়।

### ৩.৪ 🆕 Rider network
Client-এর নিয়ম: vendor আর rider একে অপরকে **invitation বা search** দিয়ে যুক্ত করে।
- Vendor: "Invite a rider" (খুঁজে invite করা), আর আমার rider-দের তালিকা
- Rider: "Request to join a store"
- দুই পক্ষেই: invitation গ্রহণ বা প্রত্যাখ্যান
- Status: Invited · Active · Declined · Removed
- শুধু **moto rider** দোকানের network-এ যোগ দিতে পারে।

### ৩.৫ Earnings ও Withdraw
✏️ Balance-এর ৩টা ভাগ পরিষ্কার করে দেখান:
- **Held (আটকে আছে):** order চলছে, delivery হলে পাবেন
- **Available (তোলা যায়)**
- 🆕 **"Waiting for the rider's cash":** COD order delivered হয়েছে, কিন্তু rider এখনো cash জমা দেয়নি। এই টাকা তখনো available হয় না।

- ✏️ **Withdraw:** সর্বনিম্ন **5 000 GNF**। Method অনুযায়ী fee কাটা হয় (admin ঠিক করে)। Form-এ দেখাবে: "পাবেন: X GNF"।
- ✅ Withdraw-এর status: Pending · Completed · Rejected (কারণসহ)। Completed হলে receipt-এর ছবি আর transaction ID দেখাবে।

### ৩.৬ Store profile
- ✅ Open/Closed toggle, working days, একটা opening-hours পরিসর।
- ✅ বন্ধ থাকলে customer সেই দোকানে order দিতে পারে না।

## ৪. Rider (Moto Delivery Partner)

### ৪.১ আবেদন
- ✅ Vehicle type, রং, brand, plate number, vest number, city/area, National ID, document। Vendor-এর মতোই ৬টা অবস্থা (৩.১ দেখুন)।
- ✏️ আবেদনের শুরুতে **partner type** বাছতে হবে: **Moto rider** অথবা **Bus driver** (অধ্যায় ৫)।

### ৪.২ 🆕 Online / Offline toggle — Figma-তে নেই, অবশ্যই লাগবে
- Home বা header-এ একটা বড় toggle।
- **Online থাকলেই** vendor-এর rider list-এ দেখা যায়, আর delivery আসে।
- Online থাকলে location permission লাগবে। Permission না দিলে নির্দেশনা দেখাতে হবে।

### ৪.৩ ✏️ Delivery-র ধাপ: বাটনের বদলে PIN
Figma-তে "Mark as picked up" বাটন আছে। **সেটা বদলে PIN দেওয়ার screen করুন।**
1. **Assigned:** নতুন delivery। Accept অথবা Decline।
2. **Going to pickup:** "Je pars récupérer" বাটন।
3. 🆕 **Pickup:** "Enter the pickup code" — **vendor-এর দেওয়া 4-digit PIN**। ভুল দিলে error।
4. **In transit:** customer-এর কাছে যাচ্ছে, সাথে map আর Navigate।
5. 🆕 **Delivery:** "Enter the customer's code" — **customer-এর দেওয়া 4-digit PIN**। এরপর Delivered।

- Rider **কোনো PIN দেখতে পায় না**, শুধু লিখে দেয়।
- COD হলে ধাপ ৫-এ বড় করে দেখাবে: **"Montant à encaisser: X GNF"** (যত টাকা নিতে হবে)।

### ৪.৪ ❌ "Assign Partner" (rider থেকে rider) — বাদ দিন
Figma-র rider flow-এ "Select & assign delivery partner" screen আছে। **Backend-এ rider অন্য rider-কে delivery দিতে পারে না।** সব ধাপের rider **vendor-ই assign করে।** Intercity-তে station-এ হাতবদল হয় PIN দিয়ে (অধ্যায় ৫)। এই screen বাদ দিন।

### ৪.৫ 🆕 COD cash হিসাব — Figma-তে নেই
- **"Cash à reverser / Cash to hand over":** rider-এর কাছে কোম্পানির কত টাকা জমা আছে।
- **Cash limit:** এর বেশি হলে নতুন COD delivery আসবে না। Limit-এর কাছাকাছি এলে warning দেখাবে।
- **"Déclarer un versement / Declare cash handover" form:** কত টাকা, কোন method, reference নম্বর, প্রমাণের ছবি।
  - পাওনার চেয়ে বেশি দেওয়া যায় না।
  - একটা declaration pending থাকলে আরেকটা দেওয়া যায় না।
- Settlement-এর history: Pending · Confirmed · Rejected।
- ✏️ **Cash পাওনা থাকলে withdraw বন্ধ থাকবে।** Withdraw screen-এ কারণ দেখাতে হবে।

### ৪.৬ Earnings
- ✅ মোট, আজকের, delivery-র সংখ্যা, দৈনিক chart। Withdraw-এর নিয়ম vendor-এর মতোই (৩.৫)।
- Rider-এর আয় = delivery fee।

## ৫. 🆕 Bus Driver (Intercity) — পুরো flow নতুন

### ৫.১ আবেদন
- Rider আবেদনের মতোই, তবে partner type **"Bus driver / Transport"**।
- 🆕 **Route যোগ করা:** কোন station থেকে কোন station-এ যায় (একাধিক route হতে পারে)। উদাহরণ: "Gare Madina (Conakry) → Gare de Labé"।

### ৫.২ Delivery list
শুধু bus-এর ধাপ আসে। দেখাবে: কোন station থেকে কোন station, পার্সেলের সংখ্যা।

### ৫.৩ Station-এ হাতবদল (PIN relay)
**মূল নিয়ম: যে মাল নিচ্ছে সে code দেখায়, আর যে দিচ্ছে সে code লেখে।** প্রতিটা হাতবদলে দুই দিক থেকে দুটো code লাগে।

**Conakry station-এ (moto rider → bus driver):**
- **Bus driver** দেখায় "Code de réception" (incoming code)। **Moto rider** সেটা লিখে মাল হস্তান্তর সম্পন্ন করে।
- **Moto rider** দেখায় "Code de remise" (outgoing code)। **Bus driver** সেটা লিখে pickup নিশ্চিত করে।

**Labé station-এ (bus driver → দ্বিতীয় moto rider):** একই নিয়ম, শুধু ভূমিকা উল্টো।

**Design-এ দুই ধরনের screen লাগবে:**
- 🆕 **"Show code"** screen: বড় 4-digit PIN, আর কাকে দেখাতে হবে সেই নির্দেশনা
- 🆕 **"Enter code"** screen: যার কাছ থেকে নিচ্ছে বা যাকে দিচ্ছে, তার নাম দেখাবে

## ৬. Job, CV ও Subscription

### ৬.১ দাম (admin বদলাতে পারে, এখনকার default)
- Job publish করা: **5 000 GNF**
- Candidate-এর CV বা contact unlock করা: **5 000 GNF**
- Spontaneous application (না চাইতে দোকানে আবেদন): **5 000 GNF**
- ✏️ **Subscription plan:** Figma-তে "$10/month Professional Plan" লেখা। **Plan admin তৈরি করে**: নাম, দাম (GNF), কত দিন, আর বিক্রির পয়েন্ট (highlights)। Design-টা এমন হবে যেন ১টা বা একাধিক plan card দেখানো যায়, আর text admin-এর দেওয়া data থেকে আসে।

### ৬.২ Recruiter (যেকোনো user)
- ✅ Job form Figma-র মতোই। 🆕 শেষ ধাপ **"Publish — 5 000 GNF"**, সাথে payment-এর অপেক্ষার অবস্থা (১.৪)।
- Job-এর অবস্থা: Draft · Published · Closed।
- 🆕 **Contact lock:** unlock-এর আগে applicant-এর phone আর email **লুকানো** থাকে, সাথে একটা lock আইকন আর "Unlock — 5 000 GNF" বাটন।
- ✅ Shortlist, Reject, Interview invite (তারিখ, সময়, স্থান, map link, note)।
- 🆕 **"Received applications":** দোকানে আসা spontaneous application-গুলো।

### ৬.৩ Job seeker
- ✅ Application-এর status: Applied · Under review · Shortlisted · Interview · Hired · Rejected · Withdrawn
- 🆕 **Pending payment** (শুধু spontaneous application, payment না হওয়া পর্যন্ত দোকান দেখতে পায় না)
- ✅ "% match" backend-এ আছে।
- ✅ CV: summary, upload করা CV, শহর, location, শিক্ষা, অভিজ্ঞতা, skill, ভাষা, ছবি।
- ⚠️ **"Generate with AI":** এখন এটা একটা template থেকে লেখা তৈরি করে, আসল AI না। Design রাখা যাবে, কিন্তু খুব বড় প্রতিশ্রুতি দেবেন না।

### ৬.৪ Worker listing
- 🆕 Profile-এ **"Show me as a worker"** toggle: profession (category থেকে), hourly rate, অভিজ্ঞতার বছর।
- Worker directory-তে phone বা email নেই। যোগাযোগ শুধু chat দিয়ে।
- Subscription থাকলে list-এর উপরের দিকে আসে।
- ❓ **Worker হওয়া ফ্রি, নাকি subscription লাগবে?** Client দুই রকম কথা বলেছে।

## ৭. Chat
- ✅ **Chat-এর ধরন:** order chat, buyer–seller, worker-এর সাথে, job application chat।
- ✏️ **Voice message শুধু customer ↔ rider-এর মধ্যে।** অন্য সব chat-এ **mic বাটন লুকান**। Text আর ছবি সব chat-এ চলে।
- 🆕 **Contact filter:** কেউ phone নম্বর, email বা link পাঠালে সেটা **mask হয়ে যায়** (যেমন "•••")।
  - তখন message-এর নিচে একটা warning: "Pour votre sécurité, les coordonnées ne sont pas autorisées"
- 🆕 **৩ বার** এমন করলে **২৪ ঘণ্টা chat বন্ধ:** input box-এর জায়গায় banner দেখাবে, "Vous pourrez écrire à nouveau le … à …"
- 🆕 **৫ বার** করলে **account suspend** হয় (১.৬)।
- ❌ **Block user:** backend-এ এর কোনো API নেই। ❓ রাখতে চাইলে backend-এ যোগ করতে হবে, নইলে সরান। **Report** আছে, সেটা রাখুন।

## ৮. Profile, Notification ও Support

### ৮.১ Notification-এর ধরন (icon আর রং ঠিক করার জন্য)
- **Customer:** Order placed · Order accepted · Ready for pickup · Rider on the way · Delivered · Cancelled · Feedback request
- **Vendor:** New order · Order cancelled · Earnings updated · Withdrawal update · Profile approved · Application received
- **Rider:** New delivery assigned · Collect payment (COD) · Earnings updated · Withdrawal update
- **সবার জন্য:** New message · Special offer · Moderation warning · Account suspended · System alert

### ৮.২ Support ticket
- ✅ **ধরন:** Order issue · Account access · Payment dispute · App bug · Rider conduct · Vendor inquiry · General · Other
- ✅ **Urgency:** Low · Medium · High · Critical
- 🆕 Ticket-এর status (Open · In progress · Resolved · Closed) আর **admin-এর উত্তর** দেখানোর screen।

### ৮.৩ বিজ্ঞাপন
- 🆕 **৩ ধরন:** Banner · Popup · Interstitial (পুরো screen)
- 🆕 **৩ জায়গা:** Home · Category page · Search
- Banner-এ ছবি আর link থাকে।

### ৮.৪ অন্যান্য
- ✅ Delete account, ভাষা বদলানো, notification setting, referral বা share link, password বদলানো, phone বদলানো (SMS OTP দিয়ে)।

## ৯. ❓ Client-এর কাছে জানতে হবে
1. **Worker listing:** ফ্রি, নাকি subscription লাগবে?
2. **Coupon code:** লাগবে কি? (এখন backend-এ নেই)
3. **Chat-এ Block user:** লাগবে কি?
4. **Customer কি এক দোকানের ভাগ আলাদা করে cancel করতে পারবে?** এখন শুধু পুরো order cancel করা যায়।
5. **Tax:** এখন 0। ভবিষ্যতে লাগবে কি?

## ১০. সংক্ষেপে — designer-এর কাজের তালিকা

### 🆕 নতুন screen বা অংশ
- Mode switch আর "Become a Vendor / Delivery Partner"
- Online payment-এর অপেক্ষা, সফল আর ব্যর্থ অবস্থা
- Station picker (intercity আর station pickup)
- Customer-এর delivery PIN
- Intercity-র ৩ ধাপের timeline
- Dispute ("Report a problem")
- Vendor বা rider আবেদনের Needs changes, Rejected আর Suspended অবস্থা
- Product approval-এর status
- Vendor-এর pickup PIN
- Order modify, আর customer-এর কাছে তার notice
- Rider network (invite বা request)
- "Waiting for the rider's cash" balance
- Rider Online/Offline toggle
- Rider-এর PIN দেওয়ার ২টা screen
- COD cash হিসাব আর declaration
- Bus driver-এর পুরো flow (route, station-এ code দেখানো ও লেখা)
- CV contact lock আর unlock
- Received applications আর pending payment
- Worker listing toggle
- Chat filter-এর warning আর restriction banner
- Suspended screen
- Support ticket-এর উত্তর
- Ad-এর popup আর interstitial

### ✏️ পরিবর্তন
- সব জায়গায় $-এর বদলে GNF
- French-কে মূল ভাষা ধরা
- Product form-এ Features আর What's in the box যোগ
- Rider-এর "Mark as picked up" বাটনের বদলে PIN
- Vendor-এর "Delivered" বাটন সরানো
- Checkout-এ tax 0 হলে লুকানো
- Cancel-এর নিয়ম (Preparing-এর আগে পর্যন্ত)
- Voice শুধু customer ↔ rider
- Subscription plan admin-এর data থেকে আসবে

### ❌ বাদ দিন
- Chat details-এ rider-এর phone আর email
- Rider থেকে rider "Assign Partner"
- Coupon code (client না চাইলে)
- Block user (client না চাইলে)

> অধ্যায় ৯-এর প্রশ্নগুলোর client-এর উত্তর না পাওয়া পর্যন্ত designer ওই অংশগুলো "pending" ধরে কাজ করবে।
