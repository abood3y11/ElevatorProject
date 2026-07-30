# ELMS — Authentication & Authorization Use-Case Map

> **Purpose.** A single source of truth for **every actor, use case, and current access gate** in ELMS, produced by scanning the whole monorepo (backend endpoints, AdminPortal, `mobile-worker`, `elms-customer`). Use it to design the redesigned **AuthN (who you are)** and **AuthZ (what you may do)** system.
>
> **Scope.** Backend = FastAPI (`backend/`), base API prefix `/api/v1`. Frontends = AdminPortal (React), `mobile-worker` (Expo), `elms-customer` (Expo).
>
> **Status.** Descriptive of the code as it exists today (2026-07-03). "Current Gate" = the actual dependency/check enforced now, not what *should* be enforced. Rows flagged **⚠ NO ROLE GATE** are authenticated-only (`get_current_user`) with no role check. Rows flagged **🔴 PUBLIC** have no auth at all.

---

## 1. How to read this document

- **§2 Current AuthN** — login flows, tokens, storage, session, per app.
- **§3 Current AuthZ** — roles catalog, the `require_*` role gates, the per-user permission overlay.
- **§4 Actor / role taxonomy** — the canonical list of who uses the system.
- **§5 Backend use-case catalog** — every endpoint grouped by domain, with its current gate.
- **§6 Frontend use cases & gating** — AdminPortal + mobile apps.
- **§7 Cross-cutting gaps & security risks** — the findings that must drive the redesign.
- **§8 Target model recommendations** — a proposed canonical role × permission matrix and rollout notes.

**Gate legend** (from `backend/app/api/deps.py`):

| Gate | Meaning / roles allowed |
|---|---|
| `get_current_user` | Any authenticated user — **no role check** unless the handler does an inline check |
| `require_admin` | `{admin}` |
| `require_operations` | `{admin, operations_manager, maintenance_manager, installation_manager, store_manager, finance_manager, customer_service, sales_manager}` |
| `require_supervisor` | `{admin, operations_manager, maintenance_manager, installation_manager, maintenance_supervisor, installation_supervisor}` |
| `require_technician` | supervisor set **+** `{technician_maintenance, technician_installation}` (≈ any staff/technician) |
| `require_staff` | all internal staff + technicians + customer_service |
| `require_permission("module.action")` | admin bypass; else user must hold the named grant. **Defined but not yet wired to any endpoint.** |
| `get_current_customer_user` / `get_current_customer` | authenticated user holding the `customer` role |
| `get_user_from_access_token_query` | token passed as `?access_token=` URL query param (for document/PDF links & WebSockets) |
| **inline** | role/ownership check done inside the handler body (not a dependency) |

---

## 2. Current Authentication (AuthN)

### 2.1 Backend mechanism (`backend/app/_shared/security.py`, `users/controllers/auth.py`)

