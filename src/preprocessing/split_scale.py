from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

try:
    from imblearn.over_sampling import SMOTE
except ImportError:  # pragma: no cover - optional dependency
    SMOTE = None


def split_and_scale(
    df,
    target_col,
    use_smote=False,
    apply_scaling=True,
    sample_for_speed=None,
    random_state=42,
):
    """
    Stratified train/test split with optional SMOTE (training fold only) and scaling.

    For N=724K, default use_smote=False and rely on class_weight='balanced' in models
    (see Stage 1 guide v5 compute note). Use sample_for_speed only for GridSearchCV.
    """
    feature_cols = [c for c in df.columns if not c.startswith("target_")]
    X = df[feature_cols]
    y = df[target_col]

    if sample_for_speed is not None:
        X, _, y, _ = train_test_split(
            X,
            y,
            train_size=sample_for_speed,
            stratify=y,
            random_state=random_state,
        )
        print(f"{target_col} — stratified subsample for tuning: {len(y):,} rows")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=random_state,
        stratify=y,
    )
    print(
        f"{target_col} — Train: {len(y_train):,} rows | Test: {len(y_test):,} rows | "
        f"train positive rate: {y_train.mean():.4f}"
    )

    if use_smote:
        if SMOTE is None:
            raise ImportError("Install imbalanced-learn to use SMOTE: pip install imbalanced-learn")
        X_train, y_train = SMOTE(random_state=random_state).fit_resample(X_train, y_train)
        print(f"{target_col} — post-SMOTE train size: {len(y_train):,}")

    scaler = None
    if apply_scaling:
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X_train)
        X_test = scaler.transform(X_test)

    return X_train, X_test, y_train, y_test, scaler
