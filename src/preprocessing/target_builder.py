import pandas as pd


def _first_available(df: pd.DataFrame, options):
    for col in options:
        if col in df.columns:
            return col
    raise KeyError(f"None of the expected columns found: {options}")


def build_targets(df: pd.DataFrame) -> pd.DataFrame:
    """
    Construct 3 binary district-level barrier targets from proxy utilisation columns.
    Strategy: invert utilisation columns (low use = high barrier),
    average proxies, and binarize at the district median.
    """
    out = df.copy()

    # Target 1: Household barrier
    hh_ins = "Households with any usual member covered under a health insurance/financing scheme (%)"
    hh_edu = "Women (age 15-49)  with 10 or more years of schooling (%)"
    out["_hh_score"] = ((100 - out[hh_ins]) + (100 - out[hh_edu])) / 2
    out["target_household"] = (out["_hh_score"] >= out["_hh_score"].median()).astype(int)

    # Target 2: Logistic barrier
    lg_inst = "Institutional births (in the 5 years before the survey) (%)"
    lg_anc = "Mothers who had at least 4 antenatal care visits  (for last birth in the 5 years before the survey) (%)"
    out["_lg_score"] = ((100 - out[lg_inst]) + (100 - out[lg_anc])) / 2
    out["target_logistic"] = (out["_lg_score"] >= out["_lg_score"].median()).astype(int)

    # Target 3: Facility barrier
    fc_sba = "Births attended by skilled health personnel (in the 5 years before the survey)10 (%)"
    fc_vacc = _first_available(
        out,
        [
            "Children age 12-23 months fully vaccinated (card or recall11) (%)",
            "Children age 12-23 months fully vaccinated (vaccination card or mother recall11) (%)",
            "Children age 12-23 months fully vaccinated based on information from either vaccination card or mother's recall11 (%)",
        ],
    )
    fc_pnc = "Mothers who received postnatal care from a doctor/nurse/LHV/ANM/midwife/other health personnel within 2 days of delivery (for last birth in the 5 years before the survey) (%)"
    out["_fc_score"] = ((100 - out[fc_sba]) + (100 - out[fc_vacc]) + (100 - out[fc_pnc])) / 3
    out["target_facility"] = (out["_fc_score"] >= out["_fc_score"].median()).astype(int)

    proxy_cols = [
        hh_ins,
        lg_inst,
        lg_anc,
        fc_sba,
        fc_vacc,
        fc_pnc,
        "_hh_score",
        "_lg_score",
        "_fc_score",
    ]
    out = out.drop(columns=[c for c in proxy_cols if c in out.columns])
    return out
