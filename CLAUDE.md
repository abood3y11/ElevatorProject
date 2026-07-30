# ELMS — Elevator Management System
## Claude Code Project Guidelines

> Read this file before starting any task. It encodes how we actually ship ELMS changes end-to-end.
>
> **Authoritative companion file:** [`docs/CODEX_WORKFLOW_PLAYBOOK.md`](docs/CODEX_WORKFLOW_PLAYBOOK.md) — the 13-step engineering process is the source of truth. Claude must follow it on every non-trivial change.

---

## 1. Project Overview

ELMS is a production Elevator Management System with multiple apps in a single repo:

| Folder            | What it is                                  | Stack                              |
| ----------------- | ------------------------------------------- | ---------------------------------- |
| `AdminPortal/`    | Web admin dashboard (operations)            | React + TypeScript + Vite          |
| `backend/`        | API + business logic + WhatsApp integration | Python (FastAPI) + Alembic         |
| `elms-customer/`  | Customer-facing mobile app                  | React Native / Expo                |
| `elms-landing/`   | Public marketing landing page               | Next.js                            |
| `mobile-worker/`  | Field technician mobile app                 | React Native / Expo                |
| `shared/`         | Shared types and utilities                  | TypeScript                         |
| `scripts/`        | Deploy + setup scripts                      | Bash / PowerShell                  |
| `docs/`           | Operations + workflow guides                | Markdown                           |

Infrastructure: `docker-compose.yml` locally; production runs on a VPS (see §8).

---

## 2. The Workflow — Always Follow This

Every meaningful change follows the playbook in `docs/CODEX_WORKFLOW_PLAYBOOK.md`. Short version:

1. **Understand the real operational case** — translate the request into trigger, state change, message behavior, UI result, failure result.
2. **Inspect before editing** — use `rg` to find the existing path, do not invent a parallel one.
3. **Decide the correct flow** explicitly before writing code.
4. **Edit backend first** when state or business rules change.
5. **Edit frontend** only after the backend contract is clear.
6. **Keep manual vs auto modes clear** — every WhatsApp template needs an explicit decision.
7. **Test locally or in container** — backend compile + frontend build + API behavior check.
8. **Commit backend and frontend separately**, message describes behavior, not files.
9. **Deploy backend** to VPS via `/opt/elms/server-ELMS` (`git pull` + `docker compose build api worker`).
10. **Deploy AdminPortal** to VPS via archive to `/opt/elms/client-ELMS`.
11. **Verify production** — health endpoint + container status + real business behavior.
12. **Report back** what changed, where it deployed, what was tested.
13. **Think about the next operational risk** — make operations trust the system more.

If a request touches business logic, state, or messaging — read the full playbook before starting.

---

## 3. Standard Inspection Map (WhatsApp + Work Orders)

For most WhatsApp / work-order tasks, these are the files to read first:

```
backend/app/api/endpoints/customer_messages.py
backend/app/api/endpoints/whatsapp_webhook.py
backend/app/api/endpoints/work_orders.py
backend/app/services/whatsapp_service.py
backend/app/services/work_order_lifecycle.py
AdminPortal/src/pages/customers/WhatsAppMessages.tsx
AdminPortal/src/api/customerMessages.ts
```

Standard search:

```powershell
rg -n "keyword" backend AdminPortal mobile-worker elms-customer
```

---

## 4. Language & Locale

- **Primary UI language:** Arabic (RTL).
- **Secondary:** English (LTR).
- **Code, comments, commit messages, PR titles:** English only.
- **User-facing strings:** must live in translation files. Never hardcode Arabic in components.

### RTL rules

1. Use CSS logical properties: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start|end`.
2. With Tailwind: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`.
3. Directional icons (arrows, chevrons) flip in RTL — `rtl:rotate-180`.
4. Numbers and dates: `Intl.NumberFormat('ar-SA')` and `Intl.DateTimeFormat('ar-SA')`.
5. Verify every visual change in **both** RTL and LTR before marking done.

