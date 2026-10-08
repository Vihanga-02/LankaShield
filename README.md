# LankaShield

Smart Disaster Early-Warning and Emergency Coordination System — campus project.

| Workspace         | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `apps/mobile`     | Expo app for Citizens and Volunteers (UC01)                                  |
| `apps/dashboard`  | React + Vite officer dashboard (UC02, UC03, UC04)                            |
| `packages/shared` | Enums, models, constants, Zod schemas and business rules (`@lankashield/shared`) |
| `scripts`         | `seed.ts` — demo data for the Firebase project                               |

## Setup

```bash
npm install                                   # installs every workspace from the root
cp apps/mobile/.env.example apps/mobile/.env  # fill in Firebase web config values
cp apps/dashboard/.env.example apps/dashboard/.env
```

## Demo data

The seed script loads demo users (one per role), disaster events, hazard reports, verification
decisions, shelters, allocations and notifications into the project in `apps/dashboard/.env`.
Running it again overwrites the same documents. The demo password is never stored in the repository.

```powershell
$env:SEED_DEMO_PASSWORD="choose-a-password"; npm run seed   # PowerShell
```

```bash
SEED_DEMO_PASSWORD=choose-a-password npm run seed           # Bash
```

## Scripts (run from the root)

```bash
npm run mobile      # Expo dev server
npm run dashboard   # Vite dev server
npm run seed        # load demo data (see above)
npm test            # unit + component tests (shared, dashboard, mobile)
npm run typecheck   # all workspaces + scripts
npm run lint
npm run format
npm run build
```

Install mobile native packages with `npx expo install <pkg>` inside `apps/mobile`.

## Continuous integration and deployment

| Workflow | When | What it does |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Every pull request and merge to `main` | Format check, typecheck, lint, all tests, dashboard build |
| `.github/workflows/mobile-preview.yml` | Merges to `main` that touch `apps/mobile`, `packages/shared` or dependencies | Only JavaScript changed → OTA update to the `preview` channel. Native code changed → new preview APK build on EAS |
| Vercel (dashboard) | Every merge to `main` / pull request | Production / preview deployment of `apps/dashboard` |

The mobile workflow needs the `EXPO_TOKEN` repository secret, the Firebase values in the EAS `preview` environment, and Android credentials set up once with `npx eas-cli@latest credentials -p android` (from `apps/mobile`).
