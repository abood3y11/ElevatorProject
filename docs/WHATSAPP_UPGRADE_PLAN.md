# WhatsApp System Upgrade — Implementation Plan

> Source of truth for the 4-phase WhatsApp upgrade. Derived from an end-to-end audit of
> the live code (backend inbound/outbound, AdminPortal UI, data model) on 2026-07-02, cross-referenced
> against `elevator-whatsapp-blueprint.html`.
>
> **Golden rule (CLAUDE.md §9/§13):** nothing that touches dispatch/alarm/emergency ships without tests.
> Backend and frontend commit separately. Every WhatsApp send path must create a `WhatsAppMessage` row.

---

## 0. Reality check — what already exists (so we don't rebuild it)

The blueprint assumes a greenfield ("one maintenance dept, no media, no emergency, no tickets"). The audit
found the operational backbone is already built. **We are filling gaps, not rewriting.**

| Blueprint target | Actual state today | Action |
| --- | --- | --- |
| Work Orders / tickets | Full `WorkOrder` model: priority incl. `emergency`, SLA deadlines, elevator/site/customer/contract FKs, cost tracking | **Reuse** |
| Emergency P1 escalation | Built in `work_orders/services/emergency.py` — SLA 0.5h, 10-min response, auto-escalation, interactive closure buttons | **Reuse / extend** |
| Asset registry | `Elevator`, `Site`(=building), `Contract`, `SparePart` all rich | **Reuse**; add `Elevator.qr_token` |
| Outbound WhatsApp | Meta Graph v20.0, 10 templates, text/template/interactive/media, auto-vs-manual per template, every send tracked | **Reuse** |
| RBAC | `User`/`Role`/`Permission` fine-grained catalog | **Reuse / extend** with dept perms |
| Bot routing scaffolding | `WhatsAppConversationState.bot_intent/bot_step/bot_payload` exist; emergency bot uses them; **menu bot is inert** | **Build on top** |
| Inbound media | metadata (`media_id`) captured into `raw_payload`, **file never downloaded/stored/rendered** | **BUILD (Phase 1)** |
| Departments / routing engine / menu | none (`DEPARTMENT` missing; distribution is by geographic *district*) | **BUILD (Phase 2)** |
| Ticket-from-chat / TICKET_EVENT / CSAT | missing (`WorkOrder.quality_rating` exists but no survey) | **BUILD (Phase 3/4)** |

### Key file map (verified)
```
backend/app/whatsapp/controllers/webhook.py            # inbound receive + emergency bot state machine
backend/app/whatsapp/controllers/customer_messages.py  # manual send, templates, inbox API, TEMPLATE_DEFINITIONS
backend/app/whatsapp/models/whatsapp.py                # WhatsAppMessage, WhatsAppConversationState
backend/app/whatsapp/repository.py
backend/app/_shared/infra/whatsapp_service.py          # outbound Meta Graph client (send text/template/interactive/media)
backend/app/_shared/infra/s3_storage_service.py        # S3 storage (work-orders/ prefix today)
backend/app/_shared/config.py                          # WHATSAPP_* + AWS_S3_* settings
backend/app/work_orders/services/emergency.py          # P1 escalation
backend/app/work_orders/services/lifecycle.py          # WO state → WhatsApp triggers
AdminPortal/src/pages/customers/WhatsAppMessages.tsx   # single 2.4k-line page, 5 tabs
AdminPortal/src/api/customerMessages.ts                # frontend API client
```

---

## Status
- **Phase 1 — DONE (built + verified locally, not yet deployed to VPS).** Backend: `WhatsAppMediaFile` + migration `whatsapp_media_0001`, S3 pipeline, non-blocking webhook wire-in, inbox media API, backfill, tests (all pass, compileall clean, single alembic head). Frontend: `MessageMedia.tsx` + inbox/emergency rendering, `npm build` passes. Emergency bot untouched. **Pending user action:** commit (BE+FE separate), run `alembic upgrade head` on VPS, deploy, send a real image to verify.
- **Phase 2 — Backend DONE (verified locally: compileall clean, single head `whatsapp_departments_0001`, 20 tests pass incl. emergency-precedence proof). Frontend IN PROGRESS.** Decisions accepted: fallback→`coordination`; dept inbox path `/customer-messages/departments/inbox`; supervisor roles `{admin, operations_manager}`; menu bot flag `whatsapp_menu_bot_enabled` default OFF; routing runs inline in webhook (try/except), emergency untouched. **Frontend DONE too** (dept-tab inbox additive, transfer/assign, routing + bot settings screens, npm build passes). Full Phase 2 verified locally.
- **Phase 3 — NOT STARTED.** A first backend build attempt crashed mid-run (host process exited); its partial output (2 orphan model stubs, no migration/logic/tests) was **reverted** back to the clean Phase 1+2 baseline. To be rebuilt fresh with the decisions below.

