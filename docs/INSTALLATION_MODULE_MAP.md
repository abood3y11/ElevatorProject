# Installation Module Map (قسم التركيبات)

> Reference analysis of how the installation section works end-to-end: data model, API,
> business rules, UI, and every cross-module link. Written 2026-08-01 against `main`.
>
> Companion docs: [`FINANCE_MODULE_MAP.md`](FINANCE_MODULE_MAP.md),
> [`SALES_WORKFLOW.md`](SALES_WORKFLOW.md), [`CODEX_WORKFLOW_PLAYBOOK.md`](CODEX_WORKFLOW_PLAYBOOK.md).

---

## 1. What the module is

The installation section tracks the delivery of a **new elevator** from a signed
installation contract to a closed, handed-over project. It is a three-level structure:

```
Contract (contract_type = "installation")
  └── InstallationProject          (1:1 with the contract — one project per contract)
        ├── InstallationTask[]     (tree: "section" headers + executable "task" rows)
        │     └── WorkOrder        (0..1 — the field ticket the technician actually executes)
        └── InstallationInspection[]  (phase / safety / final inspections)
```

Two things drive everything else:

1. **Progress is derived, never entered.** `progress_percentage` = completed executable
   tasks ÷ total executable tasks. Section headers are excluded from both.
2. **Field execution happens in the work-order system, not here.** An installation task
   only becomes real work when it is *dispatched*, which creates a `WorkOrder` of
   `work_type = "installation"`. The technician works that work order in the worker app;
   its start/completion syncs back into the task and the project.

---

## 2. File map

| Layer | Path |
| --- | --- |
| Backend model | `backend/app/installations/model.py` |
| Backend schemas | `backend/app/installations/schema.py` |
| Backend repository | `backend/app/installations/repository.py` |
| Backend controller (all endpoints) | `backend/app/installations/controller.py` |
| Router mount | `backend/app/api/router.py:130`, `:239` → `/api/v1/installations` |
| WO ↔ task sync | `backend/app/work_orders/services/lifecycle.py:56-158` |
| WO creation | `backend/app/work_orders/services/crud.py:143-187` |
| Technician eligibility | `backend/app/work_orders/services/field_eligibility.py` |
| Sales → project materialization | `backend/app/sales/services.py:84-217` |
| Customer-facing payloads | `backend/app/customers/controllers/portal.py:309-646` |
| Customer finance rollup | `backend/app/customers/service.py:85-217` |
| AdminPortal pages | `AdminPortal/src/pages/installations/` |
| AdminPortal API client | `AdminPortal/src/api/index.ts:1264-1305` |
| AdminPortal types | `AdminPortal/src/types/index.ts:1889-1987`, `:2119-2153` |
| Worker app | `mobile-worker/src/screens/workstation/installation/`, `src/screens/visits/installationDetailConfig.ts` |
| Customer app | `elms-customer/src/screens/elevators/InstallationMonitoringScreen.tsx` |

---

## 3. Data model

### 3.1 `installation_projects` — `model.py:12-74`

| Column | Notes |
| --- | --- |
| `id` | GUID PK |
| `contract_id` | FK `contracts.id` **SET NULL**, nullable in DB but **required by the API** |
| `customer_id` | FK `customers.id` **CASCADE**, NOT NULL, indexed |
| `site_id` | FK `sites.id` **CASCADE**, NOT NULL, indexed |
| `elevator_id` | FK `elevators.id` **SET NULL** — the elevator being installed |
| `project_code` | unique, NOT NULL, indexed (`INST-PRJ-*` from the UI, `INST-{request_number}` from sales) |
| `project_name`, `description`, `notes` | free text |
| `status` | NOT NULL, default `design`, indexed. **No enum/constraint** |
| `progress_percentage` | Integer, derived (see §5.1) |
| `planned_start_date` / `planned_end_date` / `actual_start_date` / `actual_end_date` | Date |
| `supervisor_id` | FK `users.id` SET NULL |
| `project_manager_id` | FK `users.id` SET NULL — **dead column**, no schema or endpoint reads/writes it |

Relations: `contract`, `customer`, `site`, `elevator`, `tasks` (**delete-orphan**),
`inspections` (**delete-orphan**).

