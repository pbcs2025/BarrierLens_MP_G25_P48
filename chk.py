import pandas as pd
from pathlib import Path
p = Path('data/dashboard/powerbi')
for f in ['base_paper_reference.csv', 'state_barrier_long.csv', 'national_barrier_long.csv']:
    df = pd.read_csv(p / f)
    if 'barrier_type' in df.columns:
        print(f + ': ' + str(df['barrier_type'].unique().tolist()))
