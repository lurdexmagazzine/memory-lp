import { useEffect, useMemo, useRef } from 'react';
import type { DiaryGroup, FacetOption, MemoryEntry, MemoryFilters, MemoryRelation, AppSurface } from '../types';
import type { FacetGroups } from '../lib/memory';
import {
  CATEGORY_LABELS,
  IMPORTANCE_LABELS,
  PERIOD_LABELS,
  formatDateLabel,
  formatShortDateLabel,
  formatTimeLabel,
  paragraphs,
  recordToInspectorSummary,
} from '../lib/memory';
import { ChipButton, EmptyState, StatusPill, cx } from './common';
import type { PillTone } from './common';

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

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sourceLabel(source: string): string {
  return source === 'holographic' ? 'Holographic' : source;
}

function SurfaceTabs({
  surface,
  onSurfaceChange,
}: {
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
}) {
  return (
    <div className="surface-tabs" role="tablist" aria-label="Memórias e diário">
      <button type="button" className={cx('surface-tab', surface === 'memories' && 'is-active')} aria-pressed={surface === 'memories'} onClick={() => onSurfaceChange('memories')}>
        Memórias
      </button>
      <button type="button" className={cx('surface-tab', surface === 'diary' && 'is-active')} aria-pressed={surface === 'diary'} onClick={() => onSurfaceChange('diary')}>
        Diário
      </button>
    </div>
  );
}

function SearchBar({
  query,
  onQueryChange,
  onOpenFilters,
  activeFilterCount,
  activeFilterSummary,
  resultLabel,
  mobile,
  surface,
  onSurfaceChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  activeFilterSummary: string[];
  resultLabel: string;
  mobile: boolean;
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
}) {
  return (
    <section className={cx('search-panel', mobile && 'search-panel--mobile')} aria-label="Busca e filtros">
      <div className="search-panel__row">
        <label className="search-panel__field" htmlFor="memory-search">
          <span>Buscar</span>
          <input
            id="memory-search"
            type="search"
            placeholder="Título, conteúdo, tag, entidade ou data"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
          />
        </label>

        <button type="button" className="ui-button ui-button--ghost search-panel__filters" onClick={onOpenFilters}>
          Filtros{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
      </div>

      <div className="search-panel__meta">
        <StatusPill label={resultLabel} tone={activeFilterCount ? 'accent' : 'neutral'} />
        <p className="search-panel__summary">
          {activeFilterSummary.length ? activeFilterSummary.join(' · ') : 'Leitura limpa, busca forte e detalhe contextual.'}
        </p>
      </div>

      {mobile ? <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} /> : null}
    </section>
  );
}

function MobileHeader({ onOpenFilters }: { onOpenFilters: () => void }) {
  return (
    <header className="mobile-header">
      <div className="mobile-header__brand">
        <p className="mobile-header__eyebrow">Memory</p>
        <h1>Memory</h1>
      </div>

      <button type="button" className="ui-button ui-button--ghost mobile-header__filters" onClick={onOpenFilters}>
        Filtros
      </button>
    </header>
  );
}

function QuickFacetRail({
  title,
  options,
  activeValue,
  onPick,
  labelAll = 'Todas',
}: {
  title: string;
  options: FacetOption[];
  activeValue: string | 'all';
  onPick: (value: string) => void;
  labelAll?: string;
}) {
  if (!options.length) return null;

  return (
    <section className="quick-facet">
      <p className="quick-facet__eyebrow">{title}</p>
      <div className="quick-facet__chips">
        {options.map((option) => (
          <ChipButton
            key={option.value}
            label={option.value === 'all' ? `${labelAll} · ${option.count}` : `${option.label} · ${option.count}`}
            active={activeValue === option.value}
            onClick={() => onPick(option.value)}
          />
        ))}
      </div>
    </section>
  );
}

