# Sales quote & contract documents

> Rewritten 2026-11-23. The earlier version of this file documented the fixed
> Excel workbooks (`quote_template.xlsx` / `contract_template.xlsx`, another
> company's form) and their cell fillers. Those were removed: every company now
> prints from **its own Word template**.

## What each export produces

| Screen | Button | Endpoint | Source |
|---|---|---|---|
| Quote builder / «عروض الأسعار» drawer | تصدير Word | `GET /api/v1/sales/quotes/{id}/document.docx` | `build_quote_document` — `companies/<slug>/quote_installation.docx`, else the default `quote_installation.docx` |
| same | تصدير PDF | `GET /api/v1/sales/quotes/{id}/document.pdf` | the same filled .docx through headless LibreOffice |
| Contract window after the wizard | تصدير Word | `GET /api/v1/technicians/sales/contract-requests/{id}/contract-document.docx` | `build_contract_document` — the same template «توليد العقد» uses, chosen by the contract's type, with its QR and `style.json` |
| same | تصدير PDF | `…/contract-document.pdf` | the same .docx converted |

The worker app's «عرض السعر» share (`OfferWorkPanel`) calls the quote `document.pdf`,
so it now shares the company's Word quote too.

## Templates

- Default set: `backend/app/maintenance/templates/{quote_installation,contract_installation,contract_maintenance}.docx`.
- Per company: `backend/app/maintenance/templates/companies/<companies.slug>/` overrides any of those
  by file name; `style.json` there sets `value_color` and `qr_dark`.
- Placeholder filling, run-merging traps and the QR swap live in
  `backend/app/maintenance/services/contract_document.py`.

## PDF conversion

`app/sales/quote_document.py` → `convert_to_pdf` / `render_docx_pdf` (headless `soffice`).
`app/sales/document_pdf.py` maps failures to Arabic HTTP errors:

- **503** — LibreOffice is not installed;
- **502** — it ran but produced no PDF (technical reason in the log only).

The API image installs `libreoffice-writer` (Calc cannot open .docx) and bundles the
**Cairo** font (`backend/fonts/`, SIL OFL) that every template is set in, so the PDF
does not reflow. Verified in production 2026-11-23: a template converts in ~1.7 s.

## Errors the user sees

- No contract built for the request yet → **409** «لم يُنشأ العقد لهذا الطلب بعد…».
- Template file missing → **422** in Arabic.
- The portal decodes Blob error bodies (`features/sales/api/salesApi.ts`), so the
  server's Arabic sentence is shown, not a generic message.

## Not printed any more

`Quote.template_overrides` / `Contract.template_overrides` (cell edits keyed by the old
workbook's refs, edited in the quote builder's cabin/motor/origin/notes tables) are still
stored but no Word template reads them. Whether to drop the column and the editor is an
open owner decision.

Tests: `backend/tests/integration/test_sales_word_documents.py`.
