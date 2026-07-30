# Codex Workflow Playbook

This file documents the practical way we handle ELMS changes end to end: how we think through a request, make the change, test it, push it to GitHub, deploy it to the VPS, and verify production.

It is not private chain-of-thought. It is the repeatable engineering process and decision checklist we can reuse.

## 1. Understand The Real Case

Start by translating the request into the real operational case.

Example:

- User says: completed emergency should not send normal maintenance message.
- System meaning: normal maintenance and emergency breakdown have different customer communication flows.
- Required behavior:
  - Maintenance completion uses `elms_service_closed_notice`.
  - Emergency completion uses an emergency closure message with buttons.
  - Sent messages must appear in `تم الإرسال`.
  - Failed or missing phone cases must stay in review.

Before editing, identify:

- Which app is affected: backend, AdminPortal, worker app, customer app, or mobile-worker.
- Which actor triggers the change: technician, operations/admin, customer WhatsApp reply, webhook, scheduler, or auto-send.
- Which state must move: work order status, WhatsApp message status, emergency report status, or UI tab.
- Which production result proves the fix worked.

## 2. Inspect Before Editing

Use fast search first.

```powershell
rg -n "keyword" backend AdminPortal mobile-worker elms-customer
```

For WhatsApp/work-order work, usually inspect:

- `backend/app/api/endpoints/customer_messages.py`
- `backend/app/api/endpoints/whatsapp_webhook.py`
- `backend/app/api/endpoints/work_orders.py`
- `backend/app/services/whatsapp_service.py`
- `backend/app/services/work_order_lifecycle.py`
- `AdminPortal/src/pages/customers/WhatsAppMessages.tsx`
- `AdminPortal/src/api/customerMessages.ts`

The goal is to find the current system path, not invent a parallel path.

## 3. Decide The Correct Flow

For every case, define:

- Trigger: what starts the flow.
- State change: what database/status change happens.
- Message behavior: manual review or auto-send.
- UI result: where it appears.
- Failure result: where it stays if sending fails.

Example for completed work orders:

- Normal maintenance completed:
  - Trigger: technician finishes normal work order.
  - Message: `elms_service_closed_notice`.
  - UI: appears in `قوائم الإرسال`.
  - Sent result: moves to `تم الإرسال`.

- Emergency completed:
  - Trigger: technician finishes emergency work order.
  - Message: emergency closure interactive message.
  - Buttons: `تم الحل`, `المشكلة مستمرة`, `اتصلوا بي`.
  - Customer says problem continues: open follow-up or return the report to emergency review.
  - Failed/missing phone: stay in `مراجعة`.

## 4. Edit Backend First When State Or Rules Change

Backend owns truth:

- Which work orders match a template.
- Which templates are allowed for normal maintenance vs emergency.
- How messages are stored.
- How delivery/read status is tracked.
- How webhook replies update emergency state.

Typical backend checks:

```powershell
cd C:\Dev\ElevatorProject\backend
python -m compileall app
git diff --check
```

If database schema changes are needed:

- Read `docs/VPS_OPERATIONS_GUIDE.md`.
- Add an Alembic migration.
- Test migration locally or against the intended environment.
- Deploy migration on the VPS before restarting app services.

## 5. Edit Frontend After Backend Contract Is Clear

Frontend should show operations what is really happening.

For WhatsApp pages, check:

- Tabs: `للإرسال`, `مراجعة`, `تم الإرسال`, `الكل`.
- Counts: ready, failed/review, sent.
- Actions: send selected, retry failed, clear selection, select all.
- Badges: manual/auto, sent/read/failed, missing phone.
- Empty states: no matching rows should be clear.

Typical frontend checks:

```powershell
cd C:\Dev\ElevatorProject\AdminPortal
npm.cmd run build
git diff --check
```

## 6. Keep Manual And Auto Clear

For every WhatsApp template, decide:

- Manual mode: show in `قوائم الإرسال` for operations review.
- Auto mode: send immediately after the trigger.
- Both modes: store the outbound message so it appears in `تم الإرسال` and `المحادثات`.

Important:

- Auto-send must still create a `WhatsAppMessage` row.
- Manual send must use the same tracking path as auto-send where possible.
- Failed auto-send should not disappear; it should be visible for retry/review.

## 7. Test Locally Or In Container

Minimum test set:

