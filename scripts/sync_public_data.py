from __future__ import annotations

from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data' / 'memories.md'
TARGET = ROOT / 'public' / 'data' / 'memories.md'
LEGACY_TARGET = ROOT / 'public' / 'data' / 'memories.json'


def main() -> int:
    if not SOURCE.exists():
        print(f'missing source snapshot: {SOURCE}', file=sys.stderr)
        return 1

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    if LEGACY_TARGET.exists():
        LEGACY_TARGET.unlink()
    shutil.copy2(SOURCE, TARGET)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
