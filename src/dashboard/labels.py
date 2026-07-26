"""Human-readable label normalisation for dashboard grouping dimensions."""

from __future__ import annotations

import pandas as pd

from src.preprocessing.engineer_features import EDUCATION_ORDER, WEALTH_ORDER


def _normalize(series: pd.Series) -> pd.Series:
    return series.astype(str).str.strip().str.lower()


def title_case_label(value: str) -> str:
    """Convert NFHS lowercase labels to display title case."""
    if pd.isna(value) or str(value).strip().lower() in {"", "nan", "missing"}:
        return "Missing"
    text = str(value).strip().lower()
    special = {
        "don't know": "Don't Know",
        "don\\'t know": "Don't Know",
    }
    if text in special:
        return special[text]
    return text.title()


def attach_state_residence(raw: pd.DataFrame) -> pd.DataFrame:
    """Return state and residence display labels from raw v024 / v025."""
    out = pd.DataFrame(index=raw.index)
    out["state_name"] = _normalize(raw["v024"]).map(title_case_label)
    residence = _normalize(raw["v025"])
    out["residence"] = residence.map({"urban": "Urban", "rural": "Rural"}).fillna("Missing")
    return out


def wealth_quintile(raw: pd.DataFrame) -> pd.Series:
    """Map v190 to ordered quintile label."""
    inv = {v: k for k, v in WEALTH_ORDER.items()}
    scores = _normalize(raw["v190"]).map(WEALTH_ORDER)
    return scores.map(inv).fillna("Missing")


def wealth_tercile(raw: pd.DataFrame) -> pd.Series:
    """
    Collapse NFHS wealth quintiles to three tiers for dashboard demographics.
    poorest+poorer -> Poor; middle -> Middle; richer+richest -> Rich.
    """
    quintile = wealth_quintile(raw)
    mapping = {
        "poorest": "Poor",
        "poorer": "Poor",
        "middle": "Middle",
        "richer": "Rich",
        "richest": "Rich",
        "Missing": "Missing",
    }
    return quintile.map(mapping).fillna("Missing")


def education_tier(raw: pd.DataFrame) -> pd.Series:
    """Map v106 to base-paper-aligned education tiers."""
    inv = {v: k for k, v in EDUCATION_ORDER.items()}
    labels = _normalize(raw["v106"]).map(EDUCATION_ORDER).map(inv)
    display = {
        "no education": "No Education",
        "primary": "Primary",
        "secondary": "Secondary",
        "higher": "Higher",
    }
    return labels.map(display).fillna("Missing")


def caste_group(raw: pd.DataFrame) -> pd.Series:
    """Simplify v131 for dashboard demographic cells."""
    normalized = _normalize(raw["v131"])
    mapping = {
        "scheduled caste": "Scheduled Caste",
        "scheduled tribe": "Scheduled Tribe",
        "other backward class": "Other Backward Class",
        "caste": "Other Caste",
        "no caste / tribe": "No Caste/Tribe",
        "no caste/tribe": "No Caste/Tribe",
        "missing": "Missing",
    }
    return normalized.map(mapping).fillna(normalized.map(title_case_label))


def religion_group(raw: pd.DataFrame) -> pd.Series:
    return _normalize(raw["v130"]).map(title_case_label).fillna("Missing")


def occupation_group(raw: pd.DataFrame) -> pd.Series:
    normalized = _normalize(raw["v717"])
    mapping = {
        "professional / technical / managerial": "Professional/Technical/Managerial",
        "clerical": "Clerical",
        "sales": "Sales",
        "services / household and domestic": "Services/Household",
        "skilled and unskilled manual": "Manual",
        "agricultural": "Agricultural",
        "not working": "Not Working",
        "missing": "Missing",
    }
    return normalized.map(mapping).fillna(normalized.map(title_case_label))


def attach_demographic_labels(raw: pd.DataFrame) -> pd.DataFrame:
    """Build all dashboard demographic grouping columns."""
    geo = attach_state_residence(raw)
    return pd.DataFrame(
        {
            "state_name": geo["state_name"],
            "residence": geo["residence"],
            "wealth_quintile": wealth_quintile(raw),
            "wealth_tier": wealth_tercile(raw),
            "education_tier": education_tier(raw),
            "caste_group": caste_group(raw),
            "religion": religion_group(raw),
            "occupation_group": occupation_group(raw),
        },
        index=raw.index,
    )
