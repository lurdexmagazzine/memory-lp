import type { DiaryEntry, DiaryGroup, MemoryEntry } from '../types';
import { CATEGORY_LABELS, IMPORTANCE_LABELS, formatDiaryDateHeading } from './memory';

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

export function presentDiaryDayTitle(group: DiaryGroup): string {
  return formatDiaryDateHeading(group.key);
}

function joinNaturalList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function normalizeMarkdownHeading(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export type MarkdownSection = {
  title: string;
  body: string;
};

export function extractMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let currentTitle = '';
  let currentBody: string[] = [];
  let inSection = false;

  const flush = () => {
    if (!currentTitle) return;
    sections.push({ title: currentTitle, body: currentBody.join('\n').trim() });
    currentTitle = '';
    currentBody = [];
  };

  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      flush();
      currentTitle = match[1].trim();
      inSection = true;
      continue;
    }

    if (!inSection) continue;
    currentBody.push(line);
  }

  flush();
  return sections;
}

export function getMarkdownSection(markdown: string, title: string): string {
  const target = normalizeMarkdownHeading(title);
  const section = extractMarkdownSections(markdown).find((item) => normalizeMarkdownHeading(item.title) === target);
  return section?.body ?? '';
}

function countLabels(labels: string[]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const label of labels) {
    const normalized = normalizeWhitespace(label);
    if (!normalized) continue;
    map.set(normalized, (map.get(normalized) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
}

function topLabels(entries: DiaryEntry[], pick: (entry: DiaryEntry) => string[], limit = 3): string[] {
  const labels = entries.flatMap((entry) => pick(entry));
  return countLabels(labels).slice(0, limit).map(([label]) => label);
}

export function presentDiaryDayMood(group: DiaryGroup): string {
  const categories = topLabels(group.entries, (entry) => [CATEGORY_LABELS[entry.category]], 3);
  if (!categories.length) return 'dia de recolher e organizar';
  if (categories.includes('Voz') || categories.includes('Marca')) return 'dia de voz e imagem';
  if (categories.includes('Fluxo') || categories.includes('Projeto')) return 'dia de fluxo e rotina';
  return `dia de ${categories.slice(0, 2).join(' e ').toLowerCase()}`;
}

export function presentDiaryDaySummary(group: DiaryGroup, limit = 220): string {
  const categories = topLabels(group.entries, (entry) => [CATEGORY_LABELS[entry.category]], 2);
  const opening = group.entries.length > 16 ? 'Hoje foi um dia cheio.' : 'Hoje foi um dia mais calmo.';
  const categoryPhrase = categories.length ? `A conversa passou por ${joinNaturalList(categories).toLowerCase()}.` : 'A conversa foi se abrindo aos poucos.';
  const closing = 'O dia ficou mais simples, mais íntimo e com menos ruído.';
  return presentExcerpt([opening, categoryPhrase, closing].join(' '), limit);
}

export function presentDiaryDayReflection(group: DiaryGroup): string {
  const categories = topLabels(group.entries, (entry) => [CATEGORY_LABELS[entry.category]], 3);
  if (categories.includes('Voz') || categories.includes('Marca')) {
    return 'O mais perto de mim foi o cuidado com a voz e com a imagem.';
  }
  if (categories.includes('Fluxo') || categories.includes('Projeto')) {
    return 'O mais perto de mim foi arrumar o fluxo e cortar o excesso.';
  }
  return 'O mais perto de mim foi deixar tudo mais claro e menos técnico.';
}

export function presentDiaryDayTomorrow(group: DiaryGroup): string {
  const categories = topLabels(group.entries, (entry) => [CATEGORY_LABELS[entry.category]], 2);
  if (categories.includes('Voz') || categories.includes('Marca')) {
    return 'Amanhã eu continuo afinando voz, ritmo e paleta.';
  }
  if (categories.includes('Fluxo') || categories.includes('Projeto')) {
    return 'Amanhã eu continuo ajustando rotina e sequência.';
  }
  return 'Amanhã eu sigo consolidando o que vale guardar.';
}

export function presentDiaryDayLead(group: DiaryGroup): string {
  const categories = topLabels(group.entries, (entry) => [CATEGORY_LABELS[entry.category]], 2);
  const opening = group.entries.length > 16 ? 'Dia cheio.' : 'Dia mais calmo.';
  const middle = categories.length ? `A conversa passou por ${joinNaturalList(categories).toLowerCase()}.` : 'A conversa foi se abrindo aos poucos.';
  return `${opening} ${middle}`;
}

export function presentDiaryDayBody(group: DiaryGroup): string {
  const mood = presentDiaryDayMood(group);
  return `Hoje eu fui deixando o dia mais íntimo e menos técnico. O tom ficou de ${mood}. ${presentDiaryDayReflection(group)}`;
}

export function presentDiaryDayTail(group: DiaryGroup): string {
  return `${presentDiaryDayReflection(group)} ${presentDiaryDayTomorrow(group)}`;
}

export function presentDiaryDayBadge(group: DiaryGroup): string {
  return `${presentDiaryDayTitle(group)} · ${group.entries.length} fragmentos`;
}

export function presentDiaryDaySubtitle(group: DiaryGroup): string {
  return `${group.entries.length} fragmentos · ${presentDiaryDayMood(group)}`;
}

export function presentLabel(value: string): string {
  return normalizeWhitespace(value.replace(/_/g, ' '));
}
