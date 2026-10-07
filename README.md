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