function LeftRail({
  surface,
  onSurfaceChange,
  syncLabel,
  syncTone,
  totalCount,
  visibleCount,
  relationCount,
  activeFilterSummary,
  categories,
  tags,
  entities,
  filters,
  onPickCategory,
  onPickTag,
  onPickEntity,
  onOpenFilters,
}: {
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
  syncLabel: string;
  syncTone: PillTone;
  totalCount: number;
  visibleCount: number;
  relationCount: number;
  activeFilterSummary: string[];
  categories: FacetOption[];
  tags: FacetOption[];
  entities: FacetOption[];
  filters: MemoryFilters;
  onPickCategory: (value: string) => void;
  onPickTag: (value: string) => void;
  onPickEntity: (value: string) => void;
  onOpenFilters: () => void;
}) {
  return (
    <aside className="left-rail" aria-label="Navegação e filtros rápidos">
      <div className="left-rail__brand">
        <p className="left-rail__eyebrow">Memory</p>
        <h1>Memory</h1>
        <p className="left-rail__subtitle">Memórias, diário e relações.</p>
      </div>

      <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} />

      <div className="left-rail__stats">
        <div>
          <span>Visíveis</span>
          <strong>{visibleCount}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{totalCount}</strong>
        </div>
        <div>
          <span>Relações</span>
          <strong>{relationCount}</strong>
        </div>
      </div>

      <div className="left-rail__status">
        <StatusPill label={syncLabel} tone={syncTone} />
        <p>{activeFilterSummary.length ? activeFilterSummary.join(' · ') : 'Snapshots, notas e relações em leitura limpa.'}</p>
      </div>

      <QuickFacetRail title="Categorias" options={categories} activeValue={filters.category} onPick={onPickCategory} />
      <QuickFacetRail title="Tags" options={tags} activeValue={filters.tag} onPick={onPickTag} />
      <QuickFacetRail title="Entidades" options={entities} activeValue={filters.entity} onPick={onPickEntity} />

      <button type="button" className="ui-button left-rail__filters-button" onClick={onOpenFilters}>
        Filtros avançados
      </button>
    </aside>
  );
}

function MemoryRow({
  record,
  active,
  onSelect,
  onPickTag,
  onPickEntity,
}: {
  record: MemoryEntry;
  active: boolean;
  onSelect: () => void;
  onPickTag: (value: string) => void;
  onPickEntity: (value: string) => void;
}) {
  return (
    <article className={cx('note-row', active && 'is-active')}>
      <button type="button" className="note-row__body" onClick={onSelect}>
        <div className="note-row__top">
          <span className="note-row__date">{formatShortDateLabel(record.createdAtMs)}</span>
          <StatusPill
            label={IMPORTANCE_LABELS[record.importance]}
            tone={record.importance === 'anchor' ? 'accent' : record.importance === 'high' ? 'good' : record.importance === 'medium' ? 'warning' : 'neutral'}
          />
        </div>

        <h3 className="note-row__title">{record.title}</h3>
        <p className="note-row__excerpt">{record.summary}</p>

        <div className="note-row__meta">
          <span>{CATEGORY_LABELS[record.category]}</span>
          <span>{sourceLabel(record.source)}</span>
        </div>
      </button>

      <div className="note-row__chips">
        {record.tags.slice(0, 2).map((tag) => (
          <ChipButton key={`${record.id}-tag-${tag}`} label={tag} active={false} onClick={() => onPickTag(tag)} />
        ))}
        {record.entities.slice(0, 2).map((entity) => (
          <ChipButton key={`${record.id}-entity-${entity}`} label={entity} active={false} onClick={() => onPickEntity(entity)} />
        ))}
      </div>
    </article>
  );
}

