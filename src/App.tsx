import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppSurface, DiaryEntry, DiaryGroup, MemoryDataset, MemoryEntry, MemoryFilters, MemoryRelation } from './types';
import {
  buildFacetGroups,
  formatDiaryDateHeading,
  formatTimeLabel,
  getRelatedRecords,
  loadMemoryDataset,
  matchesFilters,
  scoreSearchMatch,
  selectFallbackRecord,
  CATEGORY_LABELS,
  IMPORTANCE_LABELS,
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

function sourceLabel(source: string): string {
  return source === 'holographic' ? 'Holographic' : source;
}

function sortRecords(records: MemoryEntry[], surface: AppSurface, query: string): MemoryEntry[] {
  const needle = query.trim();
  return [...records].sort((a, b) => {
    if (surface === 'memories') {
      if (needle) {
        const scoreDiff = scoreSearchMatch(b, needle) - scoreSearchMatch(a, needle);
        if (scoreDiff !== 0) return scoreDiff;
      }

      if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
      if ((b.createdAtMs ?? 0) !== (a.createdAtMs ?? 0)) return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
      if ((b.updatedAtMs ?? 0) !== (a.updatedAtMs ?? 0)) return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
      return a.title.localeCompare(b.title, 'pt-BR');
    }

    if ((b.createdAtMs ?? 0) !== (a.createdAtMs ?? 0)) return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
    if ((b.updatedAtMs ?? 0) !== (a.updatedAtMs ?? 0)) return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
    if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
    return a.title.localeCompare(b.title, 'pt-BR');
  });
}

function toDiaryEntry(record: MemoryEntry): DiaryEntry {
  const dateKey = record.createdAtMs ? new Date(record.createdAtMs).toISOString().slice(0, 10) : 'sem-data';
  return {
    id: `diary:${record.id}`,
    memoryId: record.id,
    dateKey,
    dateLabel: formatDiaryDateHeading(dateKey),
    title: record.title,
    excerpt: record.summary,
    category: record.category,
    tags: record.tags,
    entities: record.entities,
    importance: record.importance,
    source: record.source,
    createdAtMs: record.createdAtMs,
  };
}

function buildTimelineGroups(records: MemoryEntry[]): DiaryGroup[] {
  const buckets = new Map<string, DiaryEntry[]>();

  for (const record of records) {
    const entry = toDiaryEntry(record);
    const current = buckets.get(entry.dateKey) ?? [];
    current.push(entry);
    buckets.set(entry.dateKey, current);
  }

  return [...buckets.entries()]
    .map(([key, entries]) => ({
      key,
      label: formatDiaryDateHeading(key),
      entries,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

function buildFilterSummary(filters: MemoryFilters): string[] {
  const labels: string[] = [];
  if (filters.query.trim()) labels.push(`Busca: ${excerpt(filters.query.trim(), 18)}`);
  if (filters.category !== 'all') labels.push(`Categoria: ${CATEGORY_LABELS[filters.category]}`);
  if (filters.importance !== 'all') labels.push(`Importância: ${IMPORTANCE_LABELS[filters.importance]}`);
  if (filters.tag !== 'all') labels.push(`Tag: ${filters.tag}`);
  if (filters.entity !== 'all') labels.push(`Entidade: ${filters.entity}`);
  if (filters.source !== 'all') labels.push(`Origem: ${sourceLabel(filters.source)}`);
  if (filters.period !== 'all') labels.push(`Período: ${PERIOD_LABELS[filters.period]}`);
  return labels;
}

function App() {
  const desktop = useMediaQuery('(min-width: 1200px)');
  const [dataset, setDataset] = useState<MemoryDataset | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [surface, setSurface] = useState<AppSurface>('diary');
  const [filters, setFilters] = useState<MemoryFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readerId, setReaderId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const scrollAnchorRef = useRef(0);

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
    document.body.classList.toggle('is-sheet-open', filtersOpen);
    return () => {
      document.body.classList.remove('is-sheet-open');
    };
  }, [filtersOpen]);

  const visibleRecords = useMemo(() => {
    if (!dataset) return [];
    const filtered = dataset.records.filter((record) => matchesFilters(record, filters));
    return sortRecords(filtered, surface, filters.query);
  }, [dataset, filters, surface]);

  const facetGroups = useMemo(() => buildFacetGroups(visibleRecords), [visibleRecords]);
  const timelineGroups = useMemo(() => buildTimelineGroups(visibleRecords), [visibleRecords]);

  const visibleRelations = useMemo(() => {
    if (!dataset) return [] as MemoryRelation[];
    const visibleIds = new Set(visibleRecords.map((record) => record.id));
    return dataset.relations.filter((relation) => visibleIds.has(relation.fromId) && visibleIds.has(relation.toId));
  }, [dataset, visibleRecords]);

  const selectedRecord = useMemo(() => {
    if (!visibleRecords.length) return null;
    const byId = selectedId ? visibleRecords.find((record) => record.id === selectedId) : null;
    return byId ?? selectFallbackRecord(visibleRecords) ?? null;
  }, [selectedId, visibleRecords]);

  const relatedRecords = useMemo(() => {
    if (!readerId) return [] as Array<{ record: MemoryEntry; relation: MemoryRelation }>;
    return getRelatedRecords(readerId, visibleRelations, visibleRecords, 6);
  }, [readerId, visibleRelations, visibleRecords]);

  useEffect(() => {
    if (!visibleRecords.length) {
      setSelectedId(null);
      setReaderId(null);
      return;
    }

    if (!selectedId || !visibleRecords.some((record) => record.id === selectedId)) {
      const fallback = selectFallbackRecord(visibleRecords) ?? visibleRecords[0] ?? null;
      setSelectedId(fallback?.id ?? null);
    }

    if (readerId && !visibleRecords.some((record) => record.id === readerId)) {
      setReaderId(null);
    }
  }, [visibleRecords, selectedId, readerId]);

  useEffect(() => {
    if (readerId === null) {
      return;
    }

    window.scrollTo(0, 0);
  }, [readerId]);

  const totalCount = dataset?.records.length ?? 0;
  const visibleCount = visibleRecords.length;
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

  const openRecord = (id: string) => {
    const wasReading = readerId !== null;
    setSelectedId(id);
    if (!wasReading) {
      scrollAnchorRef.current = window.scrollY;
    }
    setReaderId(id);
    window.scrollTo(0, 0);
  };

  const backToTimeline = () => {
    setReaderId(null);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollAnchorRef.current);
    });
  };

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
      compact={!desktop}
      surface={surface}
      onSurfaceChange={(nextSurface) => {
        setSurface(nextSurface);
        setReaderId(null);
      }}
      syncLabel={syncLabel}
      syncTone={syncTone}
      totalCount={totalCount}
      visibleCount={visibleCount}
      activeFilterSummary={activeFilterSummary}
      activeFilterCount={activeFilterCount}
      filters={filters}
      facetGroups={facetGroups}
      timelineGroups={timelineGroups}
      selectedRecord={selectedRecord}
      relatedRecords={relatedRecords}
      readerOpen={readerId !== null}
      filtersOpen={filtersOpen}
      onSelectRecord={openRecord}
      onBackToTimeline={backToTimeline}
      onQueryChange={(value) => patchFilters({ query: value })}
      onToggleFilter={toggleFilter}
      onPatchFilters={patchFilters}
      onClearFilters={clearFilters}
      onOpenFilters={openFilters}
      onCloseFilters={closeFilters}
    />
  );
}

export default App;
