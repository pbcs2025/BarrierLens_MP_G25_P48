#!/usr/bin/env python3
"""Build BarrierLens dashboard-ready CSV datasets (Guide Steps 4–5)."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.dashboard.pipeline import configure_logging, run_dashboard_pipeline


def main() -> None:
    configure_logging()
    results = run_dashboard_pipeline()
    print("\n=== Dashboard datasets generated ===")
    for name, df in results.items():
        if name == "validation_report":
            print(f"  validation_report: passed={df['passed']}")
        elif hasattr(df, "shape"):
            print(f"  {name}: {df.shape[0]:,} rows × {df.shape[1]} cols")
    print(f"\nOutput directory: {PROJECT_ROOT / 'data' / 'dashboard'}")


if __name__ == "__main__":
    main()
