export type MemoryCategory =
  | 'brand'
  | 'voice'
  | 'workflow'
  | 'product'
  | 'project'
  | 'platform'
  | 'memory'
  | 'user_pref'
  | 'unknown';

export type MemorySource = string;

export type ImportanceLevel = 'low' | 'medium' | 'high' | 'anchor';
export type EntityKind = 'tag' | 'entity' | 'category';
export type MemoryRelationKind = 'shared-tag' | 'shared-entity' | 'same-category' | 'temporal-neighbor';
export type BrainSurface = 'brain' | 'diary';
export type PeriodFilter = 'all' | '7d' | '30d' | '90d' | '365d';

export interface RawMemoryRecord {
  [key: string]: unknown;
  id?: unknown;
  fact_id?: unknown;
  title?: unknown;
  content?: unknown;
  category?: unknown;
  tags?: unknown;
  trust?: unknown;
  retrieval_count?: unknown;
  helpful_count?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  entities?: unknown;
  source?: unknown;
}

export interface ValidationIssue {
  path: string;
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface MemoryEntry {
  id: string;
  factId: number | null;
  title: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  entities: string[];
  source: MemorySource;
  trust: number;
  retrievalCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  importance: ImportanceLevel;
  importanceScore: number;
  relationCount: number;
  summary: string;
  searchText: string;
}

export interface Entity {
  id: string;
  label: string;
  kind: EntityKind;
  count: number;
  memoryIds: string[];
  score: number;
}

export interface MemoryRelation {
  fromId: string;
  toId: string;
  kind: MemoryRelationKind;
  weight: number;
  evidence: string[];
}

export interface DiaryEntry {
  id: string;
  memoryId: string;
  dateKey: string;
  dateLabel: string;
  title: string;
  excerpt: string;
  category: MemoryCategory;
  tags: string[];
  entities: string[];
  importance: ImportanceLevel;
  source: MemorySource;
  createdAtMs: number | null;
}

export interface MemoryDatasetStats {
  total: number;
  relationCount: number;
  entityCount: number;
  categories: Record<string, number>;
  sources: Record<string, number>;
  importance: Record<ImportanceLevel, number>;
}

export interface MemoryDataset {
  sourceKind: 'snapshot' | 'fixture';
  loadedAt: string;
  records: MemoryEntry[];
  entities: Entity[];
  relations: MemoryRelation[];
  diaryEntries: DiaryEntry[];
  issues: ValidationIssue[];
  stats: MemoryDatasetStats;
}

export interface MemoryFilters {
  query: string;
  category: MemoryCategory | 'all';
  importance: ImportanceLevel | 'all';
  source: string | 'all';
  period: PeriodFilter;
  entity: string | 'all';
  tag: string | 'all';
}

export type AppSurface = 'memories' | 'diary';

export interface DiaryGroup {
  key: string;
  label: string;
  entries: DiaryEntry[];
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}
