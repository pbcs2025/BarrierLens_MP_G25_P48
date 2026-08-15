#!/usr/bin/env python3
"""Validate report page queryRef fields against semantic model TMDL."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TABLES_DIR = PROJECT_ROOT / "powerbi" / "BarrierLens.SemanticModel" / "definition" / "tables"
PAGES_DIR = PROJECT_ROOT / "powerbi" / "BarrierLens.Report" / "definition" / "pages"


def _load_model_fields() -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    for tmdl in TABLES_DIR.glob("*.tmdl"):
        text = tmdl.read_text(encoding="utf-8")
        tname = tmdl.stem
        fields: set[str] = set()
        for col in re.findall(r"^\tcolumn ('[^']+'|\S+)", text, re.M):
            fields.add(col.strip("'"))
        for measure in re.findall(r"^\tmeasure '([^']+)'", text, re.M):
            fields.add(measure)
        out[tname] = fields
    return out


def main() -> int:
    fields = _load_model_fields()
    errors: list[str] = []
    for page in sorted(PAGES_DIR.glob("*/page.json")):
        data = json.loads(page.read_text(encoding="utf-8"))
        for vc in data.get("visualContainers", []):
            cfg = vc.get("config", "")
            for ref in re.findall(r'"queryRef": "([^"]+)"', cfg):
                if "." not in ref:
                    continue
                table, col = ref.split(".", 1)
                if table not in fields:
                    errors.append(f"{page.parent.name}: unknown table `{table}`")
                elif col not in fields[table]:
                    errors.append(f"{page.parent.name}: unknown field `{table}.{col}`")

    print(f"Tables in model: {len(fields)}")
    print(f"Pages checked: {len(list(PAGES_DIR.glob('*/page.json')))}")
    if errors:
        print(f"ERRORS: {len(errors)}")
        for err in errors:
            print(f"  - {err}")
        return 1
    print("All queryRef fields resolve to semantic model columns/measures.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
