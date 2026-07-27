"""Map encoded NFHS feature names to short, presentation-ready labels."""

from __future__ import annotations

# ---------------------------------------------------------------------------
# NFHS-5 variable → official human-readable label
# Used in all Stage 2 Random Forest, SHAP, and publication outputs.
# Single source of truth — do NOT duplicate this mapping elsewhere.
# ---------------------------------------------------------------------------
VAR_LABELS: dict[str, str] = {
    # ── Demographic ────────────────────────────────────────────────────────
    "v012":  "Respondent's current age",
    "v013":  "Age group (5-year groups)",
    "v106":  "Highest educational level",
    "v130":  "Religion",
    "v131":  "Caste/tribe",
    "v501":  "Current marital status",
    "v717":  "Current occupation",
    # ── Socioeconomic ─────────────────────────────────────────────────────
    "v190":  "Wealth index quintile",
    "v169a": "Household has a mobile phone",
    "v170":  "Household has a bank account",
    "v481":  "Covered by health insurance",
    # ── Media & digital access ────────────────────────────────────────────
    "v157":  "Frequency of reading newspapers/magazines",
    "v158":  "Frequency of listening to radio",
    "v159":  "Frequency of watching television",
    "v466":  "Owns and uses the internet",
    "v467b": "Used the internet in the last 12 months",
    "v467c": "Frequency of internet use",
    "v467d": "Uses internet almost every day",
    "v467e": "Uses internet at least once a week",
    "v467g": "Uses internet less than once a week",
    "v467h": "Never uses the internet",
    "v743f": "Who decides on respondent's own health care",
    # ── Family planning ───────────────────────────────────────────────────
    "v626a": "Unmet need for family planning",
    # ── Composite indices ─────────────────────────────────────────────────
    "media_exposure_index":    "Media exposure index",
    "digital_inclusion_index": "Digital inclusion index",
    "vulnerability_score":     "Vulnerability score",
    "women_empowerment_index": "Women empowerment index",
}

VALUE_LABELS: dict[str, str] = {
    "not at all": "None",
    "less than once a week": "Low",
    "at least once a week": "Regular",
    "no education": "None",
    "primary": "Primary",
    "secondary": "Secondary",
    "higher": "Higher",
    "poorest": "Poorest",
    "poorer": "Poorer",
    "richer": "Richer",
    "richest": "Richest",
    "married": "Married",
    "widowed": "Widowed",
    "missing": "Missing",
    "yes": "Yes",
    "no": "No",
    "hindu": "Hindu",
    "muslim": "Muslim",
    "christian": "Christian",
    "sikh": "Sikh",
    "tribe": "Scheduled tribe",
    "no caste / tribe": "No caste/tribe",
    "don't know": "Unknown",
    "not working": "Not working",
    "professional / technical / managerial": "Professional",
    "skilled and unskilled manual": "Manual work",
    "services / household and domestic": "Domestic work",
    "sales": "Sales",
    "clerical": "Clerical",
    "other": "Other",
    "respondent alone": "Woman decides alone",
    "respondent and husband/partner": "Woman + partner",
    "husband/partner has no earnings": "Partner no earnings",
}

TARGET_DISPLAY = {
    "household": "household barriers",
    "logistic": "logistic barriers",
    "facility": "facility barriers",
}


# ---------------------------------------------------------------------------
# Barrier / cluster / composite column labels
# (used in Stage 2 RF, SHAP, and publication outputs)
# ---------------------------------------------------------------------------
BARRIER_LABELS: dict[str, str] = {
    "household_barrier_prob":  "Household barrier probability",
    "logistic_barrier_prob":   "Logistic barrier probability",
    "facility_barrier_prob":   "Facility barrier probability",
    "composite_barrier_score": "Composite barrier score",
}


def _clean_value(raw: str) -> str:
    text = raw.strip().lower()
    if text in VALUE_LABELS:
        return VALUE_LABELS[text]
    if "never in union" in text:
        return "Never married"
    if "separated" in text or "no longer living" in text:
        return "Separated"
    if "gauna" in text:
        return "Never married"
    if len(text) > 28:
        return text[:25].rstrip() + "…"
    return text.title()


def to_display_name(feature: str) -> str:
    """Return one concise, human-readable label per column.

    Resolution order
    ----------------
    1. Barrier / composite column → BARRIER_LABELS
    2. Exact match in VAR_LABELS → VAR_LABELS value
    3. Cluster column → "Cluster <N>"
    4. One-hot encoded ``vXXX_value`` (underscore separator) → "Group: Value"
    5. Space-separated sanitised variant ``vXXX value`` → "Group: Value"
    6. Fallback → title-cased underscore/space-split string
    """
    # 1. Barrier / composite labels
    if feature in BARRIER_LABELS:
        return BARRIER_LABELS[feature]

    # 2. Exact match (continuous NFHS variable or named index)
    if feature in VAR_LABELS:
        return VAR_LABELS[feature]

    # 3. Cluster assignment columns
    if feature.startswith("cluster_"):
        suffix = feature[len("cluster_"):]
        return f"Cluster {suffix}" if suffix else "Cluster"

    # 4. One-hot encoded with underscore: vXXX_value
    if "_" in feature:
        parts = feature.split("_", 1)
        var, value = parts[0], parts[1]
        if var in VAR_LABELS:
            group = VAR_LABELS[var]
            return f"{group}: {_clean_value(value)}"

    # 5. Space-separated sanitised variant: "vXXX value" (after _sanitize_feature_names)
    if " " in feature:
        parts = feature.split(" ", 1)
        var, value = parts[0], parts[1]
        if var in VAR_LABELS:
            group = VAR_LABELS[var]
            return f"{group}: {_clean_value(value)}"

    # 6. Fallback
    return feature.replace("_", " ").title()


def map_feature_names(columns) -> list[str]:
    """Map an iterable of raw column names to human-readable display names.

    This is the centralised entry point for all Stage 2 Random Forest and
    SHAP outputs. Pass any list / Index of column names; receive the
    corresponding list of display strings.

    Usage
    -----
    >>> readable = map_feature_names(df.columns)
    >>> df.columns = readable
    """
    return [to_display_name(c) for c in columns]


def rename_frame_columns(df):
    """Return a copy of *df* with every column renamed to its display name."""
    import pandas as pd

    out = df.copy()
    out.columns = map_feature_names(out.columns)
    return out