function MemoryList({
  records,
  selectedId,
  onSelectRecord,
  onPickTag,
  onPickEntity,
}: {
  records: MemoryEntry[];
  selectedId: string | null;
  onSelectRecord: (id: string) => void;
  onPickTag: (value: string) => void;
  onPickEntity: (value: string) => void;
}) {
  if (!records.length) {
    return (
      <EmptyState
        eyebrow="Memórias"
        title="Nenhuma nota encontrou o recorte atual"
        description="Ajuste a busca ou os filtros para voltar a ver a lista de memórias."
      />
    );
  }

  return (
    <section className="surface-stack">
      <div className="section-head">
        <div>
          <p className="section-head__eyebrow">Memórias</p>
          <h2>Notas</h2>
          <p className="section-head__description">Lista limpa, ordenada por relevância e atualização.</p>
        </div>
        <StatusPill label={countLabel(records.length, 'nota', 'notas')} tone="accent" />
      </div>

      <div className="note-list" aria-label="Lista de memórias">
        {records.map((record) => (
          <MemoryRow
            key={record.id}
            record={record}
            active={record.id === selectedId}
            onSelect={() => onSelectRecord(record.id)}
            onPickTag={onPickTag}
            onPickEntity={onPickEntity}
          />
        ))}
      </div>
    </section>
  );
}

