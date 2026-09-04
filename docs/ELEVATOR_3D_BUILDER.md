# محاكي المصعد ثلاثي الأبعاد — ELEVATOR 3D BUILDER / SIMULATOR

> Design record and operating manual for the 3D elevator feature in AdminPortal.
> Built 2026-08-30/31. Status: **working tree only — not committed, not deployed.**

---

## 1. What it is

An interactive, parameterized 3D elevator inside صفحة ملف مشروع التركيب (`/installations/:id`),
reached by clicking a row in «متابعة مشاريع التركيبات». It is not a picture — it is a working
elevator: the machine turns, the cabin travels, the doors cycle, and you can put the camera
**inside the cabin** and press the buttons.

Every part is driven by the customer's real spare-parts workbooks, so clicking a component
shows its Arabic name, its actual items, unit prices and quantities for that exact configuration.

### Entry points
| Where | What |
|---|---|
| `/installations/:id` (project file page) | Full section below the stage board, driven by the project's own elevator record |
| «متابعة مشاريع التركيبات» list, row actions | «عرض ثلاثي الأبعاد» quick action → fullScreen-on-xs dialog with the same section |

---

## 2. Source data

Three workbooks + one drawing document supplied by the customer:

| File | Rows | Schema |
|---|---|---|
| `الكهرباء.xlsx` | 1,271 | `itemno │ item │ 2..12 │ price │ lift_type │ enterance │ category` |
| `سكة وباب.xlsx` | 369 | `itemno │ item │ 2..12 │ price │ lift_type │ category` |
| `ميكانيكا.xlsx` | 825 | `itemno │ item │ 2..12 │ price │ capacity │ lift_type │ category` |
| `Elevator_Types_Drawings_and_Spare_Parts.docx` | 143 tables + 7 drawing sheets | per-type technical data, dimension tables, cost tables, full BOMs |

Columns `2..12` are the **full BOM quantity at that number of stops** — not per-stop increments.

### The 7 types × 3 categories

| key | labelAr | machine | doors | speed | capacities | entrances |
|---|---|---|---|---|---|---|
| `standard` | عادي | geared | semi-auto (hinged) | 0.63–1.00 m/s | 450/630/800 | 1, 2 |
| `automatic` | اوتوماتيك | geared | auto centre-opening | 0.63–1.00 | 450/630/800 | 1, 2 |
| `gearless_standard` | عادي جيرلس | gearless PM | semi-auto | 1.00–1.60 | 450/630 (800 = stub) | 1, 2 |
| `gearless_automatic` | اوتوماتيك جيرلس | gearless PM | auto | 1.00–1.60 | 450/630 (800 = stub) | 1, 2 |
| `freight` | بضاعة | geared | semi-auto heavy | 0.40–0.63 | 450/630/800 | 1 |
| `panoramic` | بانوراما | geared | auto + glass | 1.00 | 450/630/800 | 1 |
| `food` | طعام | micro geared | hatch | 0.30–0.40 | 120 (450/630/800 = stubs) | 1 |

Categories are **origin/brand tiers**, not feature tiers: Premium = Italian (`إيطالي`) + Secor;
Standard/Basic = Chinese/Turkish/Indian. They are spelled **`Premuim`** in every source row —
normalized to `premium` on import.

**Standard and Basic are byte-identical** except the gearless machine (Secor 8,300–9,300 vs
Chinese 3,500–4,000) and one fan/cable variant in `gearless_automatic` Basic.

### Source-data anomalies — surfaced as warnings, never silently "fixed"

| Warning code | What it means |
|---|---|
| `stub_capacity` | Gearless 800 kg and food 450/630/800 have a 1-item BOM (`سوستة بير` only). Capacity snaps to the nearest real one. |
| `missing_controller` | `كنترول` / `كنترول جيرلس` is absent from exactly one entrance variant of the Std/Basic electrical lists — which is why some 2-entrance totals come out *lower* than 1-entrance. |
| `bracket_gap_food` | `كابولى صغير 5 مم` drops to qty 0 for food lifts at 8–12 stops while the rails keep growing. |
| `stops_clamped` | Stops outside 2–12 (no source data exists outside that range). |

Also known and deliberately preserved: three quantity typos in `automatic` Premium 2-entrance
electrical; a duplicated `زاوية حديد` row in the بضاعة rails list (summed, not dropped); the
بانوراما glass-cladding inversion (the *cheaper* categories carry the glass item); counterweight
fill of 640 vs 680 units for the same 630 kg across different types.

