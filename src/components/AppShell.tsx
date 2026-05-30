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
import { presentDiaryDayBadge, presentDiaryDayBody, presentDiaryDayLead, presentDiaryDayMood, presentDiaryDayReflection, presentDiaryDaySummary, presentDiaryDaySubtitle, presentDiaryDayTail, presentDiaryDayTitle, presentDiaryDayTomorrow, presentDiaryEntryTitle, presentDiarySummary, presentDiaryTitle, presentExcerpt, presentLabel, presentShortTitle, presentSummary, presentTitle } from '../lib/presentation';
import { cn } from '@/lib/utils';
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
  return source === 'holographic' ? 'Holographic' : presentLabel(source);
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
  const title = normalizeReadingText(record.title);
  return summary !== content && summary !== title;
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
  return (
    <Tabs value={surface} onValueChange={(value) => onSurfaceChange(value as AppSurface)} className="w-full">
      <TabsList
        variant={compact ? 'line' : 'line'}
        className={cn(
          'w-full',
          compact
            ? 'inline-flex w-auto items-center gap-1.5 rounded-full border border-border/70 bg-[color:var(--surface-muted)]/70 p-1'
            : 'justify-start gap-6 border-b border-border/70 bg-transparent p-0',
        )}
      >
        <TabsTrigger
          value="memories"
          className={cn(
            'text-sm shadow-none data-active:shadow-none',
            compact
              ? 'h-8 rounded-full border-0 bg-transparent px-3.5 text-[0.82rem] text-muted-foreground data-active:bg-[color:var(--surface)] data-active:text-foreground data-active:shadow-sm'
              : 'h-auto rounded-none border-0 bg-transparent px-0 py-3 text-sm text-muted-foreground data-active:bg-transparent data-active:text-foreground',
          )}
        >
          Memórias
        </TabsTrigger>
        <TabsTrigger
          value="diary"
          className={cn(
            'text-sm shadow-none data-active:shadow-none',
            compact
              ? 'h-8 rounded-full border-0 bg-transparent px-3.5 text-[0.82rem] text-muted-foreground data-active:bg-[color:var(--surface)] data-active:text-foreground data-active:shadow-sm'
              : 'h-auto rounded-none border-0 bg-transparent px-0 py-3 text-sm text-muted-foreground data-active:bg-transparent data-active:text-foreground',
          )}
        >
          Diário
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function FragmentItem({
  entry,
  active,
  compact,
  onSelect,
  onPickTag,
  onBeforeSelect,
  surface,
}: {
  entry: DiaryEntry;
  active: boolean;
  compact: boolean;
  surface: AppSurface;
  onSelect: () => void;
  onPickTag: (value: string) => void;
  onBeforeSelect: (node: HTMLElement) => void;
}) {
  const tags = compactTags(entry.tags, 2);
  const displayTitle = surface === 'diary' ? presentDiaryEntryTitle(entry) : compact ? presentShortTitle(entry.title) : presentTitle(entry.title);
  const displayExcerpt = presentExcerpt(entry.excerpt, 110);

  if (compact) {
    return (
      <button
        type="button"
        data-memory-id={entry.memoryId}
        data-active={active ? 'true' : undefined}
        className="group relative block w-full text-left outline-none"
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
        title={entry.title}
      >
        <span
          aria-hidden="true"
          className="absolute left-0 top-4 bottom-4 w-[0.35rem] rounded-r-full bg-[color:var(--mauve)] opacity-0 transition-opacity group-data-[active=true]:opacity-100"
        />
        <article
          className={cn(
            'memory-list-item__body--mobile ml-3 border-l border-[color:var(--mauve-soft)] bg-transparent px-4 py-3 shadow-none transition-all',
            active ? 'rounded-[1.35rem] border border-border/60 bg-[color:var(--surface)]/94 px-4 py-4 shadow-[0_10px_24px_rgba(28,24,18,0.08)]' : 'hover:bg-[color:var(--surface-strong)]/70',
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--mauve-soft)] bg-[color:var(--surface-strong)]/80 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground shadow-[0_4px_12px_rgba(28,24,18,0.04)]">
              Fragmento guardado
            </span>
            <span aria-hidden="true" className="h-px flex-1 rounded-full bg-[linear-gradient(90deg,rgba(124,112,143,0.18),rgba(111,89,68,0.06),transparent)]" />
          </div>
          <div className="flex items-center gap-1.5 text-[0.76rem] text-muted-foreground">
            <span>{formatShortDateLabel(entry.createdAtMs)}</span>
            <span aria-hidden="true">·</span>
            <span>{sourceLabel(entry.source)}</span>
          </div>
          <h3 className="mt-2 font-serif text-[1rem] leading-[1.12] text-foreground [overflow-wrap:anywhere]" title={entry.title}>
            {displayTitle}
          </h3>
          <p className="mt-2 line-clamp-2 text-[0.92rem] leading-6 text-foreground/82">{displayExcerpt}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.04em]">
              {CATEGORY_LABELS[entry.category]}
            </Badge>
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.04em] text-muted-foreground">
              {IMPORTANCE_LABELS[entry.importance]}
            </Badge>
            {tags.visible.map((tag) => (
              <button
                key={`${entry.memoryId}-tag-${tag}`}
                type="button"
                className="rounded-full border border-border/60 bg-[color:var(--surface-strong)]/80 px-2.5 py-0.5 text-[10px] text-muted-foreground transition hover:border-[color:var(--mauve)] hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onPickTag(tag);
                }}
              >
                {tag}
              </button>
            ))}
            {tags.hidden > 0 ? (
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] text-muted-foreground">
                +{tags.hidden}
              </Badge>
            ) : null}
          </div>
        </article>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-memory-id={entry.memoryId}
      data-active={active ? 'true' : undefined}
      className="group relative block w-full text-left outline-none"
      onPointerDown={(event) => {
        onBeforeSelect(event.currentTarget);
      }}
      onClick={(event) => {
        onBeforeSelect(event.currentTarget);
        onSelect();
      }}
      aria-current={active ? 'true' : undefined}
      title={entry.title}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-[color:var(--mauve)] opacity-0 transition-opacity group-data-[active=true]:opacity-100"
      />
      <article
        className={cn(
          'ml-3 rounded-[1.35rem] border border-border/70 bg-[color:var(--surface)]/96 px-4 py-4 shadow-sm transition-all',
          active ? 'ring-1 ring-[color:var(--line-strong)] shadow-[0_12px_28px_rgba(28,24,18,0.08)]' : 'hover:bg-[color:var(--surface-strong)]/85 hover:shadow-md',
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-muted-foreground">
          <span>{formatShortDateLabel(entry.createdAtMs)}</span>
          <span aria-hidden="true">·</span>
          <span>{sourceLabel(entry.source)}</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-serif text-[1.03rem] leading-[1.12] text-foreground md:text-[1.06rem] [overflow-wrap:anywhere]" title={displayTitle}>{displayTitle}</h3>
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] tracking-[0.04em] text-muted-foreground">
            {IMPORTANCE_LABELS[entry.importance]}
          </Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-[0.92rem] leading-6 text-foreground/84">{presentExcerpt(entry.excerpt, 110)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] tracking-[0.04em]">
            {CATEGORY_LABELS[entry.category]}
          </Badge>
          {tags.visible.map((tag) => (
            <button
              key={`${entry.memoryId}-tag-${tag}`}
              type="button"
              className="rounded-full border border-border/60 bg-transparent px-2.5 py-0.5 text-[11px] text-muted-foreground transition hover:border-[color:var(--mauve)] hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onPickTag(tag);
              }}
            >
              {tag}
            </button>
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
                className="rounded-full px-2.5 py-0.5 text-[11px] tracking-[0.04em] text-muted-foreground"
              >
                {entity}
              </Badge>
            ))}
          </div>
        </div>
      </article>
    </button>
  );
}

