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

export function presentLabel(value: string): string {
  return normalizeWhitespace(value.replace(/_/g, ' '));
}
