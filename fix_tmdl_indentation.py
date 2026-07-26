"""Convert all TMDL files from 4-space indentation back to tab indentation.

TMDL specification requires tab characters for indentation.
Power BI Desktop will fail to parse any TMDL file that uses spaces.
"""

import re
from pathlib import Path

TABLES = Path(__file__).resolve().parent / "powerbi" / "BarrierLens.SemanticModel" / "definition" / "tables"

# Also fix model-level TMDL files
MODEL_DIR = TABLES.parent


def spaces_to_tabs(content: str) -> str:
    """Convert leading 4-space groups to tabs, line by line."""
    lines = content.splitlines(keepends=True)
    out = []
    for line in lines:
        # Count leading spaces in groups of 4
        stripped = line.lstrip(" ")
        n_spaces = len(line) - len(stripped)
        n_tabs = n_spaces // 4
        remainder = n_spaces % 4
        # Reconstruct: tabs + any leftover spaces + rest of line
        out.append("\t" * n_tabs + " " * remainder + stripped)
    return "".join(out)


fixed = []
unchanged = []

# Fix all table TMDL files
for f in sorted(TABLES.glob("*.tmdl")):
    original = f.read_text(encoding="utf-8")
    if "    " in original:  # has 4-space indentation
        updated = spaces_to_tabs(original)
        if updated != original:
            f.write_text(updated, encoding="utf-8")
            fixed.append(f.name)
        else:
            unchanged.append(f.name)
    else:
        unchanged.append(f.name)

# Also fix model-level files
for fname in ["model.tmdl", "relationships.tmdl", "expressions.tmdl", "database.tmdl"]:
    f = MODEL_DIR / fname
    if f.exists():
        original = f.read_text(encoding="utf-8")
        if "    " in original:
            updated = spaces_to_tabs(original)
            if updated != original:
                f.write_text(updated, encoding="utf-8")
                fixed.append(f.name)
            else:
                unchanged.append(f.name)

print("=" * 50)
print("TMDL Indentation Fix — Spaces to Tabs")
print("=" * 50)
print(f"Fixed  ({len(fixed)}):")
for n in fixed:
    print("  " + n)
print(f"Unchanged ({len(unchanged)}):")
for n in unchanged:
    print("  " + n)

# Verify
print()
print("=== Post-fix verification ===")
all_ok = True
for f in sorted(TABLES.glob("*.tmdl")):
    content = f.read_text(encoding="utf-8")
    lines = content.splitlines()
    space_indented = [l for l in lines if l.startswith("    ")]
    if space_indented:
        print("STILL SPACES: " + f.name + " (" + str(len(space_indented)) + " lines)")
        all_ok = False
    else:
        print("OK TABS: " + f.name)

if all_ok:
    print()
    print("PASS: All TMDL files now use tab indentation.")