### 3.2 `installation_tasks` — `model.py:77-127`

`installation_project_id` (CASCADE, indexed) · `name` · `description` · `phase` (free text) ·
`task_kind` (`task` | `section`, default `task`) · `parent_task_id` (self-FK, CASCADE) ·
`order_index` · 4 dates · `planned_cost` / `actual_cost` `Numeric(12,2)` / `currency` ·
`status` (`pending` | `in_progress` | `completed` | `blocked`, default `pending`) ·
`blocking_reason` · `assigned_team_id` (FK `technician_teams.id`, SET NULL).

The link to the field ticket lives on the **work-order** side:
`WorkOrder.related_installation_task_id` (`work_orders/models/work_order.py:111`,
ON DELETE SET NULL), exposed as a one-to-one via `InstallationTask.work_order`
(`model.py:122`). Deleting a task therefore nullifies the link and leaves the work order
in place.

### 3.3 `installation_inspections` — `model.py:130-170`

`installation_project_id` (CASCADE) · `elevator_id` (SET NULL) · `inspection_type` NOT NULL ·
`inspector_name` NOT NULL · `inspector_company` · `inspector_license_number` ·
`inspection_date` NOT NULL · `result` NOT NULL (`pending` | `pass` | `conditional_pass` | `fail`) ·
`issues_summary` · `recommendations` · `report_file_url` · `next_inspection_due_date` ·
`corrective_actions_required`.

> `inspector_license_number`, `recommendations`, and `corrective_actions_required` appear in
> **no Pydantic schema** — they are write-never columns today.

### 3.4 Migrations

The three tables have **no `op.create_table` migration** — they exist only through
`Base.metadata.create_all` in `00000000000_initial_schema.py:52-64`, which no-ops on an
already-provisioned database. Only two later migrations touch them:

| Revision | Adds |
| --- | --- |
| `e5f6a7b8c9d0_add_financial_fields_to_installation_tasks` | `planned_cost`, `actual_cost`, `currency` (NOT NULL + server defaults) |
| `fa0b1c2d3e4_add_hierarchy_fields_to_installation_tasks` | `task_kind`, `parent_task_id` + index + self-FK (CASCADE) |

Both are idempotent (`_has_column` / `_has_index` / `_has_fk` guards).
Note the divergence: those 3 financial columns are `nullable=True` in the model but
`nullable=False` in the migration, so a `create_all` database and a migrated database differ.

---

## 4. API surface — `/api/v1/installations`

| # | Endpoint | Gate | What it does |
| --- | --- | --- | --- |
| 1 | `GET /projects` | `require_operations` | Paginated list (`skip`/`limit`/`status`/`customer_id`). **Writes**: recomputes progress + status for every row and forces `contract.status="active"`, then commits (`controller.py:309-327`) |
| 2 | `POST /projects` | `require_operations` | Creates a project. Full validation chain (§5.4); sets elevator to `under_installation`; forces contract `active`; 201 |
| 3 | `GET /projects/{id}` | `require_operations` | Detail: project + customer/site/elevator denormalized fields + tasks + inspections. Recomputes progress **in memory**, commits only if the contract status changed |
| 4 | `GET /projects/{id}/timeline` | `require_operations` | Unified audit feed over project + tasks + inspections + their work orders, newest first, hard `LIMIT 300`. No `response_model` |
| 5 | `PUT /projects/{id}` | `require_operations` | Update. Enforces the handover gate when the result is `closed`; flips elevator status; re-syncs progress |
| 6 | `POST /projects/{id}/tasks` | `require_supervisor` | Adds a task or section. Auto `order_index = max+1`. Returns 200 |
| 7 | `PUT /tasks/{id}` | `require_supervisor` | Update. Auto-stamps actual dates; **propagates team / dates / description onto the linked work order** and marks a reschedule |
| 8 | `DELETE /tasks/{id}` | `require_supervisor` | Deletes the task; children cascade |
| 9 | `POST /tasks/{id}/dispatch` | `require_supervisor` | **The key endpoint** — creates or updates the field work order (§6) |
| 10 | `POST /projects/{id}/inspections` | `require_supervisor` | Adds an inspection; defaults `phase_review` / `بانتظار التعيين` / `pending`. Returns 200 |
| 11 | `PUT /inspections/{id}` | `require_supervisor` | Update result / notes / report URL / next due date |
| 12 | `DELETE /inspections/{id}` | `require_supervisor` | Delete |

