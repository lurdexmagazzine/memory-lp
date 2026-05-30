from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / "docs"

FILES = [
    "index.html",
    "Diário da Melissa.html",
    "Diário da Melissa-print.html",
    "README.md",
    "app.jsx",
    "base.css",
    "markdown.js",
    "read.css",
    "tweaks-panel.jsx",
    "ui.jsx",
    "views.jsx",
]
DIRS = ["entries", "templates"]


def main() -> None:
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir(parents=True, exist_ok=True)

    for rel in FILES:
        shutil.copy2(ROOT / rel, DOCS / rel)

    for rel in DIRS:
        shutil.copytree(ROOT / rel, DOCS / rel)

    nojekyll = ROOT / ".nojekyll"
    if nojekyll.exists():
        shutil.copy2(nojekyll, DOCS / ".nojekyll")

    print(f"Built static Melissa site at {DOCS}")


if __name__ == "__main__":
    main()
