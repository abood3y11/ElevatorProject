# ELMS — AuthN/AuthZ Redesign — Implementation Plan

> Source of truth for the authentication & authorization overhaul. Derived from
> `AUTHZ_USE_CASE_MAP.md` (full-monorepo scan, 2026-07-03) covering `backend/`, `AdminPortal/`,
> `mobile-worker/`, `elms-customer/`.
>
> **Golden rule (same as WhatsApp upgrade):** nothing that touches dispatch/emergency/finance ships
> without tests. Backend and frontend commit separately. Every gate change is verifiable at each phase.
>
> **User decisions locked:** (1) target = **default-deny** (reached via a 1-week shadow-mode ramp, not a
> big-bang flip); (2) **Phase 0 = all four** critical fixes (register-demo, unauth WebSockets, ungated
> dispatch, JWT secret + webhook signature); (3) token-storage hardening (httpOnly cookies web +
> SecureStore mobile) is **in scope this round** as a parallel track.

---

## 0. Reality check — what already exists (so we don't rebuild it)

The map shows the enforcement primitives already exist; the problem is they're **inconsistent, partially
wired, and full of holes** — not absent. We are consolidating + closing gaps, not inventing RBAC.

| Capability | Actual state today | Action |
| --- | --- | --- |
| JWT auth, bcrypt, login/refresh, audit LOGIN events | Built (`_shared/security.py`, `users/controllers/auth.py`) | **Reuse / harden** |
| 20 seeded roles | Built (`_shared/db/seed.py`) | **Reuse** as permission bundles |
| Role gates `require_admin/operations/supervisor/technician/staff` | Built (`api/deps.py`) | **Keep during migration, then retire** in favor of `require_permission` |
| Permission catalog (10 modules × CRUD) + `UserPermission` grants | Built — **but `require_permission` wired to ZERO endpoints** | **Extend catalog + wire everywhere** |
| AdminPortal section RBAC (`canAccessSection`) | Built — but **module-prefix only, ignores the action** | **Upgrade to `module.action` + `<Can>`** |
| mobile-worker capability predicates | Built — **UI-only, loose role-string synonyms** | **Keep UI, rely on hardened backend** |
| Inline role sets (sales, technicians, store-admin, whatsapp dept) | Built — **drift from each other + from `require_*`** | **Replace with catalog permissions** |
| `role→permission` seed matrix | **Missing** — no canonical mapping | **BUILD (Phase 1)** |
| "self/ownership" scope dependency | **Missing** — inline `user_id` compares | **BUILD (Phase 1)** |
| Server-side token revocation, MFA, lockout | **Missing** | **BUILD (Phase 5)** |

### Key file map (from the audit — verify before editing)
```
backend/app/api/deps.py                     # require_* gates + require_permission (unwired)
backend/app/_shared/security.py             # JWT encode/decode, bcrypt
backend/app/_shared/config.py               # SECRET_KEY default (!), token lifetimes, WHATSAPP_WEBHOOK_APP_SECRET
backend/app/_shared/db/seed.py              # 20 roles + permission catalog seed
backend/app/users/controllers/auth.py       # login, login/tech, register-demo (!), register-customer, refresh
backend/app/users/models/…                  # User, Role, Permission, UserRole, UserPermission
backend/app/api/router.py                   # router mounts; WS registered on app (bypass deps)
backend/app/…/controllers/*.py              # per-module inline role sets to replace
AdminPortal/src/auth/permissions.ts          # canAccessSection, SECTION_MODULE_MAP
AdminPortal/src/pages/Login.tsx              # demo quick-login + register-demo button (!)
mobile-worker/src/…/taskUtils.ts             # capability predicates
elms-customer/…                              # token-in-URL, register-demo demo button (!)
```

---