**There is no `DELETE /projects/{id}`** and no read-only "is this project ready for
handover?" endpoint — blockers are only visible as the body of a `400` from endpoint 5.

---

## 5. Business rules

### 5.1 Progress — `controller.py:51-56`

```
executable = tasks where task_kind != "section"
progress   = round(completed / total * 100)   # 0 when there are no executable tasks
```

Unweighted by cost, duration, or tree depth. Recomputed by
`_sync_project_progress` (`controller.py:175-203`) and, on the work-order side, by
`_recalculate_installation_project_progress` (`lifecycle.py:93-119`).

### 5.2 Automatic stage advance — `controller.py:136-203`

Task `phase` maps to a project stage:

| Task phase | Project stage |
| --- | --- |
| `civil_works`, `shaft_preparation`, `guide_rails`, `machine`, `cabin_installation`, `door_installation`, `wiring` | `installation` |
| `testing` | `testing` |
| `inspection` | `inspection` |
| `handover` | `handover` |
| anything else | *no change* |

The project status is ratcheted to the highest stage implied by any task in
`in_progress` / `completed` / `blocked`, using the rank order
`design → manufacturing → shipping → installation → testing → inspection → handover → closed`.
**The ratchet only moves forward.** Then, unconditionally: if progress hits 100 % and the
status is not `closed`, the status is forced to `handover`.

Consequences worth knowing:

- `manufacturing` and `shipping` can never be reached automatically — only by a manual `PUT`.
- A project at 100 % progress cannot be manually parked at any other status: the sync at the
  end of `PUT` overwrites the submitted value with `handover`, silently and without an error.

### 5.3 Handover / close gate — `controller.py:59-97`, enforced at `:621-632`

`PUT` with `status = "closed"` is rejected with a structured 400
(`{message, blockers: [...]}`) unless **all** of the following hold:

1. the project has at least one executable task
2. every executable task is `completed`
3. no task is `blocked`
4. no inspection has `result = "fail"`
5. no inspection is still `pending` (empty result counts as pending)
6. the project is linked to an elevator
7. progress is 100 %

On success the project gets `actual_end_date = today` and the linked elevator flips to
`in_service`. Note the gate fires **only** on `closed` — `handover` is set automatically and
can also be set manually with zero validation.

### 5.4 Creation guards — `controller.py:342-372`

`project_code` non-empty → code unique → site exists → site belongs to the customer →
contract present and not already used by another project → contract exists → contract
customer + site match → `contract_type == "installation"` → (if given) elevator exists,
belongs to the site, and is currently `under_installation`.

Planned dates default to the contract's `start_date` / `end_date`.

### 5.5 Elevator coupling — `controller.py:275-282`, `:371`, `:634-637`

- An elevator can only be **linked** if its status is already `under_installation`.
- Creating a project with an elevator sets it to `under_installation`.
- **Every** project update rewrites the linked elevator's status:
  `in_service` when the project is `closed`, otherwise `under_installation`.
- Unlinking or switching the elevator never resets the *previous* elevator, and nothing stops
  two projects from claiming the same elevator (unlike contracts, which are guarded).

### 5.6 Audit + timeline

Nine call sites write `AuditLog` rows under `installation_projects`, `installation_tasks`,
`installation_inspections` (`CREATE` / `UPDATE` / `DELETE` / `DISPATCH`). Only `DISPATCH`
carries a payload; the other eight pass no `old_value`/`new_value`/`description`, so the
timeline shows *that* something changed but not *what*. The `/timeline` endpoint ORs four
`(entity_name, entity_id)` filters — project, its tasks, its inspections, and the work orders
those tasks point at — joins the actor, and returns up to 300 events.

---

## 6. Task → field work: the dispatch path

`POST /installations/tasks/{task_id}/dispatch` (`controller.py:774-885`).

**Rejects when:** the task is missing · the task is a `section` · the project is missing ·
`scheduled_end <= scheduled_start` · the given team does not exist ·
**the project has no linked elevator** · the assignment itself fails eligibility.

