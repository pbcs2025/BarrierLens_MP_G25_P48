"""
Utility module for BarrierLens project paths and root discovery.
"""
from pathlib import Path
import sys

def get_project_root() -> Path:
    """
    Finds the root directory of the project by searching upward from the current working directory
    or module location for known root markers (e.g. README.md, requirements.txt, src directory).
    Adds the project root to sys.path if not already present.
    """
    # Start searching from the file's directory if available, else current working directory
    try:
        current = Path(__file__).resolve().parent
    except NameError:
        current = Path.cwd().resolve()

    while current != current.parent:
        if (current / "README.md").exists() or (current / "requirements.txt").exists() or (current / "src").is_dir():
            if str(current) not in sys.path:
                sys.path.insert(0, str(current))
            return current
        current = current.parent

    # Fallback to CWD
    fallback = Path.cwd().resolve()
    if str(fallback) not in sys.path:
        sys.path.insert(0, str(fallback))
    return fallback
