import type { MemoryEntry, MemoryRelation } from '../types';
import { CATEGORY_LABELS, IMPORTANCE_LABELS, formatDateLabel, formatTimeLabel, paragraphs, recordToInspectorSummary } from '../lib/memory';
import { ChipButton, EmptyState, StatusPill } from './common';

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
  if (!open) return null;

  const activeRelations = record
    ? relations
        .filter((relation) => relation.fromId === record.id || relation.toId === record.id)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8)
    : [];

  const panel = (
    <div className="inspector__panel">
      <div className="inspector__header">
        <div>
          <p className="inspector__eyebrow">Inspector</p>
          <h2>{record ? record.title : 'Nenhuma memória selecionada'}</h2>
          <p className="inspector__subtitle">{record ? recordToInspectorSummary(record) : 'Escolha um nó no Brain ou um card do Diary para abrir o detalhe.'}</p>
        </div>
        <button type="button" className="toolbar-button toolbar-button--ghost" onClick={onClose} autoFocus={mobile}>
          Fechar
        </button>
      </div>

      {!record ? (
        <EmptyState
          eyebrow="Detalhe"
          title="Sem conteúdo para inspeção"
          description="Selecione uma memória para ver conteúdo, metadados, relações, tags e entidades."
        />
      ) : (
        <div className="inspector__body">
          <div className="inspector__stats">
            <div>
              <span>Categoria</span>
              <strong>{CATEGORY_LABELS[record.category]}</strong>
            </div>
            <div>
              <span>Importância</span>
              <strong>{IMPORTANCE_LABELS[record.importance]}</strong>
            </div>
            <div>
              <span>Confiança</span>
              <strong>{Math.round(record.trust * 100)}%</strong>
            </div>
            <div>
              <span>Relações</span>
              <strong>{record.relationCount}</strong>
            </div>
          </div>

          <section className="inspector__section">
            <p className="inspector__section-label">Conteúdo</p>
            <div className="inspector__content">
              {paragraphs(record.content).map((paragraph, index) => (
                <p key={`${record.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="inspector__section">
            <p className="inspector__section-label">Metadados</p>
            <dl className="inspector__meta">
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

          <section className="inspector__section">
            <p className="inspector__section-label">Tags</p>
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

          <section className="inspector__section">
            <p className="inspector__section-label">Entidades</p>
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

          <section className="inspector__section">
            <p className="inspector__section-label">Relações</p>
            {activeRelations.length ? (
              <div className="inspector__relations">
                {activeRelations.map((relation) => {
                  const counterpart = record ? counterpartRecord(record, relation, records) : undefined;
                  return (
                    <button
                      key={`${relation.fromId}-${relation.toId}-${relation.kind}`}
                      type="button"
                      className="inspector__relation"
                      onClick={() => counterpart && onSelectRecord(counterpart.id)}
                    >
                      <div className="inspector__relation-head">
                        <strong>{counterpart?.title ?? 'Relacionada'}</strong>
                        <StatusPill label={relationLabel(relation.kind)} tone="good" />
                      </div>
                      <p>{relation.evidence.join(' · ')}</p>
                      <span>peso {relation.weight.toFixed(1)}</span>
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
    </div>
  );

  if (mobile) {
    return (
      <div className="inspector-sheet" role="presentation">
        <button type="button" className="inspector-sheet__backdrop" aria-label="Fechar inspector" onClick={onClose} />
        <aside className="inspector-sheet__panel" role="dialog" aria-modal="true" aria-label="Detalhe da memória">
          {panel}
        </aside>
      </div>
    );
  }

  return (
    <aside className="inspector-rail" aria-label="Detalhe da memória">
      {panel}
    </aside>
  );
}
