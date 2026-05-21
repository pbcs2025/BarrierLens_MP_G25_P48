"""Map encoded NFHS feature names to short, presentation-ready labels."""

from __future__ import annotations

# NFHS variable → short group name (for one-hot: "Group: value")
VAR_LABELS: dict[str, str] = {
    "v012": "Age",
    "v013": "Age group",
    "v106": "Education",
    "v130": "Religion",
    "v131": "Caste/tribe",
    "v501": "Marital status",
    "v717": "Partner's occupation",
    "v190": "Wealth index",
    "v169a": "Improved water",
    "v170": "Improved toilet",
    "v481": "Clean cooking fuel",
    "v157": "Newspaper use",
    "v158": "Radio use",
    "v159": "TV use",
    "v743f": "Who decides spending",
    "media_exposure_index": "Media exposure",
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
    """One concise label per column, suitable for SHAP plots and slides."""
    if feature in VAR_LABELS and "_" not in feature:
        return VAR_LABELS[feature]

    if feature == "media_exposure_index":
        return "Media exposure"

    if feature.startswith("v") and "_" in feature:
        var, value = feature.split("_", 1)
        group = VAR_LABELS.get(var, var.upper())
        return f"{group}: {_clean_value(value)}"

    return feature.replace("_", " ").title()


def rename_frame_columns(df):
    """Return a copy with display names as columns."""
    import pandas as pd

    out = df.copy()
    out.columns = [to_display_name(c) for c in out.columns]
    return out
