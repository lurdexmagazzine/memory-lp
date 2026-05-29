import type { MemoryEntry, MemoryRelation } from '../types';
import { CATEGORY_LABELS, IMPORTANCE_LABELS, formatDateLabel, formatTimeLabel, paragraphs, recordToInspectorSummary } from '../lib/memory';
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
      return 'Vizinho temporal';
    default:
      return kind;
  }
}

function counterpartRecord(record: MemoryEntry, relation: MemoryRelation, records: MemoryEntry[]): MemoryEntry | undefined {
  const counterpartId = relation.fromId === record.id ? relation.toId : relation.fromId;
  return records.find((item) => item.id === counterpartId);
}

export function InspectorPanel({
  record,
  records,
  relations,
  open,
  mobile,
  onClose,
  onSelectRecord,
  onPickTag,
  onPickEntity,
}: {
  record: MemoryEntry | null;
  records: MemoryEntry[];
  relations: MemoryRelation[];
  open: boolean;
  mobile: boolean;
  onClose: () => void;
  onSelectRecord: (id: string) => void;
  onPickTag: (value: string) => void;
  onPickEntity: (value: string) => void;
}) {
  const activeRelations = record
    ? relations
        .filter((relation) => relation.fromId === record.id || relation.toId === record.id)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8)
    : [];

  return (
    <aside className={`inspector-panel ${mobile ? 'inspector-panel--sheet' : 'inspector-panel--dock'} ${open ? 'is-open' : ''}`} aria-label="Inspector de memória">
      <div className="inspector-panel__header">
        <SectionHeader
          eyebrow="Inspector"
          title={record ? record.title : 'Nenhuma memória selecionada'}
          description={record ? recordToInspectorSummary(record) : 'Escolha um nó no Brain ou uma entrada do Diary.'}
        />
        {mobile ? (
          <button type="button" className="inspector-panel__close" onClick={onClose}>
            Fechar
          </button>
        ) : null}
      </div>

      {!record ? (
        <EmptyState
          eyebrow="Detalhe"
          title="Sem conteúdo para inspeção"
          description="Selecione uma memória para ver conteúdo, metadados, relações, tags e entidades."
        />
      ) : (
        <div className="inspector-panel__body">
          <div className="inspector-stats">
            <div className="inspector-stat">
              <span className="inspector-stat__label">Categoria</span>
              <strong>{CATEGORY_LABELS[record.category]}</strong>
            </div>
            <div className="inspector-stat">
              <span className="inspector-stat__label">Importância</span>
              <strong>{IMPORTANCE_LABELS[record.importance]}</strong>
            </div>
            <div className="inspector-stat">
              <span className="inspector-stat__label">Confiança</span>
              <strong>{Math.round(record.trust * 100)}%</strong>
            </div>
            <div className="inspector-stat">
              <span className="inspector-stat__label">Relações</span>
              <strong>{record.relationCount}</strong>
            </div>
          </div>

          <section className="inspector-section">
            <p className="inspector-section__eyebrow">Conteúdo</p>
            <div className="inspector-content">
              {paragraphs(record.content).map((paragraph, index) => (
                <p key={`${record.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="inspector-section">
            <p className="inspector-section__eyebrow">Metadados</p>
            <dl className="inspector-meta">
              <div>
                <dt>Origem</dt>
                <dd>{record.source}</dd>
              </div>
              <div>
                <dt>Criação</dt>
                <dd>
                  {formatDateLabel(record.createdAtMs)} · {formatTimeLabel(record.createdAtMs)}
                </dd>
              </div>
              <div>
                <dt>Atualização</dt>
                <dd>
                  {formatDateLabel(record.updatedAtMs)} · {formatTimeLabel(record.updatedAtMs)}
                </dd>
              </div>
              <div>
                <dt>Avaliações</dt>
                <dd>
                  {record.helpfulCount} úteis · {record.retrievalCount} recuperações
                </dd>
              </div>
            </dl>
          </section>

          <section className="inspector-section">
            <p className="inspector-section__eyebrow">Tags</p>
            <div className="chip-row">
              {record.tags.length ? (
                record.tags.map((tag) => (
                  <ChipButton key={tag} label={tag} onClick={() => onPickTag(tag)} active={false} />
                ))
              ) : (
                <StatusPill label="Sem tags" tone="neutral" />
              )}
            </div>
          </section>

          <section className="inspector-section">
            <p className="inspector-section__eyebrow">Entidades</p>
            <div className="chip-row">
              {record.entities.length ? (
                record.entities.map((entity) => (
                  <ChipButton key={entity} label={entity} onClick={() => onPickEntity(entity)} active={false} />
                ))
              ) : (
                <StatusPill label="Sem entidades" tone="neutral" />
              )}
            </div>
          </section>

          <section className="inspector-section">
            <p className="inspector-section__eyebrow">Relações</p>
            {activeRelations.length ? (
              <div className="inspector-relations">
                {activeRelations.map((relation) => {
                  const counterpart = record ? counterpartRecord(record, relation, records) : undefined;
                  return (
                    <button
                      key={`${relation.fromId}-${relation.toId}-${relation.kind}`}
                      type="button"
                      className="inspector-relation"
                      onClick={() => counterpart && onSelectRecord(counterpart.id)}
                    >
                      <div className="inspector-relation__head">
                        <strong>{counterpart?.title ?? 'Relacionada'}</strong>
                        <StatusPill label={relationLabel(relation.kind)} tone="good" />
                      </div>
                      <p>{relation.evidence.join(' · ')}</p>
                      <span className="inspector-relation__weight">peso {relation.weight.toFixed(1)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                eyebrow="Relações"
                title="Sem relações fortes"
                description="Essa memória ainda não encontrou um vizinho relacional forte no recorte atual."
              />
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
