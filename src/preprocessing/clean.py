import pandas as pd


def handle_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Median-impute missing values for all non-identifier columns."""
    out = df.copy()
    id_cols = ["District Names", "State/UT"]
    numeric_cols = [c for c in out.columns if c not in id_cols]
    out[numeric_cols] = out[numeric_cols].apply(pd.to_numeric, errors="coerce")

    before_nulls = out[numeric_cols].isnull().sum().sum()
    print(f"Total missing values before imputation: {before_nulls}")

    for col in numeric_cols:
        if out[col].isnull().any():
            out[col] = out[col].fillna(out[col].median())

    after_nulls = out[numeric_cols].isnull().sum().sum()
    print(f"Total missing values after imputation: {after_nulls}")
    return out
