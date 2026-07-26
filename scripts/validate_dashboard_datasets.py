#!/usr/bin/env python3
"""Validate dashboard CSVs and write validation_report.json + data_dictionary.md."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.dashboard.constants import DASHBOARD_DIR
from src.dashboard.pipeline import _write_data_dictionary
from src.dashboard.validation import (
    ValidationReport,
    validate_cluster_coverage,
    validate_demographic_suppression,
    validate_rate_columns,
    validate_row_counts,
    validate_stage2_denominators,
    validate_state_uniqueness,
)


def main() -> None:
    master = pd.read_csv(DASHBOARD_DIR / "woman_level_master.csv", low_memory=False)
    state = pd.read_csv(DASHBOARD_DIR / "state_level_summary.csv")
    demo = pd.read_csv(DASHBOARD_DIR / "demographic_summary.csv")

    report = ValidationReport()
    validate_row_counts(master, report)
    validate_cluster_coverage(master, report)
    validate_stage2_denominators(master, report)
    validate_rate_columns(
        master,
        [
            "observed_household",
            "observed_logistic",
            "observed_facility",
            "pred_household_prob",
            "pred_logistic_prob",
            "pred_facility_prob",
            "composite_barrier_score",
        ],
        report,
    )
    validate_state_uniqueness(state, report)
    validate_rate_columns(
        state,
        [c for c in state.columns if "rate" in c or "prob" in c or "score" in c],
        report,
    )
    validate_demographic_suppression(demo, report)

    report.save_json(DASHBOARD_DIR / "validation_report.json")
    _write_data_dictionary()

    result = report.to_dict()
    print(f"Validation passed: {result['passed']}")
    if result["warnings"]:
        print("Warnings:", *result["warnings"], sep="\n  ")
    if result["errors"]:
        print("Errors:", *result["errors"], sep="\n  ")
        sys.exit(1)


if __name__ == "__main__":
    main()
