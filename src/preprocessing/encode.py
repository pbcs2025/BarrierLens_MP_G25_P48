import pandas as pd

from src.preprocessing.load_data import (
    BONUS_COLS,
    IDENTIFIER_COLS,
    MEDIA_COLS,
    STAGE2_COLS,
)
from src.preprocessing.engineer_features import EDUCATION_ORDER, WEALTH_ORDER

AGE_GROUP_ORDER = {
    "15-19": 0,
    "20-24": 1,
    "25-29": 2,
    "30-34": 3,
    "35-39": 4,
    "40-44": 5,
    "45-49": 6,
}

ORDINAL_COLS = {
    "v013": AGE_GROUP_ORDER,
    "v106": EDUCATION_ORDER,
    "v190": WEALTH_ORDER,
}

NOMINAL_COLS = ["v024", "v130", "v131", "v501", "v717", "v743f", "v481", "v169a", "v170"]
ENGINEERED_NUMERIC = ["media_exposure_index", "digital_inclusion_index", "vulnerability_score"]
DROP_AFTER_ENGINEERING = MEDIA_COLS + ["v169a", "v170"]


def _normalize(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip().str.lower()


def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    """Drop identifiers/non-Stage-1 columns; encode ordinals and one-hot nominals."""
    out = df.copy()
    drop_cols = (
        IDENTIFIER_COLS
        + [c for c in STAGE2_COLS + BONUS_COLS if c in out.columns]
        + [c for c in out.columns if c.startswith("target_")]
        + [c for c in DROP_AFTER_ENGINEERING if c in out.columns]
    )
    out = out.drop(columns=[c for c in drop_cols if c in out.columns])

    if "v012" in out.columns:
        out["v012"] = pd.to_numeric(out["v012"], errors="coerce")

    if "v025" in out.columns:
        out["v025"] = (_normalize(out["v025"]) == "urban").astype(int)

    for col, mapping in ORDINAL_COLS.items():
        if col in out.columns:
            out[col] = _normalize(out[col]).map(mapping)

    one_hot_cols = [c for c in NOMINAL_COLS if c in out.columns]
    if one_hot_cols:
        for col in one_hot_cols:
            out[col] = _normalize(out[col])
        out = pd.get_dummies(out, columns=one_hot_cols, drop_first=True, dtype=int)

    numeric_cols = ["v012", "v025"] + list(ORDINAL_COLS.keys()) + ENGINEERED_NUMERIC
    for col in numeric_cols:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0)

    return out
