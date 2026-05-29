import { useEffect, useMemo, useState } from 'react';
import type { BrainSurface, ImportanceLevel, MemoryCategory, MemoryDataset, MemoryFilters, MemoryEntry, MemoryRelation, PeriodFilter } from './types';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  IMPORTANCE_LABELS,
  PERIOD_LABELS,
  buildDiaryEntries,
  excerpt,
  formatTimeLabel,
  loadMemoryDataset,
  matchesFilters,
  selectFallbackRecord,
} from './lib/memory';
import { BrainView } from './components/BrainView';
import { DiaryView } from './components/DiaryView';
import { EmptyState } from './components/common';
import { FilterDrawer, FilterToolbar } from './components/FilterBar';
import { InspectorPanel } from './components/InspectorPanel';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ShellSidebar } from './components/ShellSidebar';
import { TopBar } from './components/TopBar';

const DEFAULT_FILTERS: MemoryFilters = {
  query: '',
  category: 'all',
  importance: 'all',
  source: 'all',
  period: 'all',
  entity: 'all',
  tag: 'all',
};

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
    } else {
      media.addListener(update);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', update);
      } else {
        media.removeListener(update);
      }
    };
  }, [query]);

  return matches;
}

function labelSource(source: string): string {
  return source === 'holographic' ? 'Holographic' : source;
}

function syncLabelFromDataset(
  dataset: MemoryDataset | null,
  loadState: 'loading' | 'ready' | 'error',
  errorMessage: string,
): { label: string; tone: 'neutral' | 'good' | 'warning' | 'danger' | 'accent' } {
  if (loadState === 'loading') return { label: 'carregando acervo…', tone: 'accent' };
  if (loadState === 'error') return { label: 'falha no snapshot', tone: 'danger' };
  if (!dataset) return { label: 'sem dados', tone: 'warning' };
  if (dataset.issues.some((issue) => issue.severity === 'error')) return { label: 'snapshot com erro', tone: 'danger' };
  if (dataset.issues.some((issue) => issue.severity === 'warning')) return { label: 'snapshot com alertas', tone: 'warning' };
  if (errorMessage) return { label: 'última leitura preservada', tone: 'warning' };

  const loadedAt = new Date(dataset.loadedAt).getTime();
  const timeLabel = Number.isFinite(loadedAt) ? formatTimeLabel(loadedAt) : 'agora';
  return { label: `sincronizado às ${timeLabel}`, tone: 'good' };
}

function activeFilterLabels(filters: MemoryFilters): string[] {
  const labels: string[] = [];

  if (filters.query.trim()) labels.push(`Busca: ${excerpt(filters.query.trim(), 18)}`);
  if (filters.category !== 'all') labels.push(`Categoria: ${CATEGORY_LABELS[filters.category]}`);
  if (filters.importance !== 'all') labels.push(`Importância: ${IMPORTANCE_LABELS[filters.importance]}`);
  if (filters.source !== 'all') labels.push(`Origem: ${labelSource(filters.source)}`);
  if (filters.period !== 'all') labels.push(`Período: ${PERIOD_LABELS[filters.period]}`);
  if (filters.entity !== 'all') labels.push(`Entidade: ${filters.entity}`);
  if (filters.tag !== 'all') labels.push(`Tag: ${filters.tag}`);

  return labels;
}

