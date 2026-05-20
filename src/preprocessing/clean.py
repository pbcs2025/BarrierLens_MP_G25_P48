import pandas as pd

from src.preprocessing.load_data import FEATURE_COLS, IDENTIFIER_COLS


def handle_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Impute feature missingness: median for age, 'missing' category for others."""
    out = df.copy()
    id_and_target = set(IDENTIFIER_COLS) | {
        c for c in out.columns if c.startswith("target_") or c.startswith("v467")
    }
    feature_cols = [c for c in FEATURE_COLS if c in out.columns]

    if "v012" in feature_cols:
        out["v012"] = pd.to_numeric(out["v012"], errors="coerce")
        before_age = out["v012"].isnull().sum()
        out["v012"] = out["v012"].fillna(out["v012"].median())
        print(f"v012 (age) missing imputed: {before_age}")

    cat_cols = [c for c in feature_cols if c != "v012"]
    for col in cat_cols:
        out[col] = (
            out[col]
            .astype(str)
            .str.strip()
            .replace({"": pd.NA, "nan": pd.NA, "None": pd.NA})
        )
        n_missing = out[col].isna().sum()
        if n_missing:
            out[col] = out[col].fillna("missing")
            print(f"{col}: filled {n_missing} missing values with 'missing'")

    numeric_check = [c for c in out.columns if c not in id_and_target and c not in cat_cols]
    for col in numeric_check:
        if col == "v012":
            continue

    return out