## ALL 4 PHASES BUILT + VERIFIED LOCALLY — committed, NOT pushed (2026-07-02)
- **Phase 1+2 backend** `9097044` · **Phase 1+2 frontend** `968b92a` · **WA page refactor** `facdd2a`
- **Phase 3 backend** `adb541e` (migration `whatsapp_phase3_0001`) · **Phase 3 frontend** `f9647de`
- **Phase 4 backend** `77e779e` (migration `whatsapp_phase4_0001`) · **Phase 4 frontend** `1999da1`
- Migrations (single chained head): `whatsapp_media_0001 → whatsapp_departments_0001 → whatsapp_phase3_0001 → whatsapp_phase4_0001`.
- WhatsApp test suite: **45 pass** (media + routing + emergency-precedence + phase3 + phase4). compileall clean.

### Deploy order (user directive)
1. Push both repos. Deploy backend (`alembic upgrade head` applies all 4 migrations). Deploy AdminPortal.
2. Verify Phase 1 media in prod: send a real image + sticker + voice note → confirm they render. (Routing + menu-bot + CSAT flags all OFF, so only media is live.)
3. Set ops config: `whatsapp_business_display_number` (dialable number for QR deep links).
4. Flip `whatsapp_department_routing_enabled` ON → confirm department inboxes populate.
5. Flip `whatsapp_menu_bot_enabled` ON LAST, in a quiet window.
6. Optionally flip `whatsapp_auto_csat_enabled` ON once satisfied.

### Known follow-ups (not blocking)
- Pre-existing broken shared test fixture `tests/conftest.py` `elevator` uses dropped cols `capacity_kg`/`capacity_persons` → some older tests error at setup (unrelated; phase tests use own fixtures). Small cleanup commit.
- Meta-connection + webhook-status chips are derived (no health endpoint) — wire if one is added.
- Recurring-fault auto-alert left as report-only; add a notification helper if push-on-threshold is wanted.
- mine/team/unassigned filters apply only on the dept-scoped inbox (unscoped list needs `assignedUserId`).
- **Master flag `whatsapp_department_routing_enabled` (default OFF)** wraps Phase 2 routing → ships dormant. `whatsapp_menu_bot_enabled` (default OFF) gates the menu send on top. So deploying this commit = **live behavior is Phase 1 (media) only**; flip routing flag ON after verifying media, menu-bot flag ON last in a quiet window.
- 24 WhatsApp tests pass (incl. dormancy-when-flag-off + emergency-precedence-with-routing-on).

## Operational sequencing (user directive, 2026-07-02)
Do **not** accumulate unpublished phases. Required order:
1. Commit Phase 1 (BE+FE) and Phase 2 (BE+FE) as **4 separate commits**.
2. **Deploy Phase 1 to the VPS and verify with a REAL image + sticker + voice note** to the business number before Phase 2 goes to prod (so a media issue can be isolated from routing changes).
3. Deploy Phase 2. **Enable the menu bot LAST** — only after department inboxes are confirmed working in prod, and flip `whatsapp_menu_bot_enabled` during a quiet window (not Sunday-morning peak).
4. Only then merge/deploy Phase 3.

## Phase 3 — locked decisions (user, 2026-07-02)
1. **Standalone `contacts` table** — `contacts(id, customer_id FK, site_id FK nullable, name, phone unique, role: guard|building_manager|owner|other, is_primary)`. Rationale: one building has many senders (guard, building manager, resident) on different numbers; embedded `Customer/Site` single-phone fields can't hold them. **Backfill** the existing embedded numbers into `contacts` rows; **keep the old fields read-only, do NOT drop them.** Use `contacts` to improve inbound **phone→site matching** (the same match `siteMatchMethod` uses in emergency reports).
2. **Create-ticket-from-chat = pre-filled confirmation dialog** (semi-auto, never silent): button opens a `Dialog` pre-filled — customer (from phone match), building, the site's elevator list to pick, description = recent inbound texts, attachments = all conversation `WhatsAppMediaFile`s → `WorkOrderAttachment`. Agent reviews + confirms. Rules: default type `corrective`; **priority can NEVER be raised to `emergency` from this path** (the emergency bot is the only emergency entry — §9 protection); store `conversation_id`/`source_conversation_phone` on the WorkOrder; **duplicate guard** — if the conversation already has an OPEN WorkOrder, show "يوجد أمر عمل مفتوح WO-xxx" instead of creating a second.

