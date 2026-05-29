#!/usr/bin/env python3
"""Export Holographic facts into a public JSON snapshot for memory-lp."""
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

DEFAULT_DB = Path.home() / ".hermes" / "memory_store.db"
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "data" / "memories.json"

SCHEMA = """
CREATE TABLE IF NOT EXISTS facts (
    fact_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content         TEXT NOT NULL UNIQUE,
    category        TEXT DEFAULT 'general',
    tags            TEXT DEFAULT '',
    trust_score     REAL DEFAULT 0.5,
    retrieval_count INTEGER DEFAULT 0,
    helpful_count   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hrr_vector      BLOB
);

CREATE TABLE IF NOT EXISTS entities (
    entity_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    entity_type TEXT DEFAULT 'unknown',
    aliases     TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fact_entities (
    fact_id   INTEGER REFERENCES facts(fact_id),
    entity_id INTEGER REFERENCES entities(entity_id),
    PRIMARY KEY (fact_id, entity_id)
);
"""


def split_title(content: str) -> tuple[str, str]:
    if " :: " in content:
        title, body = content.split(" :: ", 1)
        return title.strip(), body.strip()
    if "." in content:
        head, tail = content.split(".", 1)
        return head.strip(), (head + "." + tail).strip()
    trimmed = content.strip()
    return trimmed[:60].rstrip(), trimmed


def fetch_entities(conn: sqlite3.Connection, fact_id: int) -> list[str]:
    rows = conn.execute(
        """
        SELECT e.name
        FROM entities e
        JOIN fact_entities fe ON fe.entity_id = e.entity_id
        WHERE fe.fact_id = ?
        ORDER BY e.name
        """,
        (fact_id,),
    ).fetchall()
    return [row[0] for row in rows]


def export(db_path: Path, out_path: Path) -> list[dict]:
    if not db_path.exists():
        return []

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)

    rows = conn.execute(
        """
        SELECT fact_id, content, category, tags, trust_score,
               retrieval_count, helpful_count, created_at, updated_at
        FROM facts
        ORDER BY trust_score DESC, updated_at DESC, fact_id DESC
        """
    ).fetchall()

    payload = []
    for row in rows:
        title, body = split_title(row["content"])
        payload.append(
            {
                "id": f"fact-{row['fact_id']}",
                "fact_id": row["fact_id"],
                "title": title,
                "content": body,
                "category": row["category"],
                "tags": [t.strip() for t in (row["tags"] or "").split(",") if t.strip()],
                "trust": round(float(row["trust_score"] or 0), 2),
                "retrieval_count": int(row["retrieval_count"] or 0),
                "helpful_count": int(row["helpful_count"] or 0),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "entities": fetch_entities(conn, row["fact_id"]),
                "source": "holographic",
            }
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Path to Holographic memory_store.db")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output JSON path")
    args = parser.parse_args()

    payload = export(args.db, args.out)
    print(f"exported {len(payload)} memories -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
