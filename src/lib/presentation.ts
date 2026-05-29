import type { DiaryEntry, MemoryEntry } from '../types';
import { CATEGORY_LABELS, IMPORTANCE_LABELS } from './memory';

const TECHNICAL_PREFIXES = [
  /^user wants\b/i,
  /^user prefers\b/i,
  /^user asks\b/i,
  /^user requested\b/i,
  /^user wants to\b/i,
  /^user prefers to\b/i,
  /^user would like\b/i,
  /^user needs\b/i,
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripBoilerplate(value: string): string {
  let text = normalizeWhitespace(value);
  text = text.replace(/_/g, ' ');

  for (const pattern of TECHNICAL_PREFIXES) {
    text = text.replace(pattern, '');
  }

  text = text.replace(/^[:\-–—,\s]+/, '');
  text = text.replace(/\b(please|pls)\b/gi, '');
  text = normalizeWhitespace(text);

  const cutMarkers = ['; ', ' — ', ' – ', ' - ', ', but ', ', while ', ', so ', ', because ', ', as long as '];
  for (const marker of cutMarkers) {
    const index = text.toLowerCase().indexOf(marker.trim().toLowerCase());
    if (index > 28) {
      text = text.slice(0, index);
      break;
    }
  }

  text = normalizeWhitespace(text);
  if (text.length > 82) {
    text = `${text.slice(0, 79).trimEnd()}…`;
  }

  return text;
}

function presentText(value: string): string {
  return stripBoilerplate(value);
}

export function presentTitle(title: string): string {
  const cleaned = presentText(title);
  if (!cleaned) return title;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function presentShortTitle(title: string): string {
  const presented = presentTitle(title);
  if (presented.length <= 56) return presented;
  return `${presented.slice(0, 53).trimEnd()}…`;
}

export function presentExcerpt(text: string, limit = 120): string {
  const presented = presentText(text);
  if (!presented) return '';
  if (presented.length <= limit) return presented;
  return `${presented.slice(0, limit - 1).trimEnd()}…`;
}

export function presentSummary(text: string, limit = 180): string {
  return presentExcerpt(text, limit);
}

const ENGLISH_MARKERS = [' the ', ' and ', ' with ', ' from ', ' user ', ' memory ', ' note ', ' notes ', ' daily ', ' related ', ' reading ', ' summary '];

function looksEnglishText(value: string): boolean {
  const normalized = ` ${normalizeWhitespace(value).toLowerCase()} `;
  let hits = 0;
  for (const marker of ENGLISH_MARKERS) {
    if (normalized.includes(marker)) hits += 1;
  }
  return hits >= 3;
}

export function presentDiarySummary(record: Pick<MemoryEntry, 'title' | 'summary' | 'content' | 'category' | 'importance' | 'tags'>, limit = 120): string {
  const sourceText = [record.summary, record.content, record.title].join(' ');
  if (!looksEnglishText(sourceText)) {
    const direct = presentText(record.summary || record.content || record.title);
    if (direct) return presentExcerpt(direct, limit);
  }

  const category = CATEGORY_LABELS[record.category] ?? normalizeWhitespace(record.category.replace(/_/g, ' '));
  const importance = IMPORTANCE_LABELS[record.importance] ?? normalizeWhitespace(record.importance.replace(/_/g, ' '));
  const tags = record.tags.slice(0, 2).join(' · ');
  const parts = [
    `Hoje ficou guardado um fragmento de ${category}.`,
    `O tom foi ${importance}, e o diário pediu mais calma e menos ruído.`,
    tags ? `Marcas próximas: ${tags}.` : 'Marcas próximas mantidas discretas.',
  ];
  return presentExcerpt(parts.join(' '), limit);
}

export function presentDiaryTitle(record: Pick<MemoryEntry, 'title' | 'summary' | 'content' | 'category'>): string {
  const sourceText = [record.summary, record.content, record.title].join(' ');
  if (!looksEnglishText(sourceText)) return presentShortTitle(record.title);

  const category = CATEGORY_LABELS[record.category] ?? normalizeWhitespace(record.category.replace(/_/g, ' '));
  return `Fragmento de ${category}`;
}

export function presentDiaryEntryTitle(entry: DiaryEntry): string {
  const sourceText = [entry.title, entry.excerpt, entry.tags.join(' '), entry.entities.join(' ')].join(' ');
  if (!looksEnglishText(sourceText)) return presentShortTitle(entry.title);

  const category = CATEGORY_LABELS[entry.category] ?? normalizeWhitespace(entry.category.replace(/_/g, ' '));
  return `Fragmento de ${category}`;
}

export function presentDiaryEntryExcerpt(entry: DiaryEntry, limit = 120): string {
  const sourceText = [entry.excerpt, entry.title, entry.tags.join(' '), entry.entities.join(' ')].join(' ');
  if (!looksEnglishText(sourceText)) return presentExcerpt(entry.excerpt || entry.title, limit);

  const category = CATEGORY_LABELS[entry.category] ?? normalizeWhitespace(entry.category.replace(/_/g, ' '));
  const importance = IMPORTANCE_LABELS[entry.importance] ?? normalizeWhitespace(entry.importance.replace(/_/g, ' '));
  const tags = entry.tags.slice(0, 2).join(' · ');
  const parts = [
    `Hoje ficou guardado um fragmento de ${category}.`,
    `A importância é ${importance}.`,
    tags ? `Marcas próximas: ${tags}.` : 'Marcas próximas discretas.',
  ];
  return presentExcerpt(parts.join(' '), limit);
}

export function presentLabel(value: string): string {
  return normalizeWhitespace(value.replace(/_/g, ' '));
}
