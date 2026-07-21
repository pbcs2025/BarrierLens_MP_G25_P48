import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[2]

def train_random_forest(X_train, y_train, feature_names, target_name):
    """
    Trains a Random Forest classifier with predefined robust parameters.
    Saves the trained model and prints the top 10 feature importances.
    """
    print(f"Training Random Forest for {target_name}...")
    
    # Predefined parameters as requested (these were optimized previously)
    model = RandomForestClassifier(
        n_estimators=400,
        max_depth=15,
        min_samples_leaf=75,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Save the model
    save_dir = PROJECT_ROOT / "saved_models" / "stage1"
    save_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, save_dir / f"random_forest_{target_name}.pkl")
    print(f"Model saved to {save_dir / f'random_forest_{target_name}.pkl'}")
    
    # Print feature importances
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    print(f'\n--- Top 10 Feature Importances for {target_name} barrier ---')
    for i in range(10):
        if i < len(feature_names):
            print(f"{i+1}. {feature_names[indices[i]]} ({importances[indices[i]]:.4f})")
    
    return model