**Creates** (`WorkOrderService.create_work_order`, `work_type="installation"`):
elevator / site / customer / contract are copied from the **project**; schedule, priority,
team, technician come from the request; the title defaults to `تركيب - {task.name}` and the
description falls back task → project description → project notes. The link is
`related_installation_task_id`. New work orders start as `scheduled`.

**Updates** (re-dispatch): re-copies the same fields, calls `mark_rescheduled`
(`_shared/codes.py:361-390` — day-level moves only, hour shifts do not count) *before*
overwriting the dates so the connected code gets its `S` marker, then rewrites the schedule.
It does **not** reset a terminal status, so re-dispatching a completed/cancelled work order
leaves it terminal.

**Sync back** (`lifecycle.py`):

| Trigger | Effect on the task | Effect on the project |
| --- | --- | --- |
| `POST /work-orders/{id}/start` → `_sync_installation_task_start:121` | `in_progress` (unless already completed), stamps `actual_start_date` | stamps `actual_start_date`, ratchets stage forward |
| `POST /work-orders/{id}/complete` → `_sync_installation_task_completion:139` | `completed`, stamps actual dates, clears `blocking_reason` | ratchets stage, recomputes progress, forces `handover` at 100 % |

**Transitions that do *not* sync back** — worth knowing before trusting the board:

- `POST /work-orders/{id}/status` (the technician wizard, including `completed`, `cancelled`,
  `on_hold`, and the «رجوع خطوة» step-back) — `work_orders.py:3254-3413`.
- `PATCH /work-orders/{id}/status` (operations) — `work_orders.py:3462-3560`.
- `assign` / `reassign` sync the maintenance visit but never the installation task.
- Because the ratchet is one-way, a cancelled or reopened work order leaves both the task
  status and the project stage inflated.

**Eligibility** (`field_eligibility.py`): installation and modernization work require the
`technician_installation` role (admins bypass); `technician_type = "none"` is always rejected.
This is checked inside `assign_work_order` **only when a `technician_id` is supplied** — a
team-only dispatch does not run the capability check, and every member of that team then sees
the ticket in `/work-orders/my-tasks`.

---

## 7. AdminPortal UI

### 7.1 Routes and menu

| Route | Page |
| --- | --- |
| `/installations`, `/installations/projects` | `InstallationProjects` |
| `/installations/dashboard` | `InstallationDashboard` |
| `/installations/operations` | `InstallationOperationsWorkbench` |
| `/installations/finance` | `InstallationPaymentsFinance` |
| `/installations/handover` | `InstallationHandover` |
| `/installations/:id` | `InstallationProjectDetail` (lazy) |
| `/installations/phases`, `/teams`, `/inspections`, `/schedule` | → redirect to `/installations/operations` |
| `/installations/sales-requests` | → redirect to `/sales` |

The sidebar declares 9 children but `normalizedNavItems` (`Sidebar.tsx:311-331`) replaces them
with exactly 5: لوحة التركيبات · مشاريع التركيب · تشغيل التركيبات · الدفعات والمالية · التسليم والأرشيف.

### 7.2 Pages

**لوحة التركيبات — `InstallationDashboard.tsx`.** Active / overdue / completed / blocked
counters, average progress, and the 5 projects needing attention (overdue first, then lowest
progress). The quick-link rail still points at three redirect routes, so 3 of its 4 cards land
on the same workbench.

**مشاريع التركيب — `InstallationProjects.tsx`.** The only server-paginated screen
(`skip`/`limit`/`status`, status mirrored into `?status=`). Four summary cards (total,
elevators under installation, in preparation, average progress — all but *total* computed from
the current page only), a data table, and «إنشاء مشروع» which opens the project form dialog and
navigates to the new project on success.

**تشغيل التركيبات — `InstallationOperationsWorkbench.tsx`.** The merged operations screen with
four tabs over the same in-memory task set: **المراحل والمهام** (all tasks, filtered by status
and phase), **جدول التركيبات** (non-completed sorted by planned end date), **الفرق والتوزيع**
(per installation team, active task count + first 4 tasks), **الفحوصات** (with a one-click
«اعتماد الفحص» that PUTs `result: "pass"`). Every task card offers «تعيين فريق» and
«إرسال للفني / تحديث للفني».

