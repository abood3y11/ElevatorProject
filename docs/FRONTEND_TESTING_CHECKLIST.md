# ELMS — Frontend Testing Checklist

> Manual QA / functional test checklist for the three frontend apps.
> Tick each item per release. For **every** UI item also verify **Arabic RTL** layout and **English LTR** fallback.
>
> Apps covered:
> - **AdminPortal** — React + TS + Vite + MUI (web, RTL primary) → `admin.hensline.com`
> - **mobile-worker** — React Native / Expo (field technician) → App/Play Store
> - **elms-customer** — React Native / Expo (customer) → `app.hensline.com`
>
> Legend: `[ ]` = to test · note device/browser + result + ticket if it fails.

---

## 0. Cross-cutting (all three apps)

### Auth & session
- [ ] Login with valid credentials succeeds and lands on the home/dashboard
- [ ] Login with wrong password shows a clear error, no token stored
- [ ] Login with non-existent account fails gracefully
- [ ] Access token is sent as `Authorization: Bearer` on every request
- [ ] Expired access token auto-refreshes via refresh token (no user-visible logout)
- [ ] Invalid/expired refresh token forces a clean logout → login screen
- [ ] Logout clears tokens (localStorage / AsyncStorage) and protected routes redirect to login
- [ ] Deep-linking to a protected route while logged out redirects to login

### Localization & layout
- [ ] All user-facing strings come from translation files (no hardcoded Arabic in components)
- [ ] RTL mirrors layout correctly (icons, chevrons, drawers, tables, forms)
- [ ] Numbers/dates render with `ar-SA` formatting where required
- [ ] No text overflow/clipping in Arabic (longer strings)
- [ ] LTR English fallback renders correctly

### Network & error states
- [ ] Loading states show for slow requests (spinner/skeleton)
- [ ] API 4xx errors show a friendly message, not a raw stack
- [ ] API 5xx / network failure shows retry, doesn't white-screen
- [ ] Empty states render (no data) instead of a blank page
- [ ] camelCase ↔ snake_case transform works on every form submit + response

---

## 1. AdminPortal (web)

### 1.1 Auth & access control
- [ ] 30-minute inactivity auto-logout fires
- [ ] Activity (mouse/keyboard/scroll) resets the inactivity timer
- [ ] Role-based menu: each role sees only its permitted sections
  - [ ] `admin` / `super_admin` — full access
  - [ ] `operations_manager` — dashboard, customers, maintenance, installations, sales
  - [ ] `maintenance_manager` — maintenance & work orders only
  - [ ] `finance_manager` — finance modules only
  - [ ] `sales_manager` / `sales_rep` — sales only
  - [ ] `store_manager` — store/inventory only
- [ ] Per-user module grants override role defaults
- [ ] Direct URL to an unauthorized page is blocked

### 1.2 Dashboard
- [ ] KPI cards load with correct counts
- [ ] Expiring-certificates / overdue widgets reflect real data
- [ ] Date/period filters update the data

### 1.3 Customers
- [ ] Create customer → `customer_number` (C-code) assigned
- [ ] Edit / view / deactivate customer
- [ ] List search + filter + pagination
- [ ] Credit limit & credit-hold fields save and display
- [ ] Tax certificate upload + expiry date save

### 1.4 Sites / Elevators (under Customers)
- [ ] Create site under a customer → site code `S{n}-{s}` assigned
- [ ] Set building info, district, contact, preferred visit times
- [ ] Create elevator under a site → `ELV{n}-{s}-{e}` assigned
- [ ] Capture brand/model/serial/capacity/usage type/status
- [ ] Upload elevator documents (CoC, manuals)
- [ ] Elevator status transitions display correctly

### 1.5 Contracts
- [ ] Create maintenance / inspection / repair / installation contract
- [ ] Contract number `CON{n}-{s}-{c}` assigned
- [ ] Set visit frequency, coverage type, SLA, dates, value
- [ ] Status lifecycle: draft → pending_approval → active → expired/cancelled
- [ ] `auto_invoice` + next invoice date save

### 1.6 Work Orders
- [ ] Create work order (all types)
- [ ] Manual assign to technician / team
- [ ] Distribution dashboard: list unassigned elevators for month/year
- [ ] Bulk-assign work orders to technicians
- [ ] Work order detail shows full lifecycle + GPS + checklist + signatures
- [ ] Status reflects technician updates in near-real-time (WebSocket)
- [ ] Supervisor review gate: approve / reject + quality rating + rejection reason
- [ ] Overdue work orders are flagged

### 1.7 Sales pipeline
- [ ] Sales requests list (new calls اتصالات جديدة, periodic)
- [ ] Approve request (approved_working)
- [ ] Build quote: add line items, discount, payment milestones
- [ ] Quote number generated; valid-until set
- [ ] Send quote (status → sent)
- [ ] Export quote to Excel / PDF (company عرض سعر template)
- [ ] Mark accepted → finance approval (approved_finance) → contract materialized
- [ ] Default pricing config edits save

### 1.8 Finance (verify each page loads + core action)
- [ ] Overview / invoices / receivables / reports
- [ ] Create invoice + line items, 15% VAT applied
- [ ] Record payment → invoice status updates
- [ ] Periods: open/lock accounting period
- [ ] Cost centers, payables, WHT
- [ ] Budget, recurring entries, statements
- [ ] Zakat, cheques, cash flow
- [ ] ZATCA: invoice shows uuid / QR / status after submission
- [ ] GL reports (trial balance / P&L / balance sheet) render

