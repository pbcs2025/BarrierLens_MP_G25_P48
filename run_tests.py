import sys
from pathlib import Path
import pytest

root = Path(__file__).resolve().parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

if __name__ == "__main__":
    ret = pytest.main(["-o", "pythonpath=.", "tests/test_member2_prediction_adapter.py", "-v", "-s"])
    sys.exit(ret)
