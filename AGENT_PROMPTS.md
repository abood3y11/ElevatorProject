# Claude Code — Ready-to-Paste Agent Prompts (AuthN/AuthZ Redesign)

Paste these **one phase at a time**, verifying each gate before the next. They follow the same cadence
that worked for the WhatsApp upgrade: analyze → build backend → verify → build frontend → verify → commit
separately. Do **not** fire all phases at once — Phase 2 flips enforcement and must go through shadow mode.

---

## 🔬 Kickoff (run once, before Phase 0)

> Before any edits, verify the current state of the auth surface against `docs/AUTHZ_USE_CASE_MAP.md`.
> Launch parallel read-only exploration agents to confirm, at the code level: (1) the exact ungated
> dispatch/distribution endpoints and the two ungated state-changers; (2) the three WebSocket registrations
> and how the customer-orders socket authenticates today (the pattern to copy); (3) `register-demo` +
> both frontends' demo buttons; (4) `SECRET_KEY` default + `WHATSAPP_WEBHOOK_APP_SECRET` handling +
> `/assets/store-image`; (5) the permission catalog + `require_permission` (confirm it's wired to zero
> endpoints). Report a confirmed findings table — do not edit anything yet.

---

## 🚨 Phase 0 — Emergency security patches

> Implement Phase 0 of `docs/AUTHZ_REDESIGN_PLAN.md`. Four self-contained fixes, tests required (touches
> dispatch surface): (1) env-gate `POST /auth/register-demo` behind `ALLOW_DEMO_SEED` (default false, 404
> in prod) and remove the demo/register-demo buttons from AdminPortal `Login.tsx` and elms-customer login;
> (2) authenticate the three WebSockets — `/ws/admin/updates` (require `dashboard.read`/admin via
> `?access_token=`), `/ws/locations/{technician_id}` (authenticate + scope to that technician or their
> manager, reject path-id spoofing), copying the existing customer-orders socket auth pattern; (3) add
> `require_permission("dispatch.*")` to the 20 ungated distribution endpoints + `POST /work-orders/{id}/reassign`
> + `PUT /technicians/{id}/visits/{visit_id}/status` — **do NOT touch the emergency path**, it already has
> `require_roles([...])`; (4) fail-fast if `SECRET_KEY` is the shipped default in non-dev, make
> `WHATSAPP_WEBHOOK_APP_SECRET` mandatory (reject webhook if unset), confirm/add payment-webhook HMAC
> verification, and lock down `GET /assets/store-image` (auth or signed token + whitelist `src`).
> Tests: unauthorized (customer) token rejected on dispatch; emergency-create still works; WS rejects
> missing/wrong token + cross-technician GPS; webhook rejects bad signature; register-demo 404s when flag
> off. Commit backend and each frontend separately. Report the diff surface and confirm the emergency path
> is byte-for-byte unchanged.

**Verify before continuing:** compile clean, all new tests pass, emergency path unchanged, `npm build`
passes for both frontends. Then set prod env (`ALLOW_DEMO_SEED=false`, strong `SECRET_KEY`,
`WHATSAPP_WEBHOOK_APP_SECRET`) and deploy.

---

## 🧱 Phase 1 — Catalog + role→permission matrix (no enforcement change)

