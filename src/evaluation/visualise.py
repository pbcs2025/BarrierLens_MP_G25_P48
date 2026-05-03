# src/evaluation/visualise.py

import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import os
from sklearn.metrics import roc_curve, auc, confusion_matrix

os.makedirs('outputs/stage1_results/roc_curves', exist_ok=True)
os.makedirs('outputs/stage1_results/confusion_matrices', exist_ok=True)

def plot_roc_curve(model, X_test, y_test, model_name, target_name):
    y_prob = model.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)

    plt.figure()
    plt.plot(fpr, tpr, label=f'{model_name} (AUC = {roc_auc:.2f})')
    plt.plot([0, 1], [0, 1], 'k--')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title(f'ROC Curve — {model_name} | {target_name}')
    plt.legend()
    fname = f'outputs/stage1_results/roc_curves/{model_name}_{target_name}.png'
    plt.savefig(fname, dpi=150, bbox_inches='tight')
    plt.show()
    print(f'Saved: {fname}')

def plot_confusion_matrix(model, X_test, y_test, model_name, target_name):
    y_pred = model.predict(X_test)
    cm = confusion_matrix(y_test, y_pred)

    plt.figure()
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Low Barrier', 'High Barrier'],
                yticklabels=['Low Barrier', 'High Barrier'])
    plt.title(f'Confusion Matrix — {model_name} | {target_name}')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    fname = f'outputs/stage1_results/confusion_matrices/{model_name}_{target_name}.png'
    plt.savefig(fname, dpi=150, bbox_inches='tight')
    plt.show()
    print(f'Saved: {fname}')

def plot_roc_overlay(models_dict, X_test, y_test, target_name):
    """
    models_dict = {'Logistic Regression': lr_model, 'Decision Tree': dt_model, ...}
    Call this AFTER all 4 models are trained.
    """
    plt.figure(figsize=(8, 6))
    for name, model in models_dict.items():
        y_prob = model.predict_proba(X_test)[:, 1]
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        roc_auc = auc(fpr, tpr)
        plt.plot(fpr, tpr, label=f'{name} (AUC={roc_auc:.2f})')
    plt.plot([0, 1], [0, 1], 'k--', label='Random Baseline')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title(f'ROC Overlay — All Models | {target_name} Barrier')
    plt.legend()
    fname = f'outputs/stage1_results/roc_curves/overlay_{target_name}.png'
    plt.savefig(fname, dpi=150, bbox_inches='tight')
    plt.show()
    print(f'Saved: {fname}')