**Totals are always recomputed from item rows.** The docx cost tables inherit every one of these
defects and are never copied into the product.

---

## 3. Backend

**Pure code, no database.** No table, no Alembic migration, no seeder — following the
`app/installations/stage_rules.py` precedent (Arabic catalog data as Python constants served by
`GET /installations/config`). This deliberately avoids the VPS `git pull` / `alembic heads` trap
and the need to seed every environment.

```
backend/app/installations/elevator_catalog/
  __init__.py     public API: build_model, catalog, match_type, snap_capacity, clamp_stops, …
  catalog.py      loader (lru_cache) + normalization + group mapping + warnings
  groups.py       item → component-group mapping (every one of ~122 distinct item names)
  data.json       935 KB, parsed from the docx (7 types × 3 categories × capacity/entrance tables)
  drawings/*.png  the 7 engineering drawing sheets, one per type key
backend/app/installations/elevator_builder_controller.py   (registered in app/api/router.py)
```

A **load-time assertion** fails the import if any workbook item is unmapped to a component group.

### Endpoints (all read-only GET)

| Path | Purpose |
|---|---|
| `GET /api/v1/installations/elevator-builder/catalog` | picker index: types, categories, stops range, 26 component groups, disclaimer |
| `GET /api/v1/installations/elevator-builder/model` | one resolved configuration: config + dimensions + partGroups + totals + warnings |
| `GET /api/v1/installations/projects/{id}/elevator-3d` | per-project resolution (see below) |
| `GET /api/v1/installations/elevator-builder/drawing/{type_key}` | the drawing sheet PNG |

**Per-project resolution** reads `project.elevator_id → Elevator`, falls back to
`CustomerContractRequest` via `contract_id`, then to defaults. Free-text specs are **matched, never
parsed**: Arabic aliases normalize (`عادى/عادي`, `بضاعه/بضاعة`), capacity digits are extracted and
snapped, stops/entrances clamped. It **never 500s on bad data** — anything unresolvable goes to
`unmatched` / `missing` / `defaultsApplied` and the operator sees «مواصفات غير مكتملة».
404 only when the project id does not exist.

> **Category (Premium/Standard/Basic) exists nowhere in the database.** It is a UI-selected catalog
> dimension, defaulting to `premium`, and is always reported in `missing`. Persisting it would need
> a schema decision.

### Response rules (traps this obeys)
- Hand-written camelCase keys, **Arabic only in values**, lists of objects — never a dict keyed by
  Arabic or snake_case (the AdminPortal client camelCases response keys recursively).
- JSONB columns hold JSON **string scalars** on Postgres — read via ORM only, never `->>` in SQL.
- Exact literal paths, no trailing-slash variants (FastAPI 405 trap).

---

## 4. Frontend

```
AdminPortal/src/pages/installations/components/elevator3d/
  Elevator3DSection.tsx   the shell — THREE-FREE, lazy-loads the canvas behind an expand gate
  ElevatorCanvas.tsx      thin composition root (the only three.js entry)
  PartsPanel.tsx          selected component → Arabic name + items + prices
  types.ts                payload + sim types
  scene/                  rig.ts (all position math), materials, primitives, Part (picking),
                          Shaft, Rails, Machine, Ropes, Counterweight, Cabin, CabinInterior,
                          Doors, Landings, TravelingCable, Buffers, indicatorTexture
  sim/                    profile.ts + controller.ts (PURE TS — no three, no react),
                          store.ts, useElevatorSim.ts, useSimSnapshot.ts
  camera/                 views.ts, CameraRig.tsx
  ui/                     SimControls.tsx (Arabic RTL overlay)
```

### Chunk isolation (enforced by QA)
`three` must never enter the entry bundle. Verified on every build: the entry chunk contains
**zero** occurrences of `WebGLRenderer`; the only chunk carrying it is `ElevatorCanvas-*.js`
(~953 KB), and `Elevator3DSection-*.js` is a three-free ~56 KB chunk.
**Never add the canvas to `ChunkWarmup` (App.tsx) or vite `server.warmup`.**

---

## 5. The control program

`sim/controller.ts` and `sim/profile.ts` are **pure TypeScript with zero imports from three or
react**, so they are unit-tested headlessly.

- **Motion**: jerk-limited S-curve — jerk 1.0 m/s³, accel/decel 0.8 m/s², `vMax` = the type's real
  rated speed. Degrades to a triangular profile on short runs. Verified to never overshoot
  (0.000000 mm measured positionally across 30 config × dt combinations) and never exceed rated
  speed (worst excess 4.5e-13 m/s).
