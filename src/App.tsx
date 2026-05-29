import { useEffect, useMemo, useState } from 'react';
import type { AppSurface, MemoryDataset, MemoryEntry, MemoryFilters, MemoryRelation } from './types';
import {
  buildDiaryEntries,
  buildDiaryGroups,
  buildFacetGroups,
  loadMemoryDataset,
  matchesFilters,
  scoreSearchMatch,
  selectFallbackRecord,
  formatTimeLabel,
  PERIOD_LABELS,
  excerpt,
} from './lib/memory';
import { AppShell } from './components/AppShell';
import { ErrorState, LoadingState } from './components/common';
import type { PillTone } from './components/common';

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

function sortRecords(records: MemoryEntry[], query: string): MemoryEntry[] {
  const needle = query.trim();
  return [...records].sort((a, b) => {
    if (needle) {
      const scoreDiff = scoreSearchMatch(b, needle) - scoreSearchMatch(a, needle);
      if (scoreDiff !== 0) return scoreDiff;
    }

    if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
    if ((b.updatedAtMs ?? 0) !== (a.updatedAtMs ?? 0)) return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
    if ((b.createdAtMs ?? 0) !== (a.createdAtMs ?? 0)) return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
    return a.title.localeCompare(b.title, 'pt-BR');
  });
}

function buildFilterSummary(filters: MemoryFilters): string[] {
  const labels: string[] = [];
  if (filters.query.trim()) labels.push(`Busca: ${excerpt(filters.query.trim(), 20)}`);
  if (filters.category !== 'all') labels.push(`Categoria: ${filters.category}`);
  if (filters.importance !== 'all') labels.push(`Importância: ${filters.importance}`);
  if (filters.tag !== 'all') labels.push(`Tag: ${filters.tag}`);
  if (filters.entity !== 'all') labels.push(`Entidade: ${filters.entity}`);
  if (filters.source !== 'all') labels.push(`Origem: ${labelSource(filters.source)}`);
  if (filters.period !== 'all') labels.push(`Período: ${PERIOD_LABELS[filters.period]}`);
  return labels;
}

