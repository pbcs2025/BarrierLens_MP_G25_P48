#!/usr/bin/env python3
"""
Automated Notebook Test Runner for BarrierLens (P48).
Executes all notebooks in clean kernels in correct dependency order,
captures errors/timing, and outputs notebook_execution_report.json and .md.
"""

import sys
from pathlib import Path
import json
import time
import os
import nbformat
from nbconvert.preprocessors import ExecutePreprocessor

def _find_root():
    current = Path.cwd().resolve()
    while current != current.parent and not (current / "README.md").exists():
        current = current.parent
    return current

PROJECT_ROOT = _find_root()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

NOTEBOOK_SEQUENCE = [
    "00_data_exploration.ipynb",
    "00_data_exploration_executed.ipynb",
    "01_preprocessing.ipynb",
    "02_stage1_logistic.ipynb",
    "03_stage1_decision_tree.ipynb",
    "04_stage1_random_forest.ipynb",
    "05_stage1_xgboost.ipynb",
    "06_stage1_model_compare.ipynb",
    "07_data_integration.ipynb",
    "07_stage2_outcome_model.ipynb",
    "08_clustering.ipynb",
    "09_stage2_logistic.ipynb",
    "10_stage2_random_forest.ipynb",
    "11_stage2_xgboost.ipynb",
    "12_stage2_model_compare.ipynb",
    "09_barrierlens_platform.ipynb"
]

def run_notebooks():
    print("=" * 70)
    print("        BARRIERLENS (P48) AUTOMATED NOTEBOOK TEST RUNNER")
    print("=" * 70)
    print(f"Executing {len(NOTEBOOK_SEQUENCE)} notebooks in sequence...\n")

    results = []
    total_start = time.time()

    ep = ExecutePreprocessor(timeout=600, kernel_name='python3')
    nb_dir = PROJECT_ROOT / "notebooks"

    for nb_name in NOTEBOOK_SEQUENCE:
        nb_path = nb_dir / nb_name
        if not nb_path.exists():
            print(f"[SKIP] {nb_name:35s} | File not found!")
            results.append({
                "notebook": nb_name,
                "status": "SKIP",
                "duration_sec": 0,
                "error": "File not found"
            })
            continue

        print(f"Executing {nb_name:35s} ... ", end="", flush=True)
        start_t = time.time()
        try:
            with open(nb_path, "r", encoding="utf-8") as f:
                nb = nbformat.read(f, as_version=4)
            
            # Execute notebook with current working directory set to notebooks directory
            ep.preprocess(nb, {'metadata': {'path': str(nb_dir)}})
            
            # Overwrite notebook with executed outputs
            with open(nb_path, "w", encoding="utf-8") as f:
                nbformat.write(nb, f)

            dur = round(time.time() - start_t, 2)
            print(f"[PASS] ({dur}s)")
            results.append({
                "notebook": nb_name,
                "status": "PASS",
                "duration_sec": dur,
                "error": None
            })
        except Exception as e:
            dur = round(time.time() - start_t, 2)
            err_msg = str(e).splitlines()[-1] if str(e) else "Execution failed"
            print(f"[FAIL] ({dur}s) - {err_msg[:60]}")
            results.append({
                "notebook": nb_name,
                "status": "FAIL",
                "duration_sec": dur,
                "error": str(e)
            })

    total_dur = round(time.time() - total_start, 2)
    
    # Save Report JSON
    report_json_path = PROJECT_ROOT / "notebook_execution_report.json"
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_notebooks": len(NOTEBOOK_SEQUENCE),
            "total_duration_sec": total_dur,
            "passed": sum(1 for r in results if r["status"] == "PASS"),
            "failed": sum(1 for r in results if r["status"] == "FAIL"),
            "results": results
        }, f, indent=2)

    # Save Report Markdown
    report_md_path = PROJECT_ROOT / "notebook_execution_report.md"
    md_lines = [
        "# Notebook Execution Report",
        "",
        f"**Total Notebooks:** {len(NOTEBOOK_SEQUENCE)}  ",
        f"**Passed:** {sum(1 for r in results if r['status'] == 'PASS')}  ",
        f"**Failed:** {sum(1 for r in results if r['status'] == 'FAIL')}  ",
        f"**Total Duration:** {total_dur}s  ",
        "",
        "| Notebook | Status | Duration (s) | Error |",
        "|---|---|---|---|"
    ]
    for r in results:
        err_str = f"`{r['error'][:50]}`" if r['error'] else "-"
        md_lines.append(f"| `{r['notebook']}` | **{r['status']}** | {r['duration_sec']} | {err_str} |")

    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")

    print("\n" + "=" * 70)
    print(f"EXECUTION COMPLETE: {sum(1 for r in results if r['status'] == 'PASS')}/{len(NOTEBOOK_SEQUENCE)} PASSED ({total_dur}s)")
    print(f"Reports saved to:\n  - {report_json_path}\n  - {report_md_path}")
    print("=" * 70)

    return sum(1 for r in results if r["status"] == "FAIL") == 0

if __name__ == "__main__":
    success = run_notebooks()
    sys.exit(0 if success else 1)
