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

function hashValue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickVariant(value: string, variants: string[]): string {
  if (!variants.length) return '';
  return variants[hashValue(value) % variants.length];
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
  const focus = pickVariant(record.title, [
    'Hoje a página ganhou corpo com uma camada mais calma.',
    'A leitura foi lapidada para soar mais humana e mais próxima.',
    'O diário deixou o ruído de lado e respirou melhor.',
    'A memória chegou crua, mas o texto a vestiu com mais cuidado.',
  ]);
  const mood = pickVariant(record.content || record.title, [
    `O tom ficou ${importance}, com cuidado para não virar relatório.`,
    `O ritmo ficou ${importance}, sem apertar a página.`,
    `A presença ficou ${importance}, mas ainda leve o suficiente para caber num olhar.`,
  ]);
  const closing = tags
    ? `Marcas próximas: ${tags}.`
    : pickVariant(record.title + record.content, [
        'Marcas próximas mantidas discretas.',
        'Sem marcação extra, só a pista certa.',
        'Poucos sinais, para não roubar o centro da cena.',
      ]);
  const parts = [focus, `Fragmento de ${category}.`, mood, closing];
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
  const opener = pickVariant(entry.id, [
    'A página ficou mais macia e mais fácil de respirar.',
    'A cena saiu do modo relatório e entrou no modo página.',
    'O texto foi suavizado para parecer diário de verdade.',
  ]);
  const body = pickVariant(entry.title + entry.excerpt, [
    `Hoje apareceu um fragmento de ${category}, em tom ${importance}.`,
    `Ficou guardado um fragmento de ${category} com presença ${importance}.`,
    `A nota de ${category} veio com a medida certa de ${importance}.`,
  ]);
  const tail = tags
    ? `Marcas próximas: ${tags}.`
    : 'Marcas próximas discretas, sem exceder o espaço da leitura.';
  return presentExcerpt([opener, body, tail].join(' '), limit);
}

export function presentLabel(value: string): string {
  return normalizeWhitespace(value.replace(/_/g, ' '));
}
