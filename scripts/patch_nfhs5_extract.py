"""Patch or rebuild NFHS5_Individual.csv from IAIR7EFL.DTA.

Use when the working CSV is missing columns that exist in the Stata recode
(e.g. m14 for Stage 2 / target_anc_gap). Safe to re-run: only merges columns
not already present, keyed on caseid.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing.load_data import CSV_PATH, DTA_PATH, STAGE1_RAW_COLS, _load_from_stata


def _report_key_columns(df: pd.DataFrame) -> None:
    for col in ["m14", "v467f", "v467i"]:
        if col in df.columns:
            nn = int(df[col].notna().sum())
            print(f"{col}: present, non-null {nn:,} / {len(df):,}")
        else:
            print(f"{col}: NOT IN FILE")


def patch_csv_from_dta(dta_path: Path = DTA_PATH, csv_path: Path = CSV_PATH) -> pd.DataFrame:
    if not dta_path.exists():
        raise FileNotFoundError(
            f"Stata file not found: {dta_path}\n"
            "Place IAIR7EFL.DTA in data/raw/ (DHS women's individual recode) and re-run."
        )

    if not csv_path.exists():
        print(f"CSV not found at {csv_path}; exporting full Stage 1 extract from DTA.")
        df = _load_from_stata(dta_path)
        df.to_csv(csv_path, index=False)
        print(f"Wrote {csv_path.name} -> {df.shape}")
        _report_key_columns(df)
        return df

    existing = pd.read_csv(csv_path, low_memory=False)
    existing.columns = existing.columns.str.strip()

    reader = pd.read_stata(dta_path, iterator=True)
    available = set(reader.variable_labels().keys())
    reader.close()

    missing_from_csv = [c for c in STAGE1_RAW_COLS if c not in existing.columns]
    to_add = [c for c in missing_from_csv if c in available]
    absent_in_dta = [c for c in missing_from_csv if c not in available]

    if absent_in_dta:
        print(f"Columns not in DTA (expected for India on some items): {absent_in_dta}")

    if not to_add:
        print(f"{csv_path.name} already has all DTA-available Stage 1 columns.")
        _report_key_columns(existing)
        return existing

    pull_cols = ["caseid"] + [c for c in to_add if c != "caseid"]
    dta_slice = pd.read_stata(dta_path, columns=pull_cols)
    dta_slice.columns = dta_slice.columns.str.strip()

    patched = existing.merge(dta_slice, on="caseid", how="left")
    patched.to_csv(csv_path, index=False)
    print(f"Patched {csv_path.name} -> {patched.shape}")
    for col in to_add:
        nn = int(patched[col].notna().sum())
        print(f"  added {col}: non-null {nn:,} / {len(patched):,}")

    _report_key_columns(patched)
    return patched


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Merge missing Stage 1 columns from IAIR7EFL.DTA into NFHS5_Individual.csv"
    )
    parser.add_argument("--dta", type=Path, default=DTA_PATH, help="Path to IAIR7EFL.DTA")
    parser.add_argument("--csv", type=Path, default=CSV_PATH, help="Path to NFHS5_Individual.csv")
    args = parser.parse_args()
    patch_csv_from_dta(args.dta, args.csv)


if __name__ == "__main__":
    main()
