import { useEffect, useMemo, useRef, type RefObject } from 'react';
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

type TimelineAnchor = {
  id: string;
  scrollTop: number;
  itemTop: number;
};

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function compactTags(tags: string[], maxVisible = 2): { visible: string[]; hidden: number } {
  return {
    visible: tags.slice(0, maxVisible),
    hidden: Math.max(0, tags.length - maxVisible),
  };
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

function IndexToolbar({
  query,
  onQueryChange,
  onOpenFilters,
  activeFilterCount,
  activeFilterSummary,
  resultLabelText,
  surface,
  onSurfaceChange,
  syncLabel,
  syncTone,
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
  syncLabel: string;
  syncTone: PillTone;
  compact: boolean;
}) {
  return (
    <header className={cx('index-toolbar', compact && 'index-toolbar--compact')}>
      <div className="index-toolbar__top">
        <div className="index-toolbar__brand">
          <h1>Diário</h1>
          <StatusPill label={syncLabel} tone={syncTone} />
        </div>
        <p className="index-toolbar__count">{resultLabelText}</p>
      </div>

      <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} />

      <div className="index-toolbar__controls">
        <label className="search-field" htmlFor="memory-search">
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

        <button type="button" className="ui-button ui-button--ghost index-toolbar__filters" onClick={onOpenFilters}>
          Filtros{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
      </div>

      <div className="index-toolbar__meta">
        <p className="index-toolbar__summary">
          {activeFilterSummary.length ? activeFilterSummary.join(' · ') : 'Fragmentos por data, com leitura em camadas.'}
        </p>
      </div>
    </header>
  );
}

function FragmentItem({
  record,
  active,
  compact,
  onSelect,
  onPickTag,
  onBeforeSelect,
}: {
  record: MemoryEntry;
  active: boolean;
  compact: boolean;
  onSelect: () => void;
  onPickTag: (value: string) => void;
  onBeforeSelect: (node: HTMLElement) => void;
}) {
  const tags = compactTags(record.tags, 2);

  return (
    <article className={cx('memory-list-item', active && 'is-active')}>
      <button
        type="button"
        className="memory-list-item__body"
        data-memory-id={record.id}
        onPointerDown={(event) => {
          if (compact) event.preventDefault();
          onBeforeSelect(event.currentTarget);
        }}
        onClick={(event) => {
          if (compact) event.currentTarget.blur();
          onBeforeSelect(event.currentTarget);
          onSelect();
        }}
        aria-current={active ? 'true' : undefined}
      >
        <div className="memory-list-item__top">
          <span className="memory-list-item__date">
            {formatShortDateLabel(record.createdAtMs)} · {sourceLabel(record.source)}
          </span>
        </div>

        <h3 className="memory-list-item__title">{record.title}</h3>
        <p className="memory-list-item__excerpt">{record.summary}</p>

        <div className="memory-list-item__meta">
          <span>{CATEGORY_LABELS[record.category]}</span>
          <span>{IMPORTANCE_LABELS[record.importance]}</span>
        </div>
      </button>

      <div className="memory-list-item__chips" aria-label="Tags da memória">
        {tags.visible.map((tag) => (
          <ChipButton key={`${record.id}-tag-${tag}`} label={tag} active={false} onClick={() => onPickTag(tag)} />
        ))}
        {tags.hidden > 0 ? <span className="memory-list-item__more">+{tags.hidden}</span> : null}
      </div>
    </article>
  );
}

function ChapterGroup({
  group,
  selectedId,
  onSelectRecord,
  onPickTag,
  onBeforeSelectRecord,
  compact,
}: {
  group: DiaryGroup;
  selectedId: string | null;
  onSelectRecord: (id: string) => void;
  onPickTag: (value: string) => void;
  onBeforeSelectRecord: (node: HTMLElement) => void;
  compact: boolean;
}) {
  const totalEntries = group.entries.length;

  return (
    <article className="day-group">
      <header className="day-group__header">
        <div className="day-group__heading">
          <p className="day-group__eyebrow">Capítulo</p>
          <h3>{group.label}</h3>
        </div>
        <p className="day-group__count">{totalEntries} {totalEntries === 1 ? 'fragmento' : 'fragmentos'}</p>
      </header>

      <div className="day-group__list">
        {group.entries.map((entry) => (
          <FragmentItem
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
            compact={compact}
            active={entry.memoryId === selectedId}
            onSelect={() => onSelectRecord(entry.memoryId)}
            onPickTag={onPickTag}
            onBeforeSelect={onBeforeSelectRecord}
          />
        ))}
      </div>
    </article>
  );
}

function DiaryIndex({
  query,
  onQueryChange,
  onOpenFilters,
  activeFilterCount,
  activeFilterSummary,
  resultLabelText,
  surface,
  onSurfaceChange,
  syncLabel,
  syncTone,
  compact,
  timelineGroups,
  selectedId,
  onSelectRecord,
  onPickTag,
  scrollRef,
  onScroll,
  onCaptureTimelineAnchor,
  restoreAnchor,
  restoreFocusRef,
  onRestoreComplete,
  className,
  ariaHidden,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  activeFilterSummary: string[];
  resultLabelText: string;
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
  syncLabel: string;
  syncTone: PillTone;
  compact: boolean;
  timelineGroups: DiaryGroup[];
  selectedId: string | null;
  onSelectRecord: (id: string) => void;
  onPickTag: (value: string) => void;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: (scrollTop: number) => void;
  onCaptureTimelineAnchor: (anchor: TimelineAnchor) => void;
  restoreAnchor: TimelineAnchor | null;
  restoreFocusRef: RefObject<HTMLElement | null>;
  onRestoreComplete: () => void;
  className?: string;
  ariaHidden?: boolean;
}) {
  const captureAnchorFromNode = (node: HTMLElement) => {
    const container = scrollRef.current;
    if (!container) return;

    const id = node.dataset.memoryId;
    if (!id) return;

    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    onCaptureTimelineAnchor({
      id,
      scrollTop: container.scrollTop,
      itemTop: nodeRect.top - containerRect.top,
    });
  };

  useEffect(() => {
    if (compact || !selectedId || restoreAnchor) return;
    const activeButton = scrollRef.current?.querySelector<HTMLElement>('.memory-list-item.is-active .memory-list-item__body');
    activeButton?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [compact, restoreAnchor, selectedId, timelineGroups.length]);

  useEffect(() => {
    if (!compact || !restoreAnchor || !scrollRef.current) return;
    const container = scrollRef.current;
    const target = container.querySelector<HTMLElement>(`[data-memory-id="${escapeAttributeValue(restoreAnchor.id)}"]`);

    if (!target) {
      restoreFocusRef.current?.focus({ preventScroll: true });
      onRestoreComplete();
      return;
    }

    const applyRestore = () => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const currentTop = targetRect.top - containerRect.top;
      container.scrollTop = restoreAnchor.scrollTop + (currentTop - restoreAnchor.itemTop);
      target.focus({ preventScroll: true });
    };

    applyRestore();
    const frame = window.requestAnimationFrame(applyRestore);
    const timerA = window.setTimeout(applyRestore, 50);
    const timerB = window.setTimeout(() => {
      applyRestore();
      onRestoreComplete();
    }, 150);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timerA);
      window.clearTimeout(timerB);
    };
  }, [compact, onRestoreComplete, restoreAnchor, restoreFocusRef, scrollRef]);

  return (
    <section className={cx('index-pane', compact && 'index-pane--compact', className)} aria-label="Índice de memórias" aria-hidden={ariaHidden ? 'true' : undefined}>
      <IndexToolbar
        query={query}
        onQueryChange={onQueryChange}
        onOpenFilters={onOpenFilters}
        activeFilterCount={activeFilterCount}
        activeFilterSummary={activeFilterSummary}
        resultLabelText={resultLabelText}
        surface={surface}
        onSurfaceChange={onSurfaceChange}
        syncLabel={syncLabel}
        syncTone={syncTone}
        compact={compact}
      />

      <div
        ref={scrollRef}
        className="index-pane__scroll"
        tabIndex={-1}
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
      >
        {timelineGroups.length ? (
          <section className="timeline-stack" aria-label="Timeline do diário e das memórias">
            {timelineGroups.map((group) => (
              <ChapterGroup
                key={group.key}
                group={group}
                selectedId={selectedId}
                onSelectRecord={onSelectRecord}
                onPickTag={onPickTag}
                onBeforeSelectRecord={captureAnchorFromNode}
                compact={compact}
              />
            ))}
          </section>
        ) : (
          <EmptyState
            eyebrow="Índice do diário"
            title="Nenhum fragmento no recorte atual"
            description="A timeline aparece quando a busca ou os filtros encontram memórias datadas."
          />
        )}
      </div>
    </section>
  );
}

