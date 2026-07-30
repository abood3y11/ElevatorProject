# WhatsApp Customer Templates

This document is the source map for customer-facing WhatsApp templates in ELMS.

There are two WhatsApp paths in the system:

1. **Lifecycle text messages** rendered by `backend/app/services/whatsapp_service.py`.
2. **Approved Meta templates** exposed by `backend/app/api/endpoints/customer_messages.py` and sent from `AdminPortal/src/pages/customers/WhatsAppMessages.tsx`.

## Backend Links

| Area | Backend / Frontend link |
| --- | --- |
| WhatsApp service defaults | `backend/app/services/whatsapp_service.py` |
| Meta template registry | `backend/app/api/endpoints/customer_messages.py` -> `TEMPLATE_DEFINITIONS` |
| API schemas | `backend/app/schemas/whatsapp.py` |
| Admin sender page | `AdminPortal/src/pages/customers/WhatsAppMessages.tsx` |
| Admin API client | `AdminPortal/src/api/customerMessages.ts` |
| Message log table | `whatsapp_messages` / `backend/app/models/whatsapp.py` |

## Admin Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/customer-messages/templates` | Lists Meta templates available in the admin sender. |
| `POST /api/v1/customer-messages/templates/send` | Sends one selected Meta template. |
| `GET /api/v1/customer-messages/completed-work-orders` | Lists completed work orders for admin review. |
| `POST /api/v1/customer-messages/completed-work-orders/send` | Sends one selected template to one or many completed work orders. |
| `GET /api/v1/customer-messages/inbox` | Reads stored inbound/outbound WhatsApp messages. |
| `GET /api/v1/customer-messages/contracts` | Lists contract renewal/expiry candidates. |
| `POST /api/v1/customer-messages/contracts/send` | Sends contract messages. |

## Completed Work Queue

The AdminPortal WhatsApp page has an **أعمال مكتملة** tab.

Behavior:

- The queue is generated live from technician-finished work orders.
- It includes `completed`, `closed`, and `pending_review` because technician completion can wait for admin review.
- The queue date uses `completed_at`, `actual_end`, `updated_at`, `scheduled_start`, or `created_at`, so yesterday's technician-finished work still appears even if the completion timestamp was not populated.
- Rows are shown even if the customer phone is missing; sending that row will fail with a clear missing-phone message instead of hiding the work order.
- Admin can select all or select individual work orders.
- Admin chooses one approved Meta template.
- The default template is `elms_service_closed_notice`.
- The send result is saved to `whatsapp_messages`.
- The page shows whether the selected template was sent today.

Important: `elms_technician_on_the_way` is intentionally **not** defined here because that template already exists elsewhere.

## Meta Templates Exposed In Backend

These are returned by `GET /customer-messages/templates`.

### 1. Technician Visit Confirmation

Backend key: `technican_visit`

Meta template name: `technican_visit`

Use: manual appointment confirmation.

```text
مرحبًا {{1}}، نحن نحدد موعدًا لزيارة فني لـ {{2}} في {{3}} بين {{4}} و {{5}}. يرجى تأكيد ما إذا كانت هذه الفترة مناسبة لك.

{{1}} = customer_name
{{2}} = service
{{3}} = date
{{4}} = start_time
{{5}} = end_time
```

### 2. Service Closed Notice

Backend key: `elms_service_closed_notice`

Meta template name: `elms_service_closed_notice`

Use: completed work queue default.

Header:

```text
زيارة الصيانة رقم ({{1}}#).

{{1}} = visit_number
```

Body:

```text
عزيزي العميل {{1}}،

✅تم الانتهاء من أعمال الصيانة للموقع {{2}} بتاريخ {{3}}.

رقم أمر العمل: {{4}}

شكراً لتعاونكم.

{{1}} = customer_name
{{2}} = site_name
{{3}} = date
{{4}} = work_order_number
```

Footer:

