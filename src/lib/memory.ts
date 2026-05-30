import type {
  DiaryEntry,
  DiaryGroup,
  Entity,
  EntityKind,
  FacetOption,
  ImportanceLevel,
  MemoryCategory,
  MemoryDataset,
  MemoryEntry,
  MemoryFilters,
  MemoryRelation,
  MemoryRelationKind,
  RawMemoryRecord,
  ValidationIssue,
} from '../types';

export const CATEGORY_ORDER: MemoryCategory[] = [
  'brand',
  'voice',
  'workflow',
  'product',
  'project',
  'platform',
  'memory',
  'user_pref',
  'unknown',
];

export const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  brand: 'Marca',
  voice: 'Voz',
  workflow: 'Fluxo',
  product: 'Produto',
  project: 'Projeto',
  platform: 'Plataforma',
  memory: 'Memória',
  user_pref: 'Preferência',
  unknown: 'Outro',
};

export const IMPORTANCE_LABELS: Record<ImportanceLevel, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  anchor: 'Âncora',
};

export const PERIOD_LABELS: Record<string, string> = {
  all: 'Tudo',
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  '365d': '1 ano',
};

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

const diaryDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const MAX_RELATIONS_PER_NODE = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toInteger(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toFinite(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function uniqueTextList(value: unknown, lowerCase = false): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized) continue;
    const candidate = lowerCase ? normalized.toLowerCase() : normalized;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(candidate);
  }

  return items;
}

