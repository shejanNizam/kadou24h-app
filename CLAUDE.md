# Kadou24h App — guide for Claude / AI agents

@AGENTS.md

This is the **mobile app** (Expo + React Native + TypeScript) for Kadou24h, a multi-vendor marketplace with delivery and a jobs board, for **Guinea** (French first, GNF currency). It is part of a 3-project workspace:

| Folder | What | State |
|---|---|---|
| `../kadou24h-server` | Express 5 + MongoDB + Redis + Socket.io API | Done, tested (`npm run test:e2e`) |
| `../kadou24h-dashboard` | Next.js admin panel | Done |
| `kadou24h-app` (this) | Mobile app for customer, vendor and rider | **In progress** |

## Read these first
1. [docs/APP_SPEC.md](docs/APP_SPEC.md) — **the source of truth.** Every screen, per role, with its backend endpoint and the UX decisions.
2. [docs/API_MAP.md](docs/API_MAP.md) — every app endpoint, socket events and API conventions.
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, folder structure, patterns.
4. [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — phase checklist and progress. **Update it when you finish something.**
5. [docs/DESIGNER_REQUIREMENTS_BN.md](docs/DESIGNER_REQUIREMENTS_BN.md) — the original requirements and Figma-mismatch list (Bangla), written after the backend was built.

## Golden rules
1. **Figma is for the look, not the flow.** The user does not fully trust the designer's UX. Copy the visual style (purple theme, cards, layouts), but take the flow and states from `APP_SPEC.md` and the backend. If the Figma and the backend disagree, the backend wins. Tell the user about the change.
2. **One app, several modes.** Everyone signs up as a customer. Vendor and rider are modes unlocked after admin approval (`roles[]` + `lastActiveMode`). Never build separate vendor or rider auth.
3. **Mirror the server field names exactly** in TypeScript types (camelCase, the same enums). Check them against the server's `*.interface.ts` and the dashboard's `src/types/api.ts`. Never invent fields.
4. **Never show fake data.** No hardcoded numbers or names as fallbacks. Use loading, empty and error states instead.
5. **Money:** always GNF integers, formatted `100 000 GNF` with `formatGNF()`. Never `$`. **Totals always come from the backend** (`/orders/checkout-summary`, order details). Never compute fees or totals in the app.
6. **Text:** every string goes through i18n (`fr` default, `en`). French is 20–30% longer, so layouts must not break.
7. **Contact privacy (client rule):** never show a vendor's or rider's phone or email to a customer. Vendors may see the customer's name and phone. Contact happens only through in-app chat.
8. **Web preview must never crash.** The user develops on Expo web (`npm run web`, Chrome device mode). Every native-only module (maps, secure-store, location, push, camera) needs a `.web.tsx` / `.web.ts` fallback.
9. **Low-end Android + slow network:** keep bundles light, compress images before upload, cache with RTK Query, add pull-to-refresh, and show a Retry button on errors and an offline banner.
10. Run `npx tsc --noEmit` and `npx expo lint` before saying a task is done.

## Running locally
```bash
# 1) API (port 7000). Its .env FRONTEND_URL already includes http://localhost:8081 for CORS
cd ../kadou24h-server && npm run dev:local
# 2) App on the web preview → http://localhost:8081 (F12 → Ctrl+Shift+M → Pixel 7)
cd ../kadou24h-app && npm run web
```
**Demo data:** `cd ../kadou24h-server && npm run seed:demo` fills a separate `kadou24h-demo` DB (4 stores, 48 products with photos, riders, workers, jobs, banners). Then run `npm run dev:demo` instead of `dev:local`. Demo logins: customer `620 00 00 01`, vendor `…02`, rider `…03`, bus driver `…04`, password `Kadou2026`. Never seed the `.env` database.

The app reads `EXPO_PUBLIC_API_URL` (default `http://localhost:7000/api/v1`). On a real phone, use the PC's LAN IP instead of localhost.

Never run tests or experiments against the user's real `.env` database. The server e2e (`npm run test:e2e`) uses its own throwaway DB.

## Working with the user
- The user speaks Bangla and English. Give Bangla versions of overviews when asked.
- They share Figma as screenshots, section by section.
- Ask before changing business rules. Open questions are listed in `APP_SPEC.md` § Open questions.