**الدفعات والمالية — `InstallationPaymentsFinance.tsx`.** Read-only. Planned vs actual vs
variance across all task costs, then a per-project card broken down by phase. There is no
payment/invoice object here — "الدفعات" means the batch/phase cost rows on the tasks.

**التسليم والأرشيف — `InstallationHandover.tsx`.** The only consumer that loads delivered
projects. Filters `قيد التسليم / جاهزة / تحتاج إجراء / تم تسليمها / الكل`, each project
annotated with open tasks, failed inspections, and pending inspections. Approval itself is
**not** here — it lives on the project page.

**ملف المشروع — `InstallationProjectDetail.tsx`** (2 564 lines, the heart of the module):

1. Header actions: «اعتماد التسليم» (hidden once closed), «تعديل المشروع», «العودة للقائمة».
2. Hero card with progress and cross-navigation to the customer file, the customer's sites, and
   the site's elevators.
3. 8-phase stepper.
4. **سجل النشاط** — the `/timeline` audit feed (action, actor, entity, timestamp).
5. معلومات المشروع — customer, supervisor, site, contact, portfolio counts, linked elevator, schedule.
6. ملخص التنفيذ — total / completed / in progress / dispatched tasks.
7. الملخص المالي — planned, actual, remaining, per phase.
8. فرق المشروع — per assigned team with members, task and work-order counts, and «إدارة الفريق»
   (change leader, add/remove member; the UI caps an installation team at **2 members**).
9. التسلسل التنفيذي للمراحل — the execution timeline with filters (all / متأخرة / لها مستندات /
   بلا صور), per-stage work-order link, image and document upload (uploads attach to the
   **linked work order**, so a stage with no work order refuses the upload), and inspection
   report links.
10. مهام المشروع — the recursive task tree with «إضافة قالب دفعات» and «إضافة يدوية».
11. الفحوصات — add / edit / delete.

Two handlers deserve attention:

- **`handleApproveHandover`** — runs the 6-point client checklist, then `PUT status=closed` with
  `actual_end_date` and an appended Arabic note. It specially unwraps the server's
  `detail.blockers` array into a multi-line toast, so backend-only blockers stay visible.
- **`handleCreateTaskTemplate`** — the batch template generator. In `batched` mode it creates a
  `section` row per selected batch (الدفعة الأولى … الدفعة النهائية) and one task per selected
  phase underneath it; in `direct` mode it creates the phase tasks directly. With
  «إنشاء فحوصات» on, it also creates one `pending` inspection per phase. It de-duplicates against
  existing rows by `parent|kind|phase|name` and `elevatorId|type`, and issues **one HTTP request
  per row** — there is no bulk endpoint.

### 7.3 Shared layer and its cost

`useInstallationOperations` (`InstallationOperationsShared.tsx:70-152`) powers the dashboard,
workbench, finance, and handover pages. It:

1. pages through the entire project list at 100/page, then
2. fires **up to 80 parallel `getProjectById` calls** (`detailLimit = 80`), each with a silent
   `.catch(() => null)`.

Projects beyond index 80 appear in the list but contribute no tasks or inspections, so
task/inspection statistics silently under-count on large datasets. `staleTime` is 30 s and the
query key does not include `includeDelivered`, so all four pages share one cache.

`presentation.ts` holds the label/colour maps, the 8 project statuses, the 11 task phases, the
6 batch templates, and a ~25-entry phase alias table that normalizes historical spellings
(`rails` → `guide_rails`, `other` → `unassigned`, …).

### 7.4 Dead code in this folder

Zero importers, zero routes: `InstallationPhasesTasks.tsx`, `InstallationTeamsDistribution.tsx`,
`InstallationInspections.tsx`, `InstallationSchedule.tsx`, `InstallationContractRequests.tsx`.
They are the pre-workbench pages, superseded by `/installations/operations`.

`ContractWizard.tsx` is **not** dead — it physically lives here but is owned and rendered by
`pages/sales/SalesRequests.tsx`.

Also dead: the `{false && …}` legacy task-card block inside `InstallationProjectDetail.tsx`
(~160 lines), the overwritten sidebar children, and `useInstallationTaskActions.updateTaskStatus`
(exported, never called).

---

## 8. Cross-module integration

