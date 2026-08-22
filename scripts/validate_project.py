#!/usr/bin/env python3
"""
Automated Project Validation Script for BarrierLens (P48).
Checks workspace directories, raw & processed datasets, saved models,
dashboard tables, notebook validity, and platform readiness.
"""

import sys
from pathlib import Path
import json
import glob
import os

def _find_root():
    current = Path.cwd().resolve()
    while current != current.parent and not (current / "README.md").exists():
        current = current.parent
    return current

PROJECT_ROOT = _find_root()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

def run_validation():
    print("=" * 60)
    print("      BARRIERLENS (P48) AUTOMATED PROJECT VALIDATION")
    print("=" * 60)
    print(f"Project Root: {PROJECT_ROOT}\n")

    passes = 0
    fails = 0

    def check(name, condition, message=""):
        nonlocal passes, fails
        if condition:
            print(f"[PASS] {name}")
            passes += 1
        else:
            print(f"[FAIL] {name} - {message}")
            fails += 1

    # 1. Project directories
    req_dirs = ["data/raw", "data/processed", "notebooks", "scripts", "src", "saved_models", "dashboard", "platform", "outputs"]
    for d in req_dirs:
        p = PROJECT_ROOT / d
        check(f"Directory '{d}'", p.is_dir(), "Directory missing")

    # 2. Python imports
    try:
        import pandas
        import numpy
        import sklearn
        import xgboost
        import shap
        import joblib
        import streamlit
        check("Core Dependencies (pandas, sklearn, xgboost, shap, streamlit)", True)
    except Exception as e:
        check("Core Dependencies", False, str(e))

    # 3. Raw dataset
    raw_csv = PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv"
    check("Raw Dataset (NFHS5_Individual.csv)", raw_csv.exists() and raw_csv.stat().st_size > 1000, "Dataset missing or empty in data/raw/")

    # 4. Processed data
    proc_files = ["X_features.csv", "y_household.csv", "y_logistic.csv", "y_facility.csv"]
    for pf in proc_files:
        p = PROJECT_ROOT / "data" / "processed" / pf
        check(f"Processed file '{pf}'", p.exists(), "File missing in data/processed/")

    # 5. Stage 1 Models
    stage1_dir = PROJECT_ROOT / "saved_models" / "stage1"
    s1_pkls = list(stage1_dir.glob("*.pkl")) if stage1_dir.exists() else []
    check("Stage 1 Saved Models (.pkl)", len(s1_pkls) >= 12, f"Expected 12 models, found {len(s1_pkls)}")

    # 6. Stage 2 Data & Models
    s2_proc_dir = PROJECT_ROOT / "data" / "processed" / "stage2"
    check("Stage 2 Processed Directory", s2_proc_dir.is_dir(), "Directory missing")
    
    stage2_dir = PROJECT_ROOT / "saved_models" / "stage2"
    s2_pkls = list(stage2_dir.glob("*.pkl")) if stage2_dir.exists() else []
    check("Stage 2 Saved Models (.pkl)", len(s2_pkls) >= 4, f"Expected >= 4 models, found {len(s2_pkls)}")

    # 7. Notebooks JSON validity
    notebooks = sorted(glob.glob(str(PROJECT_ROOT / "notebooks" / "*.ipynb")))
    check(f"Notebooks Count ({len(notebooks)} found)", len(notebooks) >= 15, "Expected 16 notebooks")

    invalid_nbs = []
    conflict_nbs = []
    for nb in notebooks:
        nb_name = os.path.basename(nb)
        try:
            with open(nb, "r", encoding="utf-8") as f:
                text = f.read()
            if "<<<<<<<" in text or ">>>>>>>" in text:
                conflict_nbs.append(nb_name)
            json.loads(text)
        except Exception:
            invalid_nbs.append(nb_name)

    check("Notebooks JSON Validity", len(invalid_nbs) == 0, f"Invalid JSON in: {invalid_nbs}")
    check("Notebooks Conflict-Free", len(conflict_nbs) == 0, f"Merge conflicts in: {conflict_nbs}")

    # 8. Dashboard static files & data
    dash_index = PROJECT_ROOT / "dashboard" / "index.html"
    check("Dashboard index.html", dash_index.exists(), "File missing")

    dash_data = PROJECT_ROOT / "dashboard" / "assets" / "data"
    json_files = list(dash_data.glob("*.json")) if dash_data.exists() else []
    check("Dashboard JSON Exports", len(json_files) >= 5, f"Found {len(json_files)} JSON files")

    # 9. Streamlit platform
    platform_app = PROJECT_ROOT / "platform" / "app.py"
    check("Platform app.py", platform_app.exists() and platform_app.stat().st_size > 100, "platform/app.py missing or empty")

    print("=" * 60)
    print(f"VALIDATION SUMMARY: {passes} PASSED, {fails} FAILED")
    print("=" * 60)

    return fails == 0

if __name__ == "__main__":
    success = run_validation()
    sys.exit(0 if success else 1)
