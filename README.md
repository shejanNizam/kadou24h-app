# Kadou24h App

The mobile app (Expo + React Native + TypeScript) for Kadou24h: a marketplace, delivery and jobs app for Guinea. One app with 3 modes: **Customer · Vendor · Rider** (moto or bus driver).

## Run
```bash
npm install
npm run web        # web preview → http://localhost:8081 (Chrome DevTools → device mode)
npm run android    # Android emulator / device (Expo Go or dev build)
```
The API must be running: `cd ../kadou24h-server && npm run dev:local` (port 7000).

## Docs
| File | What |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Rules and context for AI agents (start here) |
| [docs/APP_SPEC.md](docs/APP_SPEC.md) | Screen-by-screen spec for every role (source of truth) |
| [docs/API_MAP.md](docs/API_MAP.md) | API endpoints, socket events, conventions |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, folder structure, patterns |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | Phases, checklist, progress log |
| [docs/DESIGNER_REQUIREMENTS_BN.md](docs/DESIGNER_REQUIREMENTS_BN.md) | Original requirements / Figma mismatch list (Bangla) |
