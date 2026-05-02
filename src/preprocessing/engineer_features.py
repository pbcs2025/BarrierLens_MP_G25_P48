import pandas as pd


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create Stage 1 composite district-level features."""
    out = df.copy()

    infra_cols = [
        "Population living in households with electricity (%)",
        "Population living in households with an improved drinking-water source1 (%)",
        "Population living in households that use an improved sanitation facility2 (%)",
        "Households using clean fuel for cooking3 (%)",
    ]
    out["infrastructure_index"] = out[infra_cols].mean(axis=1)

    emp_cols = [
        "Female population age 6 years and above who ever attended school (%)",
        "Women (age 15-49) who are literate4 (%)",
        "Women (age 15-49)  with 10 or more years of schooling (%)",
    ]
    out["women_empowerment_index"] = out[emp_cols].mean(axis=1)

    vuln_cols = [
        "Women age 20-24 years married before age 18 years (%)",
        "Women age 15-19 years who were already mothers or pregnant at the time of the survey (%)",
        "Births in the 5 years preceding the survey that are third or higher order (%)",
        "Total Unmet need for Family Planning (Currently Married Women Age 15-49  years)7 (%)",
    ]
    out["social_vulnerability_score"] = out[vuln_cols].mean(axis=1)

    return out