### 1.9 Installations
- [ ] Project list + create
- [ ] Operations workbench: task hierarchy, team assignment
- [ ] Progress + actual cost updates
- [ ] Inspections record + documents
- [ ] Handover flow → elevator status becomes in_service
- [ ] Installation finance / payments page

### 1.10 WhatsApp Messages (operationally critical)
- [ ] Manual templates appear in `قوائم الإرسال`
- [ ] Send a manual template → a `WhatsAppMessage` row is created
- [ ] Auto-send (on WO status trigger) also creates a `WhatsAppMessage` row
- [ ] Successfully sent messages appear in `تم الإرسال`
- [ ] Failed / missing-phone messages appear in `مراجعة` (not lost)
- [ ] Retry a failed message works
- [ ] Inbox shows inbound customer replies grouped by phone
- [ ] Delivered/read status updates from webhook
- [ ] Emergency closure interactive message shows buttons (تم الحل / المشكلة مستمرة / اتصلوا بي)

### 1.11 Technicians / Users / Store / Settings
- [ ] Technicians: create, team membership, licenses, availability, leave
- [ ] Users: create, assign roles, deactivate
- [ ] Store: spare-parts catalog CRUD, visibility toggle, images
- [ ] Settings: company + WhatsApp config (enable, provider, auto-template toggles)
- [ ] Settings: districts configuration

---

## 2. mobile-worker (technician app)

### 2.1 Auth & session
- [ ] Login via `/auth/login/tech` (phone/email + password)
- [ ] Tokens + technician ID stored in AsyncStorage
- [ ] Session restored on app restart
- [ ] Live location tracking starts on login
- [ ] Live location tracking stops on logout

### 2.2 Today / work execution
- [ ] Today screen lists today's assigned work orders / visits
- [ ] Open work order detail → full info, history, customer/site
- [ ] Acknowledge task → status becomes pending
- [ ] Arrive → status `arrived` with GPS captured (accuracy shown)
- [ ] No-access path → status `no_access` + reason captured
- [ ] Start work → status `in_progress`
- [ ] Complete checklist items (save partial progress)
- [ ] Capture photos and attach to work order
- [ ] Capture customer signature + technician signature
- [ ] Record parts used / recommendations
- [ ] Complete → status `completed`, end GPS captured
- [ ] Completion triggers customer WhatsApp (verify on admin side)

### 2.3 Self-assignment & map
- [ ] Self-assignment screen shows claimable tasks
- [ ] Claim a task → it appears in Today
- [ ] Map view shows all assignments with markers/clustering
- [ ] Tapping a marker opens the work order

### 2.4 Workstation (multi-role)
- [ ] Maintenance work screen: assigned visits + status updates
- [ ] Installation tasks: checklists, handover prep
- [ ] Inspection tasks: results + certificate
- [ ] Sales — sales requests (leads from admin)
- [ ] Sales — create offer / quote
- [ ] Sales — new calls (اتصالات جديدة) create + detail
- [ ] Sales — periodic calls (اتصالات دورية) create + list
- [ ] Delivery orders list + details + delivery proof

### 2.5 History & profile
- [ ] History shows completed visits
- [ ] Profile: account info, licenses & certs, statistics
- [ ] Notification/push settings
- [ ] Submit leave request → status pending
- [ ] About / help screens render

### 2.6 Offline & resilience
- [ ] Status update made offline queues and syncs on reconnect
- [ ] Photo/signature captured offline is not lost
- [ ] App handles GPS permission denied gracefully
- [ ] App handles camera permission denied gracefully

---

## 3. elms-customer (customer app)

### 3.1 Auth
- [ ] Login (phone + password) succeeds
- [ ] Register new customer account
- [ ] Token persisted (Zustand + AsyncStorage), restored on restart
- [ ] Logout clears state

### 3.2 Home & elevators
- [ ] Home dashboard shows stats + recent activity
- [ ] Elevators list shows customer's assets with status
- [ ] Elevator detail: specs, history, maintenance schedule
- [ ] Installation monitoring screen shows project progress

### 3.3 Contracts & visits
- [ ] Contracts list: active vs expired
- [ ] Request a new maintenance contract
- [ ] Visits list: upcoming + past
- [ ] Visit detail: notes, photos, technician info
- [ ] Visit tracking: live technician GPS on map + ETA

### 3.4 Store (e-commerce)
- [ ] Browse spare-parts catalog (only visible items)
- [ ] Product detail: specs, price
- [ ] Add to cart, change quantity, remove
- [ ] Checkout: choose address + payment method
- [ ] Order placed → invoice created
- [ ] Order history list
- [ ] Order tracking: delivery status updates
- [ ] Invoice viewer renders PDF
- [ ] Delivery proof (image + signature) shows when delivered

### 3.5 Notifications & profile
- [ ] Notifications list: service alerts, appointment reminders
- [ ] Push notification received and deep-links correctly
- [ ] Profile: company info displays
- [ ] Company profile edit saves

### 3.6 Resilience
- [ ] Handles location permission denied (tracking screen)
- [ ] Handles no network gracefully on each tab
- [ ] Feature flags (`store_enabled`, `payments_enabled`, `contracts_enabled`) hide disabled features

---

## 4. Sign-off
- [ ] All three apps tested on at least one real device + one browser (AdminPortal)
- [ ] RTL verified across all visual changes
- [ ] No console/Metro errors during happy-path runs
- [ ] Critical flows (WO assign→complete, WhatsApp send, checkout) verified end-to-end against the backend