- **States**: `idle · parked · doors_closing · starting · running · slowing · leveling ·
  doors_opening · dwell · door_hold`.
- **Dispatch**: collective-selective — serves calls ahead in the committed direction, then reverses.
- **Doors differ by type, mechanically:**
  - `auto` — operator drives two centre-opening panels, landing door dragged by the vane, photocell
    reverses the close.
  - `semi_auto` — the retiring cam (`كامة`) releases the interlock, the folding safety gate opens,
    and the **manual hinged landing panel** only swings on «فتح الباب». It provably never opens
    while the car is moving.
  - `hatch` (طعام) — no car calls accepted at all (nobody rides), hall calls only.

### Cabin interior
Camera at eye height riding the car: COP with **one button per stop** (click in 3D → registers a
car call and lights until served), open/close/alarm buttons, live floor indicator over the door,
ceiling lights, mirror, handrail, intercom, alarm bell — and **the fan only when the BOM actually
contains `مروحة`** (gearless_automatic Basic). Panoramic gets glass walls; food has no interior and
its interior camera option is hidden.

### Animation bindings
Cabin Y from the sim; counterweight exactly mirrored; sheave rotation
`dθ = (dCarY × ropingRatio) / radius` — **2:1 for gearless** (derived from the source data: 3
pulleys + doubled thin-rope length), 1:1 geared; ropes, governor, traveling cable and hall lanterns
all follow. React state updates only on discrete transitions (~0.9 % of frames), never per frame.

---

## 6. How it was verified

Three QA rounds, all measured rather than asserted, 58 checks in the final pass.

**Defects the QA loop caught and sent back:**
1. `dimensions.persons` null for freight/food (contract + non-nullable TS field).
2. Raw English machine tokens (`gearless`, `semi_auto`) rendered into the Arabic UI on 25 of 26 real projects.
3. Viewer opened **cropped on 26/26 real projects** — the initial camera did not scale with travel.
4. Duplicate empty-state message on the same card.
5. **A livelock in the dispatcher** — the two re-open decisions were direction-blind and re-triggered
   on the opposite-direction hall call that `serveFloor` had correctly kept, so the lift cycled
   open/dwell/close forever without departing. Every demo seed wedged. Fixed by keying the re-open
   test off the committed `serviceDirection`.
6. **A landing door opening against an engaged interlock** — the reversal branch handed to
   `doors_opening` from the one-step pass-through taken when departing an already-shut landing.
7. No visible keyboard focus ring on the overlay controls.

**Standing evidence:** six BOM regression totals exact and cross-checked four ways
(22,685 / 30,058 / 53,346 / 52,389 / 15,921 / 46,323); all 26 real installation projects resolve
with `grand > 0`; 102,000 fuzz steps with hostile input (NaN/Infinity dt, out-of-range floors,
unknown commands) with no throw, no NaN, no unknown state; doors provably sealed **and** locked in
every moving state; counterweight mirror exact over 200 consecutive trips with zero drift;
frame budget 7.7 ms mean / 9.6 ms max on a 12-stop panoramic; draw calls 77–144, all under 250.

Harnesses live outside the repos (session scratchpad): a FastAPI TestClient sweep, a headless-node
simulation suite, and a headless-WebGL render harness that drives the real canvas.

---

## 7. Live construction view — «وضع البناء» (build by tasks)

The 3D elevator doubles as a **live progress view**: as the crew ticks بنود and مهام, the matching
components materialize. Ghost = not installed yet, amber = being worked on, solid = installed,
crate = «تم التوريد» (delivered but not fitted).

**Chain (nothing new stored, nothing written):**
`installation_tasks.status` → `stage_flags.is_checked` → `installation_stages.status` → component.

**Files:** `backend/app/installations/elevator_build_map.py` (the 26-row constant: build order,
milestone flag, owner legs, BOTH task vocabularies, per-type absent sets, merged-plan resolver) and
`GET /api/v1/installations/projects/{id}/elevator-build`. Frontend:
`elevator3d/build/{BuildPanel,StageBuildPanel,presence}.tsx|ts`, mounted on the project page and in
`StageDrawer` «سير العمل» behind an explicit expand.

**Derivation ladder** (most specific wins, never promote from a coarser layer): task rows matched by
name → بند row → stage status. Component state = `min(legs)`. Rendering presence is a **separate
`SceneApi` channel** (opacity/emissive) — `colorFor` is untouched, so selection and stage coloring
still work on top of it.

