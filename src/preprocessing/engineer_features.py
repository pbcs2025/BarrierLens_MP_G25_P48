import pandas as pd

from src.preprocessing.load_data import HOUSEHOLD_COLS, MEDIA_COLS

MEDIA_ORDER = {
    "not at all": 0,
    "less than once a week": 1,
    "at least once a week": 2,
}

WEALTH_ORDER = {
    "poorest": 0,
    "poorer": 1,
    "middle": 2,
    "richer": 3,
    "richest": 4,
}

EDUCATION_ORDER = {
    "no education": 0,
    "primary": 1,
    "secondary": 2,
    "higher": 3,
}


def _normalize(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip().str.lower()


def _ordinal_score(series: pd.Series, mapping: dict) -> pd.Series:
    return _normalize(series).map(mapping)


def _binary_yes(series: pd.Series) -> pd.Series:
    normalized = _normalize(series)
    return normalized.isin(["yes", "y", "1", "has account", "has phone"]).astype(float)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add composite indices used in Stage 1 and Stage 2 clustering."""
    out = df.copy()

    media_scores = []
    for col in MEDIA_COLS:
        if col in out.columns:
            media_scores.append(_ordinal_score(out[col], MEDIA_ORDER))
    if media_scores:
        media_frame = pd.concat(media_scores, axis=1)
        out["media_exposure_index"] = media_frame.mean(axis=1)

    mobile = _binary_yes(out["v169a"]) if "v169a" in out.columns else pd.Series(0.0, index=out.index)
    bank = _binary_yes(out["v170"]) if "v170" in out.columns else pd.Series(0.0, index=out.index)
    out["digital_inclusion_index"] = (mobile + bank) / 2.0

    wealth = _ordinal_score(out["v190"], WEALTH_ORDER).fillna(0) if "v190" in out.columns else 0
    rural = (_normalize(out["v025"]) == "rural").astype(float) if "v025" in out.columns else 0
    low_education = (_ordinal_score(out["v106"], EDUCATION_ORDER).fillna(0) <= 0).astype(float)
    low_media = (
        out["media_exposure_index"].fillna(0) <= out["media_exposure_index"].median()
        if "media_exposure_index" in out.columns
        else 0
    )
    out["vulnerability_score"] = (
        (wealth <= 1).astype(float) * 0.35
        + rural * 0.25
        + low_education * 0.20
        + low_media * 0.20
    )

    return out