## Status
- **Phase 0 — DONE + DEPLOYED to VPS + verified in production.** 2026-07-05.
  - Deployed: AdminPortal (commits `757ad08` placeholders, `dfb1aef` auth) rebuilt live at admin.hensline.com; backend at `1cd1fe2` (api+worker rebuilt, healthy). Prod checks: `register-demo`→404, `/maintenance/technicians` (no token)→401, health→200, login→401 on bad creds. All 5 containers up, no errors.
  - VPS env is `ENVIRONMENT=development`, so the §0.4 **prod-only** hardening (secret fail-fast, mandatory webhook signatures) is currently INERT — active now: §0.1 demo-off, §0.2 admin-WS strict + location-WS transition, §0.3 dispatch gating. **To activate §0.4:** set `ENVIRONMENT=production` **and** `WHATSAPP_WEBHOOK_APP_SECRET` + `PAYMENT_WEBHOOK_SECRET` first (else webhooks 503).
  - Location WS deployed in **transition mode** (`LOCATION_WS_REQUIRE_AUTH=false`) per user decision — flip to true after the mobile-worker build (token-sending) ships.
  - NOTE: commit `b4e95b3` (already on origin/main via an auto-committer) **bundled** these authz changes with a separate "whatsapp daily auto-archive" feature (`scheduler.py`, `test_conversation_archive.py`); that feature rode along in this deploy.
  - Not yet deployed: mobile-worker (`locationWebSocket` token) + elms-customer (demo gate) — Expo apps, ship on next mobile build; changes committed locally.
  - §0.1 `register-demo` 404s unless `ALLOW_DEMO_SEED=true`; AdminPortal + elms-customer demo buttons gated behind `VITE_ALLOW_DEMO_LOGIN` / `EXPO_PUBLIC_ALLOW_DEMO_LOGIN` (off by default).
  - §0.2 admin-updates + location WebSockets authenticate via `?access_token=`; location socket scoped to the technician (self) or an office role; clients (AdminPortal `StoreManagementPage`, mobile-worker `locationWebSocket`) now pass the token.
  - §0.3 distribution router gated router-level with `require_operations` (AdminPortal-only; interim until Phase 2 `dispatch.*`); workload reads self-or-office scoped (mobile self-view preserved); `POST /work-orders/{id}/reassign` → `require_supervisor`. Emergency path UNCHANGED (verified). `update_visit_status` was already self-or-office gated inline — left as-is.
  - §0.4 `settings.validate_security()` fail-fast on default JWT secret / demo-seed in prod-like envs (called at startup); WhatsApp + payment webhooks reject unsigned/misconfigured in prod-like envs; `store-image` restricted to image content types + prefix whitelist.
  - Tests: `backend/tests/integration/test_authz_phase0.py` — **22 passing**. AdminPortal build clean; mobile-worker + elms-customer changed files type-clean.
  - **Deploy prerequisites (set before deploying):** `ALLOW_DEMO_SEED=false`, strong `SECRET_KEY`, `WHATSAPP_WEBHOOK_APP_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `ENVIRONMENT=production`.
- **Phase 1 — DONE + DEPLOYED to VPS + verified in production.** 2026-07-06. Backend commit `100f0d5`.
  - Extended permission catalog to 19 modules / **74 permissions** (added dispatch, elevators, sites, technicians, compliance, whatsapp, store, settings, dashboard; finance split into read/create/update/delete + post_payment/approve/close_period). Single source of truth: `app/users/authz_catalog.py`.
  - New `role_permissions` table + canonical matrix seeded for all 20 roles (**183 grants** in prod; `admin`=bypass/0 rows, `customer`=portal-auth/0 rows). Model `RolePermission`.
  - `require_self_or_manager` + `is_self_or_manager` object-level primitive added to `deps.py` (NOT yet applied — Phase 4 wires it).
  - Migrations `authz_catalog_0001` + `authz_role_perms_0001` — idempotent, concrete timestamps, tested up/down/re-up on real Postgres (local `elms_db`, identical to prod) then applied to prod (`alembic upgrade head`: wa_autooff_0039 → authz_role_perms_0001).
  - Tests: `tests/integration/test_authz_phase1.py` — **6 passing** (idempotency, 18-role coverage + admin/customer excluded, no orphan modules, matrix references only real perms). Prod spot-checks confirmed. **Zero enforcement change** (Phase 2 wires `require_permission`).
- **Phase 2 — BUILT + DEPLOYED in SHADOW MODE.** 2026-07-06. Backend commit `5325b70`.
  - `require_permission` now resolves via the role→permission matrix **and** per-user grants (admin bypass) — `app/users/authz_check.py::user_has_permission`. Shadow-aware: with `AUTHZ_ENFORCE=false` (prod default) it only **logs "would-deny"**, never blocks.
  - Wired onto the worst previously-ungated reads: `GET /dashboard/admin/stats`, `GET /settings` + `/settings/{key}`, and the whole `/maintenance/stats` sub-router. Prod verified: these return 401 unauth (not 500); shadow active.
  - Tests: `test_authz_phase2.py` — **7 passing** (matrix+grant resolution, admin bypass, shadow-never-blocks, enforce-denies-unauthorized, enforce-allows-authorized).
  - **NOT DONE (the gated rollout):** collect the would-deny log ~1 week → fix matrix → flip `AUTHZ_ENFORCE=true`. The broad sweep (replace remaining inline role sets in sales/technicians/store-admin/whatsapp; retire `require_*` call-sites; consolidate token-in-URL; `customer_id` sole tenant key) continues under shadow before the flip.
- **Phase 3 — INFRA BUILT + DEPLOYED (no buttons hidden yet).** 2026-07-06. AdminPortal commit `a8df487`.
  - `/auth/me` returns `effective_permissions` (role matrix ∪ grants; `["*"]` for admin). AdminPortal: `can(user,'module.action')`, `useCan` hook, `<Can perm>` component (`src/auth/permissions.ts`, `src/auth/useCan.tsx`).
  - Deliberately did NOT hide existing controls — the matrix is freshly seeded/unverified, so button-gating follows the same shadow-review as the backend flip. Behavior unchanged.
- **Phase 4 — PRIMITIVE ONLY.** `require_self_or_manager` landed in Phase 1; workload reads already self-or-office scoped (Phase 0). Its broad application + the `compliance_officer` gate replacement belong with the enforcement flip (replacing a role gate under shadow would otherwise open the endpoint). Mobile-worker auth consolidation → Expo build track. NOT deployed.
- **Phase 5 — NOT STARTED (staged deliberately).** Auth hardening (httpOnly-cookie cutover, MFA for admin/finance, server-side refresh-token revocation, mobile SecureStore) is breaking/env-heavy and must not be force-cut on a live elevator system without a careful rollout. To be executed as its own track.

### Remaining gated milestones (in order)
1. Review the shadow **would-deny** log (`grep "AUTHZ would-deny" api logs`) against ~1 week of prod traffic; fix any legitimate denies in the matrix seed.
2. Complete the Phase 2 wiring sweep + Phase 3 button-gating + Phase 4 gate replacements, then **flip `AUTHZ_ENFORCE=true`** in a quiet window.
3. Set `ENVIRONMENT=production` + `WHATSAPP_WEBHOOK_APP_SECRET` + `PAYMENT_WEBHOOK_SECRET` to activate the §0.4 prod hardening; flip `LOCATION_WS_REQUIRE_AUTH=true` once mobile-worker rebuild ships.
4. Execute Phase 5 auth hardening as a dedicated track.
- Note: project uses relative imports (not `@/`). VPS build runs clean `tsc` and fails on uncommitted i18n keys.
- Note: the shared `elms_test` DB has pre-existing test-isolation debt (legacy `SessionLocal()` fixtures that commit without rollback in `test_maintenance_api.py`, and stale `capacity_kg`/`max_daily_visits` fixtures) — unrelated to this work; surfaces as errors when the full suite runs together.

---

## Phase 0 — Emergency security patches (ship first, independently)

**Goal:** close the unauthenticated / backdoor holes that let any actor (or the public) take privileged
actions. All four items are self-contained and high-severity. **Touches auth + dispatch surface → tests required.**

### 0.1 Kill the demo backdoor
- Env-gate `POST /auth/register-demo` behind `ALLOW_DEMO_SEED` (default **false**); return 404 in prod.
- Remove the demo quick-login + register-demo buttons from `AdminPortal/src/pages/Login.tsx` and the
  `elms-customer` login screen (or hide behind the same env flag surfaced to the client).

### 0.2 Authenticate the three WebSockets
- `WS /ws/admin/updates` → require `?access_token=` → `verify_token` → user must hold `dashboard.read`
  (or admin); close 4401/4403 like the customer socket already does.
- `WS /api/v1/ws/locations/{technician_id}` → authenticate, then **scope**: connecting user must be that
  technician **or** their manager; reject path-id spoofing.
- Reuse the customer-orders socket's existing `?access_token=` pattern as the template.

### 0.3 Gate the dispatch/distribution surface (highest-risk)
- The 20 ungated distribution endpoints (`bulk-assign`, `auto-distribute`, `assign`, `*-generation`,
  template apply/delete, workload reads) get `require_permission("dispatch.*")` immediately — this is the
  single biggest risk reduction. Also the two ungated state-changers:
  `POST /work-orders/{id}/reassign` and `PUT /technicians/{id}/visits/{visit_id}/status`.
- **Emergency path is NOT modified** — it already has an explicit `require_roles([...])`. Leave it.

### 0.4 Secrets + webhook signatures
- Fail-fast on startup if `SECRET_KEY`/`JWT_SECRET_KEY` is the shipped default in a non-dev environment.
- Make `WHATSAPP_WEBHOOK_APP_SECRET` **mandatory** — reject inbound webhook if unset (today it silently
  skips signature verification). Confirm the payment webhook `accept_webhook` verifies HMAC; if not, add it.
- Lock down `GET /assets/store-image?src=` — require auth or a signed token, and whitelist `src` prefixes
  (currently an open proxy, SSRF-adjacent).

### Tests
- Dispatch endpoints reject an unauthorized (e.g. `customer`) token; emergency-create still works for its
  allowed roles. WebSocket connect rejects missing/wrong token and cross-technician GPS. Webhook rejects
  bad/missing signature. `register-demo` 404s when flag off.

### Deploy / verify
Set `ALLOW_DEMO_SEED=false`, a strong `SECRET_KEY`, and `WHATSAPP_WEBHOOK_APP_SECRET` in prod env first.
Backend + each frontend commit separately.

---

## Phase 1 — Permission catalog + canonical role→permission matrix (no enforcement change)

**Goal:** land the *data* for unified authz without changing a single gate yet — so it's inherently safe
and reviewable. This is the foundation the rest builds on.

### Backend
1. **Extend the permission catalog** beyond the current 10 modules to every domain the audit surfaced:
   add `dispatch, elevators, sites, technicians, compliance, whatsapp, store, settings, dashboard`.
   Split finance into **read vs money-movement**: `finance.read`, `finance.post_payment`,
   `finance.approve`, `finance.close_period` (segregation of duties). Migration `authz_catalog_0001`.
2. **Seed the canonical role→permission matrix** (versioned) — one table mapping each of the 20 roles to
   its permission set, per §8.2 of the map. This *replaces* every drifting inline role list as the source
   of truth. `admin` = bypass. Migration `authz_role_perms_0001` (idempotent seed; concrete timestamps in
   inserts — learned from the WhatsApp departments-seed NOT NULL bug).
3. **Add a `self`-scope dependency** (`require_self_or_manager`) for technician/customer own-resource
   routes — a first-class object-level check so new endpoints can't forget it.
4. **No endpoint is re-gated in this phase.** Ship the catalog + matrix + seed only.

### Tests
- Seed idempotency (run twice, stable). Matrix covers all 20 roles. Catalog has no orphan modules.

---

## Phase 2 — Wire `require_permission` (shadow-mode → default-deny)

**Goal:** enforce the unified permission gate everywhere, reaching **default-deny** safely via a ramp.
**This is the largest and most sensitive phase — touches every module → tests required throughout.**

### The safe ramp to default-deny (your locked target)
1. **Shadow mode (~1 week):** add a global dependency that resolves the required `module.action` for each
   route and **logs** "would-deny" for any request the new matrix wouldn't allow — **without blocking it**.
   Behind `AUTHZ_ENFORCE=false`. Collect the would-deny log against real traffic.
2. **Review the would-deny report** with operations — every legitimate deny is a missing grant in the
   matrix (fix the matrix, not the code). This is where you catch "a real supervisor got blocked."
3. **Flip `AUTHZ_ENFORCE=true`** → default-deny live: any route without a resolved permission, or a user
   without the grant, is rejected (admin still bypasses).

### Backend wiring order (biggest risk reduction first — mirrors map §8.6)
1. The **ungated** endpoints from the audit: dispatch (done in Phase 0), maintenance reads
   (contracts/plans/stats/dashboards), technician org reads, `dashboard/admin/stats`, `settings` reads,
   the ungated state-changers.
2. Replace **inline role sets** with catalog permissions: sales (`_ensure_sales_access`,
   `_ensure_pricing_edit_access`), technicians (`_ensure_admin_access`, `TEAM_OWNER_ROLES`,
   `_ensure_technician_scope`), store-admin (`STORE_ADMIN_ROLES`), whatsapp `allowed_department_keys_for_user`.
3. Retire `require_admin/operations/supervisor/technician/staff` call-sites, mapping each to its
   `module.action` equivalent. Keep the functions as thin shims during migration, then delete.
4. Consolidate the **token-in-URL** authz (`get_user_from_access_token_query`, ~6 endpoints) into one
   dependency; prefer short-lived signed URLs.
5. Make **`customer_id` the sole tenant key** — backfill it, drop the fuzzy email/phone matching in
   `_resolve_customer_for_user`. Unify the three customer-provisioning paths into one.

### Tests (mandatory — safety-critical gates)
- Per-module: authorized role passes, unauthorized (esp. `customer`) is denied. Explicit tests for
  dispatch, emergency, and **finance segregation** (read vs post_payment vs approve vs close_period).
  Tenant-isolation test: customer A cannot resolve customer B.

---

## Phase 3 — AdminPortal: `module.action` gating + `<Can>`

**Goal:** the UI gates the actual buttons (read vs create/update/delete/approve), sharing one contract
with the backend — no more "section access unlocks every action."

### Frontend
1. Upgrade `canAccessSection` → a `can(permission)` hook + `<Can perm="finance.approve">` component that
   checks **`module.action`**, not just the module prefix.
2. Replace the ad-hoc `canDeleteCustomers` / `canApproveReject` / `isWhatsAppSupervisor` helpers with
   `can(...)` calls. Gate every create/edit/delete/approve button that's currently ungated across
   Customers, Sites, Elevators, Contracts, Finance, Installations, Store.
3. Keep route guards, but drive them from the same permission contract. i18n keys for any new strings.

### Tests
- A finance-read-only user sees finance data but no post-payment/approve buttons; a customer_service user
  sees WhatsApp but not delete controls.

---

## Phase 4 — Object-level scoping + mobile alignment

**Goal:** own-resource enforcement is systematic, and the mobile app relies on the hardened backend.

### Backend
- Apply the `self`-scope dependency to technician workload/visit reads (self-or-manager) and all customer
  own-resource routes. Remove remaining inline `user_id` comparisons.
- Add the dedicated `compliance_officer` enforcement path (seeded role currently has no gate).

### Mobile
- Keep UI predicates, but consolidate **mobile-worker's two parallel auth implementations** into one
  (retire the `global.fetch` monkey-patch in favor of the Redux/RTK client). No new capability surface —
  enforcement now lives server-side.

### Tests
- Technician A cannot read technician B's visits; customer cannot read another customer's orders via any
  path (including token-in-URL endpoints).

---

## Phase 5 — AuthN hardening (parallel track — token storage in scope this round)

**Goal:** reduce credential-theft blast radius. Runs alongside Phases 1–4 where independent.

### In scope this round (your decision)
1. **Web tokens → httpOnly + Secure cookies** (AdminPortal + elms-customer web) — remove from
   `localStorage`. Update the axios 401-refresh interceptor to the cookie flow.
2. **Mobile tokens → `expo-secure-store`/Keychain** (mobile-worker + elms-customer) — remove from plain
   `AsyncStorage`. Migrate existing stored tokens on first launch.
3. **Stop putting tokens in URLs** — replace `?access_token=` document/PDF links with short-lived signed
   URLs; keep the consolidated WS token dependency from Phase 2.

### Also in this phase
4. Server-side **refresh-token revocation** on logout + a token-version / `is_active` re-check (today
   logout is audit-only; inactivity logout is client-only).
5. Login **rate-limiting / lockout**; **MFA** for `admin`/`finance_manager` roles.
6. Short web access tokens; keep mobile long-lived but revocable.

### Tests
- Revoked refresh token can't mint a new access token; locked-out account rejects further attempts;
  MFA-required role can't complete login without the second factor.

---

## Cross-cutting rules (all phases)
- **Commits:** backend and each frontend (AdminPortal / mobile-worker / elms-customer) separate;
  Conventional Commits describing behavior.
- **default-deny is the target**, reached via shadow-mode — never flip enforcement blind on prod traffic.
- **Migrations:** concrete timestamps in every seed/backfill insert (NOT NULL columns) — single head,
  chained; test the up/down/re-up on real Postgres, not just the ORM test DB.
- **RTL / i18n:** logical properties only; no hardcoded Arabic in components — translation files.
- **Tests mandatory** for anything touching dispatch / emergency / finance / auth.
- **Deploy:** set env (strong `SECRET_KEY`, `ALLOW_DEMO_SEED=false`, `WHATSAPP_WEBHOOK_APP_SECRET`,
  `AUTHZ_ENFORCE`) before/with each deploy; verify health + real behavior after each phase.

## Suggested sequencing
Phase 0 ships immediately and independently (pure risk reduction, no data model). Phase 1 lands the
catalog+matrix with zero enforcement change (safe, reviewable). Phase 2 is the big one — shadow first,
then flip. Phase 3 follows the backend contract. Phase 4 tightens scoping. Phase 5 runs parallel. Each
phase = its own backend + frontend commits and its own deploy + verification gate before the next.
