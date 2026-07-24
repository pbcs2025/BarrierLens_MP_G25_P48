"""Merge m14 (from m14_1 in IAIR7EFL.DTA) into NFHS5_Individual.csv.

Uses StataReader iterator to avoid loading the full 5k-column DTA into memory.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DTA_PATH = PROJECT_ROOT / "data" / "raw" / "IAIR7EFL.DTA"
CSV_PATH = PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv"


def read_m14_from_dta(path: Path) -> pd.DataFrame:
    with pd.read_stata(path, columns=["caseid", "m14_1"], iterator=True) as reader:
        m14_df = reader.read()
    m14_df = m14_df.rename(columns={"m14_1": "m14"})
    if m14_df["m14"].dtype.name == "category":
        m14_df["m14"] = pd.to_numeric(m14_df["m14"], errors="coerce")
    return m14_df


def main() -> None:
    if not DTA_PATH.exists():
        raise FileNotFoundError(f"Missing DTA file: {DTA_PATH}")
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Missing CSV extract: {CSV_PATH}")

    print(f"Reading m14_1 from {DTA_PATH.name} (iterator, low memory)...")
    m14_df = read_m14_from_dta(DTA_PATH)
    print(f"m14 non-null in DTA: {m14_df['m14'].notna().sum():,} / {len(m14_df):,}")

    existing = pd.read_csv(CSV_PATH, low_memory=False)
    existing.columns = existing.columns.str.strip()
    if "m14" in existing.columns:
        existing = existing.drop(columns=["m14"])

    merged = existing.merge(m14_df, on="caseid", how="left")
    merged.to_csv(CSV_PATH, index=False)

    n_nonnull = merged["m14"].notna().sum()
    print(f"Merged m14 into {CSV_PATH.name}")
    print(f"m14 non-null: {n_nonnull:,} / {len(merged):,} ({100 * n_nonnull / len(merged):.1f}%)")


if __name__ == "__main__":
    main()