## Phase 2/3 Frontend Refactor — WhatsApp tab redesign (user spec, 2026-07-02)
Do NOT rewrite the page; re-structure the existing 5-tab page by adding a **department layer** on top. Emergency tab logic must NOT be touched (§9). Decompose the 2.4k-line `WhatsAppMessages.tsx` into:
```
AdminPortal/src/pages/customers/whatsapp/
├── WhatsAppMessages.tsx        # Shell: Header + Strip + Tabs + Footer
├── DepartmentStrip.tsx         # NEW horizontal dept pills (gradients), permission-gated, filters all queries by department_id
├── tabs/
│   ├── InboxTab.tsx            # extracted renderInbox + [لي|فريقي|غير مسند|الكل] ToggleButtonGroup filters
│   ├── EmergencyTab.tsx        # renderEmergencyReports UNCHANGED (never department-filtered; always red pulse badge)
│   ├── CompletedTab.tsx        # renderCompleted
│   ├── TemplatesTab.tsx        # renderTemplates
│   ├── AuditTab.tsx            # renderAuditTimeline
│   └── RoutingTab.tsx          # NEW keyword-rules table (emergency row LOCKED, view-only) + bot-menu editor + live phone preview + test box (supervisor only)
├── components/
│   ├── MessageMedia.tsx        # DONE (Phase 1)
│   ├── ConversationActions.tsx # NEW hover actions: transfer dept / assign user / create work-order
│   ├── DeptChip.tsx            # NEW unified dept-colored chip
│   └── StatusFooter.tsx        # NEW thin fixed footer: webhook status • last msg • unclassified count • active emergencies • 24h window
└── constants/departments.ts    # NEW dept keys + gradient design tokens
```
Dept gradients (design tokens): all `#667eea→#764ba2`, sales `#fa709a→#fee140`, maintenance `#4facfe→#00f2fe`, coordination `#30cfd0→#330867`, crm `#f093fb→#f5576c`, inventory `#43e97b→#38f9d7`, unclassified grey `#9ca3af→#6b7280` (pulsing orange badge). Default tab becomes **Inbox** (was audit). Add a Meta-connection status chip in the header. RTL logical props only; match the page's string convention (no divergent i18n). This refactor is large — schedule it as its own frontend workstream alongside Phase 3 backend, committed separately.

## Phase 3 — Ticket-from-Chat, Asset Linking & Field Loop
- Note: project uses relative imports, not `@/` aliases.

## Phase 1 — Inbound Media Pipeline  ← fixes the #1 complaint (images don't show)

**Goal:** every inbound media message (image/sticker/audio/voice/video/document/location) is downloaded from
Meta within its ~5-min window, stored in S3, recorded in a `media_file` row, and rendered in the AdminPortal
inbox + emergency attachments. **No safety-critical code touched.**

### Root cause (verified)
`webhook.py:_message_media_payload` (≈L403) extracts `{type, id, mime_type, sha256, caption, filename}` into
`WhatsAppMessage.raw_payload` but never calls Meta to fetch bytes. The `media_id` is in the DB — only the
download+store+render layers are missing. AdminPortal renders `message.body` text only (`WhatsAppMessages.tsx:1523`).

### Backend
1. **Model + migration** — new `whatsapp_media_files` table (`WhatsAppMediaFile`):
   `id, message_id FK→whatsapp_messages, wa_media_id, media_kind(image|sticker|audio|voice|video|document|location),
   mime_type, sha256, file_name, caption, storage_key, storage_url, thumbnail_key, thumbnail_url,
   size_bytes, width, height, duration_seconds, download_status(pending|stored|failed), download_error,
   latitude, longitude, location_name, created_at, updated_at`. Alembic migration `whatsapp_media_0001`.
2. **S3** — add `S3StorageService.upload_bytes(prefix, file_name, content_type, data) -> file_url/key`
   (server-side `put_object`; today only presigned client upload exists). Key prefix `whatsapp-media/{yyyy}/{mm}/`.
