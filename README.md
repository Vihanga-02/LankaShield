# LankaShield

Smart Disaster Early-Warning and Emergency Coordination System — campus project.

| Workspace           | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `apps/mobile`       | Expo app for Citizens and Volunteers (UC01)                 |
| `apps/dashboard`    | React + Vite officer dashboard (UC02, UC03, UC04)           |
| `packages/shared`   | Shared enums, models and constants (`@lankashield/shared`)  |

## Setup

```bash
npm install                                   # installs every workspace from the root
cp apps/mobile/.env.example apps/mobile/.env  # fill in Firebase web config values
cp apps/dashboard/.env.example apps/dashboard/.env
```

## Scripts (run from the root)

```bash
npm run mobile      # Expo dev server
npm run dashboard   # Vite dev server
npm run typecheck   # all workspaces
npm run lint
npm run format
npm run build
```

Install mobile native packages with `npx expo install <pkg>` inside `apps/mobile`.
