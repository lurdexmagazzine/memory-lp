const MOBILE_QUERY = window.matchMedia('(max-width: 979px)');
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const CATEGORY_ORDER = ['all', 'brand', 'voice', 'workflow', 'product', 'project', 'platform', 'memory'];

const CATEGORY_LABELS = {
  all: 'Tudo',
  brand: 'Marca',
  voice: 'Voz',
  workflow: 'Fluxo',
  product: 'Produto',
  project: 'Projeto',
  platform: 'Plataforma',
  memory: 'Memória',
};

const state = {
  memories: [],
  activeId: null,
  query: '',
  category: 'all',
  signature: '',
  refreshing: false,
  lastSyncedAt: null,
  lastFocusId: null,
};

const els = {
  list: document.querySelector('#memory-list'),
  detail: document.querySelector('#detail-panel'),
  filters: document.querySelector('#filters'),
  search: document.querySelector('#search'),
  heroCount: document.querySelector('#hero-count'),
  syncStatus: document.querySelector('#sync-status'),
  backdrop: document.querySelector('#detail-backdrop'),
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];

  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function memoryTitle(memory) {
  return memory.title || memory.content.split(' :: ')[0].slice(0, 42);
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Memória';
}

function formatDate(value) {
  if (!value) return 'sem data';

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function formatTime(value) {
  if (!value) return 'agora';

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'agora' : timeFmt.format(parsed);
}

function formatSyncStatus(value) {
  return value ? `atualizado às ${formatTime(value)}` : 'atualizando…';
}

function excerpt(text, limit = 150) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

function renderParagraphs(text) {
  const blocks = String(text || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!blocks.length) return '<p></p>';

  return blocks.map((block) => `<p>${escapeHTML(block)}</p>`).join('');
}

function memorySignature(list) {
  return JSON.stringify(
    list.map((item) => [item.id, item.updated_at, item.created_at, item.title, item.category, item.content]),
  );
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message;
}

function setHeroCount(list) {
  els.heroCount.textContent = `${list.length}`;
}

function filteredMemories() {
  const q = state.query.trim().toLowerCase();

  return state.memories.filter((memory) => {
    const matchesCategory = state.category === 'all' || memory.category === state.category;
    if (!matchesCategory) return false;
    if (!q) return true;

    const haystack = [memory.title, memory.content, memory.category, ...parseTags(memory.tags)]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

function categoriesInUse(list) {
  const found = new Set(list.map((item) => item.category).filter(Boolean));
  return CATEGORY_ORDER.filter((category) => category === 'all' || found.has(category));
}

function buildFilters(list) {
  const categories = categoriesInUse(list);

  els.filters.innerHTML = categories
    .map((category) => {
      const active = state.category === category ? 'is-active' : '';
      return `<button class="filter-chip ${active}" data-category="${escapeHTML(category)}" type="button">${escapeHTML(getCategoryLabel(category))}</button>`;
    })
    .join('');
}

function renderList(list) {
  if (!list.length) {
    els.list.innerHTML = `
      <div class="reader-placeholder">
        <p class="reader-placeholder__eyebrow">Nada por aqui</p>
        <h2>Nenhuma memória nesta seleção</h2>
        <p>Ajuste a busca ou os filtros. O acervo continua inteiro, só saiu deste recorte.</p>
      </div>
    `;
    return;
  }

  els.list.innerHTML = list
    .map((memory) => {
      const active = memory.id === state.activeId ? 'is-active' : '';

      return `
        <button class="memory-card ${active}" type="button" data-id="${escapeHTML(memory.id)}" aria-pressed="${memory.id === state.activeId ? 'true' : 'false'}">
          <p class="memory-card__meta">${escapeHTML(getCategoryLabel(memory.category))} · ${escapeHTML(formatDate(memory.created_at))}</p>
          <h3>${escapeHTML(memoryTitle(memory))}</h3>
          <p class="memory-card__summary">${escapeHTML(excerpt(memory.content))}</p>
          <div class="memory-card__footer">
            <span class="memory-card__action">Ler</span>
          </div>
        </button>
      `;
    })
    .join('');
}

function closeDetailSheet() {
  document.body.classList.remove('is-detail-open');
  els.backdrop.hidden = true;
  els.detail.setAttribute('aria-modal', 'false');

  window.requestAnimationFrame(() => {
    const selector = state.activeId ? `[data-id="${state.activeId.replaceAll('"', '\\"')}"]` : null;
    const card = selector ? document.querySelector(selector) : null;
    card?.focus({ preventScroll: true });
  });
}

function openDetailSheet() {
  if (!MOBILE_QUERY.matches) return;

  document.body.classList.add('is-detail-open');
  els.backdrop.hidden = false;
  els.detail.setAttribute('aria-modal', 'true');

  window.requestAnimationFrame(() => {
    els.detail.scrollTop = 0;
    const closeButton = els.detail.querySelector('[data-close-detail]');
    closeButton?.focus({ preventScroll: true });
  });
}

function renderDetail(memory) {
  if (!memory) {
    els.detail.innerHTML = `
      <div class="reader-placeholder">
        <p class="reader-placeholder__eyebrow">Leitura</p>
        <h2>Escolha uma memória</h2>
        <p>O texto completo aparece aqui.</p>
      </div>
    `;
    return;
  }

  const tags = parseTags(memory.tags);
  const titleId = `reader-title-${memory.id}`;

  els.detail.innerHTML = `
    <article class="reader" aria-labelledby="${escapeHTML(titleId)}">
      <div class="reader__section reader__header">
        <div class="reader__mobilebar">
          <span class="reader__handle" aria-hidden="true"></span>
          <button class="reader__close" type="button" data-close-detail>Fechar</button>
        </div>
        <p class="reader__eyebrow">${escapeHTML(getCategoryLabel(memory.category))} · ${escapeHTML(formatDate(memory.created_at))}</p>
        <h2 class="reader__title" id="${escapeHTML(titleId)}">${escapeHTML(memoryTitle(memory))}</h2>
        <p class="reader__lede">Texto preservado na íntegra.</p>
      </div>

      <div class="reader__body">
        ${renderParagraphs(memory.content)}
      </div>

      <div class="reader__footer">
        <div class="reader__label">Assuntos</div>
        <div class="tag-row">
          ${tags.map((tag) => `<span class="tag-pill">${escapeHTML(tag)}</span>`).join('')}
        </div>
      </div>

      <p class="reader__note">Atualizado automaticamente.</p>
    </article>
  `;
}

function renderApp() {
  const list = filteredMemories();
  const active = list.find((item) => item.id === state.activeId) || list[0] || null;

  if (active) {
    state.activeId = active.id;
  } else {
    state.activeId = null;
  }

  buildFilters(state.memories);
  setHeroCount(state.memories);
  renderList(list);
  renderDetail(active);

  if (!active) {
    closeDetailSheet();
  }
}

function selectMemory(id) {
  state.lastFocusId = id;
  state.activeId = id;
  renderApp();
  openDetailSheet();
}

async function loadMemories() {
  const response = await fetch(`./data/memories.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/memories.json (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function sortMemories(list) {
  return [...list].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

function applyMemories(nextMemories) {
  const normalized = sortMemories(nextMemories);
  state.memories = normalized;
  state.signature = memorySignature(normalized);

  if (!state.activeId || !state.memories.some((item) => item.id === state.activeId)) {
    state.activeId = state.memories[0]?.id || null;
  }

  renderApp();
}

async function refreshMemories({ silent = true } = {}) {
  if (state.refreshing) return;
  state.refreshing = true;

  try {
    if (!silent) {
      setSyncStatus('atualizando…');
    }

    const next = await loadMemories();
    const normalizedNext = sortMemories(next);
    const nextSignature = memorySignature(normalizedNext);
    const changed = nextSignature !== state.signature;

    if (changed || !state.memories.length) {
      applyMemories(normalizedNext);
    }

    state.lastSyncedAt = new Date();
    setSyncStatus(formatSyncStatus(state.lastSyncedAt));
  } catch (error) {
    console.error(error);
    setSyncStatus('não foi possível atualizar');

    if (!state.memories.length) {
      els.list.innerHTML = `
        <div class="reader-placeholder">
          <p class="reader-placeholder__eyebrow">Falha ao carregar</p>
          <h2>Não foi possível carregar as memórias</h2>
          <p>Tente recarregar em alguns instantes.</p>
        </div>
      `;
      els.detail.innerHTML = `
        <div class="reader-placeholder">
          <p class="reader-placeholder__eyebrow">Erro</p>
          <h2>Não foi possível exibir esta memória</h2>
          <p>Tente recarregar a página e abrir outra vez.</p>
        </div>
      `;
    }
  } finally {
    state.refreshing = false;
  }
}

function bindEvents() {
  els.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    renderApp();
  });

  els.filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;

    state.category = button.dataset.category;
    renderApp();
  });

  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-id]');
    if (!button) return;

    selectMemory(button.dataset.id);
  });

  els.detail.addEventListener('click', (event) => {
    const button = event.target.closest('[data-close-detail]');
    if (!button) return;

    closeDetailSheet();
  });

  els.backdrop.addEventListener('click', closeDetailSheet);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDetailSheet();
    }
  });

  const onViewportChange = (event) => {
    if (!event.matches) {
      closeDetailSheet();
    }
  };

  if (typeof MOBILE_QUERY.addEventListener === 'function') {
    MOBILE_QUERY.addEventListener('change', onViewportChange);
  } else if (typeof MOBILE_QUERY.addListener === 'function') {
    MOBILE_QUERY.addListener(onViewportChange);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshMemories({ silent: true });
    }
  });
}

async function init() {
  try {
    bindEvents();
    setSyncStatus('atualizando…');
    await refreshMemories({ silent: false });
    renderApp();

    window.setInterval(() => {
      refreshMemories({ silent: true });
    }, REFRESH_INTERVAL_MS);
  } catch (error) {
    console.error(error);
    els.list.innerHTML = `
      <div class="reader-placeholder">
        <p class="reader-placeholder__eyebrow">Falha ao carregar</p>
        <h2>Não foi possível carregar as memórias</h2>
        <p>Tente recarregar a página.</p>
      </div>
    `;
    els.detail.innerHTML = `
      <div class="reader-placeholder">
        <p class="reader-placeholder__eyebrow">Erro</p>
        <h2>Não foi possível exibir esta memória</h2>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    setSyncStatus('não foi possível atualizar');
  }
}

init();
