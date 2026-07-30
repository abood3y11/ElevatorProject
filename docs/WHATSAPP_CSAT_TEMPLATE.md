# CSAT Survey — Meta Template Submission

What to submit in **Meta Business Manager → WhatsApp Manager → Message Templates**
so the customer satisfaction survey («تقييم العميل») reaches every customer.

## Why a template is required

The survey code already works and can send today, but as a **free-form interactive
message**. Meta only delivers free-form messages inside the **24-hour customer service
window** — i.e. only to customers who messaged us in the last 24 hours. Most customers
have not, so most surveys would simply fail (they are recorded as `failed` and land in
`مراجعة`, so nothing is lost — but the response rate would be poor and biased toward
the customers who happen to chat).

An **approved template is deliverable at any time.** That is the whole difference.

---

## Template to create

| Field | Value |
| ----- | ----- |
| **Name** | `elms_service_rating` |
| **Category** | `UTILITY` |
| **Language** | Arabic (`ar`) |

> If Meta rejects `UTILITY`, resubmit as `MARKETING`. Do **not** use `AUTHENTICATION`.

### Body

Exactly one variable, `{{1}}` = the customer's name.

```
مرحباً {{1}}، تم إغلاق زيارة الصيانة.
كيف تقيّم الخدمة التي قدمناها لك؟
رأيك يساعدنا على تحسين خدمتنا.
```

Sample value for `{{1}}` when Meta asks: `محمد`

### Buttons — type **Quick Reply**, exactly three, in this order

| # | Button text |
| - | ----------- |
| 0 | `ممتاز` |
| 1 | `مقبول` |
| 2 | `غير راضٍ` |

**The order matters.** The backend attaches the meaning to each button position at
send time (`CSAT_TEMPLATE_QUICK_REPLY_PAYLOADS` in
`app/whatsapp/services/csat.py`):

| Button index | Text | Payload sent | Recorded rating |
| ------------ | ---- | ------------ | --------------- |
| 0 | ممتاز | `csat_5` | 5 |
| 1 | مقبول | `csat_3` | 3 |
| 2 | غير راضٍ | `csat_1` | 1 |

If you submit the buttons in a different order, change that constant to match —
otherwise a happy customer would be recorded as unhappy.

Meta caps quick-reply buttons at 3, which is why the scale is 5/3/1 rather than
1–5. The capture side already accepts `csat_1`..`csat_5`, so a richer scale
(e.g. a list message) can be swapped in later without touching the capture.

### Footer (optional)

```
شكراً لثقتك بنا
```

---

## After Meta approves it

1. Open **الإعدادات** in the AdminPortal (or set it directly in `company_settings`):

   | Setting | Value |
   | ------- | ----- |
   | `whatsapp_csat_template_name` | `elms_service_rating` |
   | `whatsapp_auto_csat_enabled` | `true` |

   Leaving `whatsapp_csat_template_name` empty keeps the old interactive send
   (24-hour window only), so the template name is the switch that makes the
   survey universally deliverable.

2. Complete one real work order for a customer with a valid phone and confirm:
   - a `csat_surveys` row appears with `status='sent'`
   - a `WhatsAppMessage` row appears with `template_name='csat_survey'` and
     `message_type='template'` (every send path creates one — CLAUDE.md §6)
   - tapping a button sets `csat_surveys.rating` **and**
     `work_orders.quality_rating`

3. That last part is what feeds:
   - the technician's `average_rating` in statistics,
   - the `تقييم جودة 5 نجوم +5` rule on «لوحة المنافسة».

   Before this wiring, ratings lived only in `csat_surveys` and
   `work_orders.quality_rating` was NULL on all 3,727 completed jobs — so the
   quality rule could never fire and the competition rewarded speed alone.

---

## Verifying the outgoing payload

The exact JSON posted to Meta (quick-reply payloads attached per button index):

```json
{
  "messaging_product": "whatsapp",
  "to": "9665XXXXXXXX",
  "type": "template",
  "template": {
    "name": "elms_service_rating",
    "language": { "code": "ar" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "محمد" }] },
      { "type": "button", "sub_type": "quick_reply", "index": "0",
        "parameters": [{ "type": "payload", "payload": "csat_5" }] },
      { "type": "button", "sub_type": "quick_reply", "index": "1",
        "parameters": [{ "type": "payload", "payload": "csat_3" }] },
      { "type": "button", "sub_type": "quick_reply", "index": "2",
        "parameters": [{ "type": "payload", "payload": "csat_1" }] }
    ]
  }
}
```

The customer's tap comes back as `type: "button"` with `button.payload`, which is a
different shape from an interactive reply — the webhook reads it via
`_template_button_payload` and hands it to the same capture path.
