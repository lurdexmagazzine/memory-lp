#!/usr/bin/env python3
"""Seed a local Holographic memory_store.db with the curated memory-lp snapshot."""
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

DEFAULT_DB = Path.home() / ".hermes" / "memory_store.db"
DEFAULT_SOURCE = Path(__file__).resolve().parents[1] / "data" / "memories.json"

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

CREATE INDEX IF NOT EXISTS idx_facts_trust    ON facts(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_facts_category ON facts(category);
CREATE INDEX IF NOT EXISTS idx_entities_name  ON entities(name);

CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts
    USING fts5(content, tags, content=facts, content_rowid=fact_id);

CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
    INSERT INTO facts_fts(rowid, content, tags)
        VALUES (new.fact_id, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
    INSERT INTO facts_fts(facts_fts, rowid, content, tags)
        VALUES ('delete', old.fact_id, old.content, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON facts BEGIN
    INSERT INTO facts_fts(facts_fts, rowid, content, tags)
        VALUES ('delete', old.fact_id, old.content, old.tags);
    INSERT INTO facts_fts(rowid, content, tags)
        VALUES (new.fact_id, new.content, new.tags);
END;
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--reset", action="store_true", help="Clear the existing facts first")
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"source file not found: {args.source}")

    payload = json.loads(args.source.read_text(encoding='utf-8'))
    conn = sqlite3.connect(str(args.db))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)

    if args.reset:
        for table in ("fact_entities", "entities", "facts", "memory_banks"):
            try:
                conn.execute(f"DELETE FROM {table}")
            except sqlite3.Error:
                pass
        conn.commit()

    for item in payload:
        content = f"{item['title']} :: {item['content']}"
        tags = ", ".join(item.get('tags', []))
        conn.execute(
            """
            INSERT OR IGNORE INTO facts (content, category, tags, trust_score, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (content, item.get('category', 'general'), tags, float(item.get('trust', 0.5)), item.get('created_at'), item.get('updated_at')),
        )
    conn.commit()
    print(f"seeded {len(payload)} memories -> {args.db}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
