# ELMS VPS Operations Guide

This guide is for managing the ELMS production deployment on the Hostinger VPS.

Server IP:

```bash
92.113.31.218
```

Production path:

```bash
/opt/elms
```

Services:

```bash
elms-db        # PostgreSQL
elms-redis     # Redis queue / realtime bridge
elms-backend   # FastAPI / Gunicorn
elms-worker    # Background worker for Redis jobs
elms-frontend  # Admin Portal / Nginx
nginx          # Host reverse proxy for HTTPS domains
```

Production domains:

```text
https://admin.hensline.com  # Admin Portal
https://api.hensline.com    # Backend API and webhooks
```

## SSH Login

From your local machine:

```bash
ssh root@92.113.31.218
```

Then go to the project:

```bash
cd /opt/elms
```

## Important Security Note

Never commit `.env` files to GitHub.

If any AWS key, database password, JWT secret, or private token is shared in chat, logs, screenshots, or GitHub, rotate it immediately from the provider dashboard.

Backend environment file:

```bash
/opt/elms/server-ELMS/.env
```

Frontend environment file:

```bash
/opt/elms/client-ELMS/.env
```

## Edit Backend .env

```bash
cd /opt/elms/server-ELMS
nano .env
```

Example keys only:

```env
AWS_ACCESS_KEY_ID=replace_me
AWS_SECRET_ACCESS_KEY=replace_me
AWS_REGION=me-south-1
AWS_S3_BUCKET_NAME=elms-aws-bucket
```

After editing `.env`, restart the backend:

```bash
cd /opt/elms
docker compose restart api
```

Check backend health:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/api/v1/health
```

## Docker Compose Basics

Show running services:

```bash
cd /opt/elms
docker compose ps
```

Start all services:

```bash
docker compose up -d
```

Stop all services:

```bash
docker compose down
```

Restart backend only:

```bash
docker compose restart api
```

Restart frontend only:

```bash
docker compose restart web
```

Restart database only:

```bash
docker compose restart db
```

Restart Redis only:

```bash
docker compose restart redis
```

Restart background worker only:

```bash
docker compose restart worker
```

View backend logs:

```bash
docker compose logs -f api
```

View frontend logs:

```bash
docker compose logs -f web
```

View database logs:

```bash
docker compose logs -f db
```

View Redis logs:

```bash
docker compose logs -f redis
```

View worker logs:

```bash
docker compose logs -f worker
```

## Rebuild And Run

Use this after code changes, dependency changes, Dockerfile changes, or frontend environment changes.

Rebuild backend:

```bash
cd /opt/elms
docker compose build api
docker compose up -d api
```

Rebuild worker:

```bash
cd /opt/elms
docker compose build worker
docker compose up -d worker
```

Rebuild frontend:

```bash
cd /opt/elms
docker compose build web
docker compose up -d web
```

Rebuild everything:

```bash
cd /opt/elms
docker compose build
docker compose up -d
```

## Git Pull Workflow

Backend:

```bash
cd /opt/elms/server-ELMS
git status
git pull --ff-only
```

Frontend:

```bash
cd /opt/elms/client-ELMS
git status
git pull --ff-only
```

After backend pull:

```bash
cd /opt/elms
docker compose build api
docker compose run --rm api alembic upgrade head
docker compose up -d api
```

After frontend pull:

```bash
cd /opt/elms
docker compose build web
docker compose up -d web
```

## GitHub Deploy Keys

Backend repo:

```bash
/opt/elms/server-ELMS
```

Expected remote:

```bash
git@github.com:abood3y11/server-ELMS.git
```

Frontend repo:

```bash
/opt/elms/client-ELMS
```

Expected remote:

```bash
git@github-elms-client:abood3y11/ELMS.git
```

Check remotes:

```bash
cd /opt/elms/server-ELMS
git remote -v

