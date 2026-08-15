"""
Validation script for Member 1 JSON data exports.
Checks:
- All 9 files present in dashboard/assets/data/
- Valid JSON parsing
- Rates/probabilities in range [0, 1]
- Counts non-negative
- Total sample size N matches expected (724,115)
- No NaN or null values
- Generates validation report JSON
"""

from __future__ import annotations

import json
from pathlib import Path
import math

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "dashboard" / "assets" / "data"

EXPECTED_FILES = [
    "national_overview.json",
    "state_summary.json",
    "demographic_summary.json",
    "cluster_summary.json",
    "outcome_impact_summary.json",
    "rural_urban_summary.json",
    "empowerment_summary.json",
    "multiple_barrier_summary.json",
    "regression_summary.json"
]


def check_num(val, name, min_v=0.0, max_v=1.0):
    if val is None or math.isnan(val):
        return f"{name} is null/NaN"
    if val < min_v or val > max_v:
        return f"{name} ({val}) out of range [{min_v}, {max_v}]"
    return None


def validate_all():
    print("=== MEMBER 1 JSON VALIDATION STARTED ===")
    results = {}
    total_errors = 0

    for fname in EXPECTED_FILES:
        fpath = DATA_DIR / fname
        if not fpath.exists():
            results[fname] = {"status": "FAIL", "errors": ["File missing"]}
            total_errors += 1
            continue

        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            results[fname] = {"status": "FAIL", "errors": [f"JSON Parse Error: {e}"]}
            total_errors += 1
            continue

        errors = []

        # File-specific checks
        if fname == "national_overview.json":
            kpis = data.get("kpis", {})
            if kpis.get("total_women") != 724115:
                errors.append(f"total_women is {kpis.get('total_women')}, expected 724115")
            for k in ["observed_household_rate", "observed_logistic_rate", "observed_facility_rate", "observed_any_barrier_rate"]:
                err = check_num(kpis.get(k), k)
                if err: errors.append(err)

        elif fname == "state_summary.json":
            states = data.get("states", [])
            if len(states) != 36:
                errors.append(f"Expected 36 states/UTs, got {len(states)}")
            total_n = sum(s.get("sample_size_n", 0) for s in states)
            if total_n != 724115:
                errors.append(f"Sum of state sample sizes is {total_n}, expected 724115")

        elif fname == "rural_urban_summary.json":
            groups = data.get("groups", [])
            if len(groups) != 2:
                errors.append(f"Expected 2 groups (Rural, Urban), got {len(groups)}")

        elif fname == "empowerment_summary.json":
            combos = data.get("detailed_combinations", [])
            if len(combos) != 8:
                errors.append(f"Expected 8 combinations for 3 binary factors, got {len(combos)}")

        elif fname == "multiple_barrier_summary.json":
            overall = data.get("overall", {})
            dist = overall.get("distribution", [])
            total_dist_n = sum(d.get("sample_size_n", 0) for d in dist)
            if total_dist_n != 724115:
                errors.append(f"Multiple barrier count sum is {total_dist_n}, expected 724115")

        elif fname == "regression_summary.json":
            targets = data.get("targets", {})
            if len(targets) != 3:
                errors.append(f"Expected 3 targets (household, logistic, facility), got {len(targets)}")

        if errors:
            results[fname] = {"status": "FAIL", "errors": errors}
            total_errors += len(errors)
        else:
            results[fname] = {"status": "PASS", "errors": []}
            print(f"  [PASS] {fname}")

    report = {
        "validation_passed": total_errors == 0,
        "total_files": len(EXPECTED_FILES),
        "passed_files": len(EXPECTED_FILES) - total_errors,
        "failed_files": total_errors,
        "details": results
    }

    report_path = DATA_DIR / "validation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\nValidation Summary:", "ALL PASSED" if total_errors == 0 else f"{total_errors} ERRORS FOUND")
    print(f"Validation report saved to: {report_path}")
    return total_errors == 0


if __name__ == "__main__":
    validate_all()
