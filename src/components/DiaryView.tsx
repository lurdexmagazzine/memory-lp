import type { DiaryEntry, MemoryEntry } from '../types';
import { CATEGORY_LABELS, IMPORTANCE_LABELS, formatRelativeDate } from '../lib/memory';
import { ChipButton, EmptyState, SectionHeader, StatusPill } from './common';

interface DiaryGroup {
  key: string;
  label: string;
  entries: DiaryEntry[];
}

function groupEntries(entries: DiaryEntry[]): DiaryGroup[] {
  const map = new Map<string, DiaryEntry[]>();

  for (const entry of entries) {
    const bucket = map.get(entry.dateKey) ?? [];
    bucket.push(entry);
    map.set(entry.dateKey, bucket);
  }

  return [...map.entries()]
    .map(([key, groupedEntries]) => ({
      key,
      label: formatRelativeDate(key),
      entries: [...groupedEntries].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export function DiaryView({
  entries,
  records,
  activeId,
  onSelectRecord,
  onPickCategory,
  onPickTag,
  onPickEntity,
}: {
  entries: DiaryEntry[];
  records: MemoryEntry[];
  activeId: string | null;
  onSelectRecord: (id: string) => void;
  onPickCategory: (value: string) => void;
  onPickTag: (value: string) => void;
  onPickEntity: (value: string) => void;
}) {
  const focus = records.find((record) => record.id === activeId) ?? records[0] ?? null;
  const groups = groupEntries(entries);

  if (!entries.length) {
    return (
      <div className="view-stack diary-view">
        <SectionHeader
          eyebrow="Diary"
          title="Nenhuma entrada no recorte atual"
          description="Ajuste a busca ou os filtros para ver a timeline novamente."
        />
        <EmptyState
          eyebrow="Sem resultados"
          title="A timeline está vazia"
          description="Quando houver registros válidos, eles aparecem aqui em ordem cronológica, com leitura compacta e fácil de escanear."
        />
      </div>
    );
  }

  return (
    <div className="view-stack diary-view">
      <SectionHeader
        eyebrow="Diary"
        title="Timeline cronológica"
        description="Agrupada por data, com leitura compacta e acesso rápido ao inspector."
        action={focus ? <StatusPill label={`${IMPORTANCE_LABELS[focus.importance]} · ${CATEGORY_LABELS[focus.category]}`} tone="good" /> : null}
      />

      <div className="diary-quick-actions">
        <ChipButton label="Categoria atual" onClick={() => onPickCategory(focus?.category ?? 'all')} active={Boolean(focus)} />
        <ChipButton label="Tag principal" onClick={() => (focus?.tags[0] ? onPickTag(focus.tags[0]) : undefined)} active={Boolean(focus?.tags[0])} />
        <ChipButton label="Entidade principal" onClick={() => (focus?.entities[0] ? onPickEntity(focus.entities[0]) : undefined)} active={Boolean(focus?.entities[0])} />
      </div>

      <section className="timeline" aria-label="Entradas do diário">
        {groups.map((group) => (
          <article key={group.key} className="timeline-group">
            <header className="timeline-group__header">
              <div>
                <p className="timeline-group__eyebrow">{group.label}</p>
                <h3>{group.entries.length} registro(s)</h3>
              </div>
              <span className="timeline-group__count">{group.entries.length}</span>
            </header>

            <div className="timeline-group__list">
              {group.entries.map((entry) => {
                const record = records.find((item) => item.id === entry.memoryId);
                const isActive = record?.id === focus?.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`timeline-item ${isActive ? 'is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => onSelectRecord(entry.memoryId)}
                  >
                    <div className="timeline-item__head">
                      <p className="timeline-item__meta">
                        {CATEGORY_LABELS[entry.category]} · {IMPORTANCE_LABELS[entry.importance]}
                      </p>
                      <span className="timeline-item__source">{entry.source}</span>
                    </div>
                    <h4>{entry.title}</h4>
                    <p className="timeline-item__excerpt">{entry.excerpt}</p>
                    <div className="timeline-item__chips">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <ChipButton key={tag} label={tag} active={Boolean(focus?.tags.includes(tag))} onClick={() => onPickTag(tag)} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
