import { useEffect, useRef } from 'react';
import type { AppSurface, DiaryGroup, FacetOption, MemoryEntry, MemoryFilters, MemoryRelation } from '../types';
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

function sourceLabel(source: string): string {
  return source === 'holographic' ? 'Holographic' : source;
}

function resultLabel(visibleCount: number): string {
  return `${visibleCount} ${visibleCount === 1 ? 'resultado' : 'resultados'}`;
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
      <button
        type="button"
        className={cx('surface-tab', surface === 'memories' && 'is-active')}
        aria-pressed={surface === 'memories'}
        onClick={() => onSurfaceChange('memories')}
      >
        Memórias
      </button>
      <button
        type="button"
        className={cx('surface-tab', surface === 'diary' && 'is-active')}
        aria-pressed={surface === 'diary'}
        onClick={() => onSurfaceChange('diary')}
      >
        Diário
      </button>
    </div>
  );
}

function TopNavigation({ syncLabel, syncTone }: { syncLabel: string; syncTone: PillTone }) {
  return (
    <header className="top-navigation">
      <div className="top-navigation__brand">
        <h1>Memory</h1>
      </div>
      <StatusPill label={syncLabel} tone={syncTone} />
    </header>
  );
}

function JournalToolbar({
  query,
  onQueryChange,
  onOpenFilters,
  activeFilterCount,
  activeFilterSummary,
  resultLabelText,
  surface,
  onSurfaceChange,
  compact,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  activeFilterSummary: string[];
  resultLabelText: string;
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
  compact: boolean;
}) {
  return (
    <section className={cx('journal-toolbar', compact && 'journal-toolbar--compact')} aria-label="Busca, filtros e modos">
      <div className="journal-toolbar__row">
        <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} />

        <label className="journal-search" htmlFor="memory-search">
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

        <button type="button" className="ui-button ui-button--ghost journal-toolbar__filters" onClick={onOpenFilters}>
          Filtros{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
      </div>

      <div className="journal-toolbar__meta">
        <StatusPill label={resultLabelText} tone={activeFilterCount ? 'accent' : 'neutral'} />
        <p className="journal-toolbar__summary">
          {activeFilterSummary.length ? activeFilterSummary.join(' · ') : 'Leitura limpa, busca forte e filtros compactos.'}
        </p>
      </div>
    </section>
  );
}

