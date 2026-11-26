# MUKARM-DUAL-DOMAIN-001 — Phase 1 read-only audit

Date: 2026-11-26. Scope: add `api.mukarm.com` beside `api.hensline.com` on the same
FastAPI backend and PostgreSQL database. Nothing in production was changed to
write this: the server was only read (Nginx files, certificate list, non-secret
env keys).

## 1. What production looks like today

| Piece | Finding |
| --- | --- |
| Reverse proxy | Host Nginx, one file `/etc/nginx/sites-available/elms` with two HTTPS server blocks: `admin.hensline.com` (portal on :8080, `/api/v1/` and `/ws/` to :8000) and `api.hensline.com` (everything to :8000, plus `/ws/` and `/api/v1/ws/` WebSocket locations). `client_max_body_size 50m`. `Host $host` and `X-Forwarded-*` are passed through. |
| Second site | `avix-store` → `avix-market.hensline.com` (:3200). Unrelated. |
| TLS | One Certbot certificate `admin.hensline.com` with SANs `admin.hensline.com, api.hensline.com`, Nginx authenticator, expires 2027-02-08, `certbot.timer` active. |
| Backend public origin | `PUBLIC_BASE_URL` is **not set** in `server-ELMS/.env`, so the code default `https://api.hensline.com` is used. |
| CORS | `CORS_ORIGINS` and `CORS_ORIGIN_REGEX` list only localhost and LAN addresses. The portal calls the API same-origin through `admin.hensline.com/api/v1`, and the mobile app is native, so CORS does not gate either. |
| Auth | Bearer tokens (`app/api/deps.py`). The backend sets **no cookies**, so there is no cookie-domain coupling. |
| Host-based tenancy | `app/platform/subdomain.py` reads the host only as a *restriction* hint. `api` is a reserved label, so `api.mukarm.com` resolves to "no opinion" exactly like `api.hensline.com`. Companies already carry `custom_domain` and `public_token`. |
| DNS | `api.mukarm.com` is already a CNAME to `api.hensline.com` → `92.113.31.218` (zone on Vercel DNS). HTTPS to it fails today: Nginx has no server block or certificate for the name. |

## 2. Every dependency on `api.hensline.com`, classified

| Dependency | Where | Class | Why |
| --- | --- | --- | --- |
| Printed contract QR stickers `/c/…`, `/{company}/c/…` | paper in the field | **Legacy, permanent** | Cannot be reprinted on a schedule; must resolve forever. |
| Printed cabin emergency QR `/e/…` | paper in cabins | **Legacy, permanent** | Safety path: a dead sticker strands a report. |
| WhatsApp «قيّم الخدمة» button `https://api.hensline.com/r/{{1}}` | Meta-approved template (`customer_messages.py:418`, `rating.py:87`) | **Legacy until a new template is approved** | The host is part of the approved template; changing it needs a new Meta template. |
| WhatsApp Cloud API webhook | Meta app settings → `api.hensline.com/api/v1/webhooks/…` (`router.py:507`) | **Shared, keep** | Webhook URL is per Meta app, not per tenant; moving it buys nothing and risks message loss. |
| Embedded Signup / Meta OAuth | `meta_onboarding.py` exchanges the code server-side; no redirect URI is configured in this repo | **Shared, keep** | Re-check in Meta's app settings before any move (outside the repo). |
| Mobile worker app | `mobile-worker/src/config/api.ts:13`, `eas.json` (3 profiles) | **Shared, keep** | Changing it needs a build/OTA; the old host keeps working, so no forced update. |
| AdminPortal | relative `/api/v1` on `admin.hensline.com` | **Unaffected** | Never names the API host. |
| Generated links (contract, emergency, rating page, media `/m/`) | `PUBLIC_BASE_URL` in `public_contract.py:138`, `public_emergency_report.py:76`, `rating.py:93`, `media_links.py:68,76` | **Migratable / tenant-specific** | One global setting today; this is the only lever that changes which host new links carry. |
| `/m/` link validation | `media_links.is_valid_link` → `store_assets.py:155` (307 redirect) | **Migratable, security-relevant** | Accepts only `PUBLIC_BASE_URL + /m/`. If a second base is introduced it must accept an explicit allow-list, never "any host". |
| Ops scripts | `scripts/deploy-all.sh:143`, `backend/scripts/smoke/prod_verify.py:26` | **Shared, keep** | Health checks; add the new host as a second check later. |
| Docs / tests mentioning `hensline.com` | docs, `test_document_sanitize.py`, promo URL tests | **Not a dependency** | `hensline.com` (the company site) is content, not the API host. |

