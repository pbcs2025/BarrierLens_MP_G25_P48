import pandas as pd

from src.preprocessing.load_data import MEDIA_COLS

MEDIA_ORDER = {
    "not at all": 0,
    "less than once a week": 1,
    "at least once a week": 2,
    "missing": -1,
}


def _ordinal_score(series: pd.Series, mapping: dict) -> pd.Series:
    normalized = series.astype(str).str.strip().str.lower()
    return normalized.map(mapping).fillna(-1)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add composite media exposure index (mean ordinal score across v157–v159)."""
    out = df.copy()
    media_scores = [_ordinal_score(out[c], MEDIA_ORDER) for c in MEDIA_COLS if c in out.columns]
    if media_scores:
        out["media_exposure_index"] = pd.concat(media_scores, axis=1).mean(axis=1)
    return out
