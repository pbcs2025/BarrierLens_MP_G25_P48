import warnings

import pandas as pd

BARRIER_COLS = {
    "household": ["v467b", "v467c", "v467f"],
    "logistic": ["v467d", "v467e"],
    "facility": ["v467g", "v467h", "v467i"],
}


def _is_big_problem(series: pd.Series) -> pd.Series:
    normalized = series.astype(str).str.strip().str.lower()
    return normalized.eq("big problem")


def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build three binary barrier targets from v467* items using OR logic.
    Label 1 = 'big problem' on at least one item in the category.
    """
    out = df.copy()

    for barrier_type, cols in BARRIER_COLS.items():
        present = [c for c in cols if c in out.columns]
        missing = [c for c in cols if c not in out.columns]
        if missing:
            warnings.warn(
                f"target_{barrier_type}: missing barrier columns {missing}; "
                "building from available columns only."
            )
        if not present:
            raise KeyError(f"No barrier columns available for target_{barrier_type}")

        target = pd.Series(0, index=out.index, dtype=int)
        for col in present:
            target = target | _is_big_problem(out[col]).astype(int)

        out[f"target_{barrier_type}"] = target.astype(int)
        rate = out[f"target_{barrier_type}"].mean()
        print(
            f"target_{barrier_type}: positive rate = {rate:.4f} "
            f"({rate * 100:.1f}%) | built from {present} | "
            f"counts = {out[f'target_{barrier_type}'].value_counts().to_dict()}"
        )

    drop_cols = [c for c in sum(BARRIER_COLS.values(), []) if c in out.columns]
    return out.drop(columns=drop_cols)