3. **Downloader** — new `backend/app/whatsapp/services/media_pipeline.py`:
   `GET graph.facebook.com/v20.0/{media_id}` (Bearer = resolved `access_token`) → temp URL →
   `GET url` (same Bearer) → bytes → S3 → `WhatsAppMediaFile` row. Retry ×3 w/ backoff. Thumbnails for
   image/video via Pillow (already a dep? confirm; else store without thumb + TODO). Location stored as coords, no download.
4. **Wire-in** — in `webhook.py`, after the `WhatsAppMessage` row is persisted, enqueue a `whatsapp.media` job
   (Redis) OR call inline in a threadpool. **Must return 200 to Meta within seconds** → prefer enqueue; then
   `redis_worker.py` handles `whatsapp.media`. Fallback if `REDIS_ENABLED=false`: FastAPI `BackgroundTasks`.
5. **Serve** — extend the inbox API (`customer_messages.py` conversation-messages endpoint) to include a
   `media` array per message (`kind, url, thumbnailUrl, mimeType, fileName, caption, lat/lon`). Prefer S3
   signed GET URLs (add `S3StorageService.generate_presigned_get`) so the bucket stays private.
6. **Backfill** — one-off script `backend/app/scripts/backfill_whatsapp_media.py` to walk existing
   `raw_payload` media ids and attempt download (best-effort; most will be expired — log & skip).

### Frontend (AdminPortal)
1. Extend `WhatsAppInboxMessage` (`customerMessages.ts`) with `media?: WhatsAppMessageMedia[]`.
2. New component `AdminPortal/src/pages/customers/whatsapp/MessageMedia.tsx` rendering by kind:
   image (thumb → lightbox), sticker (128px webp), audio/voice (`<audio>`), video (`<video>` + poster),
   document (file card + download), location (static map / coords link). Unknown → "📎 مرفق" card, never dropped.
3. Render it in the inbox thread (`WhatsAppMessages.tsx` ≈L1509–1537) and in emergency attachments
   (≈L1986–1999, replacing the text-only "مرفق N: image/jpeg").
4. RTL: logical props only; verify both directions.

### Tests
- `backend/tests/integration/test_whatsapp_media_pipeline.py`: webhook w/ image → downloader mocked (Meta 2-step)
  → `WhatsAppMediaFile` stored, inbox API returns media array. Failure path → `download_status=failed`, message not lost.

### Deploy / verify
Migration on VPS (see `docs/VPS_OPERATIONS_GUIDE.md`), backend build, then send a real image to the business number
and confirm it renders in the inbox. Backend + AdminPortal commit separately.

---

## Phase 2 — Departments, Routing Engine & Interactive Menu Bot

**Goal:** inbound conversations are classified and routed to one of 6 department inboxes, via
(1) emergency detection first, (2) interactive list-menu, (3) keyword dictionary, (4) manual fallback —
without disturbing the existing emergency bot. **Touches messaging + routing → tests required.**

### Backend
1. **Models + migration** (`whatsapp_departments_0001`):
   - `departments` (`id, key, name_ar, name_en, color, routing_keywords JSON, is_active, sort`).
     Seed the 6: sales, maintenance, coordination, crm, inventory, exec.
   - `WhatsAppConversationState`: add `department_id FK`, `assigned_user_id FK`, `unassigned_since`.
   - `department_members` (user_id, department_id, role_in_dept) OR reuse `UserPermission` — decide at kickoff.
2. **Routing engine** — `backend/app/whatsapp/services/router.py`, ordered layers:
   1. **Emergency** — reuse existing keyword detection in `webhook.py` (L463) → existing emergency bot. **Unchanged.**
   2. **Open conversation < 24h** → keep same dept + assignee.
   3. **Interactive menu** — send WhatsApp List Message (1–5) on first contact / after 24h silence, using
      `whatsapp_service.send_interactive_message` (already exists for emergency closure). Selection → dept.
   4. **Keyword dictionary** — per-dept `routing_keywords`, editable from settings.
   5. **Fallback** → "unclassified" bucket for coordinator manual routing.