cd /opt/elms/client-ELMS
git remote -v
```

Test GitHub SSH:

```bash
ssh -T git@github.com
ssh -T git@github-elms-client
```

If frontend pull fails, add this public key as a deploy key in `abood3y11/ELMS`:

```bash
cat ~/.ssh/id_ed25519_elms_client.pub
```

If backend pull fails, add this public key as a deploy key in `abood3y11/server-ELMS`:

```bash
cat ~/.ssh/id_ed25519_elms.pub
```

Deploy keys need read access only. Do not enable write access unless you intentionally want the VPS to push to GitHub.

## Database Backup

Create a database backup:

```bash
cd /opt/elms
mkdir -p backups
docker exec elms-db pg_dump -U postgres elms_db > backups/elms_db_$(date +%Y%m%d_%H%M%S).sql
```

List backups:

```bash
ls -lh /opt/elms/backups
```

## Alembic Migrations

Check current database revision:

```bash
cd /opt/elms
docker compose exec -T api alembic current
```

Check available heads:

```bash
docker compose exec -T api alembic heads
```

Run migrations:

```bash
docker compose run --rm api alembic upgrade head
```

## Redis And Worker

Check Redis:

```bash
cd /opt/elms
docker compose exec -T redis redis-cli ping
```

Expected result:

```text
PONG
```

Check worker:

```bash
docker compose ps worker
docker compose logs --tail=50 worker
```

Check queue length:

```bash
docker compose exec -T redis redis-cli LLEN elms:jobs
```

If worker is not processing jobs:

```bash
docker compose restart redis worker
docker compose logs -f worker
```

## WhatsApp Webhook

Webhook URL for Meta:

```text
https://api.hensline.com/api/v1/webhooks/whatsapp
```

Verify token:

```text
elms_verify_token
```

The verify token is configured in:

```bash
/opt/elms/server-ELMS/.env
```

Required `.env` keys:

```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=elms_verify_token
WHATSAPP_WEBHOOK_APP_SECRET=
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379/0
```

Note: Docker Compose overrides `REDIS_URL` inside the containers to:

```env
REDIS_URL=redis://redis:6379/0
```

Test webhook verification:

```bash
curl -fsS -G "https://api.hensline.com/api/v1/webhooks/whatsapp" \
  --data-urlencode "hub.mode=subscribe" \
  --data-urlencode "hub.verify_token=elms_verify_token" \
  --data-urlencode "hub.challenge=test_ok"
```

Expected result:

```text
test_ok
```

Test webhook POST:

```bash
curl -fsS -X POST "https://api.hensline.com/api/v1/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"from":"966500000000","id":"wamid.test","text":{"body":"hello"}}],"contacts":[{"wa_id":"966500000000"}]}}]}]}'
```

Expected result:

```json
{"status":"received","queued":true}
```

Check worker processed it:

```bash
cd /opt/elms
docker compose logs --tail=50 worker
docker compose exec -T redis redis-cli LLEN elms:jobs
```

## Health Checks

Backend direct:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/api/v1/health
```

Backend through frontend proxy:

```bash
curl -fsS http://127.0.0.1:8080/
curl -fsS https://admin.hensline.com/api/v1/health
```

Public checks:

```bash
curl -I https://admin.hensline.com/
curl -fsS https://admin.hensline.com/api/v1/health
curl -fsS https://api.hensline.com/api/v1/health
```

## URLs

Admin portal:

```text
https://admin.hensline.com/
```

Backend health:

```text
https://api.hensline.com/api/v1/health
```

Note: HTTPS on the raw IP address can show a browser warning. Use the domains above because Nginx and Let's Encrypt provide trusted SSL for them.

## Nginx And SSL

Docker exposes the app only on localhost:

```text
127.0.0.1:8080 -> Admin Portal container
127.0.0.1:8000 -> Backend container
```

Host Nginx owns public ports `80` and `443`, then proxies traffic to Docker.

Nginx config:

```bash
/etc/nginx/sites-available/elms
```

Check Nginx:

```bash
nginx -t
systemctl reload nginx
```

Check certificates:

```bash
certbot certificates
```

Renewal is scheduled automatically by Certbot. Manual dry run:

```bash
certbot renew --dry-run
```

## Quick Deploy Commands

Backend quick deploy:

```bash
cd /opt/elms/server-ELMS
git pull --ff-only
cd /opt/elms
docker compose build api
docker compose run --rm api alembic upgrade head
docker compose up -d api
curl -fsS http://127.0.0.1:8000/health
```

Frontend quick deploy:

```bash
cd /opt/elms/client-ELMS
git pull --ff-only
cd /opt/elms
docker compose build web
docker compose up -d web
curl -I https://admin.hensline.com/
```

Full quick deploy:

```bash
cd /opt/elms/server-ELMS
git pull --ff-only
cd /opt/elms/client-ELMS
git pull --ff-only
cd /opt/elms
docker compose build
docker compose run --rm api alembic upgrade head
docker compose up -d
docker compose ps
```

Full quick deploy with worker:

```bash
cd /opt/elms/server-ELMS
git pull --ff-only
cd /opt/elms
docker compose build api worker
docker compose run --rm api alembic upgrade head
docker compose up -d redis api worker web
docker compose ps
curl -fsS http://127.0.0.1:8000/health
```
