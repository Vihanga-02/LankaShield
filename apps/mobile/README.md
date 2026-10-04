# LankaShield Mobile

Expo (SDK 57) app for Citizens and Community Volunteers — UC01 Submit Hazard Report.

```bash
cp .env.example .env     # fill in Firebase values
npm run mobile           # from the repo root
```

Routes live in `src/app/` (Expo Router). Non-route code goes in `src/` folders outside `app/`.
Native modules such as Google Maps need a development build (`npx eas-cli@latest build --profile development`), not Expo Go.
