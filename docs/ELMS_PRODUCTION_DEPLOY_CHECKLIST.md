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

## 0. Release Coupling — read before deploying anything

Some changes are only safe to ship together. Deploying one half alone is a known
regression, not a risk to weigh up.

### Maintenance rescheduling — backend and AdminPortal are COUPLED

**Do not deploy the maintenance rescheduling backend before the AdminPortal
handoff is finished and deployed with it.**

| side | repo | commits |
| --- | --- | --- |
| backend | server-ELMS | `a4e5c77`, `3411e41`, `5fee91c` |
| AdminPortal | client-ELMS | `1c3b84b` |

Both sides are committed. They must reach production in the same release, in
either order — the coupling is that neither is correct alone.

Why: the backend refuses a calendar-day change on a work order that carries a
maintenance visit (`PUT /work-orders` → 400), because moving a visit's day has
to be recorded through `POST /maintenance/visits/{id}/reschedule`. The
AdminPortal change is what sends operators down that path.

* backend alone → an operator editing a maintenance date gets a 400 and no way
  forward; `WorkOrderEditDialog` still posts the day change to `PUT`.
* AdminPortal alone → the reschedule dialog calls an endpoint that is not there
  yet, so the day change fails at the network instead of at validation.

Changing a job's TIME, technician, team or priority is unaffected either way.

Remove this section once both sides are live in production.

### Maintenance visit dates — order of operations on production

The generator used to overwrite each contract's day with the day the cron ran,
so whole batches landed on one date. The fix ships in the backend; the rows it
already wrote need a separate, reviewed correction.

**This order, and not another.** A capacity or workload reading taken before
step 6 measures the clustering, not the operation — on the dev database the same
month looked like 95 visits in one day when the real busiest day was 8.

- [ ] 1. deploy the backend (`56f158e` onward) — nothing below is safe first
- [ ] 2. dry run, look only:
      `docker compose exec api python scripts/verify/report_flattened_visits.py`
- [ ] 3. emit a PRODUCTION artifact:
      `... report_flattened_visits.py --emit /tmp/flattened.json`
- [ ] 4. read it — check the safe/review/completed split and the correction range
- [ ] 5. apply that exact artifact:
      `... report_flattened_visits.py --apply /tmp/flattened.json`
- [ ] 6. verify: visit dates equal canonical, work orders match their visit,
      zero reschedule rows created, zero completed rows touched
- [ ] 7. only now: `docker compose exec api python scripts/verify/report_capacity.py`

**Never reuse an artifact from another database.** The ids in a dev artifact are
dev evidence. The apply step intersects the artifact with a live re-scan, so
foreign ids are reported as skipped rather than applied — but produce a fresh
artifact on the machine you are correcting, even if the count matches.

**The correction is not a reschedule.** It writes no `maintenance_visit_reschedules`
row, because nobody moved these visits — they were generated wrong. Routing it
through the reschedule service would repair the date while holding the
customer's anchor on the bad one.

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
