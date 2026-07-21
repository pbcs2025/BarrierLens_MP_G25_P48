import shap
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from pathlib import Path

# Set style globally for these plots
plt.style.use("seaborn-v0_8-whitegrid")

def simplify_name(col):
    return (str(col).replace("Births in the 5 years preceding the survey that are third or higher order", "High-order births")
               .replace("Women (age 15-49) with 10 or more years of schooling", "Women schooling")
               .replace("Women (age 15-49) who are literate", "Women literacy")
               .replace("Population living in households with Electricity", "Electricity")
               .replace("Population below age 15 years", "Population <15")
               .replace("Households using clean fuel for cooking", "Clean cooking fuel")
               .replace("Total Unmet need for Family Planning", "Unmet FP need")
               .replace("women_empowerment_index", "Women empowerment")
               .replace("State/UT_", ""))

def generate_shap_analysis(model, X_sample, model_name, plot_dir):
    """
    Generates and saves SHAP plots for a given model and sample dataset.
    """
    print(f"Generating SHAP analysis for {model_name}...")
    plot_dir = Path(plot_dir)
    plot_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Explainer
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)
    
    # 2. Extract values
    if isinstance(shap_values, list):
        shap_vals = shap_values[1]
        base_val = explainer.expected_value[1]
    else:
        shap_vals = shap_values
        base_val = explainer.expected_value
        
    shap_vals = np.array(shap_vals)
    if len(shap_vals.shape) == 3:
        shap_vals = shap_vals[:, :, 1]
        
    # Fix base value format for Waterfall
    if isinstance(base_val, (list, tuple, np.ndarray)):
        base_val = float(base_val[1])
    else:
        base_val = float(base_val)

    # 3. Clean feature names
    X_clean = X_sample.copy()
    if isinstance(X_clean, pd.DataFrame):
        X_clean.columns = [simplify_name(c) for c in X_clean.columns]
    
    # 4. Improved Bar Chart
    importance = np.abs(shap_vals).mean(axis=0)
    top_n = 8
    top_idx = np.argsort(importance)[-top_n:]
    sorted_idx = top_idx[np.argsort(importance[top_idx])]
    
    features = X_clean.columns[sorted_idx]
    values = importance[sorted_idx]
    
    # Shorten labels
    features = [f[:35] + "..." if len(f) > 35 else f for f in features]
    
    plt.figure(figsize=(8,5))
    bars = plt.barh(features, values)
    if len(bars) > 0:
        bars[-1].set_color("darkblue")
    plt.title(f"Top Factors Influencing Prediction ({model_name})", fontsize=13)
    plt.xlabel("Impact on Prediction")
    plt.ylabel("Features")
    plt.grid(axis='x', linestyle='--', alpha=0.4)
    plt.tight_layout()
    plt.savefig(plot_dir / f"rf_bar_{model_name.lower()}.png", dpi=300)
    plt.close()
    
    # 5. Summary Plot
    plt.figure(figsize=(10,6))
    shap.summary_plot(
        shap_vals,
        X_clean,
        max_display=10,
        show=False
    )
    plt.title(f"Feature Impact ({model_name})")
    plt.tight_layout()
    plt.savefig(plot_dir / f"rf_summary_{model_name.lower()}.png", dpi=300)
    plt.close()
    
    # 6. Waterfall Plot (for first sample)
    if len(X_clean) > 0:
        sample_index = 0
        single_shap = shap_vals[sample_index]
        if len(single_shap.shape) > 1:
            single_shap = single_shap[:, 1]
            
        feature_values = X_clean.iloc[sample_index].values
        feature_names = X_clean.columns.tolist()
        
        wf_top_n = 6
        idx = np.argsort(np.abs(single_shap))[-wf_top_n:]
        idx = idx[np.argsort(single_shap[idx])]
        
        exp = shap.Explanation(
            values=single_shap[idx],
            base_values=base_val,
            data=feature_values[idx],
            feature_names=[feature_names[i] for i in idx]
        )
        
        plt.figure(figsize=(8,5))
        shap.plots.waterfall(exp, show=False)
        plt.title(f"Top Factors Behind Prediction ({model_name} Sample)")
        plt.tight_layout()
        plt.savefig(plot_dir / f"rf_waterfall_{model_name.lower()}.png", dpi=300)
        plt.close()
    
    print(f"SHAP plots saved to {plot_dir}")
    
    return shap_vals, X_clean