function normalizeCategory(value: unknown): MemoryCategory {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  return CATEGORY_ORDER.includes(normalized as MemoryCategory)
    ? (normalized as MemoryCategory)
    : 'unknown';
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = toText(value);
  if (!text) return null;

  const normalized = text.includes('T') || text.includes('Z') ? text : text.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTimestamp(ms: number | null): string {
  if (ms === null) return '';
  return new Date(ms).toISOString();
}

export function formatDateLabel(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'sem data';
  return longDateFormatter.format(new Date(value));
}

export function formatShortDateLabel(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'sem data';
  return shortDateFormatter.format(new Date(value));
}

export function formatTimeLabel(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'agora';
  return timeFormatter.format(new Date(value));
}

export function excerpt(text: string, limit = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

export function paragraphs(text: string): string[] {
  const blocks = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return blocks.length ? blocks : [''];
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function makeSearchText(record: {
  title: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  entities: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  summary?: string;
  importance?: ImportanceLevel;
  importanceScore?: number;
  relationCount?: number;
}): string {
  return [
    record.title,
    record.content,
    record.category,
    record.tags.join(' '),
    record.entities.join(' '),
    record.source,
    record.createdAt,
    record.updatedAt,
    record.summary ?? '',
    record.importance ?? '',
    formatDateLabel(record.createdAtMs),
    formatShortDateLabel(record.createdAtMs),
  ]
    .join(' ')
    .toLowerCase();
}

function scoreImportance(record: MemoryEntry, relationCount: number): number {
  const trustScore = clamp01(record.trust) * 45;
  const relationScore = Math.min(18, relationCount * 3.5);
  const activityScore = Math.min(12, record.retrievalCount * 1.2 + record.helpfulCount * 2.1);
  const coverageScore = Math.min(8, record.tags.length * 1.2 + record.entities.length * 1.4);
  const recencyScore = record.updatedAtMs ? 6 : 0;
  const categoryBonus = record.category === 'project' || record.category === 'workflow' ? 4 : 0;

  return Math.round(trustScore + relationScore + activityScore + coverageScore + recencyScore + categoryBonus);
}

function scoreToImportance(score: number): ImportanceLevel {
  if (score >= 72) return 'anchor';
  if (score >= 54) return 'high';
  if (score >= 34) return 'medium';
  return 'low';
}

function pushIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

function normalizeRawRecord(raw: RawMemoryRecord, index: number, issues: ValidationIssue[]): Omit<MemoryEntry, 'importance' | 'importanceScore' | 'relationCount' | 'summary' | 'searchText'> & { summary?: string } | null {
  const title = toText(raw.title);
  const content = toText(raw.content);
  const summary = toText(raw.summary);
  const id = toText(raw.id) || (typeof raw.fact_id === 'number' ? `fact-${raw.fact_id}` : `memory-${index + 1}`);
  const category = normalizeCategory(raw.category);
  const tags = uniqueTextList(raw.tags, true).map(normalizeTag);
  const entities = uniqueTextList(raw.entities, false);
  const createdAtMs = parseTimestamp(raw.created_at);
  const updatedAtMs = parseTimestamp(raw.updated_at) ?? createdAtMs;
  const source = toText(raw.source) || 'holographic';

  if (!title && !content) {
    pushIssue(issues, {
      path: `[${index}]`,
      code: 'missing-content',
      severity: 'error',
      message: 'Registro sem título nem conteúdo legível.',
    });
    return null;
  }

  if (!toText(raw.title)) {
    pushIssue(issues, {
      path: `[${index}].title`,
      code: 'missing-title',
      severity: 'warning',
      message: 'Título ausente; usando fallback derivado do conteúdo.',
    });
  }

  if (category === 'unknown') {
    pushIssue(issues, {
      path: `[${index}].category`,
      code: 'unknown-category',
      severity: 'info',
      message: 'Categoria fora da taxonomia atual; mantida como outro.',
    });
  }

  const factId = toInteger(raw.fact_id, NaN);

  return {
    id,
    factId: Number.isFinite(factId) ? factId : null,
    title: title || excerpt(content || id, 72),
    content: content || title,
    category,
    tags,
    entities,
    source,
    trust: clamp01(toFinite(raw.trust, 0.5)),
    retrievalCount: Math.max(0, toInteger(raw.retrieval_count, 0)),
    helpfulCount: Math.max(0, toInteger(raw.helpful_count, 0)),
    createdAt: formatTimestamp(createdAtMs),
    updatedAt: formatTimestamp(updatedAtMs),
    createdAtMs,
    updatedAtMs,
    summary: summary || undefined,
  };
}

function relationPairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function chooseRelationKind(sharedTags: string[], sharedEntities: string[], sameCategory: boolean, timeNeighbor: boolean): MemoryRelationKind {
  if (sharedEntities.length) return 'shared-entity';
  if (sharedTags.length) return 'shared-tag';
  if (sameCategory) return 'same-category';
  return timeNeighbor ? 'temporal-neighbor' : 'same-category';
}

function relationEvidence(
  sharedTags: string[],
  sharedEntities: string[],
  sameCategory: boolean,
  timeNeighbor: boolean,
): string[] {
  const evidence = [
    ...sharedTags.map((tag) => `tag:${tag}`),
    ...sharedEntities.map((entity) => `entity:${entity}`),
  ];
  if (sameCategory) evidence.push('category');
  if (timeNeighbor) evidence.push('timeline');
  return evidence;
}

function relationWeight(
  sharedTags: string[],
  sharedEntities: string[],
  sameCategory: boolean,
  timeNeighbor: boolean,
  trustA: number,
  trustB: number,
): number {
  const base = sharedTags.length * 3.2 + sharedEntities.length * 4.5 + (sameCategory ? 1.8 : 0) + (timeNeighbor ? 1.2 : 0);
  const trust = (trustA + trustB) * 1.8;
  return Number((base + trust).toFixed(1));
}

export function buildRelations(records: MemoryEntry[]): MemoryRelation[] {
  const relations: MemoryRelation[] = [];
  const sorted = [...records].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  const pairWeights = new Map<string, number>();

  for (let index = 0; index < sorted.length; index += 1) {
    const a = sorted[index];
    for (let offset = index + 1; offset < sorted.length; offset += 1) {
      const b = sorted[offset];
      const sharedTags = a.tags.filter((tag) => b.tags.includes(tag));
      const sharedEntities = a.entities.filter((entity) => b.entities.some((item) => item.toLowerCase() === entity.toLowerCase()));
      const sameCategory = a.category === b.category && a.category !== 'unknown';
      const timeDelta = Math.abs((a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
      const timeNeighbor = Number.isFinite(timeDelta) && timeDelta <= 1000 * 60 * 60 * 24 * 14;

      if (!sharedTags.length && !sharedEntities.length && !sameCategory && !timeNeighbor) continue;

      const key = relationPairKey(a.id, b.id);
      const weight = relationWeight(sharedTags, sharedEntities, sameCategory, timeNeighbor, a.trust, b.trust);
      const previousWeight = pairWeights.get(key) ?? 0;
      if (weight <= previousWeight) continue;

      pairWeights.set(key, weight);
      const kind = chooseRelationKind(sharedTags, sharedEntities, sameCategory, timeNeighbor);
      const evidence = relationEvidence(sharedTags, sharedEntities, sameCategory, timeNeighbor);
      relations.push({ fromId: a.id, toId: b.id, kind, weight, evidence });
    }
  }

  return relations.sort((a, b) => b.weight - a.weight);
}

export function buildEntities(records: MemoryEntry[]): Entity[] {
  const map = new Map<string, Entity>();

  const ensure = (id: string, label: string, kind: EntityKind): Entity => {
    const existing = map.get(id);
    if (existing) return existing;
    const entity: Entity = { id, label, kind, count: 0, memoryIds: [], score: 0 };
    map.set(id, entity);
    return entity;
  };

  for (const record of records) {
    const categoryId = `category:${record.category}`;
    const category = ensure(categoryId, CATEGORY_LABELS[record.category], 'category');
    category.count += 1;
    category.memoryIds.push(record.id);

    for (const tag of record.tags) {
      const id = `tag:${tag}`;
      const entity = ensure(id, tag, 'tag');
      entity.count += 1;
      entity.memoryIds.push(record.id);
    }

    for (const entityLabel of record.entities) {
      const id = `entity:${entityLabel.toLowerCase()}`;
      const entity = ensure(id, entityLabel, 'entity');
      entity.count += 1;
      entity.memoryIds.push(record.id);
    }
  }

  return [...map.values()]
    .map((entity) => ({
      ...entity,
      memoryIds: Array.from(new Set(entity.memoryIds)),
      score: Number((entity.count * 2 + entity.memoryIds.length * 1.5).toFixed(1)),
    }))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label));
}

export function buildDiaryEntries(records: MemoryEntry[]): DiaryEntry[] {
  return [...records]
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
    .map((record) => ({
      id: `diary:${record.id}`,
      memoryId: record.id,
      dateKey: record.createdAtMs ? new Date(record.createdAtMs).toISOString().slice(0, 10) : 'sem-data',
      dateLabel: formatDateLabel(record.createdAtMs),
      title: record.title,
      excerpt: record.summary,
      category: record.category,
      tags: record.tags,
      entities: record.entities,
      importance: record.importance,
      source: record.source,
      createdAtMs: record.createdAtMs,
    }));
}

export function buildDiaryGroups(entries: DiaryEntry[]): DiaryGroup[] {
  const buckets = new Map<string, DiaryEntry[]>();

  for (const entry of entries) {
    const bucket = buckets.get(entry.dateKey) ?? [];
    bucket.push(entry);
    buckets.set(entry.dateKey, bucket);
  }

  return [...buckets.entries()]
    .map(([key, items]) => ({
      key,
      label: formatRelativeDate(key),
      entries: [...items].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export interface FacetGroups {
  categories: FacetOption[];
  importance: FacetOption[];
  tags: FacetOption[];
  entities: FacetOption[];
  sources: FacetOption[];
}

export function buildFacetGroups(records: MemoryEntry[]): FacetGroups {
  const categoryCounts = new Map<MemoryCategory, number>();
  const importanceCounts = new Map<ImportanceLevel, number>();
  const tagCounts = new Map<string, number>();
  const entityCounts = new Map<string, { label: string; count: number }>();
  const sourceCounts = new Map<string, number>();

  for (const record of records) {
    categoryCounts.set(record.category, (categoryCounts.get(record.category) ?? 0) + 1);
    importanceCounts.set(record.importance, (importanceCounts.get(record.importance) ?? 0) + 1);
    sourceCounts.set(record.source, (sourceCounts.get(record.source) ?? 0) + 1);

    for (const tag of record.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    for (const entity of record.entities) {
      const key = entity.toLowerCase();
      const current = entityCounts.get(key);
      if (current) {
        current.count += 1;
      } else {
        entityCounts.set(key, { label: entity, count: 1 });
      }
    }
  }

  const categories: FacetOption[] = [
    { value: 'all', label: 'Todas', count: records.length },
    ...CATEGORY_ORDER.map((category) => ({
      value: category,
      label: CATEGORY_LABELS[category],
      count: categoryCounts.get(category) ?? 0,
    })).filter((option) => option.count > 0),
  ];

  const importance: FacetOption[] = [
    { value: 'all', label: 'Todas', count: records.length },
    { value: 'anchor', label: IMPORTANCE_LABELS.anchor, count: importanceCounts.get('anchor') ?? 0 },
    { value: 'high', label: IMPORTANCE_LABELS.high, count: importanceCounts.get('high') ?? 0 },
    { value: 'medium', label: IMPORTANCE_LABELS.medium, count: importanceCounts.get('medium') ?? 0 },
    { value: 'low', label: IMPORTANCE_LABELS.low, count: importanceCounts.get('low') ?? 0 },
  ].filter((option) => option.count > 0 || option.value === 'all');

  const tags: FacetOption[] = [
    { value: 'all', label: 'Todas', count: records.length },
    ...[...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 12)
      .map(([label, count]) => ({ value: label, label, count })),
  ];

  const entities: FacetOption[] = [
    { value: 'all', label: 'Todas', count: records.length },
    ...[...entityCounts.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
      .slice(0, 12)
      .map(({ label, count }) => ({ value: label, label, count })),
  ];

  const sources: FacetOption[] = [
    { value: 'all', label: 'Todas', count: records.length },
    ...[...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([label, count]) => ({ value: label, label: labelSource(label), count })),
  ];

  return { categories, importance, tags, entities, sources };
}

function labelSource(source: string): string {
  return source === 'holographic' ? 'Holographic' : source;
}

export function scoreSearchMatch(record: MemoryEntry, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;

  let score = 0;
  const title = record.title.toLowerCase();
  const content = record.content.toLowerCase();
  const summary = record.summary.toLowerCase();
  const tags = record.tags.map((tag) => tag.toLowerCase());
  const entities = record.entities.map((entity) => entity.toLowerCase());
  const source = record.source.toLowerCase();
  const created = `${formatDateLabel(record.createdAtMs)} ${formatShortDateLabel(record.createdAtMs)}`.toLowerCase();
  const updated = `${formatDateLabel(record.updatedAtMs)} ${formatShortDateLabel(record.updatedAtMs)}`.toLowerCase();

  if (title.includes(needle)) {
    score += title.startsWith(needle) ? 90 : 70;
  }
  if (content.includes(needle)) score += 30;
  if (summary.includes(needle)) score += 24;
  if (tags.some((tag) => tag.includes(needle))) score += 36;
  if (entities.some((entity) => entity.includes(needle))) score += 34;
  if (source.includes(needle)) score += 10;
  if (created.includes(needle) || updated.includes(needle)) score += 16;
  if (record.category.includes(needle)) score += 12;
  if (record.searchText.includes(needle)) score += 8;

  return score;
}

export function getRelatedRecords(
  recordId: string,
  relations: MemoryRelation[],
  records: MemoryEntry[],
  limit = MAX_RELATIONS_PER_NODE,
): Array<{ record: MemoryEntry; relation: MemoryRelation }> {
  const seen = new Set<string>();
  const pairs: Array<{ record: MemoryEntry; relation: MemoryRelation }> = [];

  for (const relation of [...relations].sort((a, b) => b.weight - a.weight)) {
    if (pairs.length >= limit) break;
    if (relation.fromId !== recordId && relation.toId !== recordId) continue;

    const counterpartId = relation.fromId === recordId ? relation.toId : relation.fromId;
    if (seen.has(counterpartId)) continue;
    const record = records.find((item) => item.id === counterpartId);
    if (!record) continue;

    seen.add(counterpartId);
    pairs.push({ record, relation });
  }

  return pairs;
}

export function buildMemoryDataset(raw: unknown, sourceKind: MemoryDataset['sourceKind'] = 'snapshot'): MemoryDataset {
  const issues: ValidationIssue[] = [];
  const sourceRecords = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.memories)
      ? raw.memories
      : isRecord(raw) && Array.isArray(raw.items)
        ? raw.items
        : [];

  if (!Array.isArray(raw) && sourceRecords.length === 0) {
    pushIssue(issues, {
      path: '$',
      code: 'invalid-root',
      severity: 'error',
      message: 'Snapshot inválido: esperado um array de memórias.',
    });
  }

  const baseRecords = sourceRecords
    .map((item, index) => (isRecord(item) ? normalizeRawRecord(item as RawMemoryRecord, index, issues) : null))
    .filter((item): item is Omit<MemoryEntry, 'importance' | 'importanceScore' | 'relationCount' | 'summary' | 'searchText'> & { summary?: string } => Boolean(item));

  const provisionalRecords: MemoryEntry[] = baseRecords.map((record) => ({
    ...record,
    importance: 'low',
    importanceScore: 0,
    relationCount: 0,
    summary: excerpt(record.content, 180),
    searchText: '',
  }));

  const relations = buildRelations(provisionalRecords);
  const relationCounts = new Map<string, number>();

  for (const relation of relations) {
    relationCounts.set(relation.fromId, (relationCounts.get(relation.fromId) ?? 0) + 1);
    relationCounts.set(relation.toId, (relationCounts.get(relation.toId) ?? 0) + 1);
  }

  const records = provisionalRecords.map((record) => {
    const relationCount = relationCounts.get(record.id) ?? 0;
    const importanceScore = scoreImportance(record, relationCount);
    const importance = scoreToImportance(importanceScore);
    const summary = record.summary?.trim() || excerpt(record.content, 180);
    const { relationCount: _relationCount, searchText: _searchText, ...searchableRecord } = record;
    const searchText = makeSearchText({
      ...searchableRecord,
      importanceScore,
      importance,
      summary,
    });

    return {
      ...record,
      relationCount,
      importanceScore,
      importance,
      summary,
      searchText,
    };
  });

  const entities = buildEntities(records);
  const diaryEntries = buildDiaryEntries(records);
  const stats: MemoryDataset['stats'] = {
    total: records.length,
    relationCount: relations.length,
    entityCount: entities.length,
    categories: {},
    sources: {},
    importance: { low: 0, medium: 0, high: 0, anchor: 0 },
  };

  for (const record of records) {
    stats.categories[record.category] = (stats.categories[record.category] ?? 0) + 1;
    stats.sources[record.source] = (stats.sources[record.source] ?? 0) + 1;
    stats.importance[record.importance] += 1;
  }

  return {
    sourceKind,
    loadedAt: new Date().toISOString(),
    records,
    entities,
    relations,
    diaryEntries,
    issues,
    stats,
  };
}

function parseMarkdownFrontmatter(markdown: string): { frontmatter: Record<string, string>; body: string } {
  const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, body: normalized.trim() };
  }

  const lines = normalized.split('\n');
  const frontmatterLines: string[] = [];
  let cursor = 1;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line === '---') {
      cursor += 1;
      break;
    }
    frontmatterLines.push(line);
    cursor += 1;
  }

  const frontmatter: Record<string, string> = {};
  for (const line of frontmatterLines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    frontmatter[match[1].toLowerCase()] = match[2].trim();
  }

  return {
    frontmatter,
    body: lines.slice(cursor).join('\n').trim(),
  };
}

function parseMarkdownList(value: string | undefined): string[] {

  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMarkdownNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMemoryMarkdown(markdown: string): RawMemoryRecord[] {
  const { frontmatter, body } = parseMarkdownFrontmatter(markdown);
  const title = frontmatter.title || 'Diário de hoje';
  const createdAt = frontmatter.created_at || frontmatter.date || new Date().toISOString();
  const updatedAt = frontmatter.updated_at || createdAt;
  const summary = frontmatter.summary || excerpt(body, 220);

  return [
    {
      id: frontmatter.id || `daily-${createdAt.slice(0, 10)}`,
      fact_id: parseMarkdownNumber(frontmatter.fact_id),
      title,
      summary,
      content: body,
      category: frontmatter.category || 'memory',
      tags: parseMarkdownList(frontmatter.tags),
      trust: frontmatter.trust ? Number.parseFloat(frontmatter.trust) : 0.8,
      retrieval_count: parseMarkdownNumber(frontmatter.retrieval_count) ?? 0,
      helpful_count: parseMarkdownNumber(frontmatter.helpful_count) ?? 0,
      created_at: createdAt,
      updated_at: updatedAt,
      entities: parseMarkdownList(frontmatter.entities),
      source: frontmatter.source || 'holographic',
    },
  ];
}

export async function loadMemoryDataset(): Promise<MemoryDataset> {
  const response = await fetch(`./data/memories.md?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/memories.md (${response.status})`);
  }

  const raw = await response.text();
  return buildMemoryDataset(parseMemoryMarkdown(raw), 'markdown');
}

export function matchesFilters(record: MemoryEntry, filters: MemoryFilters): boolean {
  const query = filters.query.trim().toLowerCase();

  if (filters.category !== 'all' && record.category !== filters.category) return false;
  if (filters.importance !== 'all' && record.importance !== filters.importance) return false;
  if (filters.source !== 'all' && record.source !== filters.source) return false;
  if (filters.entity !== 'all' && !record.entities.some((item) => item.toLowerCase() === filters.entity.toLowerCase())) return false;
  if (filters.tag !== 'all' && !record.tags.includes(filters.tag.toLowerCase())) return false;

  if (filters.period !== 'all') {
    const cutoff = getPeriodCutoff(filters.period);
    if (cutoff !== null && (record.createdAtMs ?? 0) < cutoff) return false;
  }

  if (!query) return true;

  return record.searchText.includes(query);
}

export function getPeriodCutoff(period: Exclude<MemoryFilters['period'], 'all'>): number | null {
  const now = Date.now();
  switch (period) {
    case '7d':
      return now - 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return now - 30 * 24 * 60 * 60 * 1000;
    case '90d':
      return now - 90 * 24 * 60 * 60 * 1000;
    case '365d':
      return now - 365 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export function formatDiaryDateHeading(dateKey: string): string {
  if (dateKey === 'sem-data') return 'Sem data';
  return diaryDateFormatter.format(new Date(`${dateKey}T00:00:00`));
}

export function formatRelativeDate(dateKey: string): string {
  if (dateKey === 'sem-data') return 'Sem data';
  return shortDateFormatter.format(new Date(`${dateKey}T00:00:00`));
}

export function buildRelationSummary(record: MemoryEntry, relations: MemoryRelation[]): string {
  if (!relations.length) return 'Sem relações fortes encontradas.';

  const top = relations.slice(0, MAX_RELATIONS_PER_NODE);
  const items = top.map((relation) => `${relation.kind} · ${relation.weight.toFixed(1)}`);
  return `${record.title} · ${items.join(' · ')}`;
}

export function selectFallbackRecord(records: MemoryEntry[]): MemoryEntry | null {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => b.importanceScore - a.importanceScore || (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  return sorted[0] ?? null;
}

export function recordToInspectorSummary(record: MemoryEntry): string {
  return [
    CATEGORY_LABELS[record.category],
    record.source,
    `confiança ${Math.round(record.trust * 100)}%`,
    `${record.relationCount} relações`,
  ].join(' · ');
}
