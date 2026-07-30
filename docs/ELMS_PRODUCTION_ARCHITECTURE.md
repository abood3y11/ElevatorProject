# ELMS Production Architecture

## Goal

This document describes the recommended production architecture for ELMS based on the system we have today:

- `AdminPortal` for internal management
- `elms-customer` for customer mobile app
- `mobile-worker` for technician / delivery worker mobile app
- `backend` built on FastAPI + PostgreSQL
- S3-backed media for store images
- WebSocket updates for orders
- invoice generation, WhatsApp flows, and recommendation-to-store commerce flows

The main idea is simple:

- Python is good for ELMS
- but ELMS should not make Python carry everything alone
- we separate storage, caching, background work, and realtime delivery cleanly

## Current Functional Shape

Today ELMS already has these important behaviors:

- customer store with images and order tracking
- worker app with visits, delivery actions, and proof workflows
- recommendation flow from worker visit to customer store purchase
- S3 image upload and backend proxy access
- invoice HTML/PDF generation
- WebSocket-based order updates
- PostgreSQL as the core transactional database

That means the system is already beyond a toy app. The next step is operational hardening.

## Recommended Phase 1 Deployment

For the next stable release, use this topology:

```text
Internet / Mobile Apps / Admin Portal
                |
              Nginx
                |
      +---------+----------+
      |                    |
  FastAPI App 1       FastAPI App 2
      |                    |
      +---------+----------+
                |
           PostgreSQL
                |
             Redis
                |
      +---------+----------+
      |                    |
  Background Worker     WebSocket Pub/Sub
                |
                S3
```

## Responsibilities By Layer

### 1. Nginx

Put Nginx in front of the backend.

Use it for:

- reverse proxy
- TLS termination
- request buffering
- static caching for safe responses
- WebSocket forwarding
- rate limiting on auth and public endpoints

Nginx should route:

- `/api/*` -> FastAPI app pool
- `/ws/*` -> FastAPI app pool with WebSocket headers
- admin frontend static build
- optional customer web build if used later

### 2. FastAPI App Pool

Run the backend with multiple workers.

Recommended startup:

```bash
gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 app.main:app
```

Initial notes:

- use `4` workers on a modest machine, then tune from CPU and latency
- keep workers stateless
- do not store session state in process memory
- use shared Redis for cross-worker realtime events

### 3. PostgreSQL

PostgreSQL remains the source of truth for:

- users
- customers
- sites
- elevators
- contracts
- work orders
- recommendations
- carts
- customer orders
- invoice records
- notifications metadata

Production requirements:

- daily backups
- point-in-time recovery if possible
- connection pooling
- query review on heavy list screens
- proper indexing for order, work order, recommendation, and notification tables

High-priority indexes to verify:

- `work_orders(customer_id, scheduled_start, status)`
- `work_order_recommended_parts(work_order_id, customer_action_status)`
- `customer_orders(customer_id, placed_at, payment_status, status)`
- `notifications(user_id, is_read, created_at)`
- `spare_parts(part_code, is_active)`
- `spare_part_store_settings(spare_part_id, is_visible, is_featured)`

### 4. Redis

Redis is the next major infrastructure addition for ELMS.

Use it for:

- caching expensive API responses
- pub/sub for WebSocket fan-out
- queue broker for background jobs
- lightweight rate limiting counters

Recommended first Redis use cases:

1. order update broadcast fan-out
2. notification counters
3. store home / category / featured cache
4. short-lived invoice/viewer token helpers if needed later

### 5. Background Worker

Move slow or bursty work out of request/response.

Use a worker service for:

- WhatsApp sending
- push notifications
- image processing / thumbnail generation
- invoice PDF generation if it becomes heavy
- report exports
- sync jobs

Recommended stack:

- Celery if the team wants a mature queue model
- or RQ / Dramatiq if we want lighter operations

For ELMS, Celery + Redis is a safe default.

### 6. S3

S3 should remain the media layer for:

- spare part images
- thumbnails
- delivery proof images
- signed assets if needed later

Recommended production rule:

- store originals in S3
- serve customer-visible media through the backend proxy or signed URLs
- avoid public bucket exposure unless there is a strong reason

### 7. WebSocket / Realtime

The realtime story should move to a shared model across backend workers.

Today WebSockets exist functionally, but horizontal scale requires shared event delivery.

Recommended pattern:

```text
worker/admin action
   -> DB update
   -> publish event to Redis
   -> all app workers receive event
   -> matching WebSocket clients refresh instantly
```

This avoids the “event only reached one worker” problem.

## Frontend Deployment

### AdminPortal

Deploy as a static build behind Nginx.

Recommended:

- build once in CI
- serve static files directly from Nginx
- keep API base URL in environment config

### Customer and Worker Mobile Apps

For production:

- stop relying on Expo Go
- create real development builds first
- then release builds

This matters especially for:

