import pandas as pd

from src.preprocessing.load_data import BARRIER_SOURCE_COLS


def _is_big_problem(series: pd.Series) -> pd.Series:
    normalized = series.astype(str).str.strip().str.lower()
    return (normalized == "big problem").astype(int)


def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build three binary barrier targets from v467* items.
    Household: v467b OR v467c; Logistic: v467d OR v467e; Facility: v467g OR v467h.
    Label 1 = 'big problem' on at least one item in the pair.
    """
    out = df.copy()
    missing = [c for c in BARRIER_SOURCE_COLS if c not in out.columns]
    if missing:
        raise KeyError(f"Barrier columns not found: {missing}")

    out["target_household"] = (
        _is_big_problem(out["v467b"]) | _is_big_problem(out["v467c"])
    ).astype(int)
    out["target_logistic"] = (
        _is_big_problem(out["v467d"]) | _is_big_problem(out["v467e"])
    ).astype(int)
    out["target_facility"] = (
        _is_big_problem(out["v467g"]) | _is_big_problem(out["v467h"])
    ).astype(int)

    out = out.drop(columns=BARRIER_SOURCE_COLS)
    for t in ["target_household", "target_logistic", "target_facility"]:
        rate = out[t].mean()
        print(f"{t}: positive rate = {rate:.4f} | counts = {out[t].value_counts().to_dict()}")
    return out