function App() {
  const isMobile = useMediaQuery('(max-width: 979px)');
  const [dataset, setDataset] = useState<MemoryDataset | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState<MemoryFilters>(DEFAULT_FILTERS);
  const [surface, setSurface] = useState<BrainSurface>('brain');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadMemoryDataset()
      .then((nextDataset) => {
        if (cancelled) return;
        setDataset(nextDataset);
        setLoadState('ready');
        setErrorMessage('');
      })
      .catch((error) => {
        if (cancelled) return;
        setDataset(null);
        setLoadState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = filtersOpen || (isMobile && mobileInspectorOpen);
    document.body.classList.toggle('is-inspector-open', shouldLockScroll);

    return () => {
      document.body.classList.remove('is-inspector-open');
    };
  }, [filtersOpen, isMobile, mobileInspectorOpen]);

  const visibleRecords = useMemo(() => {
    if (!dataset) return [];
    return dataset.records.filter((record) => matchesFilters(record, filters));
  }, [dataset, filters]);

  const visibleRecordIds = useMemo(() => new Set(visibleRecords.map((record) => record.id)), [visibleRecords]);

  const visibleRelations = useMemo(() => {
    if (!dataset) return [] as MemoryRelation[];
    return dataset.relations.filter((relation) => visibleRecordIds.has(relation.fromId) && visibleRecordIds.has(relation.toId));
  }, [dataset, visibleRecordIds]);

  const visibleEntities = useMemo(() => {
    if (!dataset) return [];
    return dataset.entities.filter((entity) => entity.memoryIds.some((id) => visibleRecordIds.has(id)));
  }, [dataset, visibleRecordIds]);

  const visibleDiaryEntries = useMemo(() => buildDiaryEntries(visibleRecords), [visibleRecords]);

  const fallbackRecord = useMemo(() => selectFallbackRecord(visibleRecords), [visibleRecords]);

  const focusRecord = useMemo(() => {
    if (!visibleRecords.length) return null;
    return visibleRecords.find((record) => record.id === focusedId) ?? fallbackRecord ?? visibleRecords[0];
  }, [focusedId, fallbackRecord, visibleRecords]);

  const inspectedRecord = useMemo(() => {
    if (!inspectedId) return null;
    return visibleRecords.find((record) => record.id === inspectedId) ?? null;
  }, [inspectedId, visibleRecords]);

  useEffect(() => {
    if (!visibleRecords.length) {
      setFocusedId(null);
      setInspectedId(null);
      setMobileInspectorOpen(false);
      return;
    }

    const focusedStillVisible = focusedId ? visibleRecords.some((record) => record.id === focusedId) : false;
    if (!focusedStillVisible) {
      setFocusedId(fallbackRecord?.id ?? visibleRecords[0].id);
    }

    if (inspectedId && !visibleRecords.some((record) => record.id === inspectedId)) {
      setInspectedId(null);
      setMobileInspectorOpen(false);
    }
  }, [fallbackRecord?.id, focusedId, inspectedId, visibleRecords]);

  const totalCount = dataset?.records.length ?? 0;
  const visibleCount = visibleRecords.length;
  const activeFilterLabelsList = useMemo(() => activeFilterLabels(filters), [filters]);
  const activeFilterCount = activeFilterLabelsList.length;
  const syncState = useMemo(() => syncLabelFromDataset(dataset, loadState, errorMessage), [dataset, errorMessage, loadState]);
  const selectedTitle = focusRecord?.title ?? 'Nenhuma memória selecionada';

  const categoryOptions = useMemo(() => {
    if (!dataset) return [{ value: 'all', label: 'Todas', count: 0 }];

    const counts = dataset.records.reduce<Record<string, number>>((accumulator, record) => {
      accumulator[record.category] = (accumulator[record.category] ?? 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: 'Todas', count: dataset.records.length },
      ...CATEGORY_ORDER.map((category) => ({ value: category, label: CATEGORY_LABELS[category], count: counts[category] ?? 0 })).filter((option) => option.count > 0),
    ];
  }, [dataset]);

  const importanceOptions = useMemo(() => {
    if (!dataset) return [{ value: 'all', label: 'Todas', count: 0 }];
    return [
      { value: 'all', label: 'Todas', count: dataset.records.length },
      ...(['anchor', 'high', 'medium', 'low'] as ImportanceLevel[]).map((importance) => ({
        value: importance,
        label: IMPORTANCE_LABELS[importance],
        count: dataset.stats.importance[importance],
      })),
    ];
  }, [dataset]);

  const sourceOptions = useMemo(() => {
    if (!dataset) return [{ value: 'all', label: 'Todas', count: 0 }];
    return [
      { value: 'all', label: 'Todas', count: dataset.records.length },
      ...Object.entries(dataset.stats.sources).map(([source, count]) => ({ value: source, label: labelSource(source), count })),
    ];
  }, [dataset]);

  const periodOptions = useMemo(
    () =>
      ([
        { value: 'all', label: PERIOD_LABELS.all, count: visibleRecords.length },
        { value: '7d', label: PERIOD_LABELS['7d'] },
        { value: '30d', label: PERIOD_LABELS['30d'] },
        { value: '90d', label: PERIOD_LABELS['90d'] },
        { value: '365d', label: PERIOD_LABELS['365d'] },
      ] as Array<{ value: string; label: string; count?: number }>),
    [visibleRecords.length],
  );

  const entityOptions = useMemo(() => {
    const entities = visibleEntities
      .filter((entity) => entity.kind !== 'category')
      .slice(0, 10)
      .map((entity) => ({ value: entity.label, label: entity.label, count: entity.count }));
    return [{ value: 'all', label: 'Todas', count: visibleRecords.length }, ...entities];
  }, [visibleEntities, visibleRecords.length]);

  const tagOptions = useMemo(() => {
    const counts = visibleRecords.flatMap((record) => record.tags).reduce<Record<string, number>>((accumulator, tag) => {
      accumulator[tag] = (accumulator[tag] ?? 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: 'Todas', count: visibleRecords.length },
      ...Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ value: tag, label: tag, count })),
    ];
  }, [visibleRecords]);

  function handleSurfaceChange(next: BrainSurface) {
    setSurface(next);
    if (isMobile) {
      setMobileInspectorOpen(false);
    }
  }

  function inspectRecord(id: string) {
    setFocusedId(id);
    setInspectedId(id);
    if (isMobile) {
      setMobileInspectorOpen(true);
    }
  }

  function openInspectorForCurrent() {
    if (!focusRecord) return;
    setInspectedId(focusRecord.id);
    if (isMobile) {
      setMobileInspectorOpen(true);
    }
  }

  function closeInspector() {
    if (isMobile) {
      setMobileInspectorOpen(false);
      return;
    }
    setInspectedId(null);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function setCategory(category: string) {
    setFilters((previous) => ({
      ...previous,
      category: previous.category === category ? 'all' : (category as MemoryCategory | 'all'),
    }));
  }

  function setImportance(importance: string) {
    setFilters((previous) => ({
      ...previous,
      importance: previous.importance === importance ? 'all' : (importance as MemoryFilters['importance']),
    }));
  }

  function setSource(source: string) {
    setFilters((previous) => ({
      ...previous,
      source: previous.source === source ? 'all' : source,
    }));
  }

  function setPeriod(period: string) {
    setFilters((previous) => ({
      ...previous,
      period: previous.period === period ? 'all' : (period as PeriodFilter),
    }));
  }

  function setEntity(entity: string) {
    setFilters((previous) => ({
      ...previous,
      entity: previous.entity === entity ? 'all' : entity,
    }));
  }

  function setTag(tag: string) {
    setFilters((previous) => ({
      ...previous,
      tag: previous.tag === tag ? 'all' : tag,
    }));
  }

  function setQuery(query: string) {
    setFilters((previous) => ({ ...previous, query }));
  }

  const mainContent = (() => {
    if (loadState === 'loading') {
      return (
        <EmptyState
          eyebrow="Carregando"
          title="Abrindo o snapshot"
          description="O visor está lendo o export do Holographic e montando Brain, Diary e Inspector."
        />
      );
    }

    if (loadState === 'error') {
      return (
        <EmptyState
          eyebrow="Erro"
          title="Não foi possível carregar o acervo"
          description={errorMessage || 'O snapshot não respondeu. Tente novamente em instantes.'}
        />
      );
    }

    if (surface === 'brain') {
      return (
        <BrainView
          records={visibleRecords}
          entities={visibleEntities}
          relations={visibleRelations}
          stats={{
            total: visibleRecords.length,
            relationCount: visibleRelations.length,
            entityCount: visibleEntities.length,
            categories: {},
            sources: {},
            importance: { low: 0, medium: 0, high: 0, anchor: 0 },
          }}
          activeId={focusRecord?.id ?? null}
          onSelectRecord={inspectRecord}
          onPickCategory={(value) => setCategory(value)}
          onPickEntity={(value) => setEntity(value)}
          onPickTag={(value) => setTag(value)}
        />
      );
    }

    return (
      <DiaryView
        entries={visibleDiaryEntries}
        records={visibleRecords}
        activeId={focusRecord?.id ?? null}
        onSelectRecord={inspectRecord}
        onPickCategory={(value) => setCategory(value)}
        onPickTag={(value) => setTag(value)}
        onPickEntity={(value) => setEntity(value)}
      />
    );
  })();

  const desktopInspectorRecord = !isMobile ? inspectedRecord : null;
  const mobileInspectorVisible = isMobile && mobileInspectorOpen;
  const mobileInspectorRecord = mobileInspectorVisible ? inspectedRecord ?? focusRecord : null;

  return isMobile ? (
    <div className="app-shell app-shell--mobile">
      <TopBar
        mobile
        surface={surface}
        onSurfaceChange={handleSurfaceChange}
        query={filters.query}
        onQueryChange={setQuery}
        syncLabel={syncState.label}
        syncTone={syncState.tone}
        totalCount={totalCount}
        visibleCount={visibleCount}
        selectedTitle={selectedTitle}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenInspector={openInspectorForCurrent}
        inspectorAvailable={Boolean(focusRecord)}
        showSwitcher
      />

      <FilterToolbar activeLabels={activeFilterLabelsList} onOpenFilters={() => setFiltersOpen(true)} onClear={clearFilters} />

      <main className="app-shell__main app-shell__main--mobile" aria-label="Área principal">
        {mainContent}
      </main>

      <MobileBottomNav
        surface={surface}
        onSurfaceChange={handleSurfaceChange}
        onOpenInspector={openInspectorForCurrent}
        inspectorAvailable={Boolean(focusRecord)}
        inspectorOpen={mobileInspectorVisible}
      />

      <FilterDrawer
        open={filtersOpen}
        mobile
        filters={filters}
        categoryOptions={categoryOptions}
        importanceOptions={importanceOptions}
        sourceOptions={sourceOptions}
        periodOptions={periodOptions}
        entityOptions={entityOptions}
        tagOptions={tagOptions}
        onChange={(patch) => setFilters((previous) => ({ ...previous, ...patch }))}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
      />

      <InspectorPanel
        record={mobileInspectorRecord}
        records={visibleRecords}
        relations={visibleRelations}
        open={mobileInspectorVisible}
        mobile
        onClose={closeInspector}
        onSelectRecord={inspectRecord}
        onPickTag={setTag}
        onPickEntity={setEntity}
      />
    </div>
  ) : (
    <div className={`app-shell app-shell--desktop ${desktopInspectorRecord ? 'has-inspector' : ''}`}>
      <ShellSidebar
        surface={surface}
        onSurfaceChange={handleSurfaceChange}
        syncLabel={syncState.label}
        totalCount={totalCount}
        visibleCount={visibleCount}
        relationCount={visibleRelations.length}
        selectedTitle={selectedTitle}
      />

      <div className="app-shell__workspace">
        <TopBar
          mobile={false}
          surface={surface}
          onSurfaceChange={handleSurfaceChange}
          query={filters.query}
          onQueryChange={setQuery}
          syncLabel={syncState.label}
          syncTone={syncState.tone}
          totalCount={totalCount}
          visibleCount={visibleCount}
          selectedTitle={selectedTitle}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenInspector={openInspectorForCurrent}
          inspectorAvailable={Boolean(desktopInspectorRecord)}
          showSwitcher={false}
        />

        <FilterToolbar activeLabels={activeFilterLabelsList} onOpenFilters={() => setFiltersOpen(true)} onClear={clearFilters} />

        <main className="workspace-stage" aria-label="Área principal">
          {mainContent}
        </main>
      </div>

      <FilterDrawer
        open={filtersOpen}
        mobile={false}
        filters={filters}
        categoryOptions={categoryOptions}
        importanceOptions={importanceOptions}
        sourceOptions={sourceOptions}
        periodOptions={periodOptions}
        entityOptions={entityOptions}
        tagOptions={tagOptions}
        onChange={(patch) => setFilters((previous) => ({ ...previous, ...patch }))}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
      />

      {desktopInspectorRecord ? (
        <InspectorPanel
          record={desktopInspectorRecord}
          records={visibleRecords}
          relations={visibleRelations}
          open={Boolean(desktopInspectorRecord)}
          mobile={false}
          onClose={closeInspector}
          onSelectRecord={inspectRecord}
          onPickTag={setTag}
          onPickEntity={setEntity}
        />
      ) : null}
    </div>
  );
}

export default App;