function ChapterGroup(
{
  group,
  selectedId,
  onSelectRecord,
  onPickTag,
  onBeforeSelectRecord,
  compact,
  surface,
}: {
  group: DiaryGroup;
  selectedId: string | null;
  onSelectRecord: (id: string) => void;
  onPickTag: (value: string) => void;
  onBeforeSelectRecord: (node: HTMLElement) => void;
  compact: boolean;
  surface: AppSurface;
}) {
  const representative = group.entries[0] ?? null;
  const totalEntries = group.entries.length;
  const active = group.entries.some((entry) => entry.memoryId === selectedId);
  const topTags = Array.from(new Set(group.entries.flatMap((entry) => entry.tags))).slice(0, 3);
  const topCategories = Array.from(new Set(group.entries.map((entry) => CATEGORY_LABELS[entry.category]))).slice(0, 3);
  const displayTitle = presentDiaryDayTitle(group);
  const displaySummary = presentDiaryDaySummary(group, compact ? 180 : 220);
  const displaySubtitle = presentDiaryDaySubtitle(group);
  const buttonId = representative?.memoryId ?? group.key;

  return (
    <section className={cn('space-y-3', compact && 'space-y-4')}>
      <header className={cn('flex items-end justify-between gap-3', compact && 'border-l border-[color:var(--mauve-soft)] pl-3')}>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Dia</p>
          <h3 className="font-serif text-xl text-foreground md:text-[1.35rem]">{displayTitle}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{displaySubtitle}</p>
        </div>
        <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {totalEntries} {totalEntries === 1 ? 'fragmento' : 'fragmentos'}
        </Badge>
      </header>

      <button
        type="button"
        data-memory-id={buttonId}
        data-active={active ? 'true' : undefined}
        className="group relative block w-full text-left outline-none"
        onPointerDown={(event) => {
          onBeforeSelectRecord(event.currentTarget);
        }}
        onClick={(event) => {
          onBeforeSelectRecord(event.currentTarget);
          if (representative) onSelectRecord(representative.memoryId);
        }}
        aria-current={active ? 'true' : undefined}
        title={displayTitle}
      >
        <article
          className={cn(
            'daily-diary-card ml-3 border-l border-[color:var(--mauve-soft)] bg-transparent px-4 py-4 shadow-none transition-all',
            active ? 'rounded-[1.35rem] border border-border/60 bg-[color:var(--surface)]/94 px-4 py-4 shadow-[0_10px_24px_rgba(28,24,18,0.08)]' : 'hover:bg-[color:var(--surface-strong)]/70',
          )}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.72rem] text-muted-foreground">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.04em]">
              {presentDiaryDayMood(group)}
            </Badge>
            <span aria-hidden="true">·</span>
            <span>{group.label}</span>
          </div>

          <p className="text-[0.98rem] leading-7 text-foreground/88">{displaySummary}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.04em]">
              {presentDiaryDayBadge(group)}
            </Badge>
            {topCategories.map((label) => (
              <Badge key={`${group.key}-category-${label}`} variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-[0.04em] text-muted-foreground">
                {label}
              </Badge>
            ))}
          </div>
        </article>
      </button>
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
        compact ? 'border-r-0' : 'md:border-r md:border-border/70',
        className,
      )}
      aria-label="Índice de memórias"
      aria-hidden={ariaHidden ? 'true' : undefined}
    >
      <header className={cn('border-b border-border/70 bg-[color:var(--surface)]/90 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/80', compact ? 'px-3 py-3 sm:px-5' : 'px-4 py-4 sm:px-5') }>
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', compact && 'gap-2')}>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Diário</p>
            <h1 className={cn('font-serif leading-none text-foreground', compact ? 'text-[clamp(1.55rem,7vw,1.95rem)]' : 'text-[1.9rem] md:text-[2.1rem]')}>memory-lp</h1>
            <p className={cn('leading-6 text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>{resultLabelText}</p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {syncLabel}
          </Badge>
        </div>

        <div className="mt-4">
          <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} compact={compact} />
        </div>

        <div className={cn('mt-4 flex flex-col gap-3 sm:flex-row', compact && 'gap-2') }>
          <label className="relative flex-1">
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
              className={cn('rounded-full border-border/70 bg-background/70 pl-9', compact ? 'h-9' : 'h-10')}
            />
          </label>

          <Button
            type="button"
            variant="outline"
            className={cn('rounded-full border-border/70 px-4 shadow-sm', compact ? 'h-9' : 'h-10')}
            onClick={onOpenFilters}
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            Filtros
            {activeFilterCount ? (
              <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.12em]">
                {activeFilterCount}
              </Badge>
            ) : null}
          </Button>
        </div>

        <p className={cn('mt-3 leading-6 text-muted-foreground', compact ? 'text-xs' : 'text-sm') }>
          {activeFilterSummary.length ? activeFilterSummary.join(' · ') : 'Fragmentos por data, com leitura em camadas.'}
        </p>
      </header>

      <ScrollArea
        className="flex-1 min-h-0"
        viewportRef={scrollRef}
        onViewportScroll={(event: UIEvent<HTMLDivElement>) => onScroll(event.currentTarget.scrollTop)}
      >
        <div className={cn('space-y-8 py-5', compact ? 'px-3 sm:px-5' : 'px-4 sm:px-5')}>
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
                    surface={surface}
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
      className="group flex w-full flex-col gap-2 rounded-[1.4rem] border border-border/70 bg-background/35 p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:bg-background/55 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={() => onSelect(record.id)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <strong className="font-serif text-base text-foreground">{presentDiaryTitle(record)}</strong>
        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {relationLabel(relation.kind)}
        </Badge>
      </div>
      <p className="text-sm leading-6 text-foreground/82">{presentDiarySummary(record, 90)}</p>
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        peso {relation.weight.toFixed(1)} · {relation.evidence.join(' · ')}
      </p>
    </button>
  );
}

