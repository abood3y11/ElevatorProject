# عرض سعر / عقد — Excel/PDF Export from the Company Templates

> Covers both the **quote** (عرض سعر) and the **contract** (عقد) documents. The
> contract template (`contract_template.xlsx`) is structurally identical to the
> quote; it fills from the **Contract** (number/dates/total) + its originating
> **request** (specs/payments/notes) + **Customer** (name). Endpoints:
> `GET /technicians/sales/contract-requests/{id}/contract-document.xlsx|.pdf`
> (filename `عقد <اسم العميل>`). Its `P150` price-in-words uses **our computed
> Arabic words** (the template's `=NumberToText()` VBA macro can't render in
> LibreOffice/plain Excel). After the ContractWizard builds a contract, a
> **ContractDocumentDialog** pops up for review + Excel/PDF export. Managers can
> also flag "العميل جاهز للتعاقد" from the request actions menu (`markReady` →
> `salesApi.markReadyToContract` → the existing `/ready-to-contract` endpoint,
> which already allows managers). Code: `backend/app/sales/contract_document.py`,
> `AdminPortal/src/pages/sales/ContractDocumentDialog.tsx`.

# عرض سعر — Excel/PDF Export from the Company Quote Template

How a saved sales **Quote** is turned into the company's elevator quotation
document (the fixed `quote.xlsx` the company maintains), as Excel or PDF.

## What it does

From the sales-request drawer → **إنشاء عرض سعر** (QuoteBuilderDialog), after the
quote is saved, two buttons export the **filled company template**:

- **تصدير Excel** → fills `quote_template.xlsx` and downloads `عرض سعر <اسم العميل>.xlsx`.
- **تصدير PDF** → renders that filled workbook to PDF (`عرض سعر <اسم العميل>.pdf`).

The file is named **عرض سعر {customer name}** (RFC-5987 UTF-8 in
`Content-Disposition`; the frontend also names the blob client-side).

## Data flow

```
Quote (price, customer)  ─┐
                          ├─►  fill_quote_template()  ─► .xlsx bytes ─► [LibreOffice] ─► .pdf
CustomerContractRequest ─┘     (app/sales/quote_document.py)
(elevator spec, add-ons)
```

Only **input cells** are written. Every derived cell is an Excel **formula**
left untouched (person count `=ROUND(F28/80,0)`, price-before-VAT `=M150/1.15`,
the three payment-row amounts, the seller address `=IF(B1="الرياض",…)`, rail
sizes `=IF(D1=TRUE,…)`, etc.) — Excel/LibreOffice recalculates them on open.

## Cell mapping (template ⇐ source)

| Cell | Meaning | Source |
|---|---|---|
| `B1` | Branch/city (مكة المكرمة ⇄ الرياض) — drives address + correspondence formulas | `request.site_city` ("رياض"→الرياض, else مكة المكرمة) |
| `C1` | VVVF (bool) | add-on match: vvvf / موفر / انفرتر |
| `D1` | 16mm rails (bool) | add-on match: 16 / سكك 16 / ثقيل |
| `E1` | الضمان (bool) | add-on match: ضمان / warranty |
| `F1` | Battery (bool) | add-on match: بطارية / طوارئ / battery / ups |
| `J12` | Offer date | `request.register_date` or today |
| `Q12` | Offer number (numeric) | last 6 digits of `quote.quote_number` |
| `E19` | **اسم العميل** (customer name) | `Customer.name` (the linked customer record) — NOT the contact person `contact_name` (جهة التواصل). Falls back to the contact only if no customer record. Also used for the download filename. |
| `I20` | District / address line | `request.site_region` / `site_address_text` |
| `R20` | Customer mobile (numeric) | `quote.customer_phone` / `request.contact_phone` (digits only) |
| `F25` | نوع المصعد | `request.elevator_type` |
| `R25` | عدد المصاعد | `request.elevators_count` |
| `F26` | عدد الوقفات | `request.stops_count` |
| `R26` | عدد الأدوار | `request.floors_count` |
| `F27` | نوع الأبواب | `request.door_external` |
| `R27` | مقاس الباب | `request.door_size` (numeric run) |
| `F28` | قوة المحرك (kg) → R28 persons | `request.capacity` (numeric run) |
| `R29` | عدد المداخل | `request.entrances_count` |
| `F30` `J30` | أبعاد البئر (عرض / طول) | `request.shaft_width` / `shaft_length` |
| `F69` | الباب الداخلي | `request.door_internal` |
| `M150` | **إجمالي السعر شامل 15% ضريبة** (master cell) | `quote.total` |
| `P150` | السعر بالحروف | Arabic words of `quote.total` (`number_to_arabic_words`) |
| `E145..E148` | المدة باليوم (payment 1-4) | editable payment schedule (QuoteBuilder) → `quote.payment_terms[].days` (default 30/20/40/60) |
| `F145..F148` | النسبة (payment 1-4) | editable schedule → `quote.payment_terms[].pct` (else `request.payment_pct_1..4`, else 40/25/30/5) |
| `O145..O148` | وقت الدفع (payment 1-4) | editable schedule → `quote.payment_terms[].when` (default = the 4 standard timing texts) |
| `F29` | السرعة | company setting `quote.speed` (else template text) |
| `D103` | مدة الضمان | company setting `quote.warranty_period` (else template text) |
| `B12` | offer validity (مدة هذا العرض NN يوم) | company setting `quote.validity_days` swaps the number (else 15) |
| `B155` `B156` `B157` | ملاحظات أخري | `request.note_1` / `note_2` / `note_3` (kept template text when empty) |

