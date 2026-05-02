from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


def split_and_scale(df, target_col, apply_scaling=True):
    """Run split + optional scaling for a selected target column."""
    feature_cols = [c for c in df.columns if not c.startswith("target_")]
    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"{target_col} - Train: {len(X_train)} rows | Test: {len(X_test)} rows")

    scaler = None
    if apply_scaling:
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X_train)
        X_test = scaler.transform(X_test)

    return X_train, X_test, y_train, y_test, scaler