> Implement Phase 1 of `docs/AUTHZ_REDESIGN_PLAN.md` — data only, zero gate changes. (1) Extend the
> permission catalog with `dispatch, elevators, sites, technicians, compliance, whatsapp, store, settings,
> dashboard`, and split finance into `finance.read / post_payment / approve / close_period`; migration
> `authz_catalog_0001`. (2) Seed the canonical role→permission matrix for all 20 roles per §8.2 of
> `AUTHZ_USE_CASE_MAP.md` (`admin` = bypass), as the versioned single source of truth; migration
> `authz_role_perms_0001`, **idempotent, with concrete `datetime.utcnow()` timestamps in every insert**
> (the WhatsApp departments seed failed on prod Postgres from NULL created_at — don't repeat it).
> (3) Add a `require_self_or_manager` object-level dependency (not yet applied). Do not re-gate any
> endpoint. Tests: seed idempotency (run twice stable), all 20 roles covered, no orphan catalog modules.
> Single migration head, chained. Commit backend only.

**Verify:** single migration head, run `alembic upgrade head` up/down/re-up on real Postgres, seed lands
6-of-6 style verified (row counts), full existing suite still green.

---

## ⚖️ Phase 2 — Wire require_permission (shadow → default-deny)

> Implement Phase 2 of `docs/AUTHZ_REDESIGN_PLAN.md`. First build **shadow mode**: a global dependency
> resolving each route's `module.action` that, when `AUTHZ_ENFORCE=false`, only **logs** "would-deny" for
> requests the matrix wouldn't allow — never blocks. Then wire the gate across modules in this order
> (biggest risk first): ungated maintenance reads / technician org reads / `dashboard/admin/stats` /
> `settings` reads / ungated state-changers; then replace inline role sets (`_ensure_sales_access`,
> `_ensure_pricing_edit_access`, technicians `_ensure_admin_access`/`TEAM_OWNER_ROLES`/`_ensure_technician_scope`,
> `STORE_ADMIN_ROLES`, whatsapp `allowed_department_keys_for_user`) with catalog permissions; then retire
> `require_admin/operations/supervisor/technician/staff` call-sites to their `module.action` equivalents
> (keep as shims, then delete); consolidate the ~6 token-in-URL authz endpoints into one dependency; make
> `customer_id` the sole tenant key (backfill + drop fuzzy matching in `_resolve_customer_for_user`) and
> unify the three customer-provisioning paths. **Do not flip `AUTHZ_ENFORCE` to true** — leave it false so
> I can collect the would-deny report against real traffic and review with operations first. Tests
> mandatory: per-module authorized-passes / unauthorized-denied (esp. `customer`), explicit dispatch +
> emergency + **finance segregation** (read vs post_payment vs approve vs close_period) tests, and a
> tenant-isolation test (customer A can't resolve customer B). Commit backend only.

**Verify:** compile + full suite green, emergency + finance-segregation tests pass, `AUTHZ_ENFORCE=false`
confirmed. Deploy in shadow mode, collect the would-deny log ~1 week, fix any legitimate denies **in the
matrix seed** (not the code), then in a quiet window flip `AUTHZ_ENFORCE=true`.

---

## 🎛️ Phase 3 — AdminPortal module.action gating + `<Can>`

> Implement Phase 3 of `docs/AUTHZ_REDESIGN_PLAN.md` against the Phase 2 backend contract. Upgrade
> `canAccessSection` to a `can(permission)` hook + `<Can perm="module.action">` component that checks the
> action, not just the module prefix. Replace `canDeleteCustomers`/`canApproveReject`/`isWhatsAppSupervisor`
> and gate every currently-ungated create/edit/delete/approve button across Customers, Sites, Elevators,
> Contracts, Finance, Installations, Store. Drive route guards from the same permission contract. i18n keys
> for new strings, RTL logical props, use the existing theme tokens (`colors/gradients/shadows`). Tests:
> finance-read-only user sees data but no post-payment/approve buttons; customer_service sees WhatsApp but
> no delete controls. Commit AdminPortal only; `npm build` must pass clean tsc.

---

## 🔒 Phase 4 — Object-level scoping + mobile alignment

> Implement Phase 4 of `docs/AUTHZ_REDESIGN_PLAN.md`. Backend: apply `require_self_or_manager` to
> technician workload/visit reads and all customer own-resource routes; remove remaining inline `user_id`
> compares; add the dedicated `compliance_officer` enforcement path. Mobile: consolidate mobile-worker's
> two parallel auth implementations into the Redux/RTK client (retire the `global.fetch` monkey-patch); no
> new capability surface. Tests: technician A can't read technician B's visits; customer can't read another
> customer's orders via any path incl. token-in-URL. Commit backend and mobile-worker separately.

---

## 🛡️ Phase 5 — AuthN hardening (token storage this round)

> Implement Phase 5 of `docs/AUTHZ_REDESIGN_PLAN.md`. (1) Move web tokens to httpOnly+Secure cookies
> (AdminPortal + elms-customer web), off `localStorage`; update the axios 401-refresh interceptor to the
> cookie flow. (2) Move mobile tokens to `expo-secure-store`/Keychain (mobile-worker + elms-customer), off
> plain `AsyncStorage`, with a one-time migration of existing stored tokens on first launch. (3) Replace
> `?access_token=` document/PDF links with short-lived signed URLs. (4) Server-side refresh-token
> revocation on logout + token-version/`is_active` re-check. (5) Login rate-limiting/lockout + MFA for
> `admin`/`finance_manager`. Tests: revoked refresh token can't mint access; locked-out account rejected;
> MFA-required role can't finish login without second factor. Commit each app separately. This can run
> parallel to Phases 1–4 where independent.

---

## Guardrails to repeat in every phase
- Backend and each frontend commit **separately**; commit only when I ask.
- Concrete timestamps in every migration seed/backfill insert; single chained head; test up/down/re-up on
  real Postgres.
- Never modify the emergency dispatch path; prove it unchanged when a diff touches nearby files.
- If an agent crashes mid-run, revert its partial work and rebuild cleanly (don't leave half-baked code).
- Keep `docs/AUTHZ_REDESIGN_PLAN.md` status table updated after each phase.
