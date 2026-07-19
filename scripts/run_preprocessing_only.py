"""Run Stage-1 preprocessing only (no model training)."""

from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing.clean import handle_missing
from src.preprocessing.encode import encode_features
from src.preprocessing.engineer_features import engineer_features
from src.preprocessing.load_data import load_stage1_data
from src.preprocessing.target_builder import build_targets


def main() -> None:
    df = load_stage1_data()
    df = handle_missing(df)
    df = build_targets(df)
    df = engineer_features(df)
    encoded = encode_features(df)

    processed_dir = PROJECT_ROOT / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    target_cols = [c for c in df.columns if c.startswith("target_")]
    encoded.to_csv(processed_dir / "X_features.csv", index=False)
    for target_col in target_cols:
        suffix = target_col.replace("target_", "")
        df[target_col].to_csv(processed_dir / f"y_{suffix}.csv", index=False)

    print("Saved processed files to:", processed_dir)
    print("X_features shape:", encoded.shape)
    for target_col in target_cols:
        print(target_col, df[target_col].value_counts().to_dict())


if __name__ == "__main__":
    main()
