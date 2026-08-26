"""Authoritative NFHS-5 Field Dictionary & Label Registry.

Single source of truth for all NFHS variable mappings, human-readable labels,
allowed values, required flags, and derivation rules.
Used across internal ML validation, API documentation, UI display, and handoffs.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional

FIELD_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    # ── Identifiers & Sampling ──────────────────────────────────────────────
    "caseid": {
        "label": "Unique respondent ID",
        "type": "string",
        "required": True,
        "derivable": False,
        "allowed_values": None,
    },
    "v001": {
        "label": "Cluster (Primary Sampling Unit) number",
        "type": "numeric",
        "required": True,
        "derivable": False,
        "allowed_values": None,
    },
    "v002": {
        "label": "Household number",
        "type": "numeric",
        "required": True,
        "derivable": False,
        "allowed_values": None,
    },
    "v021": {
        "label": "Sample cluster number",
        "type": "numeric",
        "required": True,
        "derivable": False,
        "allowed_values": None,
    },
    "v024": {
        "label": "State/Union Territory",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": None,
    },
    "v025": {
        "label": "Type of residence (Urban/Rural)",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": ["urban", "rural"],
    },

    # ── Background & Demographics ───────────────────────────────────────────
    "v012": {
        "label": "Respondent's current age",
        "type": "numeric",
        "required": True,
        "derivable": False,
        "allowed_values": "Range 15 to 49",
    },
    "v013": {
        "label": "Age group (5-year groups)",
        "type": "categorical",
        "required": True,
        "derivable": True,
        "derivation_rule": "Binned from v012: 15-19, 20-24, 25-29, 30-34, 35-39, 40-44, 45-49",
        "allowed_values": ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49"],
    },
    "v106": {
        "label": "Highest educational level",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": ["no education", "primary", "secondary", "higher"],
    },
    "v130": {
        "label": "Religion",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": [
            "hindu", "muslim", "christian", "sikh", "jain",
            "jewish", "parsi / zoroastrian", "no religion", "other"
        ],
    },
    "v131": {
        "label": "Caste/Tribe",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": ["no caste / tribe", "tribe", "don't know", "missing"],
    },
    "v501": {
        "label": "Current marital status",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": [
            "married",
            "never in union  [includes: married gauna not performed]",
            "no longer living together/separated",
            "widowed"
        ],
    },
    "v717": {
        "label": "Current occupation",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": [
            "not working",
            "professional / technical / managerial",
            "clerical",
            "sales",
            "services / household and domestic",
            "skilled and unskilled manual",
            "other",
            "don't know",
            "missing"
        ],
    },

    # ── Socioeconomic & Household Assets ────────────────────────────────────
    "v190": {
        "label": "Wealth index quintile",
        "type": "categorical",
        "required": True,
        "derivable": False,
        "allowed_values": ["poorest", "poorer", "middle", "richer", "richest"],
    },
    "v169a": {
        "label": "Household has a mobile phone",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["yes", "no"],
    },
    "v170": {
        "label": "Household has a bank account",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["yes", "no"],
    },
    "v481": {
        "label": "Covered by health insurance",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["yes", "no"],
    },

    # ── Media Exposure & Autonomy ───────────────────────────────────────────
    "v157": {
        "label": "Frequency of reading newspapers/magazines",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["not at all", "less than once a week", "at least once a week"],
    },
    "v158": {
        "label": "Frequency of listening to radio",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["not at all", "less than once a week", "at least once a week"],
    },
    "v159": {
        "label": "Frequency of watching television",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["not at all", "less than once a week", "at least once a week"],
    },
    "v743f": {
        "label": "Respondent owns a mobile phone",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": [
            "respondent alone",
            "respondent and husband/partner",
            "husband/partner has no earnings",
            "other",
            "missing"
        ],
    },

    # ── Digital Access & Barrier Recodes ────────────────────────────────────
    "v466": {
        "label": "Owns and uses the internet",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["yes", "no"],
    },
    "v467b": {
        "label": "Used the internet in the last 12 months",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["big problem", "not a big problem"],
    },
    "v467c": {
        "label": "Frequency of internet use",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["big problem", "not a big problem"],
    },
    "v467d": {
        "label": "Uses internet almost every day",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["big problem", "not a big problem"],
    },
    "v467e": {
        "label": "Uses internet at least once a week",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["big problem", "not a big problem"],
    },
    "v467g": {
        "label": "Uses internet less than once a week",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["big problem", "not a big problem"],
    },
    "v467h": {
        "label": "Never uses the internet",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["big problem", "not a big problem"],
    },

    # ── Stage 2 Healthcare Utilization ─────────────────────────────────────
    "v626a": {
        "label": "Unmet need for family planning",
        "type": "categorical",
        "required": False,
        "derivable": False,
        "allowed_values": ["unmet need for spacing", "unmet need for limiting", "no unmet need"],
    },
}


def get_field_label(code: str) -> str:
    """Return authoritative human-readable label for NFHS code or fallback to string."""
    info = FIELD_DEFINITIONS.get(code)
    return info["label"] if info else code


def get_combined_label(code: str) -> str:
    """Return combined developer/log label format: '<Human-readable label> (<NFHS code>)'."""
    info = FIELD_DEFINITIONS.get(code)
    if info:
        return f"{info['label']} ({code})"
    return code


def derive_v013_from_v012(age: float | int) -> str:
    """Derive 5-year age group code v013 from numeric age v012."""
    if age < 20:
        return "15-19"
    elif age < 25:
        return "20-24"
    elif age < 30:
        return "25-29"
    elif age < 35:
        return "30-34"
    elif age < 40:
        return "35-39"
    elif age < 45:
        return "40-44"
    else:
        return "45-49"