function ReadingDocument({
  record,
  dayGroup,
  pageLabel,
  onSelectRecord,
  compact = false,
}: {
  record: MemoryEntry;
  dayGroup: DiaryGroup | null;
  pageLabel: string;
  onSelectRecord: (id: string) => void;
  compact?: boolean;
}) {
  const activeGroup = dayGroup;
  const isDaily = Boolean(activeGroup);
  const displayTitle = activeGroup ? presentDiaryDayTitle(activeGroup) : compact ? presentShortTitle(record.title) : presentTitle(record.title);
  const displaySubtitle = activeGroup
    ? presentDiaryDaySubtitle(activeGroup)
    : shouldShowReadingSummary(record)
      ? presentSummary(record.summary, compact ? 120 : 140)
      : '';
  const displayLead = activeGroup ? presentDiaryDayLead(activeGroup) : presentSummary(record.summary, compact ? 180 : 140);
  const displayBody = activeGroup
    ? presentDiaryDayBody(activeGroup)
    : paragraphs(record.content).join(' ');
  const displayReflection = activeGroup ? presentDiaryDayReflection(activeGroup) : '';
  const displayTomorrow = activeGroup ? presentDiaryDayTomorrow(activeGroup) : '';
  const displayTail = activeGroup ? presentDiaryDayTail(activeGroup) : '';
  const topTags = activeGroup ? Array.from(new Set(activeGroup.entries.flatMap((entry) => entry.tags))).slice(0, 3) : record.tags.slice(0, 3);
  const topCategories = activeGroup
    ? Array.from(new Set(activeGroup.entries.map((entry) => CATEGORY_LABELS[entry.category]))).slice(0, 3)
    : [CATEGORY_LABELS[record.category]];
  const useArticleView = compact && activeGroup?.entries.length === 1;

  if (useArticleView) {
    return (
      <article className="reading-document--mobile mx-auto w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-border/70 bg-[color:var(--surface)]/96 shadow-[0_18px_48px_rgba(28,24,18,0.08)]">
        <div className="space-y-5 px-4 py-4 sm:px-5">
          <header className="space-y-4">
            <div className="reading-pane__mobile-ornament" aria-hidden="true">
              <span />
              <span />
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--mauve-soft)] bg-[color:var(--surface-strong)]/78 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground shadow-[0_4px_12px_rgba(28,24,18,0.04)]">
                Diário do dia
              </span>
              <span aria-hidden="true" className="h-px flex-1 rounded-full bg-[linear-gradient(90deg,rgba(124,112,143,0.2),rgba(111,89,68,0.06),transparent)]" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em]">
                {displayTitle}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em] text-muted-foreground">
                {pageLabel}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em] text-muted-foreground">
                {CATEGORY_LABELS[record.category]}
              </Badge>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-[clamp(1.38rem,6vw,1.95rem)] leading-[1.08] text-foreground [overflow-wrap:anywhere]">
                {displayTitle}
              </h2>
              <p className="max-w-prose text-sm leading-6 text-muted-foreground">{presentSummary(record.summary, 220)}</p>
            </div>
          </header>

          <section className="reading-section space-y-3 rounded-[1.35rem] border border-border/60 bg-[color:var(--surface-strong)]/55 p-4">
            <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">Texto</p>
            <div className="space-y-4 text-[0.98rem] leading-7 text-foreground/90">
              {paragraphs(record.content).map((paragraph, index) => (
                <p key={`${record.id}-article-${index}`}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="reading-section space-y-3 rounded-[1.35rem] border border-border/60 bg-[color:var(--surface)]/70 p-4">
            <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">Marcas</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em]">
                Data · {formatDateLabel(record.createdAtMs)}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em] text-muted-foreground">
                Importância · {IMPORTANCE_LABELS[record.importance]}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em] text-muted-foreground">
                Origem · {sourceLabel(record.source)}
              </Badge>
              {topTags.map((tag) => (
                <Badge key={`${record.id}-article-tag-${tag}`} variant="outline" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em] text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      </article>
    );
  }

  if (compact) {
    return (
      <article className="reading-document--mobile mx-auto w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-border/70 bg-[color:var(--surface)]/96 shadow-[0_18px_48px_rgba(28,24,18,0.08)]">
        <div className="space-y-5 px-4 py-4 sm:px-5">
          <header className="space-y-4">
            <div className="reading-pane__mobile-ornament" aria-hidden="true">
              <span />
              <span />
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--mauve-soft)] bg-[color:var(--surface-strong)]/78 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground shadow-[0_4px_12px_rgba(28,24,18,0.04)]">
                Diário do dia
              </span>
              <span aria-hidden="true" className="h-px flex-1 rounded-full bg-[linear-gradient(90deg,rgba(124,112,143,0.2),rgba(111,89,68,0.06),transparent)]" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em]">
                {pageLabel}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em] text-muted-foreground">
                {isDaily ? 'Consolidação' : CATEGORY_LABELS[record.category]}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em] text-muted-foreground">
                {isDaily ? presentDiaryDayMood(activeGroup!) : IMPORTANCE_LABELS[record.importance]}
              </Badge>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-[clamp(1.38rem,6vw,1.95rem)] leading-[1.08] text-foreground [overflow-wrap:anywhere]">
                {displayTitle}
              </h2>
              <p className="max-w-prose text-sm leading-6 text-muted-foreground">{displaySubtitle}</p>
            </div>
          </header>

          <section className="reading-section space-y-3 rounded-[1.35rem] border border-border/60 bg-[color:var(--surface-strong)]/55 p-4">
            <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">Resumo</p>
            <div className="space-y-4 text-[0.98rem] leading-7 text-foreground/90">
              <p>{displayLead}</p>
            </div>
          </section>

          <section className="reading-section space-y-3">
            <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">O que ficou vivo</p>
            <p className="text-[0.98rem] leading-7 text-foreground/90">{displayBody}</p>
          </section>

          {isDaily ? (
            <>
              <section className="reading-section space-y-3">
                <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">O que mais me puxou</p>
                <p className="text-[0.98rem] leading-7 text-foreground/90">{displayReflection}</p>
              </section>

              <section className="reading-section space-y-3">
                <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">Amanhã</p>
                <p className="text-[0.98rem] leading-7 text-foreground/90">{displayTomorrow}</p>
              </section>

              <section className="reading-section space-y-3 rounded-[1.35rem] border border-border/60 bg-[color:var(--surface-strong)]/55 p-4">
                <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">Marcas discretas</p>
                <div className="flex flex-wrap items-center gap-2">
                  {topCategories.map((label) => (
                    <Badge key={`${record.id}-daily-category-${label}`} variant="secondary" className="rounded-full px-3 py-1 text-[10px] tracking-[0.04em]">
                      {label}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className="reading-section space-y-3 rounded-[1.35rem] border border-border/60 bg-[color:var(--surface)]/70 p-4">
                <p className="text-[0.74rem] tracking-[0.08em] text-muted-foreground">Fecho</p>
                <p className="text-[0.98rem] leading-7 text-foreground/90">{displayTail}</p>
              </section>
            </>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-4xl !gap-0 !py-0 overflow-hidden border-border/70 bg-[color:var(--surface)]/96 shadow-[0_18px_48px_rgba(28,24,18,0.08)]">
      <CardHeader className="gap-4 border-b border-border/60 px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
            {isDaily ? 'Diário' : 'Leitura'}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {pageLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {isDaily ? 'Consolidação do dia' : CATEGORY_LABELS[record.category]}
          </Badge>
        </div>
        <h2 className="max-w-4xl font-serif text-[clamp(1.65rem,2.2vw,2.4rem)] leading-[1.12] text-foreground [overflow-wrap:anywhere]" title={displayTitle}>
          {displayTitle}
        </h2>
        <p className="max-w-4xl text-sm leading-7 text-muted-foreground">{displaySubtitle || (isDaily ? presentDiaryDayMood(activeGroup!) : sourceLabel(record.source))}</p>
      </CardHeader>

      <CardContent className="space-y-6 px-5 py-5 md:px-6">
        <section className="space-y-3 rounded-[1.4rem] border border-border/60 bg-[color:var(--surface-strong)]/55 p-5">
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Resumo</p>
          <p className="text-[1rem] leading-8 text-foreground/90">{displayLead}</p>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">O que ficou vivo</p>
          <p className="text-[1rem] leading-8 text-foreground/88">{displayBody}</p>
        </section>

        {isDaily ? (
          <>
            <section className="space-y-3">
              <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">O que mais me puxou</p>
              <p className="text-[1rem] leading-8 text-foreground/88">{displayReflection}</p>
            </section>

            <section className="space-y-3">
              <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Amanhã</p>
              <p className="text-[1rem] leading-8 text-foreground/88">{displayTomorrow}</p>
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-border/60 bg-[color:var(--surface-strong)]/55 p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Marcas discretas</p>
              <div className="flex flex-wrap items-center gap-2">
                {topCategories.map((label) => (
                  <Badge key={`${record.id}-desktop-category-${label}`} variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]">
                    {label}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-[1.4rem] border border-border/60 bg-[color:var(--surface)]/70 p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Fecho</p>
              <p className="text-[1rem] leading-8 text-foreground/88">{displayTail}</p>
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}


function DesktopReadingPage(
{
  record,
  dayGroup,
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
  dayGroup: DiaryGroup | null;
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

  const displayTitle = dayGroup ? presentDiaryDayTitle(dayGroup) : record ? presentTitle(record.title) : 'Selecione uma memória';
  const displaySubtitle = dayGroup
    ? presentDiaryDaySubtitle(dayGroup)
    : record && shouldShowReadingSummary(record)
      ? presentSummary(record.summary, 140)
      : '';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [pageLabel]);

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
                {dayGroup ? 'Diário' : 'Leitura'}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {pageLabel}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {dayGroup ? 'Consolidação do dia' : CATEGORY_LABELS[record.category]}
              </Badge>
            </div>
            <h2 className="max-w-4xl font-serif text-[clamp(1.65rem,2.2vw,2.4rem)] leading-[1.12] text-foreground [overflow-wrap:anywhere]" title={displayTitle}>
              {displayTitle}
            </h2>
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground">{displaySubtitle || (dayGroup ? presentDiaryDayMood(dayGroup) : sourceLabel(record.source))}</p>
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

      <ScrollArea className="flex-1 min-h-0" viewportRef={scrollRef}>
        <div className="px-4 py-5 sm:px-5 lg:px-6">
          <ReadingDocument record={record} dayGroup={dayGroup} pageLabel={pageLabel} onSelectRecord={onSelectRecord} />
        </div>
      </ScrollArea>
    </section>
  );
}

function MobileReadingOverlay({
  open,
  record,
  dayGroup,
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
  dayGroup: DiaryGroup | null;
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
        className="reading-pane--mobile-fullscreen reading-pane--mobile-fantasy !left-0 !right-0 !bottom-0 !top-0 !h-[100dvh] !w-[100vw] !max-w-none !rounded-none !border-0 !p-0 flex flex-col bg-[color:var(--bg)]"
      >
        <SheetHeader className="reading-pane__mobile-header border-b border-border/70 bg-[color:var(--surface)]/92 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/82 sm:px-5">
          <SheetTitle className="sr-only">Diário aberto</SheetTitle>
          <SheetDescription className="sr-only">Diário aberto em modo móvel.</SheetDescription>
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full border-border/70 bg-[color:var(--surface)]/92 shadow-sm"
              onClick={onBack}
              aria-label="Voltar para o índice"
            >
              <ArrowLeftIcon />
            </Button>

            <div className="flex min-w-0 flex-col items-center text-center">
              <span className="text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">Diário</span>
              <span className="truncate text-[0.75rem] text-muted-foreground">{pageLabel}</span>
            </div>

            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="rounded-full border-border/70 bg-[color:var(--surface)]/92 shadow-sm"
                aria-label="Fechar leitura"
              >
                <XIcon />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <ScrollArea className="reading-pane__scroll flex-1 min-h-0">
          <div className="px-4 py-5 sm:px-5">
            {record ? (
              <ReadingDocument record={record} dayGroup={dayGroup} pageLabel={pageLabel} onSelectRecord={onSelectRecord} compact />
            ) : (
              <EmptyPanel
                eyebrow="Leitura"
                title="Nada aberto"
                description="Escolha um fragmento no índice para ler a página completa."
              />
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="reading-pane__mobile-nav border-t border-border/70 bg-[color:var(--surface)]/96 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
          <div className="reading-pane__mobile-nav-row">
            <Button type="button" variant="ghost" size="sm" className="reading-pane__mobile-nav-action reading-pane__mobile-nav-back" onClick={onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Voltar
            </Button>
            <Button type="button" variant="ghost" size="sm" className="reading-pane__mobile-nav-action" onClick={onPrevious} disabled={!hasPrevious}>
              <ChevronLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
            <Button type="button" variant="ghost" size="sm" className="reading-pane__mobile-nav-action" onClick={onNext} disabled={!hasNext}>
              Próxima
              <ChevronRightIcon data-icon="inline-end" />
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

  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size="sm"
      className={cn('h-8 rounded-full px-3 text-xs shadow-sm', active && 'border-transparent')}
      onClick={() => onPick(option.value)}
    >
      {label}
    </Button>
  );
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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{title}</p>
        <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {options.length}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
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
    ? '!left-0 !right-0 !bottom-0 !top-0 !h-[100dvh] !w-[100vw] !max-w-none !rounded-none !border-0 !p-0 flex flex-col bg-[color:var(--bg)]'
    : '!right-0 !top-0 !h-[100dvh] !w-[min(38rem,92vw)] !max-w-none !rounded-none !border-0 !border-l !p-0 flex flex-col bg-[color:var(--bg)]';

  return (
    <Sheet open={open} onOpenChange={(nextOpen: boolean) => {
      if (!nextOpen) onClose();
    }}>
      <SheetContent side={compact ? 'bottom' : 'right'} showCloseButton={false} className={sheetClassName}>
        <SheetHeader className="border-b border-border/70 bg-[color:var(--surface)]/92 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface)]/82 sm:px-5">
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

        <ScrollArea className="reading-pane__scroll flex-1 min-h-0">
          <div className="space-y-6 px-4 py-5 sm:px-5">
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
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Período</p>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {PERIOD_LABELS[filters.period]}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', '7d', '30d', '90d', '365d'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={filters.period === value ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 rounded-full px-3 text-xs shadow-sm"
                    onClick={() => onChange({ period: value })}
                  >
                    {value === 'all' ? `Tudo · ${facetGroups.categories[0]?.count ?? 0}` : PERIOD_LABELS[value]}
                  </Button>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="reading-pane__mobile-nav border-t border-border/70 bg-[color:var(--surface)]/96 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
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
  const selectedDayKey = selectedRecord?.createdAtMs ? new Date(selectedRecord.createdAtMs).toISOString().slice(0, 10) : null;
  const selectedDayGroup = useMemo(
    () => (selectedDayKey ? timelineGroups.find((group) => group.key === selectedDayKey) ?? null : null),
    [selectedDayKey, timelineGroups],
  );
  const selectedDayIndex = useMemo(
    () => (selectedDayGroup ? timelineGroups.findIndex((group) => group.key === selectedDayGroup.key) : -1),
    [selectedDayGroup, timelineGroups],
  );
  const pageLabel = selectedDayIndex >= 0 ? `Dia ${selectedDayIndex + 1} de ${timelineGroups.length}` : 'Dia —';
  const mobilePageLabel = selectedDayGroup ? `${selectedDayGroup.label} · ${selectedDayGroup.entries.length} fragmentos` : pageLabel;
  const previousDayGroup = selectedDayIndex > 0 ? timelineGroups[selectedDayIndex - 1] : null;
  const nextDayGroup = selectedDayIndex >= 0 && selectedDayIndex < timelineGroups.length - 1 ? timelineGroups[selectedDayIndex + 1] : null;
  const goPrevious = () => {
    const target = previousDayGroup?.entries[0];
    if (target) onSelectRecord(target.memoryId);
  };
  const goNext = () => {
    const target = nextDayGroup?.entries[0];
    if (target) onSelectRecord(target.memoryId);
  };
  const resultLabelText = `Fragmentos · ${visibleCount} de ${totalCount}`;
  const indexHidden = compact && mobileView === 'reading';

  return (
    <div className={cn('flex min-h-dvh flex-col bg-[color:var(--bg)] text-foreground md:grid md:grid-cols-[clamp(22rem,28vw,27.5rem)_minmax(0,1fr)]', compact && 'md:grid-cols-1')}>
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
        <DesktopReadingPage
          record={selectedRecord}
          dayGroup={selectedDayGroup}
          related={relatedRecords}
          mobile={false}
          onBack={onBackToIndex}
          onSelectRecord={onSelectRecord}
          pageLabel={pageLabel}
          hasPrevious={Boolean(previousDayGroup)}
          hasNext={Boolean(nextDayGroup)}
          onPrevious={goPrevious}
          onNext={goNext}
        />
      ) : null}

      <MobileReadingOverlay
        open={compact && mobileView === 'reading'}
        record={selectedRecord}
        dayGroup={selectedDayGroup}
        related={relatedRecords}
        pageLabel={mobilePageLabel}
        hasPrevious={Boolean(previousDayGroup)}
        hasNext={Boolean(nextDayGroup)}
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


function DesktopDiaryShell(props: AppShellProps) {
  return <DiaryLayout {...props} compact={false} />;
}

function MobileDiaryShell(props: AppShellProps) {
  return <DiaryLayout {...props} compact={true} />;
}

export function AppShell(props: AppShellProps) {
  return props.compact ? <MobileDiaryShell {...props} /> : <DesktopDiaryShell {...props} />;
}
