"""
Wrap each finance page with <FinanceStatProvider radius={FINANCE_PAGE_RADIUS.<key>}>
so its stat cards inherit a unique page-level visual identity.

Idempotent: skips files where FinanceStatProvider is already wrapping the
return Box.

Strategy per file:
  1. Ensure financeShared imports `FinanceStatProvider` and `FINANCE_PAGE_RADIUS`.
  2. Wrap the outermost `<Box>` of the page's return statement with the
     provider. Format:

       return (
         <FinanceStatProvider radius={FINANCE_PAGE_RADIUS.<key>}>
           <Box>...</Box>
         </FinanceStatProvider>
       );
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path("AdminPortal/src/pages/finance")

PAGES = [
    ("FinanceOverview.tsx", "overview"),
    ("FinanceReceivables.tsx", "receivables"),
    ("FinancePayables.tsx", "payables"),
    ("InvoicesPage.tsx", "invoices"),
    ("FinanceExpenses.tsx", "expenses"),
    ("FinancePurchasing.tsx", "purchasing"),
    ("FinanceAccounts.tsx", "accounts"),
    ("FinanceJournal.tsx", "journal"),
    ("FinanceStatements.tsx", "statements"),
    ("FinanceAssets.tsx", "assets"),
    ("FinanceVat.tsx", "vat"),
    ("FinanceBanks.tsx", "banks"),
    ("FinanceApprovals.tsx", "approvals"),
    ("FinancePeriods.tsx", "periods"),
    ("FinanceCostCenters.tsx", "costCenters"),
    ("FinanceWHT.tsx", "wht"),
    ("FinanceRecurringEntries.tsx", "recurringEntries"),
    ("FinanceBudget.tsx", "budget"),
    ("FinanceStatementOfAccount.tsx", "statementOfAccount"),
    ("FinanceZakat.tsx", "zakat"),
    ("FinanceCheques.tsx", "cheques"),
    ("FinanceCashFlowForecast.tsx", "cashFlowForecast"),
    ("FinanceJEApproval.tsx", "jeApproval"),
    ("FinanceRecurringInvoicesControl.tsx", "recurringInvoices"),
    ("FinanceExports.tsx", "exports"),
    ("FinanceReports.tsx", "reports"),
]


def ensure_imports(content: str) -> str:
    """Make sure `FinanceStatProvider` and `FINANCE_PAGE_RADIUS` are imported
    from `./financeShared`. If a financeShared import already exists, augment
    it. Otherwise add a new import line."""
    if "FinanceStatProvider" in content and "FINANCE_PAGE_RADIUS" in content:
        return content  # already imports both

    # Find any existing `from './financeShared'` import and rewrite it.
    pattern = re.compile(
        r"import\s*\{([^}]*)\}\s*from\s*['\"]\./financeShared['\"];?",
        re.MULTILINE,
    )
    m = pattern.search(content)
    if m:
        inside = m.group(1)
        items = [x.strip() for x in inside.split(",") if x.strip()]
        added = []
        if "FinanceStatProvider" not in items:
            items.append("FinanceStatProvider")
            added.append("FinanceStatProvider")
        if "FINANCE_PAGE_RADIUS" not in items:
            items.append("FINANCE_PAGE_RADIUS")
            added.append("FINANCE_PAGE_RADIUS")
        if added:
            new_import = "import { " + ", ".join(items) + " } from './financeShared';"
            content = content[: m.start()] + new_import + content[m.end():]
        return content

    # No existing financeShared import — add one at the top of imports.
    lines = content.split("\n")
    insert_at = 0
    for i, line in enumerate(lines):
        if re.match(r"^import .* from .*;\s*$", line):
            insert_at = i + 1
    new_lines = (
        lines[:insert_at]
        + ["import { FinanceStatProvider, FINANCE_PAGE_RADIUS } from './financeShared';"]
        + lines[insert_at:]
    )
    return "\n".join(new_lines)


def wrap_outermost_box(content: str, key: str) -> tuple[str, bool]:
    """Wrap the outermost <Box> of the return statement with the provider.

    Matches the pattern:
        return (
          <Box ...>
            ...
          </Box>
        );

    and rewrites to:
        return (
          <FinanceStatProvider radius={FINANCE_PAGE_RADIUS.<key>}>
            <Box ...>
              ...
            </Box>
          </FinanceStatProvider>
        );
    """
    # Already wrapped?
    if "<FinanceStatProvider" in content and f"FINANCE_PAGE_RADIUS.{key}" in content:
        return content, False

    # Find the page-level `return ( <Box` — first one only (top of component).
    return_re = re.compile(r"(return\s*\(\s*\n?\s*)(<Box[^>]*>)", re.MULTILINE)
    m = return_re.search(content)
    if not m:
        return content, False

    pre = m.group(1)
    box_open = m.group(2)
    start = m.start()
    end_of_box_open = m.end()

    # Walk forward to find the matching `</Box>` at top level.
    # Naive depth tracker on `<Box` / `</Box>`.
    cursor = end_of_box_open
    depth = 1
    box_re = re.compile(r"<Box[\s\S]*?>|</Box>")
    while depth > 0:
        m2 = box_re.search(content, cursor)
        if not m2:
            return content, False
        tag = m2.group(0)
        if tag.startswith("</Box"):
            depth -= 1
        else:
            depth += 1
        cursor = m2.end()
        if depth == 0:
            close_end = cursor
            break

    inner = content[end_of_box_open:close_end]
    # Build replacement
    wrapped = (
        pre
        + f"<FinanceStatProvider radius={{FINANCE_PAGE_RADIUS.{key}}}>\n      "
        + box_open
        + inner
        + "\n    </FinanceStatProvider>"
    )
    new_content = content[:start] + wrapped + content[close_end:]
    return new_content, True


def process(path: Path, key: str) -> str:
    if not path.exists():
        return f"SKIP - {path.name} does not exist"
    text = path.read_text(encoding="utf-8")
    new_text = ensure_imports(text)
    new_text, wrapped = wrap_outermost_box(new_text, key)
    if new_text == text:
        return f"SKIP - {path.name} already wired or no anchor"
    path.write_text(new_text, encoding="utf-8")
    note = "wrapped" if wrapped else "imports-only"
    return f"OK   - {path.name} ({note}) -> FINANCE_PAGE_RADIUS.{key}"


def main() -> int:
    for name, key in PAGES:
        msg = process(ROOT / name, key)
        try:
            print(msg)
        except UnicodeEncodeError:
            print(msg.encode("ascii", "replace").decode("ascii"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
