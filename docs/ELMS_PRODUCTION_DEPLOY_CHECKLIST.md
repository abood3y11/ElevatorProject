# ELMS Production Deploy Checklist

## Goal

This checklist is for a real ELMS production rollout with:

- `backend`
- `AdminPortal`
- customer mobile app
- worker mobile app
- PostgreSQL
- Redis
- S3
- background worker

Use it before first launch, and again before every major release.

## 1. Infrastructure Ready

- [ ] Linux server or managed environment prepared
- [ ] domain / subdomain assigned
- [ ] TLS certificates ready
- [ ] PostgreSQL ready
- [ ] Redis ready
- [ ] S3 bucket ready
- [ ] outbound network access to AWS S3 verified
- [ ] backup storage path defined

## 2. Secrets and Environment

- [ ] production `.env` built from [backend/.env.example](C:/Dev/ElevatorProject/backend/.env.example)
- [ ] `SECRET_KEY` rotated to a strong production secret
- [ ] `DATABASE_URL` points to production DB
- [ ] `REDIS_ENABLED=true`
- [ ] `REDIS_URL` points to production Redis
- [ ] `AWS_ACCESS_KEY_ID` set
- [ ] `AWS_SECRET_ACCESS_KEY` set
- [ ] `AWS_REGION` set correctly
- [ ] `AWS_S3_BUCKET_NAME` set correctly
- [ ] `CORS_ORIGINS` contains only real frontend origins
- [ ] no local/demo credentials left in production config

## 3. Database Safety

- [ ] `alembic upgrade head` runs successfully
- [ ] connection pooling configured
- [ ] backups tested
- [ ] restore drill tested at least once
- [ ] critical indexes reviewed

## 4. Backend Runtime

- [ ] backend runs behind Nginx
- [ ] backend runs with Gunicorn + Uvicorn workers
- [ ] health endpoint returns `200`
- [ ] health endpoint shows Redis healthy when enabled
- [ ] no dev `--reload` process used in production

Recommended command:

```bash
gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 app.main:app
```

## 5. Redis and Worker

- [ ] Redis responds to `PING`
- [ ] worker process starts successfully
- [ ] queue name configured correctly
- [ ] sample job can be pushed and consumed
- [ ] app startup logs confirm Redis health

Worker command:

```bash
python -m app.workers.redis_worker
```

## 6. Media and S3

- [ ] image upload from admin succeeds
- [ ] store image proxy returns `200`
- [ ] thumbnail URLs work
- [ ] delivery proof image path works
- [ ] S3 credentials limited to required bucket permissions

## 7. Realtime

- [ ] admin WebSocket connects
- [ ] customer order WebSocket connects
- [ ] order update events arrive after worker/admin actions
- [ ] Redis pub/sub path is planned or wired for multi-instance deployments

## 8. AdminPortal

- [ ] production build succeeds
- [ ] API base URL points to production backend
- [ ] login works
- [ ] store management page works
- [ ] recommendation board works
- [ ] invoice open / PDF download works

## 9. Customer App

- [ ] real build used, not Expo Go for production
- [ ] login works
- [ ] store images load
- [ ] quote view works
- [ ] add-to-cart works
- [ ] checkout works
- [ ] invoice viewer and PDF work
- [ ] deep links open correctly

## 10. Worker App

- [ ] real build used, not Expo Go for production
- [ ] technician login works
- [ ] assigned visits load
- [ ] recommendation parts options load
- [ ] complete visit with recommended part works
- [ ] delivery actions work
- [ ] proof/signature flow works

## 11. Core Business Flow Test

Run one full live test:

- [ ] technician starts work order
- [ ] technician completes visit
- [ ] technician recommends a spare part
- [ ] customer sees recommendation
- [ ] customer approves recommendation
- [ ] customer opens quote
- [ ] customer adds part to cart
- [ ] customer places order
- [ ] admin marks invoice paid
- [ ] recommendation becomes `done`

Optional scripted test:

```bash
python scripts/load_test_recommendation_flow.py ^
  --base-url http://YOUR_HOST:8000/api/v1 ^
  --customer-id YOUR_CUSTOMER_UUID ^
  --iterations 3
```

## 12. Performance Checks

- [ ] `/health` latency acceptable
- [ ] `/customer/store` latency acceptable
- [ ] `/customer/visits/{id}` latency acceptable
- [ ] admin orders page acceptable under realistic data
- [ ] no oversized images being sent where thumbnails are expected

## 13. Observability

- [ ] backend logs aggregated
- [ ] worker logs aggregated
- [ ] app errors captured centrally
- [ ] request latency monitored
- [ ] DB CPU / memory monitored
- [ ] Redis memory monitored
- [ ] disk space monitored

## 14. Security Checks

- [ ] HTTPS only
- [ ] admin routes require proper roles
- [ ] rate limit on auth routes
- [ ] S3 keys not exposed in frontend
- [ ] no debug stack traces shown publicly
- [ ] production secrets not committed to git

## 15. Release Readiness

- [ ] release tag created
- [ ] rollback plan written
- [ ] DB rollback risk reviewed
- [ ] smoke test passed after deploy
- [ ] team knows where logs and health checks live

## Recommended First Production Rollout Order

1. deploy PostgreSQL
2. deploy Redis
3. deploy backend
4. run migrations
5. start worker
6. deploy AdminPortal
7. validate S3 image flow
8. validate worker-to-customer recommendation flow
9. validate invoices and payment state updates

## Notes For ELMS Specifically

- recommendation-to-store flow is now a critical business path, so test it every release
- S3 image proxy must be checked whenever media behavior changes
- worker app production builds matter because Expo Go is not enough for push and full device behavior
- Redis should be considered required once you run more than one backend instance