```text
مؤسسة حسين سفر النفيعي للمصاعد
```

### 3. Technician Arrived / Under Building

Backend key: `elms_technician_arrived`

Meta template name: `elms_technician_arrived`

Use: admin sends when the technician is at the building and needs access.

```text
الفني موجود الآن عند مبنى {{1}} لتنفيذ طلب الصيانة.
يرجى التكرم بفتح المدخل أو التواصل مع مسؤول الموقع.
رقم أمر العمل: {{2}}
{{3}}

{{1}} = site_name
{{2}} = work_order_number
{{3}} = company_name
```

### 4. Visit Rescheduled

Backend key: `elms_visit_rescheduled`

Meta template name: `elms_visit_rescheduled`

Use: admin sends when the visit date/time changes.

```text
تم تحديث موعد زيارة الصيانة للموقع {{1}}.
الموعد الجديد: {{2}}
رقم أمر العمل: {{3}}
{{4}}

{{1}} = site_name
{{2}} = date
{{3}} = work_order_number
{{4}} = company_name
```

### 5. Access Needed

Backend key: `elms_access_needed`

Meta template name: `elms_access_needed`

Use: admin sends when the technician cannot enter or needs customer action.

```text
نحتاج مساعدتكم لإكمال زيارة الصيانة في {{1}}.
الفني لم يتمكن من الدخول للمبنى أو الوصول إلى موقع المصعد.
يرجى التواصل مع مسؤول الموقع أو فتح المدخل.
رقم أمر العمل: {{2}}
{{3}}

{{1}} = site_name
{{2}} = work_order_number
{{3}} = company_name
```

### 6. Emergency Request Received

Backend key: `elms_emergency_received`

Meta template name: `elms_emergency_received`

Use: admin sends after receiving an emergency request.

```text
تم استلام بلاغكم الطارئ للموقع {{1}}.
سيتم متابعة الطلب وتحديثكم عند تعيين الفني.
رقم أمر العمل: {{2}}
{{3}}

{{1}} = site_name
{{2}} = work_order_number
{{3}} = company_name
```

### 7. Emergency Technician Assigned

Backend key: `elms_emergency_assigned`

Meta template name: `elms_emergency_assigned`

Use: admin sends after assigning a technician to an emergency work order.

```text
تم تعيين فني لمتابعة البلاغ الطارئ في {{1}}.
رقم أمر العمل: {{2}}
سيتم تحديثكم عند وصول الفني.
{{3}}

{{1}} = site_name
{{2}} = work_order_number
{{3}} = company_name
```

## Lifecycle Text Templates

These are setting-backed plain text templates in `WhatsAppService.DEFAULTS`.

| Event | Setting key | Trigger |
| --- | --- | --- |
| Same-day maintenance reminder | `whatsapp_template_visit_today` | Scheduler and same-day assignment |
| Work completed | `whatsapp_template_work_completed` | Completion / supervisor approval flow |
| Visit recommendations ready | `whatsapp_template_visit_recommendations` | Recommendation dispatch |
| Contract expiring soon | `whatsapp_template_contract_expiring` | Contract lifecycle |
| Contract expired | `whatsapp_template_contract_expired` | Contract lifecycle |

These use Python placeholders:

```text
{company_name}
{customer_name}
{contact_person_name}
{site_name}
{work_order_number}
{visit_number}
{scheduled_date}
{contract_number}
{start_date}
{end_date}
```

Recommendation messages also use:

```text
{recommendations_count}
{visit_url}
{store_url}
```

## Notes For Future Automation

- Manual/admin sending is already wired through `TEMPLATE_DEFINITIONS`.
- Automatic sending needs lifecycle hooks in backend services.
- Do not add `elms_technician_on_the_way` here unless the existing duplicate is removed from its other source.
- If a new Meta template is approved, add it to:
  - `TEMPLATE_DEFINITIONS`
  - this document
  - any AdminPortal filtering if it belongs in the completed-work queue.