function DiaryTimeline({
  groups,
  selectedId,
  onSelectRecord,
  onPickTag,
  onPickEntity,
}: {
  groups: DiaryGroup[];
  selectedId: string | null;
  onSelectRecord: (id: string) => void;
  onPickTag: (value: string) => void;
  onPickEntity: (value: string) => void;
}) {
  if (!groups.length) {
    return (
      <EmptyState
        eyebrow="Diário"
        title="Nenhuma entrada no recorte atual"
        description="A timeline aparece quando o filtro encontra registros datados."
      />
    );
  }

  const totalEntries = groups.reduce((total, group) => total + group.entries.length, 0);

  return (
    <section className="surface-stack">
      <div className="section-head">
        <div>
          <p className="section-head__eyebrow">Diário</p>
          <h2>Timeline</h2>
          <p className="section-head__description">Agrupada por data, para leitura cronológica e retorno rápido ao reader.</p>
        </div>
        <StatusPill label={countLabel(totalEntries, 'entrada', 'entradas')} tone="accent" />
      </div>

      <div className="timeline" aria-label="Timeline do diário">
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
              {group.entries.map((entry) => (
                <article key={entry.id} className={cx('timeline-row', entry.memoryId === selectedId && 'is-active')}>
                  <button type="button" className="timeline-row__body" onClick={() => onSelectRecord(entry.memoryId)}>
                    <div className="timeline-row__top">
                      <span className="timeline-row__date">{entry.dateLabel}</span>
                      <span className="timeline-row__source">{sourceLabel(entry.source)}</span>
                    </div>
                    <h4>{entry.title}</h4>
                    <p>{entry.excerpt}</p>
                  </button>
                  <div className="timeline-row__chips">
                    {entry.tags.slice(0, 2).map((tag) => (
                      <ChipButton key={`${entry.id}-tag-${tag}`} label={tag} active={false} onClick={() => onPickTag(tag)} />
                    ))}
                    {entry.entities.slice(0, 2).map((entity) => (
                      <ChipButton key={`${entry.id}-entity-${entity}`} label={entity} active={false} onClick={() => onPickEntity(entity)} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RelatedNotes({
  items,
  onSelect,
}: {
  items: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  onSelect: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        eyebrow="Relacionadas"
        title="Sem relações fortes"
        description="As relações aparecem aqui como apoio à leitura, não como tela principal."
      />
    );
  }

  return (
    <section className="reader-section">
      <p className="reader-section__eyebrow">Relacionadas</p>
      <div className="related-list">
        {items.map(({ record, relation }) => (
          <button type="button" className="related-row" key={record.id} onClick={() => onSelect(record.id)}>
            <div className="related-row__top">
              <strong>{record.title}</strong>
              <StatusPill label={relationLabel(relation.kind)} tone="neutral" />
            </div>
            <p>{record.summary}</p>
            <span className="related-row__meta">peso {relation.weight.toFixed(1)} · {relation.evidence.join(' · ')}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ReaderCard({
  record,
  related,
  onSelectRecord,
}: {
  record: MemoryEntry | null;
  related: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  onSelectRecord: (id: string) => void;
}) {
  if (!record) {
    return (
      <EmptyState
        eyebrow="Reader"
        title="Selecione uma nota"
        description="A leitura completa aparece aqui com conteúdo, metadados, tags, entidades e relações relacionadas."
      />
    );
  }

  return (
    <article className="reader-card" aria-label={`Leitura de ${record.title}`}>
      <header className="reader-card__header">
        <div>
          <p className="reader-card__eyebrow">Reader</p>
          <h2>{record.title}</h2>
          <p className="reader-card__summary">{record.summary}</p>
        </div>
      </header>

      <div className="reader-meta-grid">
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

      <section className="reader-section">
        <p className="reader-section__eyebrow">Conteúdo</p>
        <div className="reader-content">
          {paragraphs(record.content).map((paragraph, index) => (
            <p key={`${record.id}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="reader-section">
        <p className="reader-section__eyebrow">Metadados</p>
        <dl className="reader-meta-list">
          <div>
            <dt>Origem</dt>
            <dd>{sourceLabel(record.source)}</dd>
          </div>
          <div>
            <dt>Criado</dt>
            <dd>
              {formatDateLabel(record.createdAtMs)} · {formatTimeLabel(record.createdAtMs)}
            </dd>
          </div>
          <div>
            <dt>Atualizado</dt>
            <dd>
              {formatDateLabel(record.updatedAtMs)} · {formatTimeLabel(record.updatedAtMs)}
            </dd>
          </div>
          <div>
            <dt>Avaliativo</dt>
            <dd>
              {record.helpfulCount} úteis · {record.retrievalCount} recuperações
            </dd>
          </div>
        </dl>
      </section>

      <section className="reader-section">
        <p className="reader-section__eyebrow">Tags e entidades</p>
        <div className="reader-chip-row">
          {record.tags.length ? record.tags.map((tag) => <StatusPill key={`${record.id}-tag-${tag}`} label={tag} tone="accent" />) : <StatusPill label="Sem tags" tone="neutral" />}
          {record.entities.length ? record.entities.map((entity) => <StatusPill key={`${record.id}-entity-${entity}`} label={entity} tone="neutral" />) : <StatusPill label="Sem entidades" tone="neutral" />}
        </div>
      </section>

      <RelatedNotes items={related} onSelect={onSelectRecord} />

      <section className="reader-section">
        <p className="reader-section__eyebrow">Resumo de leitura</p>
        <p className="reader-footnote">{recordToInspectorSummary(record)}</p>
      </section>
    </article>
  );
}

function ReaderPanel({
  record,
  related,
  onSelectRecord,
  onClose,
  mobile = false,
  open = true,
}: {
  record: MemoryEntry | null;
  related: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  onSelectRecord: (id: string) => void;
  onClose?: () => void;
  mobile?: boolean;
  open?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open && onClose) {
      closeRef.current?.focus();
    }
  }, [open, onClose, record?.id]);

  const body = (
    <div className="reader-panel__inner">
      {onClose ? (
        <div className="reader-panel__bar">
          <button type="button" className="ui-button ui-button--ghost" onClick={onClose} ref={closeRef}>
            Voltar
          </button>
          <button type="button" className="ui-button ui-button--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      ) : null}
      <ReaderCard record={record} related={related} onSelectRecord={onSelectRecord} />
    </div>
  );

  if (mobile) {
    if (!open) return null;
    return (
      <div className="sheet reader-sheet" role="dialog" aria-modal="true" aria-label="Leitura da nota">
        <button type="button" className="sheet__backdrop" aria-label="Fechar leitura" onClick={onClose} />
        <div className="sheet__panel sheet__panel--bottom">{body}</div>
      </div>
    );
  }

  return <aside className="reader-panel">{body}</aside>;
}

function FilterSheet({
  open,
  mobile,
  filters,
  facetGroups,
  onChange,
  onClear,
  onClose,
}: {
  open: boolean;
  mobile: boolean;
  filters: MemoryFilters;
  facetGroups: FacetGroups;
  onChange: (patch: Partial<MemoryFilters>) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const body = (
    <div className="filter-sheet__body">
      <header className="sheet-header">
        <div>
          <p className="sheet-header__eyebrow">Filtros</p>
          <h2>Refinar o recorte</h2>
          <p className="sheet-header__description">Use chips para limitar as memórias por categoria, importância, tag e entidade.</p>
        </div>
        <div className="sheet-header__actions">
          <button type="button" className="ui-button" onClick={onClear}>
            Limpar
          </button>
          <button ref={closeRef} type="button" className="ui-button ui-button--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </header>

      <div className="sheet-grid">
        <QuickFacetRail
          title="Categorias"
          options={facetGroups.categories}
          activeValue={filters.category}
          onPick={(value) => onChange({ category: value as MemoryFilters['category'] })}
        />
        <QuickFacetRail
          title="Importância"
          options={facetGroups.importance}
          activeValue={filters.importance}
          onPick={(value) => onChange({ importance: value as MemoryFilters['importance'] })}
        />
        <QuickFacetRail
          title="Tags"
          options={facetGroups.tags}
          activeValue={filters.tag}
          onPick={(value) => onChange({ tag: value })}
        />
        <QuickFacetRail
          title="Entidades"
          options={facetGroups.entities}
          activeValue={filters.entity}
          onPick={(value) => onChange({ entity: value })}
        />
        <section className="quick-facet">
          <p className="quick-facet__eyebrow">Período</p>
          <div className="quick-facet__chips">
            {(['all', '7d', '30d', '90d', '365d'] as const).map((value) => (
              <ChipButton
                key={value}
                label={value === 'all' ? `Tudo${filters.period === 'all' ? ' · ativo' : ''}` : `${PERIOD_LABELS[value]}`}
                active={filters.period === value}
                onClick={() => onChange({ period: value })}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div className="sheet filter-sheet" role="dialog" aria-modal="true" aria-label="Filtros avançados">
        <button type="button" className="sheet__backdrop" aria-label="Fechar filtros" onClick={onClose} />
        <div className="sheet__panel sheet__panel--bottom">{body}</div>
      </div>
    );
  }

  return (
    <aside className="sheet filter-sheet filter-sheet--drawer" role="dialog" aria-modal="true" aria-label="Filtros avançados">
      <button type="button" className="sheet__backdrop sheet__backdrop--drawer" aria-label="Fechar filtros" onClick={onClose} />
      <div className="sheet__panel sheet__panel--drawer">{body}</div>
    </aside>
  );
}

export interface AppShellProps {
  mobile: boolean;
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
  syncLabel: string;
  syncTone: PillTone;
  totalCount: number;
  visibleCount: number;
  relationCount: number;
  activeFilterSummary: string[];
  activeFilterCount: number;
  filters: MemoryFilters;
  facetGroups: FacetGroups;
  records: MemoryEntry[];
  diaryGroups: DiaryGroup[];
  selectedRecord: MemoryEntry | null;
  relatedRecords: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  onSelectRecord: (id: string) => void;
  onQueryChange: (value: string) => void;
  onToggleFilter: (key: keyof MemoryFilters, value: string) => void;
  onPatchFilters: (patch: Partial<MemoryFilters>) => void;
  onClearFilters: () => void;
  onOpenFilters: () => void;
  onCloseFilters: () => void;
  onOpenReader: () => void;
  onCloseReader: () => void;
  readerOpen: boolean;
  filtersOpen: boolean;
}

export function AppShell({
  mobile,
  surface,
  onSurfaceChange,
  syncLabel,
  syncTone,
  totalCount,
  visibleCount,
  relationCount,
  activeFilterSummary,
  activeFilterCount,
  filters,
  facetGroups,
  records,
  diaryGroups,
  selectedRecord,
  relatedRecords,
  onSelectRecord,
  onQueryChange,
  onToggleFilter,
  onPatchFilters,
  onClearFilters,
  onOpenFilters,
  onCloseFilters,
  readerOpen,
  filtersOpen,
  onOpenReader,
  onCloseReader,
}: AppShellProps) {
  const resultLabel = countLabel(visibleCount, 'resultado', 'resultados');

  const selectRecord = (id: string) => {
    onSelectRecord(id);
    if (mobile) {
      onOpenReader();
    }
  };

  if (mobile) {
    return (
      <div className="notes-shell notes-shell--mobile">
        <MobileHeader
          onOpenFilters={onOpenFilters}
        />

        <SearchBar
          query={filters.query}
          onQueryChange={onQueryChange}
          onOpenFilters={onOpenFilters}
          activeFilterCount={activeFilterCount}
          activeFilterSummary={activeFilterSummary}
          resultLabel={resultLabel}
          mobile
          surface={surface}
          onSurfaceChange={onSurfaceChange}
        />

        <main className="notes-shell__content">
          {surface === 'memories' ? (
            <MemoryList records={records} selectedId={selectedRecord?.id ?? null} onSelectRecord={selectRecord} onPickTag={(value) => onToggleFilter('tag', value)} onPickEntity={(value) => onToggleFilter('entity', value)} />
          ) : (
            <DiaryTimeline groups={diaryGroups} selectedId={selectedRecord?.id ?? null} onSelectRecord={selectRecord} onPickTag={(value) => onToggleFilter('tag', value)} onPickEntity={(value) => onToggleFilter('entity', value)} />
          )}
        </main>

        <ReaderPanel mobile open={readerOpen} record={selectedRecord} related={relatedRecords} onSelectRecord={selectRecord} onClose={onCloseReader} />
        <FilterSheet mobile open={filtersOpen} filters={filters} facetGroups={facetGroups} onChange={onPatchFilters} onClear={onClearFilters} onClose={onCloseFilters} />
      </div>
    );
  }

  return (
    <div className={cx('notes-shell', 'notes-shell--desktop', filtersOpen && 'is-filters-open')}>
      <LeftRail
        surface={surface}
        onSurfaceChange={onSurfaceChange}
        syncLabel={syncLabel}
        syncTone={syncTone}
        totalCount={totalCount}
        visibleCount={visibleCount}
        relationCount={relationCount}
        activeFilterSummary={activeFilterSummary}
        categories={facetGroups.categories}
        tags={facetGroups.tags}
        entities={facetGroups.entities}
        filters={filters}
        onPickCategory={(value) => onToggleFilter('category', value)}
        onPickTag={(value) => onToggleFilter('tag', value)}
        onPickEntity={(value) => onToggleFilter('entity', value)}
        onOpenFilters={onOpenFilters}
      />

      <main className="notes-shell__workspace">
        <SearchBar
          query={filters.query}
          onQueryChange={onQueryChange}
          onOpenFilters={onOpenFilters}
          activeFilterCount={activeFilterCount}
          activeFilterSummary={activeFilterSummary}
          resultLabel={resultLabel}
          mobile={false}
          surface={surface}
          onSurfaceChange={onSurfaceChange}
        />

        {surface === 'memories' ? (
          <MemoryList records={records} selectedId={selectedRecord?.id ?? null} onSelectRecord={selectRecord} onPickTag={(value) => onToggleFilter('tag', value)} onPickEntity={(value) => onToggleFilter('entity', value)} />
        ) : (
          <DiaryTimeline groups={diaryGroups} selectedId={selectedRecord?.id ?? null} onSelectRecord={selectRecord} onPickTag={(value) => onToggleFilter('tag', value)} onPickEntity={(value) => onToggleFilter('entity', value)} />
        )}
      </main>

      <ReaderPanel mobile={false} open record={selectedRecord} related={relatedRecords} onSelectRecord={selectRecord} />
      <FilterSheet mobile={false} open={filtersOpen} filters={filters} facetGroups={facetGroups} onChange={onPatchFilters} onClear={onClearFilters} onClose={onCloseFilters} />
    </div>
  );
}
