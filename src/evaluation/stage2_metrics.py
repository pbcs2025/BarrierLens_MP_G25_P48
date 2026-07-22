# src/evaluation/stage2_metrics.py
#
# Owner: RBM
# Extends src/evaluation/metrics.py for Stage 2. Definitions of Accuracy,
# ROC-AUC, Precision, Recall, F1 are unchanged — import them from metrics.py
# rather than redefining them here. This file only adds the barrier-uplift
# comparison, which is Stage 2's core empirical claim.

from sklearn.model_selection import cross_val_score

# Re-export Stage 1's evaluate_model so Stage 2 notebooks only need one import.
from src.evaluation.metrics import evaluate_model  # noqa: F401


def compute_barrier_uplift(model_fn, X_socioeconomic, X_full, y, target_name, cv):
    """
    Compares a socioeconomic-only feature set against socioeconomic +
    barrier-probability + cluster features, on the same target and same CV
    folds. The uplift (auc_full - auc_baseline) is the number that supports
    or undercuts the paper's Stage 2 claim that barrier exposure adds
    predictive signal beyond raw socioeconomic status.

    model_fn: a zero-arg callable returning a fresh, unfitted estimator
              (e.g. lambda: LogisticRegression(class_weight='balanced'))
    """
    auc_baseline = cross_val_score(model_fn(), X_socioeconomic, y, cv=cv, scoring='roc_auc').mean()
    auc_full = cross_val_score(model_fn(), X_full, y, cv=cv, scoring='roc_auc').mean()
    delta = auc_full - auc_baseline

    print(f'{target_name}: socioeconomic-only={auc_baseline:.4f} | '
          f'+barriers={auc_full:.4f} | uplift={delta:+.4f}')

    return {
        'target': target_name,
        'auc_socioeconomic_only': auc_baseline,
        'auc_with_barriers': auc_full,
        'uplift': delta,
    }