The الدفعة / الضريبة / الإجمالي columns (`H/J/L 145-147`) are **template
formulas** computed from `F` and `R141` — left untouched. Fields the request
doesn't carry (speed `F29`, warranty period `D103`) keep the template's own
default text. Add-on matches that miss leave the toggle off.

### Editable payment schedule (4 rows)

The QuoteBuilder dialog shows the four payment rows (الأولى..الرابعة) with
editable **المدة (يوم)**, **النسبة %** and **وقت الدفع**, seeded from the
request's percentage split (`payment_pct_1..4`) + standard day-counts/timing
texts. Saved on the quote (`payment_terms: [{label, pct, days, when}]`,
extended `QuotePaymentTermIn`) and flow into the template on export. The default
split sums to 100% (40/25/30/5).

### Adding الدفعة الرابعة to the template (one-time Excel edit)

The shipped template has only 3 payment rows (145/146/147; row 148 is blank).
To enable the 4th installment, edit the template in Excel **once** — because
row 148 already exists empty, you PASTE INTO it (no row insertion, so the price
cells `M150`/`R141` do NOT shift):

1. Select row **147** → Copy.
2. Select row **148** → Paste (replicates the merged cells, borders, formulas).
3. Set `B148` = **الدفعة الرابعة**.
4. Fix the one formula whose row-reference shifted on copy:
   `H148` = `=R141*F148/100` (J148/L148 copy correctly: `=H148*15%`, `=J148+H148`).
5. Save. Copy the file over `app/sales/templates/quote_template.xlsx` (the active
   asset), or keep editing that file directly.

The export already writes `E148/F148/O148`; once row 148 has the formulas the
الدفعة/الضريبة/الإجمالي compute automatically like the other rows.

## Company-settings gap fields

Fields with no per-request source are read from `CompanySettings` (key-value,
no migration), each falling back to the template's own text when unset:

| Key | Fills | Default behavior |
|---|---|---|
| `quote.speed` | `F29` السرعة | keep template "ـ 1م/ث" |
| `quote.warranty_period` | `D103` مدة الضمان | keep template "سنة" |
| `quote.validity_days` | `B12` مدة هذا العرض NN يوم | keep template 15 |

Set them via the existing company-settings endpoint/page (`quote.*` keys).

## Editing an existing quote (open from the request drawer)

The request drawer's "عروض الأسعار" rows are clickable (`onOpenQuote`) → they
reopen the QuoteBuilder in **edit mode** (`quote` prop) loaded with that quote's
line items (البنود), terms (الشروط), notes, payments, and a collapsible
**مواصفات المصعد** section with the worker-entered spec fields. Saving:
1. PATCHes the request spec (`salesApi.updateContractRequest` → the spec fields
   the manager corrected), then
2. updates the quote (`PATCH /sales/quotes/{id}`) or creates it (create mode).

So a draft quote can be opened, fully edited, and re-exported. Spec edits flow
into the template because the export reads the (now-updated) request.

## Endpoints

`app/sales/controllers/quotes.py` (gated to sales roles):

- `PATCH /api/v1/sales/quotes/{id}` → edit an existing quote (recomputes totals;
  `409` if already accepted).
- `GET /api/v1/sales/quotes/{id}/document.xlsx` → `200` filled workbook.
- `GET /api/v1/sales/quotes/{id}/document.pdf` → `200` PDF, or `503` if
  LibreOffice isn't installed (clear Arabic message → the UI says "use Excel"),
  or `502` if rendering fails.

Both `409` if the quote has no linked request (the template is elevator-spec
driven and needs one).

## The template asset

- Active template: **`backend/app/sales/templates/quote_template.xlsx`**
  (committed — `uploads/` is gitignored and does NOT deploy).
- The company's working copy lives at `backend/uploads/quote.xlsx`. When it
  changes, copy it over the committed asset (or set env
  **`QUOTE_TEMPLATE_PATH`** to an absolute path to use a different file without
  a code change).

## PDF dependency (LibreOffice)

PDF rendering shells out to a headless LibreOffice (`soffice --headless
--convert-to pdf`). Resolution order: `LIBREOFFICE_BIN` env → `soffice` /
`libreoffice` on PATH → standard Windows install dir.

- **Production:** the backend `Dockerfile` installs `libreoffice-calc` +
  `fonts-noto-core` + `fonts-kacst` (Arabic shaping). Rebuild the `api` image to
  enable PDF: `docker compose build api worker && docker compose up -d api worker`.
- **Local dev:** without LibreOffice the PDF endpoint returns `503` and the UI
  falls back to Excel; Excel export works everywhere.

## Files touched

- `backend/app/sales/quote_document.py` — fill + Arabic number-to-words + PDF render (new)
- `backend/app/sales/controllers/quotes.py` — `document.xlsx` / `document.pdf` endpoints
- `backend/app/sales/templates/quote_template.xlsx` — committed template asset (new)
- `backend/requirements.txt` — pin `openpyxl==3.1.5`
- `backend/Dockerfile` — LibreOffice Calc + Arabic fonts
- `AdminPortal/src/api/index.ts` — `quotesApi.downloadDocument`
- `AdminPortal/src/pages/sales/QuoteBuilderDialog.tsx` — Excel/PDF export buttons
- `AdminPortal/src/i18n/ar.ts` — `sales.quoteBuilder.exportExcel/exportPdf/excelError/pdfError`
