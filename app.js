const MOBILE_QUERY = window.matchMedia('(max-width: 979px)');
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

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
  stats: document.querySelector('#stats'),
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

function formatDate(value) {
  if (!value) return 'sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function formatSyncTime(value) {
  if (!value) return 'agora';
  return timeFmt.format(value);
}

function memorySignature(list) {
  return JSON.stringify(
    list.map((item) => [item.id, item.updated_at, item.created_at, item.title, item.category, item.trust]),
  );
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message;
}

function setStats(list) {
  const total = list.length;
  const categories = new Set(list.map((item) => item.category)).size;
  const avgTrust = total
    ? (list.reduce((sum, item) => sum + Number(item.trust || 0), 0) / total).toFixed(2)
    : '0.00';

  els.heroCount.textContent = `${total}`;
  els.stats.innerHTML = `
    <span class="stat-pill">${total} memórias</span>
    <span class="stat-pill">${categories} categorias</span>
    <span class="stat-pill">confiança média ${avgTrust}</span>
  `;
}

function buildFilters(list) {
  const categories = ['all', ...new Set(list.map((item) => item.category).filter(Boolean))];
  els.filters.innerHTML = categories
    .map((category) => {
      const label = category === 'all' ? 'Todas' : category;
      return `<button class="filter-chip ${state.category === category ? 'is-active' : ''}" data-category="${escapeHTML(category)}" type="button">${escapeHTML(label)}</button>`;
    })
    .join('');
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

function renderList(list) {
  if (!list.length) {
    els.list.innerHTML = `
      <div class="detail-placeholder">
        <p class="detail-placeholder__eyebrow">Nada encontrado</p>
        <h2>Sem memória com esse filtro</h2>
        <p>Tenta outro termo. O diário ainda está aqui, só ficou exigente.</p>
      </div>
    `;
    return;
  }

  els.list.innerHTML = list
    .map((memory) => {
      const tags = parseTags(memory.tags);
      const active = memory.id === state.activeId ? 'is-active' : '';
      return `
        <button class="memory-card ${active}" type="button" data-id="${escapeHTML(memory.id)}">
          <div class="memory-card__top">
            <div>
              <h3>${escapeHTML(memoryTitle(memory))}</h3>
              <div class="memory-card__meta">
                <span class="tag-pill">${escapeHTML(memory.category || 'general')}</span>
                <span class="tag-pill">${escapeHTML(formatDate(memory.created_at))}</span>
              </div>
            </div>
            <span class="memory-card__trust">★ ${Number(memory.trust || 0).toFixed(2)}</span>
          </div>
          <p class="memory-card__summary">${escapeHTML(memory.content)}</p>
          <div class="tag-row">${tags.slice(0, 4).map((tag) => `<span class="tag-pill">${escapeHTML(tag)}</span>`).join('')}</div>
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
        <p class="detail-placeholder__eyebrow">Escolhe uma memória</p>
        <h2>Vai aparecer aqui</h2>
        <p>Selecione uma nota para abrir a leitura confortável, com o texto inteiro e os metadados que importam.</p>
      </div>
    `;
    return;
  }

  const tags = parseTags(memory.tags);
  els.detail.innerHTML = `
    <article class="detail">
      <div class="detail__stack">
        <div class="detail__panel detail__head">
          <button class="detail__close" type="button" data-close-detail>Fechar leitura</button>
          <div class="detail__eyebrow">${escapeHTML(memory.category || 'general')} · ${escapeHTML(formatDate(memory.created_at))}</div>
          <h2>${escapeHTML(memoryTitle(memory))}</h2>
          <div class="detail__header">
            <span class="stat-pill">confiança ${Number(memory.trust || 0).toFixed(2)}</span>
            <span class="stat-pill">${escapeHTML((memory.entities || []).length ? `${memory.entities.length} entidades` : 'sem entidades destacadas')}</span>
            <span class="stat-pill">${escapeHTML(memory.source || 'holographic snapshot')}</span>
          </div>
        </div>

        <div class="detail__panel">
          <p class="detail__body">${escapeHTML(memory.content)}</p>
        </div>

        <div class="detail__panel">
          <div class="detail__footer">
            <div>
              <div class="detail__eyebrow">Tags</div>
              <div class="tag-row">${tags.map((tag) => `<span class="tag-pill">${escapeHTML(tag)}</span>`).join('')}</div>
            </div>
            <div class="detail__intense">abrir com calma é o ponto</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderApp() {
  const list = filteredMemories();
  const active = list.find((item) => item.id === state.activeId) || list[0] || null;

  if (active) {
    state.activeId = active.id;
  }

  buildFilters(state.memories);
  setStats(state.memories);
  renderList(list);
  renderDetail(active);

  if (!active) {
    closeDetailSheet();
  }
}

function selectMemory(id) {
  state.activeId = id;
  renderApp();

  if (MOBILE_QUERY.matches) {
    openDetailSheet();
  }
}

async function loadMemories() {
  const response = await fetch(`./data/memories.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load memories.json (${response.status})`);
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
      state.lastSyncedAt = new Date();
      setSyncStatus(`atualizado às ${formatSyncTime(state.lastSyncedAt)}`);
      return;
    }

    state.lastSyncedAt = new Date();
    setSyncStatus(`em dia • ${formatSyncTime(state.lastSyncedAt)}`);
  } catch (error) {
    console.error(error);
    setSyncStatus('falha no sync');

    if (!state.memories.length) {
      els.list.innerHTML = `
        <div class="detail-placeholder">
          <p class="detail-placeholder__eyebrow">Erro ao carregar</p>
          <h2>Sem snapshot</h2>
          <p>O site não conseguiu ler <code>data/memories.json</code>. Verifica o deploy e depois volta com menos drama e mais arquivo.</p>
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
        <p>O site não conseguiu inicializar. Revê o console e o deploy.</p>
      </div>
    `;
    els.detail.innerHTML = `
      <div class="detail-placeholder">
        <p class="detail-placeholder__eyebrow">Erro</p>
        <h2>Não abriu</h2>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
    setSyncStatus('falha no sync');
  }
}

init();