- **Scheme:** JWT, `HS256`, secret = `SECRET_KEY` or `JWT_SECRET_KEY` (**default `"super-secret-key-change-in-production"`** if unset — must be overridden in prod).
- **Access token claims:** `{sub: user_id, roles: [...], exp, type:"access"}`. **Roles are baked into the token** at login and are not re-checked against the DB on every request for role content (the DB *is* re-queried for the user record and `is_active`, but role gates in `deps.py` re-read `UserRole` from DB, not the token — so a role change takes effect immediately server-side; the token's `roles` claim is used mainly by clients).
- **Passwords:** bcrypt (`passlib`), truncated to 72 bytes safely.
- **Token lifetimes** (`_shared/config.py`):
  - Web access: **60 min**; web refresh: **7 days**.
  - Mobile access: **30 days**; mobile refresh: **365 days** (granted to technician/worker/customer roles via `login/tech`).
- **Audit:** `LOGIN_SUCCESS` / `LOGIN_FAILED` written to `audit_logs` (model supports IP + user-agent, action taxonomy CREATE/UPDATE/DELETE/LOGIN/…/APPROVE/REJECT).
- **No account lockout / rate limiting / MFA** anywhere.

### 2.2 Auth endpoints (`/api/v1/auth`)

| Method + Path | Use Case | Actor | Current Gate |
|---|---|---|---|
| POST `/auth/login` | OAuth2 password login (web, form-encoded) | anonymous | 🔴 PUBLIC (credential check) |
| POST `/auth/login/tech` | JSON phone+password login → long-lived mobile tokens | anonymous | 🔴 PUBLIC |
| POST `/auth/register-demo` | Seed/reset demo admin+manager+customer accounts (hard-coded passwords) | anonymous | 🔴 PUBLIC — **seeds real privileged accounts** |
| POST `/auth/register-customer` | Customer self-registration (creates User + Customer record) | anonymous | 🔴 PUBLIC |
| POST `/auth/refresh` | Exchange refresh token for a new access token | holder of refresh token | 🔴 PUBLIC (token in body) |
| GET `/auth/me` | Get own profile + roles + permission grants | any authenticated | `get_current_user` |
| POST `/auth/change-password` | Change own password | any authenticated | `get_current_user` |
| POST `/auth/logout` | Logout (audit only — no server-side token revocation) | any authenticated | `get_current_user` |

### 2.3 Per-app session handling

| App | Login endpoint | Token storage | Refresh | Session gate | Notes |
|---|---|---|---|---|---|
| **AdminPortal** | `POST /auth/login` (OAuth2 form) then `GET /auth/me` | `localStorage` (`accessToken`,`refreshToken`) — **JS-readable / XSS-exposable** | axios 401 interceptor → `/auth/refresh`, retry once, else hard-redirect `/login` | `ProtectedRoute` + client-side JWT `exp` decode (UX only) | 30-min inactivity local logout; demo quick-login buttons + `register-demo` button in `Login.tsx` |
| **mobile-worker** | `POST /auth/login/tech` | plain **`AsyncStorage`** (`auth_token`,`refresh_token`,`user_data`,…) — **no SecureStore/Keychain** | `global.fetch` monkey-patch retries on 401 → `/auth/refresh` | presence of token string = authenticated (no expiry validation) | roles from `GET /technicians/me/profile`; **two parallel auth impls** (hand-rolled fetch vs Redux/RTK) |
| **elms-customer** | `POST /auth/login` (OAuth2 form) then `/auth/me` + `/customer/profile` | Zustand `persist` → **`AsyncStorage`** (`token`,`refreshToken`,`user`) | axios 401 interceptor → `/auth/refresh` | `token ? App : Auth` | token appended as `?access_token=` on invoice/PDF/WS URLs — **leaks into logs**; `roles` never used to gate anything |

---

## 3. Current Authorization (AuthZ)

### 3.1 Roles catalog (20 seeded roles — `backend/app/_shared/db/seed.py`)

| Role | Description |
|---|---|
| `admin` | System Administrator — full access |
| `operations_manager` | Operations Manager (maintenance + installations) |
| `maintenance_manager` | Maintenance Manager |
| `installation_manager` | Installation Manager |
| `store_manager` | Store Manager |
| `finance_manager` | Finance Manager |
| `maintenance_supervisor` | Maintenance Supervisor |
| `installation_supervisor` | Installation Supervisor |
| `technician_maintenance` | Maintenance Technician |
| `technician_installation` | Installation Technician |
| `inspector` | Installation/safety inspector (worker app) |
| `engineer` | Field engineer (installation quality) |
| `installation_inspector` | Installation phase inspector |
| `quality_engineer` | Quality engineer (installation handover) |
| `sales_rep` | Sales representative (leads/surveys) |
| `sales_manager` | Sales Manager |
| `delivery_rep` | Delivery representative (store orders) |
| `customer` | Customer |
| `customer_service` | Customer Service |
| `compliance_officer` | Compliance & Safety Officer |

> **Note:** the frontend also string-matches `system_admin` / `super_admin` as admin aliases, but these are **not** seeded roles — admin detection lives outside the role table.

### 3.2 Enforcement mechanisms (three coexisting idioms — a core problem)

1. **Dependency role gates** — `require_admin/operations/supervisor/technician/staff` in `deps.py`. Used by work_orders, maintenance, elevators, sites, installations, compliance, finance, users, customers, whatsapp.
2. **In-body / inline role-set checks** — each module redefines its own role sets: sales (`_ensure_sales_access`, `_ensure_pricing_edit_access`), technicians (`_ensure_admin_access`, `TEAM_OWNER_ROLES`, `_ensure_technician_scope`, `_ensure_leave_scope`), whatsapp departments (`allowed_department_keys_for_user`), customer_app admin (`STORE_ADMIN_ROLES`). **These lists drift from each other and from `require_*`.**
3. **Per-user permission overlay** — `Permission` (catalog: 10 modules × CRUD) + `UserPermission` grants, enforced by `require_permission("module.action")`. Catalog = `maintenance, work_orders, contracts, sales, finance, installation, inventory, customers, users, reports`. **Admin manages grants from the Users page; `require_permission` is defined but wired to ZERO endpoints.** AdminPortal already *reads* grants to unlock sidebar sections (by module prefix only — it ignores the action).

---

## 4. Actor / role taxonomy (who uses ELMS)

| Actor group | Roles | Primary surface |
|---|---|---|
| **System admin** | `admin` | AdminPortal (all) |
| **Operations & dept managers** | `operations_manager`, `maintenance_manager`, `installation_manager`, `store_manager`, `finance_manager`, `sales_manager` | AdminPortal |
| **Supervisors** | `maintenance_supervisor`, `installation_supervisor` | AdminPortal + mobile-worker |
| **Field technicians** | `technician_maintenance`, `technician_installation` | mobile-worker |
| **Field specialists** | `inspector`, `engineer`, `installation_inspector`, `quality_engineer` | mobile-worker |
| **Sales force** | `sales_rep`, `sales_manager` | mobile-worker (Sales tab) + AdminPortal |
| **Delivery** | `delivery_rep` | mobile-worker (Delivery tab) |
| **Customer service** | `customer_service` | AdminPortal (WhatsApp, customers, sales) |
| **Compliance** | `compliance_officer` | AdminPortal (compliance) — *currently no dedicated gate* |
| **Customer** | `customer` | elms-customer app + customer portal + emergency create |
| **External systems** | — | WhatsApp Cloud API webhook, payment provider webhook (unauthenticated, token/HMAC-verified) |
| **Anonymous public** | — | QR resolution, store-image proxy, login/register |

---

## 5. Backend use-case catalog

### 5.1 Users & Permissions (`/api/v1/users`)

| Method + Path | Use Case | Actor | Current Gate |
|---|---|---|---|
| GET `/users` | List users (paginated) | staff/ops | `require_operations` |
| POST `/users` | Create user (assign roles) | admin | `require_admin` |
| GET `/users/roles` | List roles | staff/ops | `require_operations` |
| GET `/users/{id}` | Get one user | staff/ops | `require_operations` |
| PUT `/users/{id}` | Update user + roles | admin | `require_admin` |
| DELETE `/users/{id}` | Deactivate (soft) user | admin | `require_admin` |
| GET `/users/permissions/catalog` | List grantable permission catalog | admin | `require_admin` |
| GET `/users/{id}/permissions` | List a user's grants | admin | `require_admin` |
| PUT `/users/{id}/permissions` | Replace a user's grant set | admin | `require_admin` |

- **Note:** any admin can grant *any* role including `admin` — no separate privilege-escalation control.

### 5.2 Customers (`/api/v1/customers`)

| Method + Path | Use Case | Actor | Current Gate |
|---|---|---|---|
| GET `/customers` | List customers | staff/ops | `require_operations` |
| POST `/customers` | Create/merge customer | staff/ops | `require_operations` |
| GET `/customers/{id}` | Customer detail | staff/ops | `require_operations` |
| PUT `/customers/{id}` | Update customer (code renumber cascade) | staff/ops | `require_operations` |
| GET `/customers/{id}/delete-impact` | Preview cascade delete | admin | `require_admin` |
| DELETE `/customers/{id}` | Force-delete customer + all dependents | admin | `require_admin` |
| POST `/customers/dev/wipe-all` | 🔴 **DANGER: delete every customer + all data** | admin | `require_admin` + confirm phrase |
| GET `/customers/{id}/sites` | List customer's sites | staff/ops | `require_operations` |
| GET `/customers/{id}/elevators` | List customer's elevators | staff/ops | `require_operations` |
| GET `/customers/{id}/app-account` | Get linked app-user | staff/ops | `require_operations` |
| PUT `/customers/{id}/app-account` | Create/update app-user + set password (`customer` role) | staff/ops | `require_operations` |

### 5.3 Customer Portal (`/api/v1/customer`) — customer-scoped

All routes resolve a customer context (`_resolve_customer_for_user`, which **fuzzy-matches email/phone/site-contact when `user.customer_id` is null** — tenant-isolation concern).

| Method + Path | Use Case | Actor | Current Gate |
|---|---|---|---|
| GET/PUT `/customer/profile`, POST `/customer/profile/update` | View/update own profile | customer | `get_current_customer_user` |
| GET `/customer/dashboard` | Own KPIs | customer | `get_current_customer_context` |
| GET `/customer/elevators`, `/customer/elevators/{id}` | Own elevators | customer | `get_current_customer_context` |
| GET `/customer/visits`, `/customer/visits/{id}` | Own maintenance visits | customer | `get_current_customer_context` |
| POST `/customer/visits/{id}/recommended-parts/...` (add-to-cart, decision, bulk decision) | Approve/ignore recommended spare parts | customer | `get_current_customer_context` |
| GET `/customer/visits/{id}/recommended-parts/{rid}/quote` | Render quote HTML | customer | `get_current_customer_context` |
| GET `/customer/visits/{id}/recommended-parts/{rid}/quote-public` | ⚠ Render quote via `?access_token=` | customer (token in URL) | `get_user_from_access_token_query` + inline role check |
| GET `/customer/visits/{id}/tracking` | Live technician tracking | customer | `get_current_customer_context` |
| GET `/customer/contracts`, `/contracts/request-options`, `/contracts/requests` | Own contracts + request options | customer | `get_current_customer_context` |
| POST `/customer/contracts/requests` | Create contract request (may create Site) | customer | `get_current_customer_user` |
| GET `/customer/contracts/{id}/pdf` | Own contract PDF | customer | `get_current_customer_context` |
| GET `/customer/invoices` | Own invoices | customer | `get_current_customer_context` |
| GET `/customer/notifications` | Own notifications | customer | `get_current_customer_user` |

### 5.4 Customer App / Commerce (`/api/v1/customer/...`) — customer-scoped

| Area | Endpoints | Use Case | Gate |
|---|---|---|---|
| **account** | POST `/account/login` | Customer mobile login (role-checked in body) | 🔴 PUBLIC |
| | GET `/account/me` | Own profile | `get_current_customer` |
| | POST `/account/activate`, `/forgot-password`, `/reset-password` | Account activation / password reset (**activate & reset are no-op stubs**) | 🔴 PUBLIC |
| | POST `/account/change-password` | Change own password | ⚠ `get_current_user` (siblings use `get_current_customer`) |
| | GET/POST/PUT `/account/addresses[/{id}]`, POST `/account/devices` | Address book + push device | `get_current_customer` |
| **catalog** | GET `/store`, `/store/categories`, `/store/products[/{id}]`, `/{id}/checkout`, `/{id}/related` | Browse storefront (no anonymous browsing) | `get_current_customer` |
| **cart** | GET `/store/cart`, POST `/items`, PUT/DELETE `/items/{id}`, POST `/clear` | Cart management | `get_current_customer` |
| **checkout** | GET `/store/checkout/summary`, POST `/place-order` | Place order | `get_current_customer` |
| **orders** | GET `/store/orders[/{id}]`, `/timeline`, `/delivery-location`, `/invoice`, `/invoice-pdf` | Own orders + tracking + invoices | `get_current_customer` |
| | GET `/store/orders/{id}/invoice-public`, `/invoice-pdf-public` | ⚠ Invoice via `?access_token=` | token-in-URL + inline `customer_id` check |
| | POST `/store/orders/{id}/reorder`, `/cancel`, `/issues` | Reorder / cancel / raise issue | `get_current_customer` |
| **payments** | GET `/payments/methods`, POST `/intent`, `/confirm`, `/company-approval`, GET `/{id}` | Payment lifecycle | `get_current_customer` |
| | POST `/payments/webhooks/{provider}` | 🔴 Payment provider callback — **verify HMAC exists in service** | PUBLIC |
| **support** | GET/POST `/support/conversations` | Support tickets | `get_current_customer` |
| **notifications** | GET `/notifications`, POST `/read`, `/devices` | Notifications + device reg | `get_current_customer` |

### 5.5 Customer App Admin / Store back-office (`/api/v1/customer-admin`)

| Method + Path | Use Case | Actor | Current Gate |
|---|---|---|---|
| GET/POST/PUT/DELETE `/customer-admin/catalog/products[/{code}]`, upload/delete image | Store product catalog CRUD | staff/ops | `require_operations` |
| GET `/customer-admin/customers[/{id}]`, `/finance` | Store-admin customer views | staff/ops | `require_operations` |
| PUT `.../finance/spare-part-orders/{id}/payment`, `.../installation-tasks/{id}` | ⚠ Mutate order/task **payment status** | staff/ops (incl. `customer_service`) | `require_operations` |
| PUT `/customer-admin/customers/{id}/services` | Toggle customer app services | staff/ops | `require_operations` |
| POST `/customer-admin/customers/{id}/users` | Create customer app-user (3rd provisioning path) | staff/ops | `require_operations` |
| GET/PUT `/customer-admin/orders[/{id}]`, delivery-workers, recommendations, quotes, send-quote-whatsapp | Store order fulfilment + quotes | staff/ops | `require_operations` |
| GET `.../{id}/invoice-public`, `/invoice-pdf-public`, `/quote-public` | ⚠ Docs via `?access_token=` | inline `STORE_ADMIN_ROLES` (4 roles — narrower than `require_operations`) | token-in-URL |

### 5.6 Work Orders (`/api/v1/work-orders`)

**Office / operations:**

| Method + Path | Use Case | Gate |
|---|---|---|
| GET `/work-orders` | List/filter all WOs | `require_operations` |
| POST `/work-orders/` | Create WO | `require_operations` |
| POST `/work-orders/breakdown` | Create breakdown WO | `require_operations` |
| POST `/work-orders/generate-preventive` | Generate preventive WOs | `require_operations` |
| PATCH `/work-orders/{id}/status` | Operations status override | `require_operations` |
| POST `/work-orders/{id}/no-access-actions` | Record no-access action | `require_operations` |
| POST `/work-orders/mark-overdue`, `/{id}/assign`, `/review/approve`, `/review/reject`, GET `/review/pending`, `/pending-review` | Overdue/assign/review lifecycle | `require_supervisor` |
| PUT `/work-orders/{id}`, DELETE `/work-orders/{id}` | Office edit / delete WO | `require_supervisor` |
| GET `/previous-month-overdue-summary`, POST `/previous-month-overdue/*` | Prev-month overdue handling | `require_operations` |
| POST `/work-orders/dev/delete-and-regenerate` | DEV tool | `require_supervisor` |

**Technician (mobile):** `get_current_technician_user`

| GET `/my-tasks`, `/claimable`, `/my-stats`; POST `/{id}/claim`, `/reclaim-overdue`, `/acknowledge`, `/emergency-actions`, `/status`, `/start`, `/complete` | Technician's own job lifecycle |

**Shared reads / attachments:** `require_technician` (any staff/tech) — GET `/{id}`, `/events`, `/history`, attachments list/upload/presign; recommendation-parts options.

**⚠ NO ROLE GATE (`get_current_user`):**
- GET `/work-orders/attachments/config`
- POST `/work-orders/{id}/reassign` — **state-changing, ungated**
- GET `/work-orders/{id}/whatsapp-messages`, `/whatsapp-status`

**Emergency (`emergency.py`):**

| Method + Path | Use Case | Gate |
|---|---|---|
| POST `/work-orders/emergency` | Create emergency WO (**customer allowed**) | `require_roles([admin, operations_manager, maintenance_manager, maintenance_supervisor, customer])` |
| GET `/work-orders/emergency/active` | List active emergencies | `require_operations` |
| POST `/work-orders/emergency/{id}/assign` | Auto-assign emergency | `require_operations` |
| GET `/work-orders/sla-breaches` | SLA breaches | `require_operations` |
| POST `/work-orders/emergency/escalate-stale` | Trigger escalation job | `require_operations` |

### 5.7 Maintenance (`/api/v1/maintenance`)

**⚠ NO ROLE GATE (`get_current_user`) — any authenticated user can read/mutate:**
- Reads: GET `/visits`, `/contracts`, `/contracts/stats`, `/contracts/{id}`, `/contracts/{id}/visits`, `/plans`, `/plans/{id}`, all `/stats/*` (monthly, daily, capacity-dashboard, status-summary, status-distribution, supervisor/stats).
- Writes: POST `/contracts/{id}/visits/{visit_id}/assign-team` (single-visit team assign — its bulk sibling *is* gated).
- Notifications (`/api/v1/maintenance-notifications`): GET/POST/PUT preferences + list — all ungated.

**Gated (`require_operations`):** POST `/contracts`, PUT/PATCH/DELETE `/contracts/{id}`, `/activate`, `/generate-visits`, `/assign-team-to-all`, DELETE `/contracts/{id}/visits`; plan create/update/delete; **all invoices** (list/detail/create/mark-paid/update/record-payment/archive/unarchive/delete); **finance-overview** (`/finance/overview`, `/receivables`, `/billables`, `/reports`).

### 5.8 Dispatch / Distribution — **highest-risk module**

Mounted under `/api/v1/maintenance` (distribution) and `/api/v1/technicians` (workload).

**⚠ NO ROLE GATE (`get_current_user`) — 20 of 22 distribution endpoints, incl. powerful mutations:**
- POST `/maintenance/work-orders/bulk-assign`, `/auto-distribute`, `/assign`, `/assign-preview`, `/publish-self-assignment`, `/next-month-generation`, `/current-month-generation`
- Distribution templates: GET/POST list, POST `/{id}/apply`, DELETE `/{id}`
- GET `/unassigned`, `/monthly-overview`, `/*-generation-preview`, `/*-generation-audit`, `/by-district`, `/distribution-filter-options`, `/technicians`, `/suggested-technician/{district_id}`
- Workload: GET `/technicians/workload-summary`, `/technicians/{id}/work-orders`, `/{id}/work-orders/history` — **any user can read any technician's data**

**Gated (`require_operations`):** only GET `/maintenance/distributed` and POST `/maintenance/return`.

### 5.9 Technicians (`/api/v1/technicians`)

**Self-service (worker app, self-scoped inline by `user_id`):** GET/PUT `/me/profile`, GET `/me/statistics`, licenses `/me/licenses[...]`, leaves `/{id}/leaves` (self-or-admin), delivery-orders `/my-tasks`, `/history`, `/{order_id}/actions`.

**Admin/office actions (inline `_ensure_admin_access` — role sets defined per-file, drifting):** POST `/technicians` (create), DELETE `/{id}`, `/{id}/deactivate`, `/{id}/activate`; license approve/reject; leave approve/reject.

**Teams (inline `TEAM_OWNER_ROLES` / `TEAM_MEMBER_MANAGER_ROLES`):** POST/PUT/DELETE `/teams[/{id}]`, add/remove members.

**⚠ NO ROLE GATE (`get_current_user`) — org-data reads despite "admin"-named routes:** GET `/technicians`, `/{id}`, `/list`, `/admin/statistics-overview`, `/admin/overtime-report`, `/locations/active`, `/{id}/admin-details`, `/supervisors`, `/cities-regions`, `/teams`, `/teams/{id}`, `/teams/{id}/available-members`, `/{id}/visits/history`. **PUT `/{id}/visits/{visit_id}/status` — state change, ungated.**

**Sales CRM sub-router (`/technicians/sales/...`, inline `_ensure_sales_access`):** contract-requests CRUD + status (approve/reject manager-only), build-contract (manager/admin), finance-decision (`_ensure_finance_access` = admin/ops/finance_manager), calls/new-calls/periodic-calls/execution. *This is functionally a separate CRM feature mounted under technicians.*

### 5.10 Sales (`/api/v1/sales`) — inline role checks

| Method + Path | Use Case | Gate |
|---|---|---|
| GET/POST/PATCH `/sales/quotes[/{id}]`, `/send`, `/status`, `document.xlsx/pdf` | Quote lifecycle | `_ensure_sales_access` = `{admin, operations_manager, sales_rep, sales_manager, customer_service}` |
| GET `/sales/pricing/defaults`, POST `/pricing/calculate` | Read pricing / calculate | `_ensure_sales_access` |
| PUT `/sales/pricing/defaults` | Edit default price list | `_ensure_pricing_edit_access` = `{admin, operations_manager, sales_manager}` |

### 5.11 Installations (`/api/v1/installations`)

| Method + Path | Use Case | Gate |
|---|---|---|
| GET/POST `/projects`, GET `/projects/{id}`, `/timeline`, PUT `/projects/{id}` | Project CRUD | `require_operations` |
| POST `/projects/{id}/tasks`, PUT/DELETE `/tasks/{id}`, POST `/tasks/{id}/dispatch` | Task lifecycle + dispatch→WO | `require_supervisor` |
| POST `/projects/{id}/inspections`, PUT/DELETE `/inspections/{id}` | Inspection lifecycle | `require_supervisor` |

### 5.12 Compliance (`/api/v1/compliance`)

| Method + Path | Use Case | Gate |
|---|---|---|
| GET `/dashboard`, `/alerts`, `/certificates`, `/elevators` | Compliance reads | `require_operations` |
| PUT `/alerts/{id}/resolve`, POST/PUT `/certificates[...]`, POST `/entities` | Compliance writes | `require_supervisor` |

- **No dedicated `compliance_officer` gate** — relies on generic operations/supervisor tiers.

### 5.13 Elevators, Sites, Districts, Cities

| Method + Path | Use Case | Gate |
|---|---|---|
| GET/POST/PUT/DELETE `/elevators[/{id}]`, `/stats`, `/{id}/documents` (GET), `/{id}/qr-link` | Elevator CRUD | `require_operations` |
| POST `/elevators/{id}/documents`, PUT `/elevators/{id}/status` | Upload doc / change status | `require_supervisor` |
| GET `/public/elevator-qr/{token}` | 🔴 Resolve scanned cabin QR → wa.me redirect | PUBLIC (by design; token is only secret) |
| GET `/assets/store-image?src=` | 🔴 Proxy/stream store image (local uploads + app S3) | **PUBLIC — no auth at all (SSRF-adjacent)** |
| GET/POST/PUT/DELETE `/sites[/{id}]`, `/resolve-map-link` | Site CRUD | `require_operations` |
| GET `/districts`, `/districts/{id}`, `/workload-summary`, `/stats`, `/{id}/technicians`, `/technicians/all-assignments`, `/teams/all-assignments` | ⚠ District **reads** | `get_current_user` (any authenticated) |
| POST/PUT/DELETE `/districts[...]` (create/update/delete/assign/auto-assign) | District writes | `require_operations` |
| GET `/cities` | ⚠ City list | `get_current_user` |
| POST/PUT `/cities[/{id}]` | City writes | `require_operations` |

- **Inconsistency:** `sites` reads require `require_operations`, but `districts`/`cities` reads are ungated.

### 5.14 Finance (`/api/v1/maintenance/finance/...`)

**No finance-specific gate exists** — everything is `require_operations` (baseline, incl. `customer_service`/`sales_manager`) or `require_admin` (sensitive). **No segregation of duties** between viewing finance data and moving money.

- **`require_operations` (read + routine writes incl. money movement):** suppliers, POs, supplier-bills + record-payment, expenses + mark-paid, payments, cost-summary; GL accounts + journal-entries + sync + all statements (trial-balance, income-statement, balance-sheet, VAT return, cash-flow); JE pending-approval (list); fixed assets CRUD + run-depreciation + transfer/revalue/dispose; bank accounts + transactions + import-statement + auto-reconcile + link-payments; cheque register + status; period list; cost-center list; budget list; recurring list; credit-status; zakat compute; WHT/payables/cash-flow-forecast/statements/ZATCA config+clear; exports; attachments.
- **`require_admin` (sensitive/irreversible):** JE approve/reject/reverse; period close/reopen/lock/year-end-close; cost-center create/update/delete; budget create/delete; recurring template create/delete + run; recurring-invoice run; credit-settings change; zakat adjustment add/delete; cheque delete.

### 5.15 WhatsApp & Messaging

| Area | Endpoints | Gate |
|---|---|---|
| **Webhook** (`/api/v1/webhooks/whatsapp`) | GET (Meta verify handshake), POST (inbound events) | 🔴 PUBLIC. GET verifies `hub.verify_token`; POST checks `X-Hub-Signature-256` HMAC — **but skips verification entirely if `WHATSAPP_WEBHOOK_APP_SECRET` is unset** |
| **Customer messages** (`/api/v1/customer-messages`) | ~25 endpoints: templates, inbox, conversations (read/reply/attach/state/reorder/clear/archive), emergency-reports (+actions), completed-work-orders send, contracts send, tickets, CSAT, audit-timeline | `require_operations` (uniform) |
| **Departments** (`/api/v1/customer-messages/departments`, transfer, assign) | Dept inbox + transfer + assign | ⚠ `get_current_user` only — authz done **in-body** via `allowed_department_keys_for_user` (a user with no dept still passes the gate) |
| **Routing settings** (`/api/v1/settings/whatsapp`) | GET/PUT departments, POST routing/test | `require_admin` |
| **Reports** (`/api/v1/reports`) | whatsapp/first-response, work-orders/sla, elevators/recurring-faults, technicians/performance, csat | `require_operations` (comment says supervisor/admin — **code/comment divergence**) |

### 5.16 Dashboard, Settings, Notifications

| Method + Path | Use Case | Gate |
|---|---|---|
| GET `/dashboard/admin/stats` | ⚠ Company-wide admin KPIs | `get_current_user` — **any authenticated user reads admin metrics** |
| GET `/settings`, `/settings/{key}` | ⚠ Read all company settings (may include WhatsApp tokens/provider config) | `get_current_user` |
| PUT `/settings[/{key}]`, POST `/settings/seed-defaults`, `/settings/whatsapp/test`, `/template-test` | Settings writes / test sends | `require_admin` |
| `/api/v1/notifications/*` (13 endpoints: devices, list, count, mark-read, delete, preferences) | Own notifications (self-scoped by `user_id`) | `get_current_user` — correct owner-scoped pattern |

### 5.17 WebSockets (registered on `app`, bypass the API router & its deps)

| Path | Use Case | Gate |
|---|---|---|
| WS `/ws/admin/updates` | Admin real-time feed (WO events, emergencies) | 🔴 **NONE — fully unauthenticated broadcast** |
| WS `/ws/customer/orders`, `/ws/customer/orders/{order_id}` | Customer live order stream | `?access_token=` → `verify_token` → active user with `customer_id` (closes 4401/4403) |
| WS `/api/v1/ws/locations/{technician_id}` | Technician live GPS send/receive | 🔴 **NONE — trusts `technician_id` in path; anyone can connect as any tech** |

---

## 6. Frontend use cases & gating

### 6.1 AdminPortal (already has real section-level RBAC)

- **`canAccessSection(user, section)`** (`src/auth/permissions.ts`) precedence: (1) admin roles → all; (2) **per-user permission grant** whose module matches `SECTION_MODULE_MAP[section]` unlocks the section (**module prefix only — ignores the action**, so `sales.read` unlocks the whole Sales section incl. create/approve UI); (3) hardcoded role→section switch.
- **Route guards:** `ProtectedRoute` (auth), `SectionRoute section=… [adminOnly]` (every in-app route), `SupervisorRoute` (`/reports/whatsapp` = admin ∪ operations_manager). Sidebar mirrors the same `canAccessSection` filter.
- **Role → section matrix (role-only path):**

| Section | Roles (besides admin & matching grants) |
|---|---|
| dashboard, customers | any dept manager, customer_service |
| maintenance | operations_manager, maintenance_manager, maintenance_supervisor |
| installations | operations_manager, installation_manager, installation_supervisor |
| store | store_manager |
| finance | finance_manager |
| sales | operations_manager, sales_manager, sales_rep, customer_service |
| technicians | operations_manager, maintenance/installation managers + supervisors |
| whatsapp | operations_manager, customer_service |
| users, settings | admin-only (users also unlockable via a `users`-module grant) |

- **Per-action gating is sparse & ad-hoc, role-string based (not permission based):** `canDeleteCustomers` (admin), `canApproveReject` (manager roles), `canReturnDistribution` (admin/ops/maint mgr), `isWhatsAppSupervisor`. Most create/edit/delete buttons across Customers/Sites/Elevators/Contracts/Finance/Installations/Store have **no action-level gate** — visible to anyone with section access.
- **Pages/use cases** (each behind its `SectionRoute`): Dashboard KPIs; Customers + Sites + Elevators + Contracts CRUD; Maintenance work-orders + distribution + schedule; Installations projects/operations/finance/handover; Store products + orders; Sales requests/quotes/pricing (approve/reject); Finance (~30 sub-routes: invoices, AR/AP, GL, journal, JE-approval, assets, VAT/WHT/Zakat/ZATCA, banks/cheques, periods, cost-centers, budget); WhatsApp inboxes (supervisor sees all depts); Reports; Technicians; Users + `ManagerPermissionsDialog` (grant per-module CRUD); Settings + districts.

### 6.2 mobile-worker (role-based UI, backend-enforced)

- **Roles from `GET /technicians/me/profile`** drive bottom tabs (`resolveWorkerTabs`) and WorkstationHub cards. `admin` is whitelisted in **every** capability predicate.
- **Tabs:** Dashboard + Profile always; Now + Map for any field role; Sales for sales roles. Unified "Now" feed merges maintenance + installation + inspection + delivery jobs, one primary next-action per status.
- **Capability predicates** (`taskUtils.ts`): `canAccessTechnicianWork`, `canAccessInstallationTasks`, `canAccessInspectorEngineer`, `canAccessSalesRep`, `isSalesManager`, `canAccessDeliveryRep` — each matches a **loose synonym set** of role strings.
- **Use cases:** login (+ demo supervisor autofill); unified job feed; map/navigation; claim/self-assign WOs; start/complete visit; submit maintenance form + photo upload (presign→confirm); emergency actions; installation phase tracking; inspection sign-off; sales CRM (contract requests, offers, calls, periodic); delivery order actions + proof; profile/licenses/leaves/stats/notifications.
- **Gating is UI-only** — every per-role screen is registered in the root stack and reachable via `navigate(...)`; real enforcement depends entirely on the backend.

### 6.3 elms-customer (no role gating)

- Single audience (`customer`); `roles` field exists but **gates nothing** — every authenticated user sees the same tabs.
- **Use cases:** login/register (+ demo admin login via `register-demo`); home + report issue/emergency; store browse/product/cart/checkout; order history/tracking/cancel; invoice viewer (token-in-URL); elevators list/detail; installation monitoring; visits list/detail + approve/decline recommended parts + add-to-cart; technician tracking; contracts + request; notifications; profile/company profile.

---

## 7. Cross-cutting gaps & security risks (drivers for the redesign)

Ordered roughly by severity.

### 🔴 Critical — unauthenticated / broken access control
1. **`POST /auth/register-demo` is public and seeds real privileged accounts** (admin/managers) with hard-coded passwords, and both frontends expose buttons that call it. A live backdoor if reachable in prod. → gate behind env flag / remove in prod.
2. **WS `/ws/admin/updates` — fully unauthenticated** admin event broadcast (work orders, emergencies).
3. **WS `/api/v1/ws/locations/{technician_id}` — no auth**, trusts path id; anyone can spoof/read any technician's GPS.
4. **Dispatch/distribution — 20/22 endpoints ungated** incl. `bulk-assign`, `auto-distribute`, `assign`, month-generation, template apply/delete. Any authenticated user (a customer!) can reshuffle the entire maintenance schedule.
5. **`GET /assets/store-image?src=` — no auth, fetches arbitrary keys from local uploads + app S3** (SSRF-adjacent open proxy).
6. **WhatsApp webhook POST skips signature verification when `WHATSAPP_WEBHOOK_APP_SECRET` is unset** → spoofable inbound messages/status. Ensure the secret is mandatory.
7. **Payment webhook `POST /customer/payments/webhooks/{provider}` public** — confirm HMAC/signature verification exists in `accept_webhook`; if not, payment-status injection.

### 🟠 High — over-broad authenticated access ("NO ROLE GATE")
8. **Maintenance reads (contracts, plans, stats, dashboards) all ungated** — any authenticated user, incl. `customer` role, can read the whole maintenance book and KPIs.
9. **Technician org-data reads ungated** (`/technicians`, `/admin/*`, `/locations/active`, overtime report, teams, another tech's visit history). No ownership scoping.
10. **State-changing endpoints with no gate:** `POST /work-orders/{id}/reassign`, `PUT /technicians/{id}/visits/{visit_id}/status`, `POST /maintenance/.../visits/{vid}/assign-team`.
11. **`GET /dashboard/admin/stats`** and **`GET /settings` / `/settings/{key}`** ungated — any authenticated user reads company-wide KPIs and settings (settings may hold WhatsApp/provider secrets).
12. **District/city reads ungated** while sites reads are gated — inconsistent.

### 🟡 Medium — model & consistency problems
13. **Three coexisting enforcement idioms** (dependency gates, per-module inline role sets, unused permission overlay) with **drifting role lists** (`_ADMIN_ROLES`, `TEAM_OWNER_ROLES`, `STORE_ADMIN_ROLES`, `_ensure_sales_access`, `require_operations` all differ). Consolidate into one matrix.
14. **`require_permission` overlay is built but wired to zero endpoints** — the fine-grained system exists only on paper server-side (AdminPortal already consumes grants for section visibility).
15. **No finance segregation of duties** — viewing finance data and moving money (record-payment, run-depreciation, bank import, ZATCA clear) share the `require_operations` tier; `customer_service` & `sales_manager` are inside it.
16. **Token-in-URL authz pattern** (`get_user_from_access_token_query`) in ~6 endpoints, each re-implementing role/ownership inline; tokens leak via logs/referrers. Consolidate into one dependency; prefer short-lived signed URLs.
17. **Customer tenant isolation via fuzzy matching** — `_resolve_customer_for_user` matches email/phone/site-contact when `user.customer_id` is null; a customer could resolve to a record they only loosely match. Make `customer_id` the authoritative link.
18. **Three divergent customer-account provisioning paths** with different gates (`POST /users` admin; `PUT /customers/{id}/app-account` ops; `POST /customer-admin/customers/{id}/users` ops). Unify.
19. **No dedicated `compliance_officer` enforcement** despite the seeded role.
20. **`admin` hard-coded into every mobile capability predicate** — blurs least privilege.

### 🔵 AuthN hardening
21. **Tokens in `localStorage` / plain `AsyncStorage`** across all three clients — XSS/device-theft exposure. Move to httpOnly cookies (web) + SecureStore/Keychain (mobile).
22. **Default JWT secret** ships in config; **no MFA, no lockout/rate-limit, no server-side token revocation** (logout is audit-only; inactivity logout is local-only — refresh token stays valid).
23. **Roles are baked into the access token** but role changes require re-login to update the client's view; consider short access tokens + a revocation/version check.
24. **mobile-worker has two parallel auth implementations** (hand-rolled fetch vs Redux/RTK) that can drift; `global.fetch` monkey-patch applies auth-retry to all fetches.

---

## 8. Target model — recommendations

### 8.1 Unify on the permission overlay (RBAC → role-grants-permissions)
- Keep the 20 roles as **bundles of permissions**, not as the enforcement primitive. Enforce everywhere with a single `require_permission("module.action")` dependency (admin bypass) so backend and AdminPortal share one contract.
- **Extend the catalog** beyond the current 10 modules to cover every domain surfaced above: add `dispatch`, `elevators`, `sites`, `technicians`, `compliance`, `whatsapp`, `store` (commerce), `settings`, `dashboard`. Split finance into read vs. money-movement actions (e.g. `finance.read`, `finance.post_payment`, `finance.approve`, `finance.close_period`) to get segregation of duties.
- Make AdminPortal check **`module.action`**, not just module prefix, so read vs. create/update/delete/approve gate the actual buttons. Replace ad-hoc `canX(user)` helpers with one `can(permission)` hook / `<Can>` component.

### 8.2 Define the canonical role → permission matrix
Build one table (seeded, versioned) mapping each of the 20 roles to its permission set — replacing every drifting inline role list. Draft starting point (to be reviewed with operations):

| Role | Representative permissions |
|---|---|
| `admin` | `*` (bypass) |
| `operations_manager` | `maintenance.*`, `work_orders.*`, `dispatch.*`, `installation.*`, `elevators.*`, `sites.*`, `technicians.*`, `customers.*`, `contracts.*`, `reports.read` |
| `maintenance_manager` | `maintenance.*`, `work_orders.*`, `dispatch.*`, `technicians.read/assign`, `reports.read` |
| `installation_manager` | `installation.*`, `work_orders.read`, `technicians.read/assign`, `compliance.read` |
| `maintenance_supervisor` / `installation_supervisor` | scoped subset of the above: assign/review/approve within their line, no delete of masters |
| `store_manager` | `store.*`, `inventory.*`, `customers.read` |
| `finance_manager` | `finance.read`, `finance.post_payment`, `finance.approve`, `finance.close_period`, `contracts.read`, `reports.read` |
| `sales_manager` | `sales.*`, `contracts.create`, `customers.read`, `pricing.write` |
| `sales_rep` | `sales.read/create/update`, `customers.read` |
| `technician_maintenance` / `technician_installation` | `work_orders.self` (own tasks: claim/start/complete/status/attachments), `technicians.self` (own profile/licenses/leaves) |
| `inspector` / `engineer` / `installation_inspector` / `quality_engineer` | `installation.inspect`, `work_orders.self` |
| `delivery_rep` | `store.deliver` (own delivery tasks) |
| `customer_service` | `whatsapp.*`, `customers.read`, `work_orders.read`, `sales.read` |
| `compliance_officer` | `compliance.*`, `elevators.read`, `reports.read` |
| `customer` | `customer.self` (own portal/commerce), `work_orders.create_emergency` |

### 8.3 Introduce object-level / ownership scoping
- Add a first-class **"self" scope** dependency for technician + customer routes (own tasks/visits/orders/profile) instead of inline `user_id` comparisons, so new endpoints can't forget it.
- Make **`customer_id` the sole tenant key**; backfill it and drop fuzzy matching.
- Scope technician workload/visit reads to self-or-manager.

### 8.4 Fix the public surface
- Remove/env-gate `register-demo` and both frontends' demo buttons.
- Authenticate all three risky WebSockets with the `?access_token=` pattern already used for customer sockets (and scope location sockets to the owning technician / their managers).
- Require `WHATSAPP_WEBHOOK_APP_SECRET`; verify payment-webhook signatures.
- Lock down `/assets/store-image` (require auth or a signed token; restrict `src` to a whitelist).

### 8.5 AuthN hardening
- Mandatory strong JWT secret (fail fast if default in prod); short web access tokens; server-side refresh-token revocation on logout + a token-version/`is_active` re-check.
- Move web tokens to httpOnly+Secure cookies; move mobile tokens to `expo-secure-store`/Keychain; stop putting tokens in URLs (use short-lived signed document URLs).
- Add login rate-limiting/lockout; consider MFA for admin/finance roles.
- Consolidate mobile-worker onto a single auth implementation.

### 8.6 Migration approach (safe rollout)
1. Land the expanded permission catalog + role→permission seed (no enforcement change yet).
2. Wire `require_permission` onto the **ungated** endpoints first (dispatch, maintenance reads, technician org reads, dashboard/settings, the two ungated state-changers) — biggest risk reduction.
3. Replace inline role sets (sales, technicians, store-admin) with catalog permissions.
4. Switch AdminPortal to `module.action` gating + `<Can>`.
5. Fix WebSocket/webhook/public-asset auth.
6. AuthN hardening (storage, secrets, revocation) as a parallel track.
7. Add tests for dispatch/emergency/finance gates (safety-critical per project quality bar).

---

*Generated by scanning `backend/`, `AdminPortal/`, `mobile-worker/`, `elms-customer/`. Endpoint gates reflect source as of 2026-07-03; re-verify a specific handler before relying on any single row for a security decision.*
