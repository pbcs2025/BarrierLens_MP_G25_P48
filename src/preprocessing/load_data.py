import warnings
from pathlib import Path
from typing import Optional, Union

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DTA_PATH = PROJECT_ROOT / "data" / "raw" / "IAIR7EFL.DTA"
CSV_PATH = PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv"
RAW_PATH = DTA_PATH if DTA_PATH.exists() else CSV_PATH

# Group 1 — identifiers (not used as model features)
IDENTIFIER_COLS = ["caseid", "v001", "v002", "v021", "v024", "v025"]

# Group 2 — woman's background
BACKGROUND_COLS = ["v012", "v013", "v106", "v130", "v131", "v501", "v717"]

# Group 3 — household features
HOUSEHOLD_COLS = ["v190", "v169a", "v170", "v481"]

# Group 4 — media exposure
MEDIA_COLS = ["v157", "v158", "v159"]

# Group 5 — autonomy (v466 is all-missing in the India extract; loaded but not modelled)
AUTONOMY_COLS = ["v743f"]

FEATURE_COLS = BACKGROUND_COLS + HOUSEHOLD_COLS + MEDIA_COLS + AUTONOMY_COLS

# Group 6 — barrier items used to build Stage-1 targets (f/i optional in India recode)
BARRIER_SOURCE_COLS = [
    "v467b",
    "v467c",
    "v467d",
    "v467e",
    "v467f",
    "v467g",
    "v467h",
    "v467i",
]

# Group 7 — Stage 2 (loaded for reference only, not used in Stage 1)
STAGE2_COLS = ["v626a", "m14"]

# Group 8 — bonus validation columns (not used in Stage 1)
BONUS_COLS = ["s245a", "s245b", "s245h"]

STAGE1_RAW_COLS = (
    IDENTIFIER_COLS
    + FEATURE_COLS
    + ["v466"]
    + BARRIER_SOURCE_COLS
    + STAGE2_COLS
    + BONUS_COLS
)

# Analytic sample rule (v5 Section 0.2):
# "full" keeps all 724,115 women — barrier module has zero missingness on this extract.
# Set to "ever_married" later if the team aligns with the base paper's 108,785 subset.
ANALYTIC_SAMPLE = "full"


def _resolve_raw_path(path: Optional[Union[str, Path]]) -> Path:
    if path is not None:
        return Path(path)
    if DTA_PATH.exists():
        return DTA_PATH
    if CSV_PATH.exists():
        return CSV_PATH
    raise FileNotFoundError(
        f"No Stage 1 raw file found. Expected {DTA_PATH} or {CSV_PATH}."
    )


def _load_from_stata(path: Path) -> pd.DataFrame:
    reader = pd.read_stata(path, iterator=True)
    available = set(reader.variable_labels().keys())
    reader.close()

    cols_to_load = [c for c in STAGE1_RAW_COLS if c in available]
    missing = [c for c in STAGE1_RAW_COLS if c not in available]
    if missing:
        warnings.warn(f"Columns not found in DTA and skipped: {missing}")

    df = pd.read_stata(path, columns=cols_to_load)
    df.columns = df.columns.str.strip()
    print(f"Loaded Stata file: {path.name} -> {df.shape}")
    return df


def _load_from_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip()

    missing = [c for c in STAGE1_RAW_COLS if c not in df.columns]
    if missing:
        warnings.warn(f"Columns not found in CSV and skipped: {missing}")

    cols_present = [c for c in STAGE1_RAW_COLS if c in df.columns]
    selected = df[cols_present].copy()
    print(f"Loaded CSV file: {path.name} -> {selected.shape}")
    return selected


def apply_analytic_sample(df: pd.DataFrame, rule: str = ANALYTIC_SAMPLE) -> pd.DataFrame:
    """Apply documented inclusion rule before modelling."""
    out = df.copy()
    if rule == "full":
        print(f"Analytic sample: full file ({len(out):,} rows)")
        return out
    if rule == "ever_married":
        if "v501" not in out.columns:
            raise KeyError("v501 required for ever_married filter")
        mask = out["v501"].astype(str).str.strip().str.lower() != "never in union"
        out = out.loc[mask].copy()
        print(f"Analytic sample: ever_married ({len(out):,} rows)")
        return out
    raise ValueError(f"Unknown analytic sample rule: {rule}")


def load_stage1_data(path: Optional[Union[str, Path]] = None) -> pd.DataFrame:
    """Load NFHS-5 individual-level extract and keep Stage 1 columns."""
    raw_path = _resolve_raw_path(path)

    if raw_path.suffix.lower() == ".dta":
        df = _load_from_stata(raw_path)
    else:
        df = _load_from_csv(raw_path)

    required = set(IDENTIFIER_COLS + FEATURE_COLS + ["v467b", "v467c", "v467d", "v467e", "v467g", "v467h"])
    missing_required = sorted(required - set(df.columns))
    if missing_required:
        raise KeyError(f"Required columns missing from dataset: {missing_required}")

    df = apply_analytic_sample(df)
    return df
