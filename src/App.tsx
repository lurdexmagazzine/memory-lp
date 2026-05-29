import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrainSurface, ImportanceLevel, MemoryCategory, MemoryDataset, MemoryFilters, MemoryRelation, MemoryEntry, PeriodFilter } from './types';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  IMPORTANCE_LABELS,
  PERIOD_LABELS,
  buildDiaryEntries,
  formatTimeLabel,
  loadMemoryDataset,
  matchesFilters,
  selectFallbackRecord,
} from './lib/memory';
import { BrainView } from './components/BrainView';
import { DiaryView } from './components/DiaryView';
import { EmptyState } from './components/common';
import { FilterBar } from './components/FilterBar';
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

function syncLabelFromDataset(dataset: MemoryDataset | null, loadState: 'loading' | 'ready' | 'error', errorMessage: string): { label: string; tone: 'neutral' | 'good' | 'warning' | 'danger' | 'accent' } {
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

function App() {
  const isMobile = useMediaQuery('(max-width: 979px)');
  const [dataset, setDataset] = useState<MemoryDataset | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [filters, setFilters] = useState<MemoryFilters>(DEFAULT_FILTERS);
  const [surface, setSurface] = useState<BrainSurface>('brain');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const previousMainSurface = useRef<Exclude<BrainSurface, 'inspector'>>('brain');

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
    document.body.classList.toggle('is-inspector-open', Boolean(isMobile && surface === 'inspector'));
    return () => {
      document.body.classList.remove('is-inspector-open');
    };
  }, [isMobile, surface]);

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

  useEffect(() => {
    if (!visibleRecords.length) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    const selectedStillVisible = visibleRecords.some((record) => record.id === selectedId);
    if (!selectedStillVisible) {
      setSelectedId(selectFallbackRecord(visibleRecords)?.id ?? visibleRecords[0].id);
    }
  }, [visibleRecords, selectedId]);

  const selectedRecord = useMemo(() => {
    if (!visibleRecords.length) return null;
    return visibleRecords.find((record) => record.id === selectedId) ?? selectFallbackRecord(visibleRecords);
  }, [visibleRecords, selectedId]);

  const visibleStats = useMemo(() => {
    return visibleRecords.reduce(
      (stats, record) => {
        stats.categories[record.category] = (stats.categories[record.category] ?? 0) + 1;
        stats.sources[record.source] = (stats.sources[record.source] ?? 0) + 1;
        stats.importance[record.importance] += 1;
        return stats;
      },
      {
        total: visibleRecords.length,
        relationCount: visibleRelations.length,
        entityCount: visibleEntities.length,
        categories: {} as Record<string, number>,
        sources: {} as Record<string, number>,
        importance: { low: 0, medium: 0, high: 0, anchor: 0 } as Record<ImportanceLevel, number>,
      },
    );
  }, [visibleEntities.length, visibleRecords, visibleRelations.length]);

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
      ...(['anchor', 'high', 'medium', 'low'] as ImportanceLevel[]).map((importance) => ({ value: importance, label: IMPORTANCE_LABELS[importance], count: dataset.stats.importance[importance] })),
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

  const syncState = useMemo(() => syncLabelFromDataset(dataset, loadState, errorMessage), [dataset, loadState, errorMessage]);

  const activeView = surface === 'inspector' ? previousMainSurface.current : surface;
  const inspectorOpen = !isMobile || surface === 'inspector';
  const totalCount = dataset?.records.length ?? 0;
  const visibleCount = visibleRecords.length;
  const selectedTitle = selectedRecord?.title ?? 'Nenhuma memória selecionada';

  function applySurface(next: BrainSurface) {
    if (next === 'inspector') {
      if (isMobile) {
        setSurface((current) => (current === 'inspector' ? previousMainSurface.current : 'inspector'));
      } else {
        setSurface('inspector');
      }
      return;
    }

    previousMainSurface.current = next;
    setSurface(next);
  }

  function selectRecord(id: string) {
    const sameRecord = selectedId === id;
    setSelectedId(id);

    if (isMobile) {
      if (surface === 'inspector' && sameRecord) {
        setSurface(previousMainSurface.current);
      } else {
        previousMainSurface.current = activeView;
        setSurface('inspector');
      }
    }
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

    if (activeView === 'brain') {
      return (
        <BrainView
          records={visibleRecords}
          entities={visibleEntities}
          relations={visibleRelations}
          stats={visibleStats}
          activeId={selectedRecord?.id ?? null}
          onSelectRecord={selectRecord}
          onPickCategory={(value) => setCategory(value as MemoryCategory | 'all')}
          onPickEntity={(value) => setEntity(value)}
          onPickTag={(value) => setTag(value)}
        />
      );
    }

    return (
      <DiaryView
        entries={visibleDiaryEntries}
        records={visibleRecords}
        activeId={selectedRecord?.id ?? null}
        onSelectRecord={selectRecord}
        onPickCategory={(value) => setCategory(value as MemoryCategory | 'all')}
        onPickTag={(value) => setTag(value)}
        onPickEntity={(value) => setEntity(value)}
      />
    );
  })();

  return (
    <div className="app-shell">
      <ShellSidebar
        surface={surface}
        onSurfaceChange={applySurface}
        syncLabel={syncState.label}
        totalCount={totalCount}
        visibleCount={visibleCount}
        relationCount={visibleStats.relationCount}
      />

      <div className="app-shell__main">
        <TopBar
          surface={surface}
          onSurfaceChange={applySurface}
          query={filters.query}
          onQueryChange={setQuery}
          syncLabel={syncState.label}
          syncTone={syncState.tone}
          totalCount={totalCount}
          visibleCount={visibleCount}
          selectedTitle={selectedTitle}
        />

        <FilterBar
          filters={filters}
          categoryOptions={categoryOptions}
          importanceOptions={importanceOptions}
          sourceOptions={sourceOptions}
          periodOptions={periodOptions}
          entityOptions={entityOptions}
          tagOptions={tagOptions}
          onChange={(patch) => setFilters((previous) => ({ ...previous, ...patch }))}
          onClear={clearFilters}
        />

        <main className="workspace" aria-label="Área principal">
          {mainContent}
        </main>
      </div>

      <InspectorPanel
        record={selectedRecord}
        records={visibleRecords}
        relations={visibleRelations}
        open={inspectorOpen}
        mobile={isMobile}
        onClose={() => setSurface(previousMainSurface.current)}
        onSelectRecord={selectRecord}
        onPickTag={setTag}
        onPickEntity={setEntity}
      />

      {isMobile && surface === 'inspector' ? (
        <button type="button" className="inspector-backdrop" aria-label="Fechar inspector" onClick={() => setSurface(previousMainSurface.current)} />
      ) : null}

      {isMobile ? <MobileBottomNav value={surface} onChange={applySurface} inspectorLabel="Inspector" /> : null}
    </div>
  );
}

export default App;