function MemoryEntryRow({
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
    <article className={cx('memory-row', active && 'is-active')}>
      <button type="button" className="memory-row__body" onClick={onSelect}>
        <div className="memory-row__top">
          <span className="memory-row__date">{formatShortDateLabel(record.createdAtMs)}</span>
          <span className="memory-row__category">{CATEGORY_LABELS[record.category]}</span>
        </div>

        <h3 className="memory-row__title">{record.title}</h3>
        <p className="memory-row__excerpt">{record.summary}</p>

        <div className="memory-row__meta">
          <span>{sourceLabel(record.source)}</span>
          <span>{IMPORTANCE_LABELS[record.importance]}</span>
        </div>
      </button>

      <div className="memory-row__chips">
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

function DayGroup({
  group,
  selectedId,
  onSelectRecord,
  onPickTag,
  onPickEntity,
}: {
  group: DiaryGroup;
  selectedId: string | null;
  onSelectRecord: (id: string) => void;
  onPickTag: (value: string) => void;
  onPickEntity: (value: string) => void;
}) {
  const totalEntries = group.entries.length;

  return (
    <article className="day-group">
      <header className="day-group__header">
        <div>
          <p className="day-group__eyebrow">{group.label}</p>
          <h3>{totalEntries} {totalEntries === 1 ? 'entrada' : 'entradas'}</h3>
        </div>
      </header>

      <div className="day-group__list">
        {group.entries.map((entry) => (
          <MemoryEntryRow
            key={entry.id}
            record={{
              id: entry.memoryId,
              factId: null,
              title: entry.title,
              content: entry.excerpt,
              category: entry.category,
              tags: entry.tags,
              entities: entry.entities,
              source: entry.source,
              trust: 0.5,
              retrievalCount: 0,
              helpfulCount: 0,
              createdAt: entry.createdAtMs ? new Date(entry.createdAtMs).toISOString() : '',
              updatedAt: entry.createdAtMs ? new Date(entry.createdAtMs).toISOString() : '',
              createdAtMs: entry.createdAtMs,
              updatedAtMs: entry.createdAtMs,
              importance: entry.importance,
              importanceScore: 0,
              relationCount: 0,
              summary: entry.excerpt,
              searchText: '',
            }}
            active={entry.memoryId === selectedId}
            onSelect={() => onSelectRecord(entry.memoryId)}
            onPickTag={onPickTag}
            onPickEntity={onPickEntity}
          />
        ))}
      </div>
    </article>
  );
}

function JournalTimeline({
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
        description="A timeline aparece quando a busca ou os filtros encontram registros datados."
      />
    );
  }

  return (
    <section className="timeline-stack" aria-label="Timeline do diário e das memórias">
      {groups.map((group) => (
        <DayGroup
          key={group.key}
          group={group}
          selectedId={selectedId}
          onSelectRecord={onSelectRecord}
          onPickTag={onPickTag}
          onPickEntity={onPickEntity}
        />
      ))}
    </section>
  );
}

function RelatedEntries({
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
    <section className="reading-section">
      <p className="reading-section__eyebrow">Relacionadas</p>
      <div className="related-list">
        {items.map(({ record, relation }) => (
          <button type="button" className="related-entry" key={record.id} onClick={() => onSelect(record.id)}>
            <div className="related-entry__top">
              <strong>{record.title}</strong>
              <StatusPill label={relationLabel(relation.kind)} tone="neutral" />
            </div>
            <p>{record.summary}</p>
            <span className="related-entry__meta">peso {relation.weight.toFixed(1)} · {relation.evidence.join(' · ')}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ReadingView({
  record,
  related,
  onBack,
  onSelectRecord,
}: {
  record: MemoryEntry | null;
  related: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  onBack: () => void;
  onSelectRecord: (id: string) => void;
}) {
  if (!record) {
    return (
      <EmptyState
        eyebrow="Leitura"
        title="Selecione uma entrada"
        description="A leitura completa aparece aqui, em formato de página única, com conteúdo, metadados e relações no fim."
        action={
          <button type="button" className="ui-button" onClick={onBack}>
            Voltar
          </button>
        }
      />
    );
  }

  return (
    <article className="reading-view" aria-label={`Leitura de ${record.title}`}>
      <div className="reading-view__bar">
        <button type="button" className="ui-button ui-button--ghost" onClick={onBack}>
          Voltar
        </button>
        <StatusPill label={CATEGORY_LABELS[record.category]} tone="accent" />
      </div>

      <header className="reading-view__header">
        <p className="reading-view__eyebrow">Leitura</p>
        <h2>{record.title}</h2>
        <p className="reading-view__summary">{record.summary}</p>
      </header>

      <section className="reading-section">
        <div className="reading-meta-grid">
          <div>
            <span>Data</span>
            <strong>
              {formatDateLabel(record.createdAtMs)} · {formatTimeLabel(record.createdAtMs)}
            </strong>
          </div>
          <div>
            <span>Origem</span>
            <strong>{sourceLabel(record.source)}</strong>
          </div>
          <div>
            <span>Importância</span>
            <strong>{IMPORTANCE_LABELS[record.importance]}</strong>
          </div>
          <div>
            <span>Relações</span>
            <strong>{record.relationCount}</strong>
          </div>
        </div>
      </section>

      <section className="reading-section">
        <p className="reading-section__eyebrow">Conteúdo</p>
        <div className="reading-content">
          {paragraphs(record.content).map((paragraph, index) => (
            <p key={`${record.id}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="reading-section">
        <p className="reading-section__eyebrow">Tags e entidades</p>
        <div className="reading-chip-row">
          {record.tags.length ? record.tags.map((tag) => <StatusPill key={`${record.id}-tag-${tag}`} label={tag} tone="accent" />) : <StatusPill label="Sem tags" tone="neutral" />}
          {record.entities.length ? record.entities.map((entity) => <StatusPill key={`${record.id}-entity-${entity}`} label={entity} tone="neutral" />) : <StatusPill label="Sem entidades" tone="neutral" />}
        </div>
      </section>

      <RelatedEntries items={related} onSelect={onSelectRecord} />

      <section className="reading-section">
        <p className="reading-section__eyebrow">Resumo de leitura</p>
        <p className="reading-footnote">{recordToInspectorSummary(record)}</p>
      </section>
    </article>
  );
}

function FilterSheet({
  open,
  compact,
  filters,
  facetGroups,
  onChange,
  onClear,
  onClose,
}: {
  open: boolean;
  compact: boolean;
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

  const FacetGroup = ({
    title,
    options,
    activeValue,
    onPick,
  }: {
    title: string;
    options: FacetOption[];
    activeValue: string | 'all';
    onPick: (value: string) => void;
  }) => (
    <section className="filter-group">
      <p className="filter-group__eyebrow">{title}</p>
      <div className="filter-group__chips">
        {options.map((option) => (
          <ChipButton
            key={option.value}
            label={option.value === 'all' ? `Todas · ${option.count}` : `${option.label} · ${option.count}`}
            active={activeValue === option.value}
            onClick={() => onPick(option.value)}
          />
        ))}
      </div>
    </section>
  );

  const body = (
    <div className="filter-sheet__body">
      <header className="filter-sheet__header">
        <div>
          <p className="filter-sheet__eyebrow">Filtros</p>
          <h2>Refinar o recorte</h2>
          <p className="filter-sheet__description">Use chips para limitar as memórias por categoria, importância, tag, entidade, origem e período.</p>
        </div>
        <div className="filter-sheet__actions">
          <button type="button" className="ui-button" onClick={onClear}>
            Limpar
          </button>
          <button ref={closeRef} type="button" className="ui-button ui-button--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </header>

      <div className="filter-sheet__grid">
        <FacetGroup title="Categorias" options={facetGroups.categories} activeValue={filters.category} onPick={(value) => onChange({ category: value as MemoryFilters['category'] })} />
        <FacetGroup title="Importância" options={facetGroups.importance} activeValue={filters.importance} onPick={(value) => onChange({ importance: value as MemoryFilters['importance'] })} />
        <FacetGroup title="Tags" options={facetGroups.tags} activeValue={filters.tag} onPick={(value) => onChange({ tag: value })} />
        <FacetGroup title="Entidades" options={facetGroups.entities} activeValue={filters.entity} onPick={(value) => onChange({ entity: value })} />
        <FacetGroup title="Origem" options={facetGroups.sources} activeValue={filters.source} onPick={(value) => onChange({ source: value })} />
        <section className="filter-group">
          <p className="filter-group__eyebrow">Período</p>
          <div className="filter-group__chips">
            {(['all', '7d', '30d', '90d', '365d'] as const).map((value) => (
              <ChipButton
                key={value}
                label={value === 'all' ? `Tudo · ${filters.period === 'all' ? 'ativo' : ''}` : PERIOD_LABELS[value]}
                active={filters.period === value}
                onClick={() => onChange({ period: value })}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div className={cx('filter-sheet', 'sheet', compact ? 'sheet--bottom' : 'sheet--drawer')} role="dialog" aria-modal="true" aria-label="Filtros avançados">
      <button type="button" className="sheet__backdrop" aria-label="Fechar filtros" onClick={onClose} />
      <div className={cx('sheet__panel', compact ? 'sheet__panel--bottom' : 'sheet__panel--drawer')}>{body}</div>
    </div>
  );
}

export interface AppShellProps {
  compact: boolean;
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
  syncLabel: string;
  syncTone: PillTone;
  totalCount: number;
  visibleCount: number;
  activeFilterSummary: string[];
  activeFilterCount: number;
  filters: MemoryFilters;
  facetGroups: FacetGroups;
  timelineGroups: DiaryGroup[];
  selectedRecord: MemoryEntry | null;
  relatedRecords: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  readerOpen: boolean;
  filtersOpen: boolean;
  onSelectRecord: (id: string) => void;
  onBackToTimeline: () => void;
  onQueryChange: (value: string) => void;
  onToggleFilter: (key: keyof MemoryFilters, value: string) => void;
  onPatchFilters: (patch: Partial<MemoryFilters>) => void;
  onClearFilters: () => void;
  onOpenFilters: () => void;
  onCloseFilters: () => void;
}

export function AppShell({
  compact,
  surface,
  onSurfaceChange,
  syncLabel,
  syncTone,
  totalCount,
  visibleCount,
  activeFilterSummary,
  activeFilterCount,
  filters,
  facetGroups,
  timelineGroups,
  selectedRecord,
  relatedRecords,
  readerOpen,
  filtersOpen,
  onSelectRecord,
  onBackToTimeline,
  onQueryChange,
  onToggleFilter,
  onPatchFilters,
  onClearFilters,
  onOpenFilters,
  onCloseFilters,
}: AppShellProps) {
  const openRecord = (id: string) => {
    onSelectRecord(id);
  };

  const timeline = (
    <JournalTimeline
      groups={timelineGroups}
      selectedId={selectedRecord?.id ?? null}
      onSelectRecord={openRecord}
      onPickTag={(value) => onToggleFilter('tag', value)}
      onPickEntity={(value) => onToggleFilter('entity', value)}
    />
  );

  const reading = (
    <ReadingView
      record={selectedRecord}
      related={relatedRecords}
      onBack={onBackToTimeline}
      onSelectRecord={openRecord}
    />
  );

  return (
    <div className={cx('journal-shell', compact && 'journal-shell--compact')}>
      <TopNavigation syncLabel={syncLabel} syncTone={syncTone} />

      <JournalToolbar
        query={filters.query}
        onQueryChange={onQueryChange}
        onOpenFilters={onOpenFilters}
        activeFilterCount={activeFilterCount}
        activeFilterSummary={activeFilterSummary}
        resultLabelText={resultLabel(visibleCount)}
        surface={surface}
        onSurfaceChange={onSurfaceChange}
        compact={compact}
      />

      <main className="journal-shell__content">
        {readerOpen ? reading : timeline}
      </main>

      <FilterSheet
        open={filtersOpen}
        compact={compact}
        filters={filters}
        facetGroups={facetGroups}
        onChange={onPatchFilters}
        onClear={onClearFilters}
        onClose={onCloseFilters}
      />

      <p className="journal-shell__sr-only">
        {totalCount} memórias no acervo.
      </p>
    </div>
  );
}