3. **Assignment** — round-robin / least-loaded within dept; `unassigned_since` + timeout alert.
4. **Endpoints** — dept inbox list (filtered by caller's dept perms), transfer-conversation, assign-user,
   settings CRUD for departments/keywords, a "test routing" preview endpoint.
5. **Config decision** — every new menu/template gets an explicit manual-vs-auto mode (CLAUDE.md §6).

### Frontend
- Inbox becomes tabbed by department (color-coded, counters) with filters (mine/team/unassigned/emergency).
- Per-message actions: transfer dept, assign user, tag.
- Settings screens: `/settings/routing` (keyword→dept table + live test), `/settings/bot` (menu editor + phone preview).
- Permission-gated: each user sees only their department(s); supervisor/ops see all (align to §11 matrix).

### Tests
- Router unit tests: emergency-first precedence, 24h-continuation, menu selection, keyword match, fallback.
- Assignment tests: round-robin, timeout escalation.

---

## Phase 3 — Ticket-from-Chat, Asset Linking & Field Loop

**Goal:** link every conversation to customer→building→elevator→contract, create a WorkOrder from a chat in one
click (pre-filled + media attached), and close the loop with automated customer updates. Reuses existing WO/asset models.

### Backend
1. **Conversation ↔ asset resolution** — resolve inbound phone → `Customer`/`Contact`; surface the customer's
   buildings + elevators. Add lightweight `CONTACT` model (guard/building-manager) — currently embedded in
   `Customer`/`Site`; blueprint wants standalone. (Decide: new table vs. reuse embedded fields.)
2. **Elevator QR** — add `Elevator.qr_token` + endpoint that maps a scanned token → prefilled `wa.me` deep link
   carrying elevator code. Migration `elevator_qr_0001`.
3. **Create-ticket-from-conversation** endpoint: builds a `WorkOrder` (type corrective/breakdown) from the
   conversation, attaches its `WhatsAppMediaFile`s as `WorkOrderAttachment`s, links `conversation_id`.
4. **TICKET_EVENT** — new `work_order_events` table (status transitions as discrete timeline rows) —
   currently only broad `AuditLog` exists. Wire lifecycle transitions to emit events.
5. **Automated customer updates** — reuse `lifecycle.py` triggers ("technician en route 🚗" / "fixed ✅") —
   confirm each has an explicit auto/manual mode and creates a `WhatsAppMessage` row.

### Frontend
- Conversation side panel: customer + building + **elevator list w/ status** + contract status + last 5 tickets +
  "🎫 create ticket" button.
- Ticket detail: source-conversation link, timeline (from `work_order_events`), media, spare parts, closure + signature.
- Elevator file: fault history chart + QR generator for cabin sticker.

### Tests
- Create-ticket-from-chat: WO fields + media attachments + conversation link correct.
- `work_order_events` emitted on each transition. Any dispatch-touching change → tests (§9).

---

## Phase 4 — Intelligence & Reporting

**Goal:** proactive automation + operational visibility.

### Backend
1. **Preventive maintenance scheduling** from contract terms (`visits_per_year`) → auto-create PM WorkOrders +
   customer reminder (reuse WO `type=preventive_maintenance`; `MaintenanceVisit` is deprecated per audit).
2. **Contract renewal reminders** — 60/30-day pre-expiry (templates `elms_contract_expiring/_expired` exist;
   confirm scheduler wiring).
3. **CSAT** — new `csat_surveys` table; auto-send ⭐ survey after ticket close (interactive buttons); store responses.
4. **Reporting** — first-response time, SLA compliance, recurring faults per elevator, technician performance, CSAT.
5. **Recurring-fault detection** → alert quality when same elevator repeats (blueprint UC-M8).

### Frontend
- Exec dashboard (KPIs, live P1 alerts), reports screens, CSAT results.

### Tests
- PM auto-scheduling from contract cadence; CSAT send-on-close; report aggregation correctness.

---

## Cross-cutting rules (all phases)
- **Commits:** backend and frontend separate; Conventional Commits describing behavior.
- **RTL:** logical properties only; verify both directions for every UI change.
- **i18n:** no hardcoded Arabic in components — translation files (note VPS build runs clean `tsc`, fails on
  uncommitted i18n keys — see memory `vps-client-repo-deploy-quirks`).
- **Every send path** creates a `WhatsAppMessage` row (auto + manual).
- **Tests mandatory** for anything touching dispatch/alarm/emergency/messaging.
- **Deploy** per CLAUDE.md §8; verify health + real business behavior after each phase.

## Suggested sequencing
Phase 1 ships independently and immediately (highest value, lowest risk). Phase 2 is the largest new subsystem and
should land behind Phase 1. Phases 3–4 build on 2. Each phase = its own backend + frontend commits and its own
VPS deploy + verification gate before the next begins.