- Backend compile passes.
- Frontend production build passes.
- API response matches the intended tab behavior.
- Message storage has correct `template_name`, status, phone, and work order id.

For production-style API checks, run scripts inside the API container:

```powershell
$code = @'
print("test script here")
'@
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($code))
$remote = "cd /opt/elms; docker compose exec -T -e CODE=$encoded api python -c 'import os,base64; exec(base64.b64decode(os.environ[chr(67)+chr(79)+chr(68)+chr(69)]).decode())'"
ssh root@92.113.31.218 $remote
```

When testing against a real conversation, prefer snapshot/restore if touching bot state.

## 8. Commit With A Focused Message

Commit backend and frontend separately when both changed.

Backend:

```powershell
cd C:\Dev\ElevatorProject\backend
git status --short
git add app/path/file.py
git commit -m "Short backend behavior summary"
git push
```

AdminPortal:

```powershell
cd C:\Dev\ElevatorProject\AdminPortal
git status --short
git add src/path/file.tsx
git commit -m "Short frontend behavior summary"
git push
```

Use commit messages that describe behavior, not only files.

## 9. Deploy Backend To VPS

Backend repo on server:

```bash
/opt/elms/server-ELMS
```

Deploy:

```powershell
ssh root@92.113.31.218 "set -e; cd /opt/elms/server-ELMS; git pull --ff-only; cd /opt/elms; docker compose build api worker; docker compose up -d api worker; sleep 8; curl -fsS http://127.0.0.1:8000/api/v1/health"
```

If migrations exist, run Alembic according to `docs/VPS_OPERATIONS_GUIDE.md` before or during this deploy, depending on compatibility.

## 10. Deploy AdminPortal To VPS

Frontend repo on server:

```bash
/opt/elms/client-ELMS
```

Because the frontend server may not pull directly, deploy an archive from the local committed source:

```powershell
cd C:\Dev\ElevatorProject\AdminPortal
git archive --format=tar -o C:\Dev\ElevatorProject\admin-release.tar HEAD
scp C:\Dev\ElevatorProject\admin-release.tar root@92.113.31.218:/tmp/client-ELMS-release.tar
ssh root@92.113.31.218 "set -e; rm -rf /tmp/client-ELMS-release; mkdir -p /tmp/client-ELMS-release; tar -xf /tmp/client-ELMS-release.tar -C /tmp/client-ELMS-release; cd /opt/elms/client-ELMS; find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .env ! -name node_modules -exec rm -rf {} +; cp -a /tmp/client-ELMS-release/. /opt/elms/client-ELMS/; cd /opt/elms; docker compose build web; docker compose up -d web; sleep 5; docker compose ps web"
```

## 11. Verify Production

Always verify the services:

```powershell
curl.exe -fsS https://api.hensline.com/api/v1/health
curl.exe -I -sS https://admin.hensline.com
ssh root@92.113.31.218 "cd /opt/elms; docker compose ps api worker web"
```

Then verify the actual business behavior.

Examples:

- Send-list:
  - Ready item appears in `للإرسال`.
  - Failed/missing phone item appears in `مراجعة`.
  - Sent item appears in `تم الإرسال`.

- WhatsApp:
  - Meta returns success.
  - `WhatsAppMessage` is stored.
  - Conversation tab shows the outbound message.
  - Delivery/read webhook updates badges.

- Emergency:
  - Emergency close sends interactive message.
  - `تم الحل` confirms closure.
  - `المشكلة مستمرة` opens follow-up or operations review.
  - `اتصلوا بي` flags operations call request.

## 12. Report Back To The User

Final update should include:

- What changed.
- Where it was deployed.
- What was tested.
- Real phone/work-order test result if used.
- Commits.
- Anything not tested or blocked.

Example:

```text
تم التنفيذ والنشر.
Backend: abc1234
AdminPortal: def5678
اختبرت على 0510488958، الإرسال نجح وظهر في تم الإرسال.
```

## 13. Good Next-Step Thinking

After each shipped fix, ask what operational risk remains.

Common next cases:

- Missing phone handling.
- Failed send retry.
- Customer reply after closure.
- Duplicate emergency reports.
- Technician workflow after emergency follow-up.
- Contract active/expired/no-contract badges.
- Reports and exports for operations.

The best next step is usually the one that makes operations trust the system more: clearer status, better retry, stronger audit trail, and fewer hidden failures.