### 8.1 Sales → installation (how a project is born)

Projects are created two ways:

1. **Automatically from sales.** `POST /api/v1/technicians/sales/contract-requests/{id}/build-contract`
   (`technicians/controllers/sales.py:828`) calls `materialize_contract_from_request`
   (`sales/services.py:84`). For a non-maintenance request it creates the `Contract`
   (`status="draft"`, number `CON{customer}-{site}-{seq}`) **and** an `InstallationProject`
   (`status="design"`, code `INST-{request_number}`, dates copied from the contract). The
   request must be in `approved_working`, and the caller must be admin / operations_manager /
   sales_manager. It is idempotent three ways: the controller short-circuits on
   `request.contract_id`, the service returns any already-linked contract, and it adopts an
   existing contract for the same site+type.
2. **Manually in the portal.** «إنشاء مشروع» on the projects page, which requires an existing
   installation contract that no other project uses.

### 8.2 Contracts

`contract_type` must be `installation`; the contract's customer and site must match the
project's. One project per contract, enforced in Python only (no unique index).

The installation controller **forces `Contract.status = "active"`** in four places — on create,
on update when the contract changes, and on *both* read endpoints. Net effect: a contract that
sales left as `draft` becomes `active` the first time anyone opens the installations list.

### 8.3 Elevators

`under_installation` is the gateway status: an elevator must already be in it to be linked, and
closing the project moves it to `in_service`. See §5.5 for the full coupling and its gaps.

### 8.4 Teams and the competition board

Installation teams are `TechnicianTeam.team_type ∈ {installation, both}`, and an installation
team only accepts technicians whose `technician_type` is `installation` or `both`
(`technicians/controllers/teams.py:58-70`).

The «لوحة المنافسة» installation league (`technicians/controllers/leaderboard.py:122-132`) scores
**work orders**, not installation tasks — types `installation`, `installation_task`,
`inspection`, `inspection_support`. So installation work only earns points once it has been
dispatched. The installation rule set deliberately excludes the emergency bonus.

### 8.5 Finance and the customer file

`GET /customer-admin/{customer_id}/finance` (`customers/service.py:85-166`) sums
`planned_cost` and `actual_cost` across all non-section tasks of the customer's projects, and
`PUT .../finance/installation-tasks/{task_id}` lets finance edit those amounts in place
(rejecting section rows). In the summary math, **installation planned cost is treated as
billable and installation actual cost as money received**, while the installation contract's
`total_value` is excluded from the grand total — worth confirming against how operations reads
that screen.

In the customer dialog: **FinanceTab** edits the task amounts; **InstallationTab** is a
read-only project/phase view that reads the installations endpoints directly.

### 8.6 Customer-facing (elms-customer)

`GET /api/v1/customer/elevators` returns a compact `installationOverview` plus
`activeInstallationCount` / `hasActiveInstallation`; `GET /api/v1/customer/elevators/{id}` is the
only endpoint returning the full tree — phase summaries with per-task status, team names and
member names, planned/actual cost, and the linked work-order number. Only **active** projects
(`status != "closed"`) are exposed. The customer app renders this in
`InstallationMonitoringScreen`.

### 8.7 Worker app (mobile-worker)

`InstallationTasksScreen` does **not** call any `/installations/*` endpoint. It fetches
`GET /work-orders/my-tasks?days_ahead=30` and filters client-side for
`visit_type === "installation"`. Visibility is gated by `canAccessInstallationTasks`
(technician type `installation`/`both`, or roles `technician_installation`,
`installation_supervisor`, `operations_manager`, `admin`) — a **wider** set than the backend's
`technician_installation`.

Opening a task loads `GET /work-orders/{id}`, which carries the nested `installationProject`
and `installationTask`. The detail screen relabels the whole action wizard for installation
(استلام المهمة / وصلت للموقع / بدء التنفيذ / إنهاء المهمة) and picks a **per-phase checklist** from
`installationDetailConfig.ts` — 10 phase-specific 5-item lists (civil works, shaft, rails,
machine, cabin, doors, wiring, testing, inspection, handover) with a generic 5-item fallback.

Completion posts to `/work-orders/{id}/complete`, which is the path that syncs back into the
task. Intermediate status moves post to `/work-orders/{id}/status`, which does not.

