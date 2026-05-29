const MOBILE_QUERY = window.matchMedia('(max-width: 979px)');
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const CATEGORY_ORDER = [
  'all',
  'brand',
  'voice',
  'workflow',
  'product',
  'project',
  'platform',
  'memory',
];

const CATEGORY_LABELS = {
  all: 'Todas',
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

const escapeHTML = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const parseTags = (tags) => {
  if (Array.isArray(tags)) return tags;
  if (!tags) return [];
  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const memoryTitle = (memory) => memory.title || memory.content.split(' :: ')[0].slice(0, 42);

const getCategoryLabel = (category) => CATEGORY_LABELS[category] || category || 'Memória';

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
  return value ? `sincronizado às ${formatTime(value)}` : 'sincronizando…';
}

function excerpt(text, limit = 145) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
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
      <div class="detail-placeholder">
        <p class="detail-placeholder__eyebrow">Nada encontrado</p>
        <h2>Sem memória com esse filtro</h2>
        <p>Troque a busca ou o filtro. O diário continua aí, só ficou mais exigente.</p>
      </div>
    `;
    return;
  }

  els.list.innerHTML = list
    .map((memory) => {
      const tags = parseTags(memory.tags);
      const active = memory.id === state.activeId ? 'is-active' : '';
      const handle = MOBILE_QUERY.matches ? 'Toque para abrir' : 'Abrir leitura';

      return `
        <button class="memory-card ${active}" type="button" data-id="${escapeHTML(memory.id)}" aria-pressed="${memory.id === state.activeId ? 'true' : 'false'}">
          <div class="memory-card__head">
            <div class="memory-card__title-group">
              <p class="memory-card__eyebrow">${escapeHTML(getCategoryLabel(memory.category))} · ${escapeHTML(formatDate(memory.created_at))}</p>
              <h3>${escapeHTML(memoryTitle(memory))}</h3>
            </div>
            <span class="memory-card__chevron">${escapeHTML(handle)}</span>
          </div>

          <p class="memory-card__summary">${escapeHTML(excerpt(memory.content))}</p>

          <div class="memory-card__footer">
            <div class="tag-row">
              ${tags.slice(0, 3).map((tag) => `<span class="tag-pill">${escapeHTML(tag)}</span>`).join('')}
            </div>
            <span class="memory-card__hint">${escapeHTML(handle)}</span>
          </div>
        </button>
      `;
    })
    .join('');
}

function closeDetailSheet() {
  document.body.classList.remove('is-detail-open');
  els.backdrop.hidden = true;
}

function openDetailSheet() {
  if (!MOBILE_QUERY.matches) return;
  document.body.classList.add('is-detail-open');
  els.backdrop.hidden = false;
}

function renderDetail(memory) {
  if (!memory) {
    els.detail.innerHTML = `
      <div class="detail-placeholder">
        <p class="detail-placeholder__eyebrow">Leitura</p>
        <h2>Escolha uma memória</h2>
        <p>Toque em um cartão para abrir o texto completo aqui.</p>
      </div>
    `;
    return;
  }

  const tags = parseTags(memory.tags);

  els.detail.innerHTML = `
    <article class="detail">
      <div class="detail__stack">
        <div class="detail__panel detail__panel--hero">
          <div class="detail__mobilebar">
            <span class="detail__handle" aria-hidden="true"></span>
            <button class="detail__close" type="button" data-close-detail>Fechar</button>
          </div>
          <p class="detail__eyebrow">${escapeHTML(getCategoryLabel(memory.category))} · ${escapeHTML(formatDate(memory.created_at))}</p>
          <h2>${escapeHTML(memoryTitle(memory))}</h2>
          <p class="detail__lede">Leitura sem edição, direto do Holographic.</p>
        </div>

        <div class="detail__panel">
          <p class="detail__body">${escapeHTML(memory.content)}</p>
        </div>

        <div class="detail__panel detail__panel--tags">
          <div class="detail__label">Palavras-chave</div>
          <div class="tag-row">
            ${tags.map((tag) => `<span class="tag-pill">${escapeHTML(tag)}</span>`).join('')}
          </div>
        </div>

        <p class="detail__note">Atualizado automaticamente pelo Holographic.</p>
      </div>
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
      setSyncStatus('sincronizando…');
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
    setSyncStatus('falha ao atualizar');

    if (!state.memories.length) {
      els.list.innerHTML = `
        <div class="detail-placeholder">
          <p class="detail-placeholder__eyebrow">Erro ao carregar</p>
          <h2>Sem snapshot</h2>
          <p>Não consegui ler <code>data/memories.json</code>. Verifique o deploy e tente novamente.</p>
        </div>
      `;
      els.detail.innerHTML = `
        <div class="detail-placeholder">
          <p class="detail-placeholder__eyebrow">Erro</p>
          <h2>Não abriu</h2>
          <p>${escapeHTML(error.message)}</p>
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
    setSyncStatus('sincronizando…');
    await refreshMemories({ silent: false });
    renderApp();

    window.setInterval(() => {
      refreshMemories({ silent: true });
    }, REFRESH_INTERVAL_MS);
  } catch (error) {
    console.error(error);
    els.list.innerHTML = `
      <div class="detail-placeholder">
        <p class="detail-placeholder__eyebrow">Erro ao carregar</p>
        <h2>Sem snapshot</h2>
        <p>O app não conseguiu inicializar. Veja o console e confira o deploy.</p>
      </div>
    `;
    els.detail.innerHTML = `
      <div class="detail-placeholder">
        <p class="detail-placeholder__eyebrow">Erro</p>
        <h2>Não abriu</h2>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    setSyncStatus('falha ao atualizar');
  }
}

init();