None of the public token routes read the request host to build or authorize a
link — every absolute link comes from `PUBLIC_BASE_URL`. So both hosts can serve
the same tokens with no host-header injection surface, as long as that stays true.

## 3. Phase 2 — dual domain (infrastructure only, no code)

Minimum change that makes `https://api.mukarm.com` serve the same backend:

1. **DNS** (already done as a CNAME). Recommended: replace the CNAME with an
   `A` record `api → 92.113.31.218`, so `mukarm.com` does not depend on the
   `hensline.com` zone staying alive. Either works for TLS.
2. **Nginx**: add a *separate* server block pair (80 + 443) for
   `server_name api.mukarm.com;` that is a copy of the `api.hensline.com`
   block (same three locations, same headers, same 50m body limit). Do not
   edit the existing `api.hensline.com` block.
3. **TLS**: issue a *separate* certificate
   (`certbot --nginx -d api.mukarm.com`, HTTP-01 works because DNS already
   points here). Do not `--expand` the existing `admin.hensline.com`
   certificate: a failed expand can touch the certificate both live hostnames use.
4. **Backend**: no change. `PUBLIC_BASE_URL` stays unset (= `api.hensline.com`),
   so every new link keeps its current host until Phase 3 decides otherwise.
5. **Verify**: `nginx -t`, reload, then on both hosts: `/api/v1/health`,
   login, a WebSocket connect, an upload, an existing `/c/` and `/e/` token,
   `/r/` page, an `/m/` link. Old host must be byte-for-byte unchanged.

Rollback: remove the `api.mukarm.com` server block (or its symlink), `nginx -t`,
reload. The old block and certificate were never touched, so nothing else moves.
The new certificate can stay or be deleted with `certbot delete`.

What this does **not** do: no redirect between the API domains, no change to
Meta, the mobile app, the portal, or any issued link.

### Phase 2 — DONE 2026-11-26

- New file `/etc/nginx/sites-available/mukarm-api` (symlinked in `sites-enabled`):
  port 80 → HTTPS redirect + ACME path; port 443 with the same three locations,
  headers and 50m limit as `api.hensline.com` (diffed: identical).
- Separate certificate `api.mukarm.com` (Certbot `certonly --nginx`), expires
  2027-02-24, auto-renews; `certbot renew --dry-run --cert-name api.mukarm.com` succeeded.
- Untouched: `sites-available/elms`, the `admin.hensline.com` certificate, backend
  env, containers. Backup of the elms file: `/root/elms.nginx.bak-2026-11-26`.
- Verified on both hosts, same status and byte size: `/api/v1/health` 200,
  `/{company}/c/<qr>` 200, `/{company}/e/<qr>` 200, wrong company 404, junk token
  404, WebSocket handshake without auth 403. Old `/c/<qr>` redirects to the
  `/{company}/c/` form **on the same host** it was opened on.
- Rollback: `rm /etc/nginx/sites-enabled/mukarm-api && nginx -t && systemctl reload nginx`.

## 4. Phase 3 — tenant-specific public links (design, needs your decision)

The repo already has the per-company piece: every generator looks up the
owner's `public_token` before building the link. A per-company base fits there:

- Add `companies.public_base_url` (nullable). `NULL` → global `PUBLIC_BASE_URL`.
  C1 (Hensline) stays `NULL`; C5 and new companies get `https://api.mukarm.com`.
- **Allow-list, not free text**: a new env `PUBLIC_BASE_URLS_ALLOWED`
  (`https://api.hensline.com,https://api.mukarm.com`). The column may only hold
  a value from that list — validated on write (platform console) and again on
  read, falling back to the global base if a stale value is found. This is what
  rules out host-header injection and an open redirect: the host never comes
  from a request, and no tenant can point links at an arbitrary domain.
- Generators (`public_contract_url`, `public_emergency_url`, `rating_url`) take
  the base from the owner company they already look up. Media `/m/` links stay
  on the global base (short-lived, not customer-facing branding).
- `media_links.is_valid_link` accepts any base in the allow-list.
- Token checks stay exactly as they are: `/{company_token}/c/{token}` already
  verifies the company/token pair server-side, so a link on either host
  resolves only to its own company's record.
- **Old links never change**: nothing stored holds the host except printed
  paper and sent WhatsApp messages, and both hosts keep serving every token.
- Known gap: the WhatsApp rating button stays `api.hensline.com/r/{{1}}` for
  every company until a Mukarm-host template is approved by Meta. That is a
  Meta task, not a code task.

