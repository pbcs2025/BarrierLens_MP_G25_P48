import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_PATH = str(PROJECT_ROOT / "data" / "raw" / "NFHS5_Women.csv")

IDENTIFIER_COLS = [
    "District Names",
    "State/UT",
]

FEATURE_COLS = [
    # Household Infrastructure / Wealth Proxies
    "Population living in households with electricity (%)",
    "Population living in households with an improved drinking-water source1 (%)",
    "Population living in households that use an improved sanitation facility2 (%)",
    "Households using clean fuel for cooking3 (%)",
    "Households using iodized salt (%)",
    # Women Education & Empowerment
    "Female population age 6 years and above who ever attended school (%)",
    "Women (age 15-49) who are literate4 (%)",
    "Women (age 15-49)  with 10 or more years of schooling (%)",
    # Demographic Indicators
    "Population below age 15 years (%)",
    " Sex ratio of the total population (females per 1,000 males)",
    "Sex ratio at birth for children born in the last five years (females per 1,000 males)",
    # Reproductive Health & Social Vulnerability
    "Women age 20-24 years married before age 18 years (%)",
    "Women age 15-19 years who were already mothers or pregnant at the time of the survey (%)",
    "Births in the 5 years preceding the survey that are third or higher order (%)",
    "Total Unmet need for Family Planning (Currently Married Women Age 15-49  years)7 (%)",
    # Insurance & Health Financing
    "Households with any usual member covered under a health insurance/financing scheme (%)",
    # Women Health Burden
    "All women age 15-49 years who are anaemic22 (%)",
    "Women (age 15-49 years) whose Body Mass Index (BMI) is below normal (BMI <18.5 kg/m2)21 (%)",
]

TARGET_PROXY_COLS = [
    "Households with any usual member covered under a health insurance/financing scheme (%)",
    "Women (age 15-49)  with 10 or more years of schooling (%)",
    "Institutional births (in the 5 years before the survey) (%)",
    "Mothers who had at least 4 antenatal care visits  (for last birth in the 5 years before the survey) (%)",
    "Births attended by skilled health personnel (in the 5 years before the survey)10 (%)",
    "Children age 12-23 months fully vaccinated (card or recall11) (%)",
    "Children age 12-23 months fully vaccinated (vaccination card or mother recall11) (%)",
    "Children age 12-23 months fully vaccinated based on information from either vaccination card or mother's recall11 (%)",
    "Mothers who received postnatal care from a doctor/nurse/LHV/ANM/midwife/other health personnel within 2 days of delivery (for last birth in the 5 years before the survey) (%)",
]


def load_stage1_data(path: str = RAW_PATH) -> pd.DataFrame:
    """Load NFHS-5 district dataset and keep Stage 1 columns only."""
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()

    cols_to_keep = list(dict.fromkeys(IDENTIFIER_COLS + FEATURE_COLS + TARGET_PROXY_COLS))
    cols_to_keep = [c for c in cols_to_keep if c in df.columns]

    selected = df[cols_to_keep].copy()
    print(f"Raw dataset shape: {df.shape}")
    print(f"After column selection: {selected.shape}")
    return selected