function App() {
  const desktop = useMediaQuery('(min-width: 1200px)');
  const [dataset, setDataset] = useState<MemoryDataset | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [surface, setSurface] = useState<AppSurface>('memories');
  const [filters, setFilters] = useState<MemoryFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;

    setStatus('loading');
    setErrorMessage('');

    (async () => {
      try {
        const nextDataset = await loadMemoryDataset();
        if (!active) return;
        setDataset(nextDataset);
        setStatus('ready');
      } catch (error) {
        if (!active) return;
        setDataset(null);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      }
    })();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  useEffect(() => {
    document.body.classList.toggle('is-sheet-open', !desktop && (readerOpen || filtersOpen));
    return () => {
      document.body.classList.remove('is-sheet-open');
    };
  }, [desktop, readerOpen, filtersOpen]);

  const visibleRecords = useMemo(() => {
    if (!dataset) return [];
    const filtered = dataset.records.filter((record) => matchesFilters(record, filters));
    return sortRecords(filtered, filters.query);
  }, [dataset, filters]);

  const facetGroups = useMemo(() => buildFacetGroups(visibleRecords), [visibleRecords]);

  const visibleRelations = useMemo(() => {
    if (!dataset) return [] as MemoryRelation[];
    const visibleIds = new Set(visibleRecords.map((record) => record.id));
    return dataset.relations.filter((relation) => visibleIds.has(relation.fromId) && visibleIds.has(relation.toId));
  }, [dataset, visibleRecords]);

  const diaryEntries = useMemo(() => buildDiaryEntries(visibleRecords), [visibleRecords]);
  const diaryGroups = useMemo(() => buildDiaryGroups(diaryEntries), [diaryEntries]);

  useEffect(() => {
    if (!visibleRecords.length) {
      setSelectedId(null);
      setReaderOpen(false);
      return;
    }

    setSelectedId((current) => {
      if (current && visibleRecords.some((record) => record.id === current)) return current;
      return selectFallbackRecord(visibleRecords)?.id ?? visibleRecords[0].id;
    });
  }, [visibleRecords]);

  const selectedRecord = useMemo(() => {
    if (!visibleRecords.length) return null;
    const current = selectedId ? visibleRecords.find((record) => record.id === selectedId) : null;
    return current ?? selectFallbackRecord(visibleRecords) ?? visibleRecords[0] ?? null;
  }, [selectedId, visibleRecords]);

  const relatedRecords = useMemo(() => {
    if (!selectedRecord) return [] as Array<{ record: MemoryEntry; relation: MemoryRelation }>;
    const related = visibleRelations
      .filter((relation) => relation.fromId === selectedRecord.id || relation.toId === selectedRecord.id)
      .sort((a, b) => b.weight - a.weight);

    const seen = new Set<string>();
    const result: Array<{ record: MemoryEntry; relation: MemoryRelation }> = [];
    for (const relation of related) {
      const counterpartId = relation.fromId === selectedRecord.id ? relation.toId : relation.fromId;
      if (seen.has(counterpartId)) continue;
      const record = visibleRecords.find((item) => item.id === counterpartId);
      if (!record) continue;
      seen.add(counterpartId);
      result.push({ record, relation });
      if (result.length >= 6) break;
    }
    return result;
  }, [selectedRecord, visibleRelations, visibleRecords]);

  const totalCount = dataset?.records.length ?? 0;
  const visibleCount = visibleRecords.length;
  const relationCount = visibleRelations.length;
  const activeFilterSummary = useMemo(() => buildFilterSummary(filters), [filters]);
  const activeFilterCount = activeFilterSummary.length;
  const syncTone: PillTone =
    status === 'error'
      ? 'danger'
      : dataset?.issues.some((issue) => issue.severity === 'error')
        ? 'danger'
        : dataset?.issues.some((issue) => issue.severity === 'warning')
          ? 'warning'
          : 'good';
  const syncLabel =
    status === 'loading'
      ? 'carregando…'
      : status === 'error'
        ? 'erro ao carregar'
        : `sincronizado às ${formatTimeLabel(dataset ? new Date(dataset.loadedAt).getTime() : Date.now())}`;

  const patchFilters = (patch: Partial<MemoryFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const toggleFilter = (key: keyof MemoryFilters, value: string) => {
    setFilters((previous) => {
      if (key === 'query') {
        return { ...previous, query: value };
      }

      const current = previous[key] as string;
      return {
        ...previous,
        [key]: current === value ? 'all' : value,
      } as MemoryFilters;
    });
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const selectRecord = (id: string) => {
    setSelectedId(id);
  };

  const openReader = () => setReaderOpen(true);
  const closeReader = () => setReaderOpen(false);
  const openFilters = () => setFiltersOpen(true);
  const closeFilters = () => setFiltersOpen(false);

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="Não foi possível carregar o acervo"
        description={errorMessage || 'O snapshot não respondeu. Tente novamente em instantes.'}
        onRetry={() => setReloadTick((value) => value + 1)}
      />
    );
  }

  return (
    <AppShell
      mobile={!desktop}
      surface={surface}
      onSurfaceChange={setSurface}
      syncLabel={syncLabel}
      syncTone={syncTone}
      totalCount={totalCount}
      visibleCount={visibleCount}
      relationCount={relationCount}
      activeFilterSummary={activeFilterSummary}
      activeFilterCount={activeFilterCount}
      filters={filters}
      facetGroups={facetGroups}
      records={visibleRecords}
      diaryGroups={diaryGroups}
      selectedRecord={selectedRecord}
      relatedRecords={relatedRecords}
      onSelectRecord={selectRecord}
      onQueryChange={(value) => patchFilters({ query: value })}
      onToggleFilter={toggleFilter}
      onPatchFilters={patchFilters}
      onClearFilters={clearFilters}
      onOpenFilters={openFilters}
      onCloseFilters={closeFilters}
      onOpenReader={openReader}
      onCloseReader={closeReader}
      readerOpen={readerOpen}
      filtersOpen={filtersOpen}
    />
  );
}

export default App;
