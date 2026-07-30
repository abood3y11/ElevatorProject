"""
One-shot: inject <PageHelp> + imports into every finance page.

Idempotent: skips files that already import PageHelp. For each page:
  1. Add 'import PageHelp from './PageHelp';' after the last relative import
  2. Add 'import { helpContent } from './pageHelpContent';' next to it
  3. Insert `<PageHelp {...helpContent.<key>} />` after the page's
     <Typography color="text.secondary" sx={{ mt: -3, ...}}>...</Typography>
     block (or right after </PageHeader> if no subtitle Typography exists).
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


PAGEHELP_IMPORT_BLOCK = (
    "import PageHelp from './PageHelp';\n"
    "import { helpContent } from './pageHelpContent';\n"
)


def has_import(content: str) -> bool:
    return "import PageHelp from './PageHelp'" in content


def add_imports(content: str) -> str:
    """Insert PageHelp imports right after the last `import ... from '...'` line."""
    lines = content.split("\n")
    last_import_idx = -1
    for i, line in enumerate(lines):
        if re.match(r"^import .* from .*;\s*$", line):
            last_import_idx = i
    if last_import_idx == -1:
        # No imports at all? bail
        return content
    # Insert after the last import
    new_lines = lines[: last_import_idx + 1] + [
        "import PageHelp from './PageHelp';",
        "import { helpContent } from './pageHelpContent';",
    ] + lines[last_import_idx + 1 :]
    return "\n".join(new_lines)


def insert_pagehelp_after_subtitle(content: str, key: str) -> tuple[str, bool]:
    """Insert <PageHelp /> right after the page's introductory subtitle
    Typography. Subtitle pattern: <Typography ... sx={{ mt: -3, ... }}>...</Typography>.

    Falls back to inserting right after </PageHeader> when no subtitle exists.
    Returns (new_content, inserted_bool).
    """
    pagehelp_jsx = f"      <PageHelp {{...helpContent.{key}}} />\n"

    # Strategy 1: insert after a `<Typography ... mt: -3 ...>...</Typography>` block.
    # Match the whole block including the closing tag, possibly multi-line.
    subtitle_re = re.compile(
        r"(<Typography[^>]*sx=\{\{[^}]*mt:\s*-3[^}]*\}\}[^>]*>[\s\S]*?</Typography>)",
        re.MULTILINE,
    )
    m = subtitle_re.search(content)
    if m:
        end = m.end()
        # Insert on the line AFTER the subtitle (find the next newline).
        # Place an empty line for visual separation.
        return content[:end] + "\n" + pagehelp_jsx.rstrip("\n") + content[end:], True

    # Strategy 2: insert right after the PageHeader self-closing tag or </PageHeader>.
    page_header_re = re.compile(r"(<PageHeader[\s\S]*?/>|<PageHeader[\s\S]*?</PageHeader>)", re.MULTILINE)
    m = page_header_re.search(content)
    if m:
        end = m.end()
        return content[:end] + "\n" + pagehelp_jsx.rstrip("\n") + content[end:], True

    # Strategy 3: insert right after the opening `return (\n    <Box>`.
    return_re = re.compile(r"(return\s*\(\s*\n\s*<Box[^>]*>)", re.MULTILINE)
    m = return_re.search(content)
    if m:
        end = m.end()
        return content[:end] + "\n" + pagehelp_jsx.rstrip("\n") + content[end:], True

    return content, False


def process_file(path: Path, key: str) -> str:
    if not path.exists():
        return f"SKIP — {path.name} does not exist"
    text = path.read_text(encoding="utf-8")
    if has_import(text):
        return f"SKIP — already wired in {path.name}"
    new_text = add_imports(text)
    new_text, inserted = insert_pagehelp_after_subtitle(new_text, key)
    if not inserted:
        return f"FAIL — could not find insertion anchor in {path.name}"
    path.write_text(new_text, encoding="utf-8")
    return f"OK   - {path.name} -> helpContent.{key}"


def main() -> int:
    for name, key in PAGES:
        msg = process_file(ROOT / name, key)
        try:
            print(msg)
        except UnicodeEncodeError:
            print(msg.encode("ascii", "replace").decode("ascii"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
