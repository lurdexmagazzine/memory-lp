import type { Entity, MemoryDatasetStats, MemoryEntry, MemoryRelation } from '../types';
import { CATEGORY_LABELS, IMPORTANCE_LABELS, formatDateLabel } from '../lib/memory';
import { ChipButton, EmptyState, SectionHeader, StatusPill } from './common';

function relationLabel(kind: MemoryRelation['kind']): string {
  switch (kind) {
    case 'shared-tag':
      return 'Tag compartilhada';
    case 'shared-entity':
      return 'Entidade compartilhada';
    case 'same-category':
      return 'Mesma categoria';
    case 'temporal-neighbor':
      return 'Vizinha temporal';
    default:
      return kind;
  }
}

function counterpartRecord(record: MemoryEntry, relation: MemoryRelation, records: MemoryEntry[]): MemoryEntry | undefined {
  const counterpartId = relation.fromId === record.id ? relation.toId : relation.fromId;
  return records.find((item) => item.id === counterpartId);
}

export function BrainView({
  records,
  entities,
  relations,
  stats,
  activeId,
  onSelectRecord,
  onPickCategory,
  onPickEntity,
  onPickTag,
}: {
  records: MemoryEntry[];
  entities: Entity[];
  relations: MemoryRelation[];
  stats: MemoryDatasetStats;
  activeId: string | null;
  onSelectRecord: (id: string) => void;
  onPickCategory: (value: string) => void;
  onPickEntity: (value: string) => void;
  onPickTag: (value: string) => void;
}) {
  const focus = records.find((record) => record.id === activeId) ?? records[0] ?? null;

  if (!records.length) {
    return (
      <div className="view-stack brain-view">
        <SectionHeader
          eyebrow="Brain"
          title="Nenhuma memória para mapear"
          description="Ajuste a busca ou os filtros para o cérebro voltar a acender."
        />
        <EmptyState
          eyebrow="Vazio"
          title="Sem nós disponíveis"
          description="Quando houver registros válidos, o mapa relacional aparece aqui com foco, relações e clusters." 
        />
      </div>
    );
  }

  const activeRelations = focus
    ? relations.filter((relation) => relation.fromId === focus.id || relation.toId === focus.id).slice(0, 6)
    : [];

  const relatedRecords = activeRelations
    .map((relation) => (focus ? counterpartRecord(focus, relation, records) : undefined))
    .filter((value): value is MemoryEntry => Boolean(value));

  const topCategories = Object.entries(
    records.reduce<Record<string, number>>((accumulator, record) => {
      accumulator[record.category] = (accumulator[record.category] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topTags = Object.entries(
    records.flatMap((record) => record.tags).reduce<Record<string, number>>((accumulator, tag) => {
      accumulator[tag] = (accumulator[tag] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topEntities = entities.filter((entity) => entity.kind !== 'category').slice(0, 8);

  return (
    <div className="view-stack brain-view">
      <SectionHeader
        eyebrow="Brain"
        title="Mapa relacional"
        description="Foco, conexões e clusters. Toque em um item para abrir o detalhe contextual."
        action={<StatusPill label={focus ? `${IMPORTANCE_LABELS[focus.importance]} · ${formatDateLabel(focus.createdAtMs)}` : 'Sem foco'} tone="accent" />}
      />

      <section className="brain-focus" aria-label="Foco relacional">
        <div className="brain-focus__primary">
          <p className="brain-focus__eyebrow">Nó em foco</p>
          <h3>{focus?.title ?? 'Sem foco'}</h3>
          <p className="brain-focus__summary">{focus?.summary ?? 'Nenhuma memória selecionada.'}</p>

          <dl className="brain-focus__meta">
            <div>
              <dt>Categoria</dt>
              <dd>{focus ? CATEGORY_LABELS[focus.category] : '—'}</dd>
            </div>
            <div>
              <dt>Importância</dt>
              <dd>{focus ? IMPORTANCE_LABELS[focus.importance] : '—'}</dd>
            </div>
            <div>
              <dt>Origem</dt>
              <dd>{focus?.source ?? '—'}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{focus ? formatDateLabel(focus.createdAtMs) : '—'}</dd>
            </div>
          </dl>

          <div className="chip-row">
            {focus?.tags.slice(0, 5).map((tag) => (
              <ChipButton key={tag} active label={tag} onClick={() => onPickTag(tag)} />
            ))}
          </div>
        </div>

        <div className="brain-focus__relations">
          <div className="brain-focus__relations-head">
            <div>
              <p className="brain-focus__eyebrow">Conexões próximas</p>
              <h4>Relações fortes</h4>
            </div>
            <StatusPill label={`${activeRelations.length} ligações`} tone="good" />
          </div>

          <div className="brain-relation-stack">
            {relatedRecords.length ? (
              relatedRecords.map((record) => {
                const relation = activeRelations.find((item) => item.fromId === record.id || item.toId === record.id);
                return (
                  <button key={record.id} type="button" className="brain-relation-card" onClick={() => onSelectRecord(record.id)}>
                    <div className="brain-relation-card__head">
                      <strong>{record.title}</strong>
                      <span>{relation ? relationLabel(relation.kind) : 'nó'}</span>
                    </div>
                    <p>{record.summary}</p>
                    {relation ? <small>peso {relation.weight.toFixed(1)} · {relation.evidence.join(' · ')}</small> : null}
                  </button>
                );
              })
            ) : (
              <EmptyState
                eyebrow="Conexões"
                title="Sem relações fortes"
                description="Esse nó ainda não encontrou vizinhos com força suficiente neste recorte."
              />
            )}
          </div>
        </div>
      </section>

      <section className="brain-clusters" aria-label="Clusters e filtros rápidos">
        <article className="cluster-card">
          <p className="cluster-card__eyebrow">Categorias</p>
          <div className="cluster-card__chips">
            {topCategories.map(([category, count]) => (
              <ChipButton
                key={category}
                label={`${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category} · ${count}`}
                onClick={() => onPickCategory(category)}
                active={focus?.category === category}
              />
            ))}
          </div>
        </article>

        <article className="cluster-card">
          <p className="cluster-card__eyebrow">Tags centrais</p>
          <div className="cluster-card__chips">
            {topTags.map(([tag, count]) => (
              <ChipButton key={tag} label={`${tag} · ${count}`} onClick={() => onPickTag(tag)} active={Boolean(focus?.tags.includes(tag))} />
            ))}
          </div>
        </article>

        <article className="cluster-card">
          <p className="cluster-card__eyebrow">Entidades</p>
          <div className="cluster-card__chips">
            {topEntities.map((entity) => (
              <ChipButton
                key={entity.id}
                label={`${entity.label} · ${entity.count}`}
                onClick={() => onPickEntity(entity.label)}
                active={Boolean(focus?.entities.some((item) => item.toLowerCase() === entity.label.toLowerCase()))}
              />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
