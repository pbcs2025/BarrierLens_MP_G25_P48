import pandas as pd


def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    """Drop district identifier and one-hot encode State/UT."""
    out = df.copy()

    if "District Names" in out.columns:
        out = out.drop(columns=["District Names"])

    if "State/UT" in out.columns:
        out = pd.get_dummies(out, columns=["State/UT"], drop_first=True, dtype=int)

    return out
