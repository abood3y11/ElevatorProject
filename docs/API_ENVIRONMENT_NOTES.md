ELMS API environment notes

Development
- Backend listens on `0.0.0.0:8000`
- Web/admin on the same machine can use `http://localhost:8000/api/v1`
- Expo native apps should also keep env as `http://localhost:8000/api/v1`
- The mobile apps rewrite `localhost` automatically to the Expo host LAN IP on real devices

Current local defaults
- `elms-customer/.env` -> `EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1`
- `mobile-worker/.env` -> `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`
- `AdminPortal/.env` dev mode -> `VITE_DEV_API_BASE_URL=http://localhost:8000/api/v1`

Production / server deployment
- Do not hardcode a temporary server IP in app code
- Set the deployed API base from environment only
- Recommended:
  - Admin portal behind reverse proxy: `/api/v1`
  - Mobile app builds: `EXPO_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1`
  - Customer app builds: `EXPO_PUBLIC_API_URL=https://api.your-domain.com/api/v1`

Why this setup
- local development stays simple
- Expo devices still reach the PC backend automatically
- deployment can change IP/domain without code changes