**Seven honesty invariants, each guarding a specific lie** — never infer `installed` from build
order or from a stage merely being open; `crane` installs nothing; un-ticking moves the component
back (recomputed every read, no high-water mark); the safe default is `not_started`;
`not_applicable` comes only from the per-type table, never from `items.length`.

**Replay** is ordered by **physical build order, never by timestamp** — 46 % of timestamps are
missing (70/151 checked flags have no `checked_at`, 158/344 completed tasks no `actual_end_date`)
and three projects carry microsecond-identical stamps across all five stages. Dates are captions:
«تاريخ تقديري» when estimated, «بدون تاريخ مسجّل» when absent. The scrubber cursor **marks** a step;
it never builds one.

### What this surfaced in the existing system — all four now FIXED (2026-08-31)

1. **`stage_rules.task_flag()` is dead for new projects.** It searches only the legacy `_FLAG_TASKS`
   and returns `None` for all 41 task names the approved `_SECTION_TASKS` catalog creates. The only
   working route is the section heading via `SECTION_FLAGS`. The build map therefore matches task
   names directly, in **both** vocabularies (25 of 26 local projects still carry legacy names).
2. **`groups.py` `stageKey` is wrong on 5 of 26 groups** — `pit_equipment` (buffers go in during
   `rail_door`, not `machine`), `lubrication` (a rails task), `controller` and `hall_call` (both
   **two-phase**: placed/mounted early, wired in `electrical`), `governor_safety` (safety gear is a
   cabin task). `elevator_build_map.py` supersedes it; `groups.py` was left alone.
