# src/evaluation/metrics.py

from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_score,
    recall_score, f1_score, confusion_matrix, classification_report
)
import pandas as pd

def evaluate_model(model, X_test, y_test, model_name, target_name):
    y_pred  = model.predict(X_test)
    y_prob  = model.predict_proba(X_test)[:, 1]

    results = {
        'Model'     : model_name,
        'Target'    : target_name,
        'Accuracy'  : round(accuracy_score(y_test, y_pred), 4),
        'ROC-AUC'   : round(roc_auc_score(y_test, y_prob), 4),
        'Precision' : round(precision_score(y_test, y_pred), 4),
        'Recall'    : round(recall_score(y_test, y_pred), 4),
        'F1-Score'  : round(f1_score(y_test, y_pred), 4),
    }

    print(f'\n=== {model_name} | {target_name} barrier ===')
    for k, v in results.items(): print(f'  {k:12s}: {v}')
    print(classification_report(y_test, y_pred))
    return results
