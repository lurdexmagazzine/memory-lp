import type { Entity, MemoryDatasetStats, MemoryEntry, MemoryRelation } from '../types';
import { CATEGORY_LABELS, IMPORTANCE_LABELS, formatDateLabel } from '../lib/memory';
import { ChipButton, EmptyState, MetricTile, SectionHeader, StatusPill } from './common';

function countBy<T extends string>(items: T[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function relatedPairs(recordId: string, relations: MemoryRelation[]): MemoryRelation[] {
  return relations
    .filter((relation) => relation.fromId === recordId || relation.toId === recordId)
    .sort((a, b) => b.weight - a.weight);
}

function relatedRecordIds(recordId: string, relations: MemoryRelation[]): string[] {
  return relatedPairs(recordId, relations)
    .map((relation) => (relation.fromId === recordId ? relation.toId : relation.fromId))
    .filter((value, index, array) => array.indexOf(value) === index);
}

function relationKindLabel(kind: MemoryRelation['kind']): string {
  switch (kind) {
    case 'shared-tag':
      return 'tag';
    case 'shared-entity':
      return 'entidade';
    case 'same-category':
      return 'categoria';
    case 'temporal-neighbor':
      return 'tempo';
    default:
      return kind;
  }
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
      <div className="view-stack">
        <SectionHeader
          eyebrow="Brain"
          title="Nenhuma memória para mapear"
          description="Ajuste a busca ou os filtros para o cérebro voltar a acender."
        />
        <EmptyState
          eyebrow="Vazio"
          title="Sem nós disponíveis"
          description="Quando houver registros válidos, o mapa relacional aparece aqui com clusters, relações e importância."
        />
      </div>
    );
  }

  const activeRelations = focus ? relatedPairs(focus.id, relations) : [];
  const relatedIds = focus ? relatedRecordIds(focus.id, relations) : [];
  const relatedRecords = relatedIds
    .map((id) => records.find((record) => record.id === id))
    .filter((value): value is MemoryEntry => Boolean(value))
    .slice(0, 8);
  const topCategories = Object.entries(countBy(records.map((record) => record.category)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topTags = Object.entries(countBy(records.flatMap((record) => record.tags)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topEntities = entities.filter((entity) => entity.kind !== 'category').slice(0, 8);

  return (
    <div className="view-stack brain-view">
      <SectionHeader
        eyebrow="Brain"
        title="Mapa relacional"
        description="Nós, clusters, relações e importância. Toque em um item para abrir a inspeção."
        action={<StatusPill label={focus ? `${IMPORTANCE_LABELS[focus.importance]} · ${formatDateLabel(focus.createdAtMs)}` : 'Sem foco'} tone="accent" />}
      />

      <div className="brain-metrics">
        <MetricTile label="Memórias" value={stats.total} note="no recorte atual" tone="accent" />
        <MetricTile label="Relações" value={stats.relationCount} note="arestas derivadas" tone="calm" />
        <MetricTile label="Entidades" value={stats.entityCount} note="tags, nomes e categorias" />
        <MetricTile label="Âncoras" value={stats.importance.anchor} note="registros fortes" />
      </div>

      <section className="brain-canvas" aria-label="Mapa relacional">
        <div className="brain-canvas__head">
          <div>
            <p className="brain-canvas__eyebrow">Foco atual</p>
            <h3>{focus?.title ?? 'Sem foco'}</h3>
            <p className="brain-canvas__meta">{focus ? `${CATEGORY_LABELS[focus.category]} · ${formatDateLabel(focus.createdAtMs)}` : 'Escolha um nó'}</p>
          </div>
          <div className="brain-canvas__chips">
            {focus?.tags.slice(0, 3).map((tag) => (
              <ChipButton key={tag} active label={tag} onClick={() => onPickTag(tag)} />
            ))}
          </div>
        </div>

        <div className="brain-map" role="list" aria-label="Nodos do cérebro">
          <button
            type="button"
            className="brain-node brain-node--focus"
            onClick={() => focus && onSelectRecord(focus.id)}
            aria-pressed="true"
          >
            <span className="brain-node__label">{focus?.title ?? 'Foco'}</span>
            <span className="brain-node__meta">
              {focus ? `${IMPORTANCE_LABELS[focus.importance]} · ${focus.relationCount} relações` : '—'}
            </span>
          </button>

          {relatedRecords.map((record, index) => {
            const relation = activeRelations.find((item) => item.fromId === record.id || item.toId === record.id);
            const angle = (index / Math.max(relatedRecords.length, 1)) * Math.PI * 2;
            const radius = 37;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;

            return (
              <button
                key={record.id}
                type="button"
                className="brain-node"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => onSelectRecord(record.id)}
                aria-pressed={record.id === focus?.id}
              >
                <span className="brain-node__label">{record.title}</span>
                <span className="brain-node__meta">
                  {CATEGORY_LABELS[record.category]} · {relation ? relationKindLabel(relation.kind) : 'nó'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="brain-map__foot">
          {focus ? <p>{focus.summary}</p> : null}
        </div>
      </section>

      <section className="cluster-grid" aria-label="Clusters e filtros rápidos">
        <div className="cluster-card">
          <p className="cluster-card__eyebrow">Categorias</p>
          <div className="cluster-card__chips">
            {topCategories.map(([category, count]) => (
              <ChipButton key={category} label={`${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category} · ${count}`} onClick={() => onPickCategory(category)} active={focus?.category === category} />
            ))}
          </div>
        </div>

        <div className="cluster-card">
          <p className="cluster-card__eyebrow">Tags principais</p>
          <div className="cluster-card__chips">
            {topTags.map(([tag, count]) => (
              <ChipButton key={tag} label={`${tag} · ${count}`} onClick={() => onPickTag(tag)} active={focus?.tags.includes(tag)} />
            ))}
          </div>
        </div>

        <div className="cluster-card">
          <p className="cluster-card__eyebrow">Entidades</p>
          <div className="cluster-card__chips">
            {topEntities.map((entity) => (
              <ChipButton key={entity.id} label={`${entity.label} · ${entity.count}`} onClick={() => onPickEntity(entity.label)} active={focus?.entities.some((item) => item.toLowerCase() === entity.label.toLowerCase())} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