3. **Two ordering defects in the company's own approved task catalog** — report, don't silently fix:
   «تمرير حبال الرفع ومعادلة الشد بينها» (machine #6) comes **before** «تجميع هيكل الكابينة (السلينج)
   على السكك» (cabin #1), and «تركيب أحذية التوجيه … (للكابينة والثقل)» (cabin #3) comes **after**
   «تجميع إطار الثقل الموازن» (machine #5).
4. **Two writers stamp `installation_tasks.actual_end_date` with different clocks** —
   `stages_controller.py:2339` uses `datetime.utcnow().date()`, `controller.py:1389` uses
   `date.today()`. Identical on a UTC container, up to a day apart otherwise.
5. **Cache-key collision:** `['installation-project-stages', projectId]` is shared by three
   components across **two different response shapes**. The build view uses its own key.

**How each was fixed** (user decisions: legacy catalog retired for NEW projects only; the two
ordering defects corrected by moving the work):

| # | Fix |
|---|---|
| D1 | `task_flag()` now resolves **both** vocabularies — the approved catalog through a `SECTION_FLAGS`-derived index, the legacy map for old rows. Verified: 62/62 approved names and 13/13 legacy names resolve, and **not one** of the 90 distinct (stage, name) pairs on the 652 live rows changed its بند. |
| D2 | `groups.py` no longer hand-types `stageKey`. A new shared table `elevator_build_legs.py` owns the (group → ordered بند legs) truth, and both `groups.py` and `elevator_build_map.py` **derive** from it — with an import-time raise on drift in either direction, so they can never disagree again. For a two-phase component the badge names the stage the work **starts** in. |
| D3 | «تمرير حبال الرفع ومعادلة الشد بينها» moved out of the machine section into the cabin section, after the sling. «تركيب أحذية التوجيه أو البكرات (للكابينة والثقل)» split into «…للكابينة» (with the sling) and «…للثقل الموازن» (with the counterweight frame, machine stage). **New projects only** — no existing task row was touched. |
| D4 | New `timeutils.utc_today()` is the single named event-date clock. Every runtime writer of `actual_start_date`/`actual_end_date` now uses it (verified by an AST sweep of all of `app/`); only the `app/scripts/seed_*.py` seeders still call `date.today()`, which is correct for seed data. |

**Guardrails added so this class of defect cannot recur:** `default_task_plan()` now **raises** instead
of silently falling back to `_FLAG_TASKS` (which is re-documented as a deprecated, read-only legacy
resolution table); `_assert_catalog_covers_plan()` validates the catalog against the stage plan at
import; and `elevator_build_map` gained checks that every mapped task name exists verbatim, that no
task is filed under a stage the component has no leg in, and that the `groups.py` badge equals the
first leg. QA proved each guard by **mutation testing** — deliberately breaking the catalog nine
different ways and confirming the import fails every time.

### «تحديد الكل» — bulk task completion

**AdminPortal** (`StageTasksPanel.tsx`): a tri-state select-all on every section header, behind a
confirmation naming the count, calling the new `POST /api/v1/installations/stages/{id}/tasks/bulk`.
The endpoint reuses the *same* guard/apply/audit helpers as the single tick (extracted, not
duplicated), so it cannot bypass ordering rules, blockers, locks or permissions — QA proved
**46/46 parity**: identical status code *and* identical Arabic refusal text as a single tick, for
every refusal shape. Partial batches report honestly (moved / requested / failed with the server's
own reasons) and the bulk path **cannot tick a بند** — proved by AST that it writes no flag at all.

**mobile-worker** (`WorkOrderDetailsScreen.tsx`): the technician's single tick has been *local* since
2026-08-30 (the per-tick POST was removed because an 18-task catalog cost dozens of requests on a
site connection), so select-all is local too and ships in the one completion POST. It covers the
**active section only**, and a recorded **خلل is never overwritten** in either direction — it is the
one value on the list that tells the office something on site is broken.

## 8. The technician's view — 3D in mobile-worker

The same lift, on the phone of the person building it. The technician opens his installation job and
sees what is already in, what **he** is expected to install right now, and what is still ahead — the
tick-list rendered as the physical machine, so a junior tech reading «تحديد وتثبيت كوابيل السكك» can
see *which piece that is*.

**Backend** — two field-shaped reads added to `elevator_builder_controller.py`, both pure:
`GET /api/v1/installations/stages/{stage_id}/elevator-build` and
`GET /api/v1/installations/work-orders/{work_order_id}/elevator-build`. They return the resolved
model plus, per component, `scope: "mine" | "other"`, `myState`, and `boundItems` naming the بند and
the Arabic task that installs it — so the app can highlight exactly the current crew's work.
Auth is the **narrower** gate: a technician gets his own stage and his own ticket, and **403 on a
stage he does not hold** (a phone cannot walk the estate). A bogus id returns the same 403 as a real
one — no enumeration.

**App** — `mobile-worker/src/elevator3d/`: `core/` is pure TypeScript ported from the portal (rig
math, materials, presence rules, scene plan, normalisation) and is unit-tested; `webview/` hosts the
three.js scene; `ElevatorBuildScreen.tsx` is the screen. Reached from the work-order detail screen.

**Three constraints that shaped it:**
1. **OTA-safe** — no new native module. `git diff package.json package-lock.json` is empty;
   `react-native-webview` was already installed. A native dependency would silently break
   `eas update`.
2. **No CDN.** The customer app fetches three.js from unpkg at runtime; a site connection cannot.
   The scene is bundled (`webview/bundle.generated.ts`, ~553 KB, built by
   `scripts/build-elevator3d-bundle.mjs`) and contains **zero** `fetch` / `XMLHttpRequest` /
   `importScripts` calls — verified on the shipped artifact.
3. **One elevator, not two.** The geometry and presence rules are ported from the portal rather than
   re-authored, and a jest guard pins the renderer's duplicated constants to their owning modules —
   proven non-vacuous by mutating each of five constants and watching the suite fail.

**Honesty, verified by diff:** across all 75 seeded stages, every component's state matches
`/projects/{id}/elevator-build` exactly — zero divergences — and every `installed` is backed by a
ticked بند, an all-completed task set, or a completed stage. Zero unbacked. The "my work" scope was
re-derived a third independent way from `stage_rules` + the raw legs table and matched on every
stage, and every `boundItem` names a بند and task row that really exist on that stage.

## 9. Known gaps / next steps

- **Not committed, not deployed.** Both repos hold this as untracked work alongside unrelated
  work-in-progress. Remember: AdminPortal production runs a feature branch via archive deploys —
  deploying from `main` would regress prod.
- **Category is not persisted** — needs a product decision (new column on `Elevator` /
  `CustomerContractRequest`, or a pricing-catalog dimension).
- Entrances only affect the electrical BOM in the source data; landing-door quantities do **not**
  double for a 2-entrance lift. That is what the workbooks price — surfaced, not corrected.
- Dimensions are the docx's **typical reference values**, not supplier-specific; the disclaimer
  «قيم استرشادية — راجع مخطط المورد» ships with the payload.
- Phase 2+ placements considered and deferred: live preview in QuoteBuilder (sales), upgrading the
  existing `elms-customer` three.js scene, the public contract QR page, `elms-landing`, and the
  technician app (needs a worker-accessible spec endpoint).
