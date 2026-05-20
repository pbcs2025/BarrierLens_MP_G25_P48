import pandas as pd

from src.preprocessing.load_data import (
    BONUS_COLS,
    IDENTIFIER_COLS,
    STAGE2_COLS,
)


def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Drop identifiers and non-Stage-1 columns; one-hot encode categoricals.
    Keeps v012 (age) as numeric.
    """
    out = df.copy()
    drop_cols = (
        IDENTIFIER_COLS
        + [c for c in STAGE2_COLS + BONUS_COLS if c in out.columns]
        + [c for c in out.columns if c.startswith("target_")]
    )
    out = out.drop(columns=[c for c in drop_cols if c in out.columns])

    if "v012" in out.columns:
        out["v012"] = pd.to_numeric(out["v012"], errors="coerce")

    cat_cols = [c for c in out.columns if c != "v012" and c != "media_exposure_index"]
    if cat_cols:
        for col in cat_cols:
            out[col] = out[col].astype(str).str.strip().str.lower()
        out = pd.get_dummies(out, columns=cat_cols, drop_first=True, dtype=int)

    return out