function MemoryMarks({ record, pageLabel }: { record: MemoryEntry; pageLabel: string }) {
  return (
    <section className="reading-section" aria-label="Marcas da memória">
      <p className="reading-section__eyebrow">Marcas</p>
      <div className="reading-metadata">
        <StatusPill label={`Página · ${pageLabel}`} tone="neutral" />
        <StatusPill label={`Data · ${formatDateLabel(record.createdAtMs)} · ${formatTimeLabel(record.createdAtMs)}`} tone="neutral" />
        <StatusPill label={`Categoria · ${CATEGORY_LABELS[record.category]}`} tone="accent" />
        <StatusPill label={`Origem · ${sourceLabel(record.source)}`} tone="neutral" />
        <StatusPill
          label={`Importância · ${IMPORTANCE_LABELS[record.importance]}`}
          tone={record.importance === 'anchor' || record.importance === 'high' ? 'warning' : 'good'}
        />
      </div>
    </section>
  );
}

function RelatedEchoes({
  items,
  onSelect,
}: {
  items: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  onSelect: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        eyebrow="Ecos relacionados"
        title="Sem ecos ainda"
        description="Quando surgirem relações confiáveis, elas aparecem aqui como pequenos apoios à leitura."
      />
    );
  }

  return (
    <section className="reading-section">
      <p className="reading-section__eyebrow">Ecos relacionados</p>
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

function ReadingPage({
  record,
  related,
  mobile,
  onBack,
  onSelectRecord,
  pageLabel,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  record: MemoryEntry | null;
  related: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  mobile: boolean;
  onBack: () => void;
  onSelectRecord: (id: string) => void;
  pageLabel: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mobileBackRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [record?.id]);

  useEffect(() => {
    if (!mobile || !record) return;
    mobileBackRef.current?.focus({ preventScroll: true });
  }, [mobile, record?.id]);

  useEffect(() => {
    if (!mobile || !record) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onBack();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobile, onBack, record?.id]);

  if (!record) {
    return (
      <section className={cx('reading-pane', mobile && 'reading-pane--mobile-fullscreen')} aria-label="Leitura da memória">
        <div className="reading-pane__scroll" ref={scrollRef}>
          <EmptyState
            eyebrow="Leitura"
            title="Selecione uma memória"
            description="A entrada abre aqui como uma página de diário com data, conteúdo e ecos ao fim."
            action={mobile ? <button type="button" className="ui-button" onClick={onBack}>Voltar</button> : undefined}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={cx('reading-pane', mobile && 'reading-pane--mobile-fullscreen')} aria-label={`Leitura de ${record.title}`}>
      <div className="reading-pane__scroll" ref={scrollRef}>
        {!mobile ? (
          <div className="reading-pane__desktop-nav" aria-label="Navegação da leitura">
            <StatusPill label={pageLabel} tone="neutral" />
            <div className="reading-pane__nav-actions">
              <button type="button" className="ui-button ui-button--ghost" onClick={onPrevious} disabled={!hasPrevious}>
                Anterior
              </button>
              <button type="button" className="ui-button ui-button--ghost" onClick={onNext} disabled={!hasNext}>
                Próxima
              </button>
            </div>
          </div>
        ) : null}

        <header className="reading-header">
          {mobile ? (
            <div className="reading-header__mobile-meta">
              <StatusPill label={pageLabel} tone="neutral" />
              <StatusPill label={CATEGORY_LABELS[record.category]} tone="accent" />
            </div>
          ) : null}
          <p className="reading-header__eyebrow">Leitura</p>
          <h2>{record.title}</h2>
          <p className="reading-header__summary">{record.summary}</p>
        </header>

        <MemoryMarks record={record} pageLabel={pageLabel} />

        <section className="reading-section">
          <p className="reading-section__eyebrow">Anotação</p>
          <div className="reading-content">
            {paragraphs(record.content).map((paragraph, index) => (
              <p key={`${record.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="reading-section">
          <p className="reading-section__eyebrow">Marcas</p>
          <div className="reading-chip-row">
            {record.tags.length ? record.tags.map((tag) => <StatusPill key={`${record.id}-tag-${tag}`} label={tag} tone="accent" />) : <StatusPill label="Sem tags" tone="neutral" />}
            {record.entities.length ? record.entities.map((entity) => <StatusPill key={`${record.id}-entity-${entity}`} label={entity} tone="neutral" />) : <StatusPill label="Sem entidades" tone="neutral" />}
          </div>
        </section>

        <RelatedEchoes items={related} onSelect={onSelectRecord} />

          {mobile ? (
            <div className="reading-pane__mobile-nav" aria-label="Navegação da leitura">
              <button ref={mobileBackRef} type="button" className="ui-button ui-button--ghost" onClick={onBack}>
                Voltar
              </button>
              <button type="button" className="ui-button ui-button--ghost" onClick={onPrevious} disabled={!hasPrevious}>
                Anterior
              </button>
              <button type="button" className="ui-button ui-button--ghost" onClick={onNext} disabled={!hasNext}>
                Próxima
              </button>
            </div>
          ) : null}
      </div>
    </section>
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
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable || !focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panelRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

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

  return (
    <div className={cx('filter-sheet', 'sheet', compact ? 'sheet--bottom' : 'sheet--drawer')} role="dialog" aria-modal="true" aria-label="Filtros avançados">
      <button type="button" className="sheet__backdrop" aria-label="Fechar filtros" onClick={onClose} />
      <div ref={panelRef} className={cx('sheet__panel', compact ? 'sheet__panel--bottom' : 'sheet__panel--drawer')}>
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
      </div>
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
  mobileView: 'index' | 'reading';
  indexScrollRef: RefObject<HTMLDivElement>;
  mobileTimelineRestoreAnchor: TimelineAnchor | null;
  restoreFocusRef: RefObject<HTMLElement | null>;
  filtersOpen: boolean;
  onTimelineScroll: (scrollTop: number) => void;
  onRememberTimelinePosition: (anchor: TimelineAnchor) => void;
  onTimelineRestoreComplete: () => void;
  onSelectRecord: (id: string) => void;
  onBackToIndex: () => void;
  onQueryChange: (value: string) => void;
  onToggleFilter: (key: keyof MemoryFilters, value: string) => void;
  onPatchFilters: (patch: Partial<MemoryFilters>) => void;
  onClearFilters: () => void;
  onOpenFilters: () => void;
  onCloseFilters: () => void;
}

function DiaryLayout({
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
  mobileView,
  indexScrollRef,
  mobileTimelineRestoreAnchor,
  restoreFocusRef,
  onRememberTimelinePosition,
  onTimelineRestoreComplete,
  onSelectRecord,
  onBackToIndex,
  onQueryChange,
  onToggleFilter,
  onPatchFilters,
  onClearFilters,
  onOpenFilters,
  onCloseFilters,
  filtersOpen,
  onTimelineScroll,
}: AppShellProps) {
  const indexVisible = true;
  const readingVisible = !compact || mobileView === 'reading';
  const resultLabelText = `Fragmentos · ${visibleCount} de ${totalCount}`;
  const timelineEntries = useMemo(() => timelineGroups.flatMap((group) => group.entries), [timelineGroups]);
  const selectedIndex = useMemo(
    () => (selectedRecord ? timelineEntries.findIndex((entry) => entry.memoryId === selectedRecord.id) : -1),
    [selectedRecord, timelineEntries],
  );
  const pageLabel = selectedIndex >= 0 ? `Página ${selectedIndex + 1} de ${timelineEntries.length}` : 'Página —';
  const previousEntry = selectedIndex > 0 ? timelineEntries[selectedIndex - 1] : null;
  const nextEntry = selectedIndex >= 0 && selectedIndex < timelineEntries.length - 1 ? timelineEntries[selectedIndex + 1] : null;
  const goPrevious = () => {
    if (previousEntry) onSelectRecord(previousEntry.memoryId);
  };
  const goNext = () => {
    if (nextEntry) onSelectRecord(nextEntry.memoryId);
  };

  return (
    <div className={cx('notebook-layout', compact && 'notebook-layout--compact')}>
      {indexVisible ? (
        <DiaryIndex
          query={filters.query}
          onQueryChange={onQueryChange}
          onOpenFilters={onOpenFilters}
          activeFilterCount={activeFilterCount}
          activeFilterSummary={activeFilterSummary}
          resultLabelText={resultLabelText}
          surface={surface}
          onSurfaceChange={onSurfaceChange}
          syncLabel={syncLabel}
          syncTone={syncTone}
          compact={compact}
          className={compact && mobileView === 'reading' ? 'index-pane--underlay' : undefined}
          ariaHidden={compact && mobileView === 'reading'}
          timelineGroups={timelineGroups}
          selectedId={selectedRecord?.id ?? null}
          onSelectRecord={onSelectRecord}
          onPickTag={(value) => onToggleFilter('tag', value)}
          scrollRef={indexScrollRef}
          onScroll={onTimelineScroll}
          onCaptureTimelineAnchor={onRememberTimelinePosition}
          restoreAnchor={mobileTimelineRestoreAnchor}
          restoreFocusRef={restoreFocusRef}
          onRestoreComplete={onTimelineRestoreComplete}
        />
      ) : null}

      {readingVisible ? (
        <ReadingPage
          record={selectedRecord}
          related={relatedRecords}
          mobile={compact}
          onBack={onBackToIndex}
          onSelectRecord={onSelectRecord}
          pageLabel={pageLabel}
          hasPrevious={Boolean(previousEntry)}
          hasNext={Boolean(nextEntry)}
          onPrevious={goPrevious}
          onNext={goNext}
        />
      ) : null}

      <FilterSheet
        open={filtersOpen}
        compact={compact}
        filters={filters}
        facetGroups={facetGroups}
        onChange={onPatchFilters}
        onClear={onClearFilters}
        onClose={onCloseFilters}
      />
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <div className={cx('notebook-shell', props.compact && 'notebook-shell--compact')}>
      <DiaryLayout {...props} />
    </div>
  );
}
