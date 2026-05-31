#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

DB_PATH = Path('/root/.hermes/memory_store.db')


def split_title_content(text: str) -> tuple[str, str]:
    text = text.strip()
    if ' :: ' in text:
        title, content = text.split(' :: ', 1)
        return title.strip(), content.strip()
    if '.' in text:
        title = text.split('.', 1)[0].strip()
    else:
        title = text
    return title, text


def export(out_path: Path) -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    entity_rows = conn.execute(
        '''
        SELECT fe.fact_id, e.name
        FROM fact_entities fe
        JOIN entities e ON e.entity_id = fe.entity_id
        ORDER BY fe.fact_id, e.name
        '''
    ).fetchall()
    entities_by_fact: dict[int, list[str]] = {}
    for row in entity_rows:
        entities_by_fact.setdefault(row['fact_id'], []).append(row['name'])

    facts = []
    for row in conn.execute(
        '''
        SELECT fact_id, content, category, tags, trust_score, retrieval_count,
               helpful_count, created_at, updated_at
        FROM facts
        ORDER BY trust_score DESC, fact_id DESC
        '''
    ):
        title, content = split_title_content(row['content'])
        tags = [tag.strip() for tag in (row['tags'] or '').split(',') if tag.strip()]
        facts.append(
            {
                'id': f"fact-{row['fact_id']}",
                'fact_id': row['fact_id'],
                'title': title,
                'content': content,
                'category': row['category'],
                'tags': tags,
                'trust': row['trust_score'],
                'retrieval_count': row['retrieval_count'],
                'helpful_count': row['helpful_count'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'entities': entities_by_fact.get(row['fact_id'], []),
                'source': 'holographic',
            }
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True, help='Output JSON path')
    args = parser.parse_args()
    export(Path(args.out))


if __name__ == '__main__':
    main()
