# ELMS Customer App

React Native (Expo + TypeScript) customer mobile app for ELMS.

## Included from blueprint

- 9 core screens:
  - Login
  - Home Dashboard
  - Elevators List
  - Elevator Detail
  - Visits
  - Technician Tracking (map)
  - Contracts
  - Report Issue (bottom sheet modal)
  - Notifications
- Stack + Bottom Tabs navigation
- Arabic RTL-first dark UI
- FastAPI endpoint mapping for customer app contracts
- Mock mode to run app immediately

## Run

```bash
npm install
npm run start
```

## Typecheck

```bash
npm run typecheck
```

## Environment variables

Create `.env` in project root if needed:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
EXPO_PUBLIC_USE_MOCKS=true
```

Set `EXPO_PUBLIC_USE_MOCKS=false` to call real backend endpoints.
