"""Paths and column constants for the BarrierLens dashboard data pipeline."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAW_CSV = PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
STAGE2_DIR = PROCESSED_DIR / "stage2"
DASHBOARD_DIR = PROJECT_ROOT / "data" / "dashboard"
STAGE2_OUTPUTS = PROJECT_ROOT / "outputs" / "stage2_results"
STAGE2_MODELS = PROJECT_ROOT / "saved_models" / "stage2"

EXPECTED_N_WOMEN = 724_115
MIN_CELL_N = 30

BARRIER_TYPES = ("household", "logistic", "facility")
STAGE2_TARGETS = ("target_unmet_fp", "target_anc_gap")

OOF_PROB_COLS = {
    "household": "household_barrier_prob",
    "logistic": "logistic_barrier_prob",
    "facility": "facility_barrier_prob",
}

OBSERVED_COLS = {
    "household": "observed_household",
    "logistic": "observed_logistic",
    "facility": "observed_facility",
}

PRED_COLS = {
    "household": "pred_household_prob",
    "logistic": "pred_logistic_prob",
    "facility": "pred_facility_prob",
}

MASTER_OUTPUT = DASHBOARD_DIR / "woman_level_master.csv"
STATE_SUMMARY_OUTPUT = DASHBOARD_DIR / "state_level_summary.csv"
STATE_BARRIER_LONG_OUTPUT = DASHBOARD_DIR / "state_barrier_long.csv"
DEMO_SUMMARY_OUTPUT = DASHBOARD_DIR / "demographic_summary.csv"
CLUSTER_SUMMARY_OUTPUT = DASHBOARD_DIR / "cluster_summary.csv"
CLUSTER_STATE_OUTPUT = DASHBOARD_DIR / "cluster_state_distribution.csv"
VALIDATION_REPORT_OUTPUT = DASHBOARD_DIR / "validation_report.json"
DATA_DICTIONARY_OUTPUT = DASHBOARD_DIR / "data_dictionary.md"
