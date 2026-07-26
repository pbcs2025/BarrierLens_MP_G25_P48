"""Validation rules for dashboard datasets (Guide Sections 11, 20, 29)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from src.dashboard.constants import EXPECTED_N_WOMEN, MIN_CELL_N


@dataclass
class ValidationReport:
    checks: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def check(self, name: str, passed: bool, detail: str = "") -> None:
        self.checks.append({"name": name, "passed": passed, "detail": detail})
        if not passed:
            self.errors.append(f"{name}: {detail}")

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def to_dict(self) -> Dict[str, Any]:
        def _convert(obj: Any) -> Any:
            if isinstance(obj, (np.bool_, bool)):
                return bool(obj)
            if isinstance(obj, dict):
                return {k: _convert(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_convert(v) for v in obj]
            return obj

        return _convert(
            {
                "passed": len(self.errors) == 0,
                "n_checks": len(self.checks),
                "n_errors": len(self.errors),
                "n_warnings": len(self.warnings),
                "checks": self.checks,
                "errors": self.errors,
                "warnings": self.warnings,
            }
        )

    def save_json(self, path) -> None:
        path = __import__("pathlib").Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")


def validate_row_counts(master: pd.DataFrame, report: ValidationReport) -> None:
    n = len(master)
    report.check(
        "row_count_total",
        n == EXPECTED_N_WOMEN,
        f"expected {EXPECTED_N_WOMEN:,}, got {n:,}",
    )


def validate_rate_columns(df: pd.DataFrame, rate_cols: List[str], report: ValidationReport) -> None:
    for col in rate_cols:
        if col not in df.columns:
            report.warn(f"Rate column missing for validation: {col}")
            continue
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if series.empty:
            continue
        bad = series[(series < 0) | (series > 1)]
        report.check(
            f"rate_bounds_{col}",
            bad.empty,
            f"{len(bad)} values outside [0, 1]" if not bad.empty else "",
        )


def validate_cluster_coverage(master: pd.DataFrame, report: ValidationReport) -> None:
    if "cluster_id" not in master.columns:
        report.check("cluster_coverage", False, "cluster_id column missing")
        return
    missing = master["cluster_id"].isna().sum()
    report.check(
        "cluster_coverage",
        missing == 0,
        f"{missing:,} rows without cluster assignment",
    )


def validate_demographic_suppression(demo: pd.DataFrame, report: ValidationReport) -> None:
    if "suppress_flag" not in demo.columns or "N" not in demo.columns:
        report.check("demographic_suppression", False, "suppress_flag or N missing")
        return
    small = demo[demo["N"] < MIN_CELL_N]
    unsuppressed = small[small["suppress_flag"] == False]  # noqa: E712
    report.check(
        "demographic_suppression",
        unsuppressed.empty,
        f"{len(unsuppressed)} cells with N<{MIN_CELL_N} not suppressed",
    )
    flagged = demo[demo["suppress_flag"] == True]  # noqa: E712
    if not flagged.empty:
        null_rates = flagged[["mean_observed_rate", "mean_predicted_prob"]].notna().any(axis=1).sum()
        report.check(
            "suppressed_cells_null_rates",
            null_rates == 0,
            f"{null_rates} suppressed rows still carry rate values",
        )


def validate_state_uniqueness(state_df: pd.DataFrame, report: ValidationReport) -> None:
    dupes = state_df["state_name"].duplicated().sum()
    report.check(
        "state_unique",
        dupes == 0,
        f"{dupes} duplicate state rows",
    )


def validate_stage2_denominators(master: pd.DataFrame, report: ValidationReport) -> None:
    for target in ("target_unmet_fp", "target_anc_gap"):
        col = f"observed_{target}"
        if col not in master.columns:
            continue
        valid_n = master[col].notna().sum()
        if valid_n == 0:
            report.warn(f"{target}: 0 valid rows — Stage 2 dashboard metrics will be empty")
        else:
            report.check(
                f"{target}_valid_n_documented",
                True,
                f"{valid_n:,} women in analytic sample",
            )