---

## 5. UI / UX Standards

### Visual design

- Gradients on cards/headers — see palette below.
- Soft shadows on every elevated surface:
  - Default card: `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)`
  - Hover/elevated: `0 10px 15px rgba(0,0,0,0.1)`
- Border radius: 12px cards, 8px inputs/buttons, full on chips.
- Spacing grid: 4px base, prefer multiples of 8px.
- Transitions: `transition: all 0.3s ease`, `translateY(-2px)` on hover.

### Curated gradient themes

```ts
export const gradientThemes = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Royal purple
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink sunset
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Ocean blue
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Forest mint
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Warm sunset
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Deep ocean
];
```

### Accessibility (WCAG 2.1 AA minimum)

- Text contrast ≥ 4.5:1 on any background or gradient.
- Touch targets ≥ 44×44 px on mobile.
- Visible `:focus-visible` outline on every focusable element.
- Every input has a `<label>` or `aria-label`.
- Meaningful icons have `aria-label`; decorative ones have `aria-hidden="true"`.

---

## 6. WhatsApp / Messaging Conventions

These are operationally critical — get them wrong and operations stops trusting the system.

- Every WhatsApp template has an explicit **mode**: manual (shows in `قوائم الإرسال`) or auto (sends after trigger).
- **Auto-send must still create a `WhatsAppMessage` row** — same tracking path as manual.
- Failed auto-send does not disappear; it surfaces for retry/review.
- Maintenance completion uses `elms_service_closed_notice`.
- Emergency completion uses the emergency closure interactive message with buttons (`تم الحل`, `المشكلة مستمرة`, `اتصلوا بي`).
- Sent messages must appear in `تم الإرسال`. Failed or missing phone cases stay in `مراجعة`.

---

## 7. Code Conventions

### Backend (Python / FastAPI)

- Validate every endpoint input with Pydantic models.
- Authorization checks at route AND data-access layer (defense in depth).
- DB schema changes go through Alembic migrations — see `docs/VPS_OPERATIONS_GUIDE.md`.
- Before commit:
  ```powershell
  cd C:\Dev\ElevatorProject\backend
  python -m compileall app
  git diff --check
  ```

### Frontend (TypeScript / React)

- TypeScript strict mode. No `any` — use `unknown` and narrow.
- Imports use path aliases (`@/components`, `@shared/...`), not `../../../`.
- Functional components + hooks only.
- Local state with `useState`/`useReducer`; cross-tree state with Context or Zustand. Do not add Redux.
- Forms: React Hook Form + Zod. Zod schemas live in `shared/`.
- Before commit:
  ```powershell
  cd C:\Dev\ElevatorProject\AdminPortal
  npm.cmd run build
  git diff --check
  ```

---

## 8. Deployment (VPS)

Production VPS: `root@92.113.31.218`.
Backend repo path on server: `/opt/elms/server-ELMS`.
Frontend repo path on server: `/opt/elms/client-ELMS`.
Health URLs: `https://api.hensline.com/api/v1/health`, `https://admin.hensline.com`.

### Deploy backend

```powershell
ssh root@92.113.31.218 "set -e; cd /opt/elms/server-ELMS; git pull --ff-only; cd /opt/elms; docker compose build api worker; docker compose up -d api worker; sleep 8; curl -fsS http://127.0.0.1:8000/api/v1/health"
```

### Deploy AdminPortal (archive-based)

```powershell
cd C:\Dev\ElevatorProject\AdminPortal
git archive --format=tar -o C:\Dev\ElevatorProject\admin-release.tar HEAD
scp C:\Dev\ElevatorProject\admin-release.tar root@92.113.31.218:/tmp/client-ELMS-release.tar
ssh root@92.113.31.218 "set -e; rm -rf /tmp/client-ELMS-release; mkdir -p /tmp/client-ELMS-release; tar -xf /tmp/client-ELMS-release.tar -C /tmp/client-ELMS-release; cd /opt/elms/client-ELMS; find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .env ! -name node_modules -exec rm -rf {} +; cp -a /tmp/client-ELMS-release/. /opt/elms/client-ELMS/; cd /opt/elms; docker compose build web; docker compose up -d web; sleep 5; docker compose ps web"
```

