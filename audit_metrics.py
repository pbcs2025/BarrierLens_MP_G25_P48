import re
from collections import Counter
from pathlib import Path

content = Path('powerbi/BarrierLens.SemanticModel/definition/tables/_Metrics.tmdl').read_bytes().decode('utf-8')
names = re.findall(r"measure '([^']+)'", content)
counts = Counter(names)

print('Total measure declarations:', len(names))
print('Unique names:', len(counts))
print()

dups = {n: c for n, c in counts.items() if c > 1}
if dups:
    print('DUPLICATES:')
    for name, count in dups.items():
        print('  x' + str(count) + ': ' + name)
else:
    print('No duplicates')

print()
print('All names:')
for n in names:
    print('  ' + n)