- push notifications
- deep links
- stable media behavior
- device-level testing

## Background Job Breakdown

These should be moved to queue-backed jobs first:

### High priority

- WhatsApp recommendation messages
- quote sending
- customer push notifications
- admin notification fan-out

### Medium priority

- image thumbnail regeneration
- PDF invoice rendering
- export jobs

### Later

- analytics aggregation
- SLA reports
- billing summaries

## Recommended API Boundaries

Keep the backend split by domain rather than by screen:

- auth
- customer portal
- customer commerce
- customer admin
- work orders
- technicians
- notifications
- billing

That matches the codebase direction already in place and will age better than screen-coupled logic.

## Scaling Path

### Stage A: Single Server, Cleanly Structured

Good for early rollout.

```text
Nginx
FastAPI workers
PostgreSQL
Redis
Worker process
S3
```

This is still one machine or one VM group, but properly separated by process.

### Stage B: Split Database and Cache

When customer count and order volume increase:

- move PostgreSQL to dedicated managed DB or dedicated VM
- move Redis to dedicated managed cache or dedicated VM
- keep app workers separate

### Stage C: Horizontal App Scale

Add multiple app instances behind Nginx or a load balancer:

```text
Load Balancer
  -> App 1
  -> App 2
  -> App 3
Shared PostgreSQL
Shared Redis
Shared S3
Shared Worker Queue
```

### Stage D: Service Hardening

After growth:

- read replicas if reporting becomes heavy
- separate worker classes by task type
- CDN in front of media proxy or signed image path
- observability dashboards

## Observability

Add this early, not late.

### Logs

Collect structured logs for:

- request ID
- user ID
- customer ID
- work order ID
- order ID
- recommendation ID

### Metrics

Track:

- request latency by endpoint
- worker queue latency
- websocket connection count
- DB pool usage
- Redis memory
- S3 upload failures
- invoice generation time
- WhatsApp send success/failure

### Error Tracking

Add centralized error reporting for:

- backend exceptions
- AdminPortal errors
- customer app crashes
- worker app crashes

## Security Notes

### Required now

- move secrets out of local `.env` for production
- use strong JWT secret rotation policy
- restrict admin endpoints by role tightly
- rate limit auth and password-reset flows
- use HTTPS only

### Recommended next

- signed asset access where needed
- audit logs for critical customer-admin actions
- IP restrictions for internal-only operations if required

## ELMS-Specific Hotspots

These are the places ELMS will feel pressure first:

### 1. Store images

Large image lists can slow mobile apps.

Use:

- thumbnails
- pagination
- S3
- cache headers

### 2. Realtime order tracking

As orders and workers grow:

- Redis pub/sub becomes important
- WebSocket events should not stay process-local

### 3. Notifications

Do not send push / WhatsApp inline inside sensitive user requests long-term.

Queue them.

### 4. PDF / invoice generation

This is fine inline at low volume.

At higher volume, shift it to worker jobs or pre-generation.

## Recommended 30-Day Infrastructure Roadmap

### Week 1

- run backend with Gunicorn + Uvicorn workers
- put Nginx in front
- standardize production env variables

### Week 2

- add Redis
- move WebSocket broadcasts to Redis pub/sub
- cache store home and notification counts

### Week 3

- add worker queue
- move WhatsApp / push / heavy notifications to worker jobs
- move image post-processing to background jobs

### Week 4

- add monitoring and log aggregation
- add backup verification
- load test core flows:
  - worker complete visit
  - customer recommendation approval
  - add to cart
  - order placement
  - invoice payment update

## Recommended Capacity Guidance

Very rough starting expectations:

### Small launch

- 4 vCPU
- 8 GB RAM
- PostgreSQL on same environment or small dedicated instance
- Redis small instance

Good for:

- internal team
- pilot customers
- dozens to low hundreds of active daily users

### Growth phase

- separate DB
- separate Redis
- 2 to 3 backend instances
- worker instance

Good for:

- larger customer base
- frequent worker activity
- heavier order and notification traffic

## Final Recommendation

For ELMS, the right next infrastructure move is:

1. Nginx in front of FastAPI
2. Gunicorn/Uvicorn workers
3. Redis for cache + realtime + queue broker
4. Worker process for WhatsApp / push / image / PDF jobs
5. PostgreSQL hardening
6. keep S3 as media backbone

That gives ELMS a path from “working app” to “production-ready platform” without rewriting the backend stack.

## Verified Business Flow Reference

This architecture recommendation is aligned with a real tested flow in ELMS:

- technician completes visit
- technician recommends spare part
- customer sees recommendation
- customer approves it
- customer opens quote
- customer adds it to cart
- customer places order
- admin marks invoice paid
- recommendation becomes `done`

That is exactly why the next scaling focus should be:

- realtime consistency
- queue-backed notifications
- store/media performance
- PostgreSQL and Redis discipline