### 8.8 Admin dashboard — broken counter

`backend/app/dashboard/repository.py:63-67` counts ongoing installation projects using
`("planning", "in_progress", "pending_approval")`. **None of these three strings is a reachable
`InstallationProject.status`** — the vocabulary is `design … closed`, sales hardcodes `design`,
and the only status writer picks from the same 8 values. The dashboard's
`ongoingInstallationProjects` tile therefore reports **0 for every project created through any
supported path**. The fix is a one-line change to that tuple (or `status != "closed"`).

---

## 9. Permissions

| Surface | Roles |
| --- | --- |
| Project endpoints (`require_operations`) | admin, operations_manager, maintenance_manager, **installation_manager**, store_manager, finance_manager, customer_service, sales_manager |
| Task / inspection / dispatch (`require_supervisor`) | admin, operations_manager, maintenance_manager, **installation_manager**, maintenance_supervisor, **installation_supervisor** |
| AdminPortal section gate (`permissions.ts:91-92`) | operations_manager, installation_manager, installation_supervisor (+ admin, + anyone with an `installation.*` grant) |
| Permission catalog (`authz_catalog.py:52`, `:101-183`) | `installation.create/read/update/delete`; supervisor gets CRU, technician_installation / inspector / engineer / quality_engineer get read (or read+update) |

Three asymmetries to keep in mind:

1. **`installation_supervisor` can edit tasks and dispatch work orders but gets 403 on
   `GET /projects` and `GET /projects/{id}`** — they cannot read the project they are editing.
2. `sales_manager`, `store_manager`, `finance_manager`, and `customer_service` can create a
   project and set it to `closed`, but cannot touch a single task.
3. Roles holding only `installation.read` (technician_installation, inspector, engineer,
   quality_engineer) will see the AdminPortal section via the grant path, but every backend
   endpoint 403s for them.

None of the installation routes use the fine-grained `require_permission("installation.*")`
gates — the catalog entries exist but are not wired.

---

## 10. End-to-end operational flow

1. Sales approves an installation contract request → contract (`draft`) + project (`design`) are
   created automatically, or operations creates the project manually against an existing
   installation contract.
2. Someone opens the installations list → the contract is flipped to `active`.
3. Operations links the elevator (it must already be `under_installation`) and sets the
   supervisor and planned dates.
4. Operations builds the work breakdown — usually «إضافة قالب دفعات»: batch sections
   (الدفعة الأولى …) each holding the standard phase tasks, optionally with one `pending`
   inspection per phase. Costs go on the task rows (`planned_cost` / `actual_cost`).
5. Each executable task is assigned to an installation team and **dispatched**, creating a
   scheduled `installation` work order.
6. The technician sees it in the worker app, works the phase checklist, and completes it via
   `/complete` → the task flips to `completed`, the project's progress and stage advance.
