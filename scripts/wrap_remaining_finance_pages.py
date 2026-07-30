"""
Patch the 5 finance pages whose `return ( <Box>` couldn't be auto-wrapped
by wrap_finance_stat_provider.py. For each, wrap the outermost <Box> by
matching the FIRST `<Box>` after `return (` and the LAST `</Box>` before
the closing `);` of the page component.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path("AdminPortal/src/pages/finance")

PAGES = [
    ("FinanceOverview.tsx", "overview"),
    ("FinancePayables.tsx", "payables"),
    ("FinancePeriods.tsx", "periods"),
    ("FinanceBudget.tsx", "budget"),
    ("FinanceZakat.tsx", "zakat"),
]


def patch(path: Path, key: str) -> str:
    if not path.exists():
        return f"SKIP - {path.name} missing"
    text = path.read_text(encoding="utf-8")
    if "<FinanceStatProvider" in text:
        return f"SKIP - {path.name} already wrapped"

    # Find the first `return (` in the file (page top-level return).
    return_match = re.search(r"return\s*\(\s*\n?\s*<Box", text)
    if not return_match:
        return f"FAIL - {path.name}: no `return ( <Box>` found"

    start = return_match.start()
    # Find the first `<Box` after `return (`
    after_return = text[return_match.start():]
    box_start_in_after = after_return.find("<Box")
    if box_start_in_after < 0:
        return f"FAIL - {path.name}: no <Box> after return"

    box_start_abs = return_match.start() + box_start_in_after

    # Find the LAST `</Box>` before the closing `);` of the return.
    # The page-component pattern ends with:
    #     </Box>
    #   );
    # };
    closing_re = re.compile(r"</Box>\s*\n?\s*\)\s*;\s*\n?\s*};?", re.MULTILINE)
    closing = closing_re.search(text, box_start_abs)
    if not closing:
        return f"FAIL - {path.name}: no `</Box>\\n  );` end"

    closing_box_end = closing.start() + len("</Box>")

    # Build the wrapped content.
    new_text = (
        text[:return_match.start()]
        + "return (\n    <FinanceStatProvider radius={FINANCE_PAGE_RADIUS." + key + "}>\n    "
        + text[box_start_abs:closing_box_end]
        + "\n    </FinanceStatProvider>"
        + text[closing_box_end:]
    )
    path.write_text(new_text, encoding="utf-8")
    return f"OK   - {path.name} (manual wrap) -> {key}"


def main() -> int:
    for name, key in PAGES:
        msg = patch(ROOT / name, key)
        try:
            print(msg)
        except UnicodeEncodeError:
            print(msg.encode("ascii", "replace").decode("ascii"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