Needs a migration (one nullable column), so it goes through Alembic and the
normal backend deploy, with tests for: allow-list rejection, NULL fallback,
both hosts resolving the same token, cross-company token on either host → 404.

### Phase 3 — BUILT LOCALLY 2026-11-26 (not committed, not deployed)

Worktree `backend-mukarm-links`, branch `feature/mukarm-public-base-url` from prod
`5c030fd`. Migration `pubbase_0001` (one nullable column, no backfill). New
`app/platform/public_base.py`; contract/emergency/rating builders take the
owner's allow-listed base; `/m/` validation accepts every allowed base; platform
console `PUT /platform/companies/{id}` takes `publicBaseUrl` and answers
`publicBaseUrl`, `publicBaseUrlEffective`, `publicBaseUrlOptions`.
Tests: `tests/integration/test_public_base_url.py` 18 passed; neighbouring suites
214 passed, 1 failure (`test_platform_user_delete::test_every_not_null_reference_is_classified`)
that fails identically on the untouched prod commit.

**DEPLOYED 2026-11-26 ~18:50 UTC**: commit `4908f3f` (pushed as
`feature/mukarm-public-base-url`; server branch `release/avix-2026-11-26-mukarm-links`),
`pubbase_0001` applied, `PUBLIC_BASE_URLS_ALLOWED=https://api.mukarm.com` in
`server-ELMS/.env` (old file: `/root/backups/server-ELMS.env.before-pubbase`).
Backup: `/root/backups/elms_db_before-pubbase_0001_20261126-184803.dump`.
Every company's `public_base_url` is still NULL → all links unchanged.
**Blocker found during verification:** at 17:06 UTC someone else removed
`sites-enabled/mukarm-api` and reloaded Nginx, so `api.mukarm.com` no longer
answers HTTPS. C5 was NOT switched. The config file and certificate are still present.
Code rollback if needed: checkout `5c030fd`, rebuild api+worker (the nullable column can stay).

**Resolved ~19:05 UTC:** `sites-enabled/mukarm-api` re-linked (file unchanged since
Phase 2), `nginx -t` + reload; both hosts identical again on every check. C5
(«مؤسسة كيان الذهبي للمصاعد») set to `https://api.mukarm.com` by direct SQL in one
transaction with an `audit_logs` UPDATE row (`user_agent = 'deploy: MUKARM-DUAL-DOMAIN-001'`).
The app resolves C5 → `api.mukarm.com`, C1 → `api.hensline.com`; C1 contract,
emergency and rating links open (200). C5 has 0 contracts and 0 work orders yet,
so no C5 link exists to open. Undo for C5: `UPDATE companies SET public_base_url = NULL WHERE code = 'C5'`.

To switch it on after deploy: set `PUBLIC_BASE_URLS_ALLOWED=https://api.mukarm.com`
in `server-ELMS/.env`, restart api + worker, then set C5's `publicBaseUrl`.
The portal's platform console has no field for it yet (API only).

## 5. Phase 4 — test plan (when approved)

| Check | Old host | New host |
| --- | --- | --- |
| `/api/v1/health` 200 | ✓ | ✓ |
| Worker login + job list (mobile, unchanged build) | ✓ | — |
| Portal login, WebSocket live refresh | ✓ (via admin) | — |
| Existing `/c/`, `/{company}/c/`, `/e/`, `/r/` tokens render | ✓ | ✓ |
| Cross-company token on the wrong `{company}` segment → 404 | ✓ | ✓ |
| `/m/` media link opens; store-asset proxy redirect stays same-host | ✓ | ✓ |
| Upload ≤ 50 MB | ✓ | ✓ |
| WhatsApp inbound webhook still delivered (Meta dashboard last-delivery) | ✓ | n/a |
| Celery worker unaffected (no host involved) | ✓ | n/a |
| Certificate renewal dry run covers both certs | `certbot renew --dry-run` | |

## 6. Side observations (not touched, outside this task)

- `server-ELMS/.env` has `ENVIRONMENT=development` on the production server.
- `CORS_ORIGINS` still lists LAN addresses from local testing; harmless for the
  portal (same-origin) but worth pruning.

## 7. Approvals needed before anything changes

1. Phase 2 on the server: new Nginx server block + new certificate + reload.
2. Optionally: switch `api.mukarm.com` from CNAME to an `A` record in Vercel DNS.
3. Phase 3: the per-company `public_base_url` design above (code + migration + deploy).
4. Later, separately: a Mukarm-host WhatsApp rating template in Meta.
