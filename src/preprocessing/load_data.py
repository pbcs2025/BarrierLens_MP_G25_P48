import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_PATH = str(PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv")

# Group 1 — identifiers (not used as model features)
IDENTIFIER_COLS = ["caseid", "v001", "v002", "v021", "v024", "v025"]

# Group 2 — woman's background
BACKGROUND_COLS = ["v012", "v013", "v106", "v130", "v131", "v501", "v717"]

# Group 3 — household features
HOUSEHOLD_COLS = ["v190", "v169a", "v170", "v481"]

# Group 4 — media exposure
MEDIA_COLS = ["v157", "v158", "v159"]

# Group 5 — autonomy (v466 is all-missing in this extract; kept out of FEATURE_COLS)
AUTONOMY_COLS = ["v743f"]

FEATURE_COLS = BACKGROUND_COLS + HOUSEHOLD_COLS + MEDIA_COLS + AUTONOMY_COLS

# Group 6 — barrier items used to build Stage-1 targets
BARRIER_SOURCE_COLS = ["v467b", "v467c", "v467d", "v467e", "v467g", "v467h"]

# Group 7 — Stage 2 (loaded for reference only, not used in Stage 1)
STAGE2_COLS = ["v626a"]

# Group 8 — bonus validation columns (not used in Stage 1)
BONUS_COLS = ["s245a", "s245b", "s245h"]

STAGE1_RAW_COLS = (
    IDENTIFIER_COLS
    + FEATURE_COLS
    + BARRIER_SOURCE_COLS
    + STAGE2_COLS
    + BONUS_COLS
)


def load_stage1_data(path: str = RAW_PATH) -> pd.DataFrame:
    """Load NFHS-5 individual-level extract and keep Stage 1 columns."""
    df = pd.read_csv(path, low_memory=False)
    df.columns = df.columns.str.strip()

    missing = [c for c in STAGE1_RAW_COLS if c not in df.columns]
    if missing:
        raise KeyError(f"Expected columns missing from dataset: {missing}")

    selected = df[STAGE1_RAW_COLS].copy()
    print(f"Raw dataset shape: {df.shape}")
    print(f"After column selection: {selected.shape}")
    return selected