### Verify production

```powershell
curl.exe -fsS https://api.hensline.com/api/v1/health
curl.exe -I -sS https://admin.hensline.com
ssh root@92.113.31.218 "cd /opt/elms; docker compose ps api worker web"
```

If a migration is needed, see `docs/VPS_OPERATIONS_GUIDE.md` before restarting services.

---

## 9. Testing & Quality Bar

For an elevator system, bugs can strand people in cabins. Treat every change accordingly.

- Backend changes touching dispatch, alarm, emergency, or messaging logic require tests in the same PR.
- For safety-critical backend logic: **TDD** — write the failing test first (`tdd-guide` skill).
- Backend compile must pass: `python -m compileall app`.
- Frontend production build must pass: `npm.cmd run build`.
- Verify the API response matches the intended tab/state behavior before deploying.

---

## 10. Git Workflow

- Backend and frontend commits are **separate** — different folders, different `git` invocations.
- Conventional Commits: `feat(admin): ...`, `fix(backend): ...`, `chore: ...`.
- Commit messages describe **behavior**, not files. Bad: `update file.py`. Good: `track emergency closure messages in تم الإرسال`.
- PRs are small, focused, with screenshots for any UI change (both RTL and LTR if visual).

---

## 11. Final Report Format

After shipping, Claude reports in this shape (Arabic acceptable for the summary, English for IDs):

```text
تم التنفيذ والنشر.
Backend: <commit-sha>
AdminPortal: <commit-sha>
اختبرت على <رقم>، النتيجة: <ما حصل>.
ملاحظات: <أي شيء لم يُختبر أو متبقي>.
```

---

## 12. Which Skill to Use When

Skills are installed in `~/.claude/skills/` via `scripts/install-skills.sh` (or `.ps1`). Claude Code picks the right one automatically, but this is the map:

| Task                                              | Skill                  |
| ------------------------------------------------- | ---------------------- |
| New page/component, styling, RTL, accessibility   | `senior-frontend`      |
| FastAPI endpoint, service logic, Alembic          | `senior-backend`       |
| Cross-stack feature touching FE + BE              | `senior-fullstack`     |
| New module, system diagram, scaling decisions     | `senior-architect`     |
| Writing tests, test strategy                      | `senior-qa`            |
| Safety-critical logic (dispatch, emergency, alarms) | `tdd-guide`          |
| Dockerfile, CI/CD, VPS deploy issue               | `senior-devops`        |
| Auth, secrets, vulnerability fix                  | `senior-security`      |
| PR review, refactor suggestions                   | `code-reviewer`        |
| Second-opinion review on a risky change           | `adversarial-reviewer` |
| Production outage, post-mortem                    | `incident-response`    |
| Design system, component library consistency      | `epic-design`          |

---

## 13. Hard Don'ts

- Don't skip steps 1–3 of the playbook ("understand → inspect → decide").
- Don't edit frontend before the backend contract is clear when state changes.
- Don't add a new WhatsApp send path without creating a `WhatsAppMessage` row.
- Don't hardcode Arabic user-facing strings.
- Don't use `margin-left`/`right` — use logical properties.
- Don't ship UI changes without verifying RTL.
- Don't merge backend changes to dispatch/alarm/emergency without tests.
- Don't commit secrets, `.env` files, or build artifacts.
- Don't combine backend + frontend changes in a single commit.

---

## 14. When in Doubt

Stop and ask the user one focused question rather than guess on architecture, business rules, or anything safety- or operations-related. Operations trusting the system is the top priority.
