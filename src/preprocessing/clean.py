import numpy as np
import pandas as pd

from src.preprocessing.load_data import BARRIER_SOURCE_COLS, FEATURE_COLS, IDENTIFIER_COLS

SPECIAL_CODES = [8, 9, 98, 99, 998, 999, 9998, 9999]
MISSING_TOKENS = {"", "nan", "none", "missing", "don't know", "dk"}


def _normalize_text(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip().str.lower()


def handle_missing(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert DHS special codes to NaN, then impute feature missingness.
    Barrier source columns are left untouched for target construction.
    """
    out = df.copy()
    protected = set(IDENTIFIER_COLS + BARRIER_SOURCE_COLS)
    protected |= {c for c in out.columns if c.startswith("target_")}

    feature_cols = [c for c in FEATURE_COLS if c in out.columns]
    if "v466" in out.columns and out["v466"].notna().sum() == 0:
        out = out.drop(columns=["v466"])
        print("Dropped v466 (100% missing in this extract)")

    for col in feature_cols:
        if pd.api.types.is_numeric_dtype(out[col]):
            out[col] = out[col].replace(SPECIAL_CODES, np.nan)
        else:
            normalized = _normalize_text(out[col])
            out[col] = normalized.replace(list(MISSING_TOKENS), np.nan)

    if "v012" in feature_cols:
        out["v012"] = pd.to_numeric(out["v012"], errors="coerce")
        age_missing = out["v012"].isnull().sum()
        if age_missing:
            out["v012"] = out["v012"].fillna(out["v012"].median())
            print(f"v012 (age) missing imputed: {age_missing}")

    cat_cols = [c for c in feature_cols if c != "v012"]
    for col in cat_cols:
        n_missing = out[col].isna().sum()
        if n_missing:
            out[col] = out[col].fillna("missing")
            print(f"{col}: filled {n_missing} missing values with 'missing'")

    before = out[feature_cols].isnull().sum().sum()
    print(f"Feature missing values remaining: {before}")
    return out