7. Photos and documents are uploaded per stage from the project page (they attach to the
   stage's work order).
8. Inspections are recorded and marked `pass` / `conditional_pass` / `fail`.
9. At 100 % the project auto-moves to `handover`. «اعتماد التسليم» runs the 7-point server gate
   and, on success, closes the project, stamps `actual_end_date`, and moves the elevator to
   `in_service`.
10. The project disappears from the operational screens and stays in
    «التسليم والأرشيف → مشاريع تم تسليمها». The customer sees only *active* projects in the
    customer app.

---

## 11. Known gaps and risks

Ordered roughly by operational impact.

| # | Issue | Where |
| --- | --- | --- |
| 1 | **Dashboard installation counter always reads 0** — status tuple never matches reality | `dashboard/repository.py:63-67` |
| 2 | **Read endpoints write.** `GET /projects` recomputes status/progress, forces contracts `active`, and commits — so listing projects mutates data and bumps `updated_at` with no audit trail. `?status=` filters the *stored* value before the rewrite, so rows can be mislabeled | `controller.py:309-327` |
| 3 | **Detail vs list disagree.** `GET /projects/{id}` recomputes progress but usually does not persist it; the list does. The stored value depends on which screen was opened last | `controller.py:404-407` |
| 4 | **Work-order status wizard does not sync back.** A technician who finishes (or cancels, or steps back) via `/status` instead of `/complete` leaves the installation task stale; the one-way stage ratchet means the project can never recover automatically | `work_orders.py:3254-3413`, `lifecycle.py:136,153` |
| 5 | **Team-only dispatch skips the capability check** — eligibility is only enforced when a `technician_id` is supplied | `lifecycle.py:452-464` |
| 6 | **Completion before review.** `_sync_installation_task_completion` runs even when the work order lands in `pending_review`, so progress advances before a supervisor approves | `lifecycle.py:334-349` |
| 7 | **No status validation anywhere.** `status`, `task_kind`, `result` are bare `Optional[str]`; a task set to `"done"` is counted incomplete forever, and an inspection with an unrecognized result silently unblocks handover | `schema.py:36,107,110,162` |
| 8 | **Elevator bookkeeping leaks.** Unlinking/switching never resets the old elevator, and two projects can claim the same one; every project update rewrites the linked elevator's status | `controller.py:275-282,634-637` |
| 9 | **`contract_id` can be nulled by an update** even though it is mandatory on create (`if key in data and data[key]` skips validation on `null`) | `controller.py:596,609` |
| 10 | **Progress after task delete is computed pre-flush**, and the one-way ratchet means deleting the last completed task lowers progress while the project stays at `handover` | `controller.py:759-767` |
| 11 | **No project delete/archive endpoint**; `repository.delete()` is only used by tests | `repository.py:185-187` |
| 12 | **Audit rows carry no diff** for 8 of 9 actions, so «سجل النشاط» shows that a project changed but not what changed. `/timeline` also reports `total` after a hard `LIMIT 300` | `controller.py:384-965`, `:507,551` |
| 13 | **`installation_supervisor` cannot read projects** (see §9) | `deps.py:151-170` |
| 14 | **Two different task counts.** `GET /work-orders/{id}` counts section rows in `total_tasks_count` while progress excludes them, so the worker app can show "60 % — 3/7" | `work_orders.py:2433` vs `controller.py:51-56` |
| 15 | **N+1 everywhere.** The operations pages fire up to 80 detail requests per view and silently drop failures; the project list does one `Site` + one `User` query per row; the batch template writes one request per generated row | `InstallationOperationsShared.tsx:87-97`, `controller.py:312-324` |
| 16 | **`InstallationContractRequests` gates the wizard on `finance_approved`** while the backend requires `approved_working` (and the installation manager is not in `MANAGER_ROLES`) — dead page today, but a trap if it is ever re-routed | `InstallationContractRequests.tsx:105` vs `sales.py:863` |
| 17 | **Almost no test coverage.** The only installation test is `tests/integration/test_installations_repository.py`; there is no test of any endpoint, of `_sync_project_progress`, or of the handover gate | — |
| 18 | Duplicated vocabularies: the stage order, phase labels, and checklists exist independently in the backend, `AdminPortal/presentation.ts`, `mobile-worker/installationDetailConfig.ts`, `InstallationTaskCard.tsx`, and `customers/dialogs/InstallationTab.tsx` | — |

---

## 12. Quick reference — where to change what

| Task | Files |
| --- | --- |
| Add a project status | `model.py:32` comment, `controller.py:157-172` + `:189-198` rank lists, `presentation.ts:9-18,50-59`, `installationDetailConfig.ts:20-29,51-60`, `InstallationProjects.tsx:36-46`, `InstallationProjectFormDialog.tsx:24-33` |
| Add a task phase | `presentation.ts:61-73` (+ aliases `:93-121`), `controller.py:136-154` and `lifecycle.py:73-91` mapping, `installationDetailConfig.ts:38-49`, checklist in `installationDetailConfig.ts:70-141` |
| Change the handover rules | `controller.py:59-97` (server, authoritative) **and** `InstallationProjectDetail.tsx:253-309` (client checklist) |
| Change how progress is computed | `controller.py:51-56` **and** `lifecycle.py:93-119` — both must match |
| Change what gets dispatched to the field | `controller.py:774-885`, `work_orders/services/crud.py:143-187` |
| Change the batch templates | `presentation.ts:79-86` + `InstallationProjectDetail.tsx:509-616` |
| Change what the customer sees | `customers/controllers/portal.py:409-601` |
