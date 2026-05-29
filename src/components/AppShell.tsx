import { useEffect, useMemo, useRef, type ReactNode, type RefObject, type UIEvent } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, FilterIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react';
import type { AppSurface, DiaryEntry, DiaryGroup, FacetOption, MemoryEntry, MemoryFilters, MemoryRelation } from '../types';
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
import { cn } from '@/lib/utils';
import { ChipButton, StatusPill, type PillTone } from './common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

function compactTags(tags: string[], maxVisible = 2): { visible: string[]; hidden: number } {
  return {
    visible: tags.slice(0, maxVisible),
    hidden: Math.max(0, tags.length - maxVisible),
  };
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeReadingText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function shouldShowReadingSummary(record: MemoryEntry): boolean {
  const summary = normalizeReadingText(record.summary);
  if (!summary) return false;

  const content = normalizeReadingText(record.content);
  if (summary === content) return false;

  const firstParagraph = normalizeReadingText(paragraphs(record.content)[0] ?? '');
  return summary !== firstParagraph;
}

function EmptyPanel({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card size="sm" className="!gap-0 !py-0 bg-[color:var(--surface)]/90 shadow-sm">
      <CardHeader className="gap-2 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
        <h3 className="font-serif text-base text-foreground">{title}</h3>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

function SurfaceTabs({
  surface,
  onSurfaceChange,
  compact = false,
}: {
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Tabs value={surface} onValueChange={(value: string) => onSurfaceChange(value as AppSurface)} className="w-full notebook-tabs">
        <TabsList className="surface-tabs notebook-tabs__list">
          <TabsTrigger value="memories" className={cn('surface-tab', surface === 'memories' && 'is-active')}>
            Memórias
          </TabsTrigger>
          <TabsTrigger value="diary" className={cn('surface-tab', surface === 'diary' && 'is-active')}>
            Diário
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  return (
    <Tabs value={surface} onValueChange={(value: string) => onSurfaceChange(value as AppSurface)} className="w-full">
      <TabsList
        variant="line"
        className="w-full justify-start gap-6 border-b border-border/70 bg-transparent p-0"
      >
        <TabsTrigger
          value="memories"
          className="h-auto rounded-none border-0 bg-transparent px-0 py-3 text-sm text-muted-foreground shadow-none data-active:bg-transparent data-active:text-foreground data-active:shadow-none"
        >
          Memórias
        </TabsTrigger>
        <TabsTrigger
          value="diary"
          className="h-auto rounded-none border-0 bg-transparent px-0 py-3 text-sm text-muted-foreground shadow-none data-active:bg-transparent data-active:text-foreground data-active:shadow-none"
        >
          Diário
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function FragmentCard({
  entry,
  active,
  compact,
  onSelect,
  onPickTag,
  onBeforeSelect,
}: {
  entry: DiaryEntry;
  active: boolean;
  compact: boolean;
  onSelect: () => void;
  onPickTag: (value: string) => void;
  onBeforeSelect: (node: HTMLElement) => void;
}) {
  const tags = compactTags(entry.tags, 2);
  const importanceTone: PillTone = entry.importance === 'anchor' || entry.importance === 'high' ? 'warning' : 'good';

  if (compact) {
    return (
      <article className={cn('memory-list-item', active && 'is-active')}>
        <button
          type="button"
          data-memory-id={entry.memoryId}
          data-active={active ? 'true' : undefined}
          className="memory-list-item__body"
          onPointerDown={(event) => {
            event.preventDefault();
            onBeforeSelect(event.currentTarget);
          }}
          onClick={(event) => {
            event.currentTarget.blur();
            onBeforeSelect(event.currentTarget);
            onSelect();
          }}
          aria-current={active ? 'true' : undefined}
        >
          <div className="memory-list-item__top">
            <span className="memory-list-item__date">
              {formatShortDateLabel(entry.createdAtMs)} · {sourceLabel(entry.source)}
            </span>
            <StatusPill label={IMPORTANCE_LABELS[entry.importance]} tone={importanceTone} />
          </div>

          <h3 className="memory-list-item__title">{entry.title}</h3>
          <p className="memory-list-item__excerpt">{entry.excerpt}</p>

          <div className="memory-list-item__meta">
            <StatusPill label={CATEGORY_LABELS[entry.category]} tone="accent" />
            <StatusPill label={sourceLabel(entry.source)} tone="neutral" />
          </div>
        </button>

        <div className="memory-list-item__chips" aria-label="Tags da memória">
          {tags.visible.map((tag) => (
            <ChipButton key={`${entry.memoryId}-tag-${tag}`} label={tag} active={false} onClick={() => onPickTag(tag)} />
          ))}
          {tags.hidden > 0 ? <span className="memory-list-item__more">+{tags.hidden}</span> : null}
        </div>
      </article>
    );
  }

  return (
    <button
      type="button"
      data-memory-id={entry.memoryId}
      data-active={active ? 'true' : undefined}
      className="group relative block w-full text-left outline-none"
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
      <span
        aria-hidden="true"
        className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-[color:var(--mauve)] opacity-0 transition-opacity group-data-[active=true]:opacity-100"
      />
      <Card
        size="sm"
        className={cn(
          '!gap-0 !py-0 overflow-hidden border-border/70 bg-[color:var(--surface)]/96 transition-all',
          active
            ? 'ring-1 ring-[color:var(--line-strong)] shadow-[0_12px_28px_rgba(28,24,18,0.08)]'
            : 'shadow-sm hover:bg-[color:var(--surface-strong)]/85 hover:shadow-md',
        )}
      >
        <CardHeader className="gap-2 px-4 pt-4 pb-2 md:px-5">
          <div className="flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">
            <span>{formatShortDateLabel(entry.createdAtMs)}</span>
            <span aria-hidden="true">·</span>
            <span>{sourceLabel(entry.source)}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 font-serif text-[1.05rem] leading-snug text-foreground md:text-[1.1rem]">{entry.title}</h3>
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {IMPORTANCE_LABELS[entry.importance]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-3 md:px-5">
          <p className="line-clamp-2 text-sm leading-6 text-foreground/84">{entry.excerpt}</p>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-transparent px-4 py-3 md:px-5">
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em]">
            {CATEGORY_LABELS[entry.category]}
          </Badge>
          {tags.visible.map((tag) => (
            <Badge key={`${entry.memoryId}-tag-${tag}`} variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              {tag}
            </Badge>
          ))}
          {tags.hidden > 0 ? (
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
              +{tags.hidden}
            </Badge>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {entry.entities.slice(0, 1).map((entity) => (
              <Badge
                key={`${entry.memoryId}-entity-${entity}`}
                variant="ghost"
                className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {entity}
              </Badge>
            ))}
          </div>
        </CardFooter>
      </Card>
    </button>
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
    <section className={cn('space-y-3', compact && 'day-group')}>
      <header className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Capítulo</p>
          <h3 className="font-serif text-xl text-foreground md:text-[1.35rem]">{group.label}</h3>
        </div>
        <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {totalEntries} {totalEntries === 1 ? 'fragmento' : 'fragmentos'}
        </Badge>
      </header>

      <div className="space-y-3">
        {group.entries.map((entry) => (
          <FragmentCard
            key={entry.id}
            entry={entry}
            compact={compact}
            active={entry.memoryId === selectedId}
            onSelect={() => onSelectRecord(entry.memoryId)}
            onPickTag={onPickTag}
            onBeforeSelect={onBeforeSelectRecord}
          />
        ))}
      </div>
    </section>
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
  syncTone: 'neutral' | 'good' | 'warning' | 'danger' | 'accent';
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
    const activeButton = scrollRef.current?.querySelector<HTMLElement>('.group[data-active="true"]');
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
    <section
      className={cn(
        'flex h-dvh flex-col border-border/70 bg-[color:var(--surface)]/92',
        compact ? 'border-r-0 index-pane' : 'md:border-r md:border-border/70',
        className,
      )}
      aria-label="Índice de memórias"
      aria-hidden={ariaHidden ? 'true' : undefined}
    >
      <header className="index-toolbar border-b border-border/70 bg-[color:var(--surface)]/90 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/80 sm:px-5">
        <div className="index-toolbar__top flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="index-toolbar__brand space-y-1">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Diário</p>
            <h1 className="font-serif text-[1.9rem] leading-none text-foreground md:text-[2.1rem]">memory-lp</h1>
            <p className="text-sm leading-6 text-muted-foreground">{resultLabelText}</p>
          </div>
          <StatusPill label={syncLabel} tone={syncTone} />
        </div>

        <div className="mt-4">
          <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} compact={compact} />
        </div>

        <div className="index-toolbar__controls mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="search-field relative flex-1">
            <span className="sr-only">Buscar</span>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="memory-search"
              type="search"
              placeholder="Título, conteúdo, tag, entidade ou data"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              autoComplete="off"
              className="h-10 rounded-full border-border/70 bg-background/70 pl-9"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            className="index-toolbar__filters h-10 rounded-full border-border/70 px-4 shadow-sm"
            onClick={onOpenFilters}
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            Filtros
            {activeFilterCount ? (
              <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
                {activeFilterCount}
              </Badge>
            ) : null}
          </Button>
        </div>

        <p className="index-toolbar__meta index-toolbar__summary mt-3 text-sm leading-6 text-muted-foreground">
          {activeFilterSummary.length ? activeFilterSummary.join(' · ') : 'Fragmentos por data, com leitura em camadas.'}
        </p>
      </header>

      <ScrollArea
        className={cn('flex-1 min-h-0', compact && 'index-pane__scroll')}
        viewportRef={scrollRef}
        onViewportScroll={(event: UIEvent<HTMLDivElement>) => onScroll(event.currentTarget.scrollTop)}
      >
        <div className="space-y-8 px-4 py-5 sm:px-5">
          {timelineGroups.length ? (
            <div className="space-y-8">
              {timelineGroups.map((group, index) => (
                <div key={group.key} className="space-y-8">
                  <ChapterGroup
                    group={group}
                    selectedId={selectedId}
                    onSelectRecord={onSelectRecord}
                    onPickTag={onPickTag}
                    onBeforeSelectRecord={captureAnchorFromNode}
                    compact={compact}
                  />
                  {index < timelineGroups.length - 1 ? <Separator className="bg-border/70" /> : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              eyebrow="Índice do diário"
              title="Nenhum fragmento no recorte atual"
              description="A timeline aparece quando a busca ou os filtros encontram memórias datadas."
              action={
                <Button type="button" variant="outline" onClick={onOpenFilters}>
                  <FilterIcon data-icon="inline-start" />
                  Abrir filtros
                </Button>
              }
            />
          )}
        </div>
      </ScrollArea>
    </section>
  );
}

function RelatedEchoItem({
  record,
  relation,
  onSelect,
}: {
  record: MemoryEntry;
  relation: MemoryRelation;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="related-entry group flex w-full flex-col gap-2 rounded-[1.4rem] border border-border/70 bg-background/35 p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:bg-background/55 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={() => onSelect(record.id)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <strong className="font-serif text-base text-foreground">{record.title}</strong>
        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {relationLabel(relation.kind)}
        </Badge>
      </div>
      <p className="text-sm leading-6 text-foreground/82">{record.summary}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        peso {relation.weight.toFixed(1)} · {relation.evidence.join(' · ')}
      </p>
    </button>
  );
}

function ReadingDocument({
  record,
  related,
  pageLabel,
  onSelectRecord,
  compact = false,
}: {
  record: MemoryEntry;
  related: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  pageLabel: string;
  onSelectRecord: (id: string) => void;
  compact?: boolean;
}) {
  const subtitle = shouldShowReadingSummary(record) ? record.summary : '';
  const importanceTone: PillTone = record.importance === 'anchor' || record.importance === 'high' ? 'warning' : 'good';

  if (compact) {
    return (
      <article className="reading-document">
        <section className="reading-section">
          <p className="reading-section__eyebrow">Anotação</p>
          <div className="space-y-4 text-[0.98rem] leading-8 text-foreground/88">
            {paragraphs(record.content).map((paragraph, index) => (
              <p key={`${record.id}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="reading-section">
          <p className="reading-section__eyebrow">Marcas</p>
          <div className="reading-metadata">
            <StatusPill label={`Data · ${formatDateLabel(record.createdAtMs)} · ${formatTimeLabel(record.createdAtMs)}`} tone="neutral" />
            <StatusPill label={`Categoria · ${CATEGORY_LABELS[record.category]}`} tone="accent" />
            <StatusPill label={`Origem · ${sourceLabel(record.source)}`} tone="neutral" />
            <StatusPill label={`Importância · ${IMPORTANCE_LABELS[record.importance]}`} tone={importanceTone} />
            {record.tags.length ? (
              record.tags.slice(0, 2).map((tag) => (
                <ChipButton key={`${record.id}-tag-${tag}`} label={tag} disabled onClick={() => {}} />
              ))
            ) : null}
            {record.tags.length > 2 ? <StatusPill label={`+${record.tags.length - 2}`} tone="neutral" /> : null}
          </div>
        </section>

        <section className="reading-section">
          <p className="reading-section__eyebrow">Ecos relacionados</p>
          {related.length ? (
            <div className="related-list">
              {related.map(({ record: relatedRecord, relation }) => (
                <RelatedEchoItem key={relatedRecord.id} record={relatedRecord} relation={relation} onSelect={onSelectRecord} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              eyebrow="Ecos relacionados"
              title="Sem ecos ainda"
              description="Quando surgirem relações confiáveis, elas aparecem aqui como pequenos apoios à leitura."
            />
          )}
        </section>
      </article>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-4xl !gap-0 !py-0 overflow-hidden border-border/70 bg-[color:var(--surface)]/96 shadow-[0_18px_48px_rgba(28,24,18,0.08)]">
      <CardHeader className="reading-header gap-3 border-b border-border/60 px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
            {pageLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {CATEGORY_LABELS[record.category]}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {sourceLabel(record.source)}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">Leitura íntima, sem ruído de dashboard ou lista corporativa.</p>
        {subtitle ? <p className="text-sm leading-6 text-foreground/80">{subtitle}</p> : null}
      </CardHeader>

      <CardContent className="space-y-6 px-5 py-5 md:px-6">
        <section className="reading-section space-y-3">
          <p className="reading-section__eyebrow">Anotação</p>
          <div className="space-y-4 text-[0.98rem] leading-8 text-foreground/88">
            {paragraphs(record.content).map((paragraph, index) => (
              <p key={`${record.id}-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>
        </section>

        <Separator className="bg-border/70" />

        <section className="reading-section space-y-3">
          <p className="reading-section__eyebrow">Marcas</p>
          <div className="reading-metadata">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]">
              Data · {formatDateLabel(record.createdAtMs)} · {formatTimeLabel(record.createdAtMs)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Importância · {IMPORTANCE_LABELS[record.importance]}
            </Badge>
            {record.tags.length ? (
              record.tags.map((tag) => (
                <Badge key={`${record.id}-tag-${tag}`} variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]">
                  {tag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Sem tags
              </Badge>
            )}
            {record.entities.length ? (
              record.entities.map((entity) => (
                <Badge key={`${record.id}-entity-${entity}`} variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]">
                  {entity}
                </Badge>
              ))
            ) : null}
          </div>
        </section>

        <Separator className="bg-border/70" />

        <section className="reading-section space-y-3">
          <p className="reading-section__eyebrow">Ecos relacionados</p>
          {related.length ? (
            <div className="related-list grid gap-3">
              {related.map(({ record: relatedRecord, relation }) => (
                <RelatedEchoItem key={relatedRecord.id} record={relatedRecord} relation={relation} onSelect={onSelectRecord} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              eyebrow="Ecos relacionados"
              title="Sem ecos ainda"
              description="Quando surgirem relações confiáveis, elas aparecem aqui como pequenos apoios à leitura."
            />
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function ReadingPane({
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [record?.id]);

  if (!record) {
    return (
      <section className="flex h-dvh min-h-0 flex-col bg-[color:var(--bg-2)]/55">
        <header className="border-b border-border/70 bg-[color:var(--surface)]/90 px-5 py-5 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/80">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                  Leitura
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Página vazia
                </Badge>
              </div>
              <h2 className="font-serif text-3xl text-foreground">Selecione uma memória</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A entrada abre aqui como uma página de diário com data, conteúdo e ecos ao fim.
              </p>
            </div>
            {!mobile ? (
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
                  <ChevronLeftIcon data-icon="inline-start" />
                  Anterior
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
                  <ChevronRightIcon data-icon="inline-start" />
                  Próxima
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center p-5">
          <EmptyPanel
            eyebrow="Leitura"
            title="Nada aberto"
            description="Escolha um fragmento no índice para ler a página completa."
            action={mobile ? <Button type="button" onClick={onBack}><ArrowLeftIcon data-icon="inline-start" />Voltar</Button> : undefined}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-dvh min-h-0 flex-col bg-[color:var(--bg-2)]/55">
      <header className="border-b border-border/70 bg-[color:var(--surface)]/90 px-5 py-5 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/80">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                Leitura
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {pageLabel}
              </Badge>
            </div>
            <h2 className="max-w-4xl font-serif text-[clamp(1.9rem,2.6vw,3rem)] leading-tight text-foreground">{record.title}</h2>
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground">{record.summary}</p>
          </div>

          {!mobile ? (
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
                <ChevronLeftIcon data-icon="inline-start" />
                Anterior
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
                <ChevronRightIcon data-icon="inline-start" />
                Próxima
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <ScrollArea className="reading-pane__scroll flex-1 min-h-0" viewportRef={scrollRef}>
        <div className="px-4 py-5 sm:px-5 lg:px-6">
          <ReadingDocument record={record} related={related} pageLabel={pageLabel} onSelectRecord={onSelectRecord} compact />
        </div>
      </ScrollArea>
    </section>
  );
}

function MobileReadingSheet({
  open,
  record,
  related,
  pageLabel,
  hasPrevious,
  hasNext,
  onBack,
  onSelectRecord,
  onPrevious,
  onNext,
}: {
  open: boolean;
  record: MemoryEntry | null;
  related: Array<{ record: MemoryEntry; relation: MemoryRelation }>;
  pageLabel: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onBack: () => void;
  onSelectRecord: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen: boolean) => {
      if (!nextOpen) onBack();
    }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="reading-pane reading-pane--mobile-fullscreen !left-0 !right-0 !bottom-0 !top-0 !h-[100dvh] !w-[100vw] !max-w-none !rounded-none !border-0 !p-0 flex flex-col bg-[color:var(--bg)]"
      >
        <SheetHeader className="reading-header border-b border-border/70 bg-[color:var(--surface)]/92 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/82 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <SheetTitle className="sr-only">Leitura da memória</SheetTitle>
              <SheetDescription className="sr-only">Página aberta em modo móvel.</SheetDescription>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                  Leitura
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {pageLabel}
                </Badge>
              </div>
              <h2 className="max-w-4xl font-serif text-[clamp(1.75rem,6vw,2.45rem)] leading-tight text-foreground">
                {record?.title ?? 'Selecione uma memória'}
              </h2>
              <p className="max-w-4xl text-sm leading-7 text-muted-foreground">{record && shouldShowReadingSummary(record) ? record.summary : 'A leitura abre aqui como uma página de diário.'}</p>
            </div>

            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar leitura">
                <XIcon />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea className="reading-pane__scroll flex-1 min-h-0">
          <div className="px-4 py-5 sm:px-5">
            {record ? (
              <ReadingDocument record={record} related={related} pageLabel={pageLabel} onSelectRecord={onSelectRecord} compact />
            ) : (
              <EmptyPanel
                eyebrow="Leitura"
                title="Nada aberto"
                description="Escolha um fragmento no índice para ler a página completa."
              />
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="reading-pane__mobile-nav border-t border-border/70 bg-[color:var(--surface)]/96 px-4 py-3 sm:px-5">
          <div className="flex w-full items-center gap-2">
            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Voltar
            </Button>
            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onPrevious} disabled={!hasPrevious}>
              <ChevronLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onNext} disabled={!hasNext}>
              <ChevronRightIcon data-icon="inline-start" />
              Próxima
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterChip({
  option,
  active,
  onPick,
}: {
  option: FacetOption;
  active: boolean;
  onPick: (value: string) => void;
}) {
  const label = option.value === 'all' ? `Todas · ${option.count}` : `${option.label} · ${option.count}`;

  return <ChipButton label={label} active={active} onClick={() => onPick(option.value)} />;
}

function FilterGroup({
  title,
  options,
  activeValue,
  onPick,
}: {
  title: string;
  options: FacetOption[];
  activeValue: string | 'all';
  onPick: (value: string) => void;
}) {
  return (
    <section className="filter-group space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{title}</p>
        <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {options.length}
        </Badge>
      </div>
      <div className="filter-group__chips flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip key={option.value} option={option} active={activeValue === option.value} onPick={onPick} />
        ))}
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
  const sheetClassName = compact
    ? 'filter-sheet sheet__panel--bottom !left-0 !right-0 !bottom-0 !top-0 !h-[100dvh] !w-[100vw] !max-w-none !rounded-none !border-0 !p-0 flex flex-col bg-[color:var(--bg)]'
    : 'filter-sheet sheet__panel--drawer !right-0 !top-0 !h-[100dvh] !w-[min(38rem,92vw)] !max-w-none !rounded-none !border-0 !border-l !p-0 flex flex-col bg-[color:var(--bg)]';

  return (
    <Sheet open={open} onOpenChange={(nextOpen: boolean) => {
      if (!nextOpen) onClose();
    }}>
      <SheetContent side={compact ? 'bottom' : 'right'} showCloseButton={false} className={sheetClassName}>
        <SheetHeader className="filter-sheet__header border-b border-border/70 bg-[color:var(--surface)]/92 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/82 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <SheetTitle className="font-serif text-[1.7rem] text-foreground">Refinar o recorte</SheetTitle>
              <SheetDescription className="max-w-xl text-sm leading-6 text-muted-foreground">
                Use os filtros para limar o índice sem transformar o diário em painel administrativo.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar filtros">
                <XIcon />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="filter-sheet__body space-y-6 px-4 py-5 sm:px-5">
            <FilterGroup title="Categorias" options={facetGroups.categories} activeValue={filters.category} onPick={(value) => onChange({ category: value as MemoryFilters['category'] })} />
            <Separator className="bg-border/60" />
            <FilterGroup title="Importância" options={facetGroups.importance} activeValue={filters.importance} onPick={(value) => onChange({ importance: value as MemoryFilters['importance'] })} />
            <Separator className="bg-border/60" />
            <FilterGroup title="Marcas" options={facetGroups.tags} activeValue={filters.tag} onPick={(value) => onChange({ tag: value })} />
            <Separator className="bg-border/60" />
            <FilterGroup title="Entidades" options={facetGroups.entities} activeValue={filters.entity} onPick={(value) => onChange({ entity: value })} />
            <Separator className="bg-border/60" />
            <FilterGroup title="Origem" options={facetGroups.sources} activeValue={filters.source} onPick={(value) => onChange({ source: value })} />
            <Separator className="bg-border/60" />
            <section className="filter-group space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Período</p>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {PERIOD_LABELS[filters.period]}
                </Badge>
              </div>
              <div className="filter-group__chips flex flex-wrap gap-2">
                {(['all', '7d', '30d', '90d', '365d'] as const).map((value) => (
                  <ChipButton
                    key={value}
                    label={value === 'all' ? `Tudo · ${facetGroups.categories[0]?.count ?? 0}` : PERIOD_LABELS[value]}
                    active={filters.period === value}
                    onClick={() => onChange({ period: value })}
                  />
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t border-border/70 bg-[color:var(--surface)]/96 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onClear}>
              Limpar
            </Button>
            <SheetClose asChild>
              <Button type="button" className="flex-1 rounded-full">
                Fechar
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export interface AppShellProps {
  compact: boolean;
  surface: AppSurface;
  onSurfaceChange: (surface: AppSurface) => void;
  syncLabel: string;
  syncTone: 'neutral' | 'good' | 'warning' | 'danger' | 'accent';
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
  const resultLabelText = `Fragmentos · ${visibleCount} de ${totalCount}`;
  const indexHidden = compact && mobileView === 'reading';

  return (
    <div className={cn('notebook-shell notebook-layout flex min-h-dvh flex-col bg-[color:var(--bg)] text-foreground md:grid md:grid-cols-[clamp(22rem,28vw,27.5rem)_minmax(0,1fr)]', compact && 'notebook-shell--compact md:grid-cols-1')}>
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
        className={cn(indexHidden && 'pointer-events-none select-none')}
        ariaHidden={indexHidden}
      />

      {!compact ? (
        <ReadingPane
          record={selectedRecord}
          related={relatedRecords}
          mobile={false}
          onBack={onBackToIndex}
          onSelectRecord={onSelectRecord}
          pageLabel={pageLabel}
          hasPrevious={Boolean(previousEntry)}
          hasNext={Boolean(nextEntry)}
          onPrevious={goPrevious}
          onNext={goNext}
        />
      ) : null}

      <MobileReadingSheet
        open={compact && mobileView === 'reading'}
        record={selectedRecord}
        related={relatedRecords}
        pageLabel={pageLabel}
        hasPrevious={Boolean(previousEntry)}
        hasNext={Boolean(nextEntry)}
        onBack={onBackToIndex}
        onSelectRecord={onSelectRecord}
        onPrevious={goPrevious}
        onNext={goNext}
      />

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
  return <DiaryLayout {...props} />;
}
