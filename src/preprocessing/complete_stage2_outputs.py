#!/usr/bin/env python3
"""
Complete Stage 2 Output Generation
Owner: RBM
Purpose: Generate the missing Stage 2 output files that block downstream pipeline
         - X_stage2_preclustering.csv (for PBC's clustering)
         - y_stage2_targets.csv (for all Stage 2 models)

Run this AFTER stage2_integration.py has generated oof_barrier_probabilities.csv
"""

from pathlib import Path
import pandas as pd
import numpy as np
from stage2_integration import build_stage2_targets

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
STAGE2_DIR = PROCESSED_DIR / "stage2"
RAW_DIR = PROJECT_ROOT / "data" / "raw"


def load_stage1_outputs():
    """Load Stage 1 processed features and OOF barrier probabilities."""
    print("Loading Stage 1 features...")
    X_features = pd.read_csv(PROCESSED_DIR / "X_features.csv")
    print(f"  X_features shape: {X_features.shape}")
    
    print("Loading OOF barrier probabilities...")
    oof_df = pd.read_csv(STAGE2_DIR / "oof_barrier_probabilities.csv")
    print(f"  OOF shape: {oof_df.shape}")
    
    return X_features, oof_df


def build_preclustering_features(X_features, oof_df):
    """
    Combine Stage 1 features with OOF barrier probabilities to create
    the input matrix for PBC's clustering step (Guide Section 2.5).
    
    This matrix includes:
    - All Stage 1 engineered features (media_exposure_index, etc.)
    - All Stage 1 one-hot encoded demographic features
    - 3 OOF barrier probabilities (household, logistic, facility)
    - 1 composite barrier score
    
    Note: Does NOT include cluster labels yet - those are added by PBC
    after clustering is complete.
    """
    print("Building X_stage2_preclustering...")
    
    
    # Sanity check: same number of rows
    assert len(X_features) == len(oof_df), \
        f"Row count mismatch: X_features={len(X_features)}, oof_df={len(oof_df)}"
    
    # Concatenate horizontally
    X_stage2 = pd.concat([X_features, oof_df], axis=1)
    
    print(f"  Final shape: {X_stage2.shape}")
    print(f"  Total features: {X_stage2.shape[1]}")
    print(f"    - Stage 1 features: {X_features.shape[1]}")
    print(f"    - OOF probabilities: {oof_df.shape[1]}")
    
    return X_stage2


def build_targets_from_raw():
    """
    Load raw data and build Stage 2 targets.
    
    CRITICAL: As of this implementation, m14 (ANC visits) is NOT present
    in NFHS5_Individual.csv, so target_anc_gap will be all-NaN.
    Stage 2 proceeds with ONLY target_unmet_fp until m14 is re-extracted.
    """
    print("Loading raw data...")
    df_raw = pd.read_csv(RAW_DIR / "NFHS5_Individual.csv")
    print(f"  Raw data shape: {df_raw.shape}")
    
    print("Checking for m14 column...")
    if "m14" in df_raw.columns:
        print("  ✅ m14 found - both targets can be built")
    else:
        print("  ⚠️ m14 NOT found - target_anc_gap will be all-NaN")
        print("  ⚠️ Stage 2 will proceed with ONLY target_unmet_fp")
    
    print("Building targets...")
    y_stage2 = build_stage2_targets(df_raw)
    
    print(f"  Targets shape: {y_stage2.shape}")
    return y_stage2


def validate_outputs(X_stage2, y_stage2):
    """Sanity checks before saving."""
    print("\n" + "="*60)
    print("VALIDATION CHECKS")
    print("="*60)
    
    # Check shapes match
    assert len(X_stage2) == len(y_stage2), \
        f"Row count mismatch: X={len(X_stage2)}, y={len(y_stage2)}"
    print(f"✅ Row counts match: {len(X_stage2):,}")
    
    
    # Check for required columns in X_stage2
    required_oof_cols = ['household_barrier_prob', 'logistic_barrier_prob', 
                          'facility_barrier_prob', 'composite_barrier_score']
    for col in required_oof_cols:
        assert col in X_stage2.columns, f"Missing required column: {col}"
    print(f"✅ All OOF probability columns present")
    
    # Check OOF probability ranges
    for col in required_oof_cols[:3]:  # The 3 probability columns
        min_val, max_val = X_stage2[col].min(), X_stage2[col].max()
        assert 0 <= min_val <= 1, f"{col} has invalid min: {min_val}"
        assert 0 <= max_val <= 1, f"{col} has invalid max: {max_val}"
    print(f"✅ OOF probabilities in valid range [0, 1]")
    
    # Report target statistics
    print("\nTarget Statistics:")
    for target in y_stage2.columns:
        n_valid = y_stage2[target].notna().sum()
        n_positive = (y_stage2[target] == 1).sum()
        prevalence = n_positive / n_valid if n_valid > 0 else 0
        
        print(f"  {target}:")
        print(f"    - Valid (non-null): {n_valid:,} / {len(y_stage2):,} "
              f"({100*n_valid/len(y_stage2):.1f}%)")
        if n_valid > 0:
            print(f"    - Positive cases: {n_positive:,} ({100*prevalence:.1f}%)")
            print(f"    - Negative cases: {n_valid - n_positive:,}")
        else:
            print(f"    - ALL VALUES ARE NaN (column not available)")
    
    print("\n" + "="*60 + "\n")


def main():
    """Execute complete Stage 2 output generation pipeline."""
    print("="*60)
    print("STAGE 2 OUTPUT GENERATION")
    print("Owner: RBM")
    print("="*60 + "\n")
    
    # Step 1: Load inputs
    X_features, oof_df = load_stage1_outputs()
    
    # Step 2: Build preclustering feature matrix
    X_stage2 = build_preclustering_features(X_features, oof_df)
    
    # Step 3: Build targets from raw data
    y_stage2 = build_targets_from_raw()
    
    # Step 4: Validate
    validate_outputs(X_stage2, y_stage2)
    
    
    # Step 5: Save outputs
    STAGE2_DIR.mkdir(parents=True, exist_ok=True)
    
    X_path = STAGE2_DIR / "X_stage2_preclustering.csv"
    y_path = STAGE2_DIR / "y_stage2_targets.csv"
    
    print("Saving outputs...")
    X_stage2.to_csv(X_path, index=False)
    print(f"  ✅ Saved: {X_path}")
    print(f"     Shape: {X_stage2.shape}")
    
    y_stage2.to_csv(y_path, index=False)
    print(f"  ✅ Saved: {y_path}")
    print(f"     Shape: {y_stage2.shape}")
    
    print("\n" + "="*60)
    print("SUCCESS: Stage 2 outputs complete")
    print("="*60)
    print("\nNext steps:")
    print("  1. Review outputs in data/processed/stage2/")
    print("  2. Handoff to PBC for clustering (notebook 08)")
    print("  3. All Stage 2 models can now proceed")
    
    if "target_anc_gap" in y_stage2.columns:
        if y_stage2["target_anc_gap"].isna().all():
            print("\n⚠️ WARNING: target_anc_gap is all-NaN")
            print("   m14 column was not present in raw data")
            print("   Stage 2 will use ONLY target_unmet_fp")
            print("   Consider re-extracting with m14 for full 2-target analysis")


if __name__ == "__main__":
    main()
