const state = {
  memories: [],
  activeId: null,
  query: '',
  category: 'all',
};

const els = {
  list: document.querySelector('#memory-list'),
  detail: document.querySelector('#detail-panel'),
  filters: document.querySelector('#filters'),
  search: document.querySelector('#search'),
  stats: document.querySelector('#stats'),
  heroCount: document.querySelector('#hero-count'),
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
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
  return String(tags).split(',').map((tag) => tag.trim()).filter(Boolean);
};

const memoryTitle = (memory) => memory.title || memory.content.split(' :: ')[0].slice(0, 42);

function formatDate(value) {
  if (!value) return 'sem data';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
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

    const haystack = [
      memory.title,
      memory.content,
      memory.category,
      ...(parseTags(memory.tags)),
    ]
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

function renderDetail(memory) {
  if (!memory) {
    els.detail.innerHTML = `
      <div class="detail-placeholder">
        <p class="detail-placeholder__eyebrow">Escolhe uma memória</p>
        <h2>Vai aparecer aqui</h2>
        <p>Selecione uma nota à esquerda para abrir a leitura confortável, com o texto inteiro e os metadados que importam.</p>
      </div>
    `;
    return;
  }

  const tags = parseTags(memory.tags);
  els.detail.innerHTML = `
    <article class="detail">
      <div class="detail__stack">
        <div class="detail__panel">
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

function setActive(id) {
  state.activeId = id;
  const memory = state.memories.find((item) => item.id === id) || null;
  renderDetail(memory);
  renderList(filteredMemories());
}

function bindEvents() {
  els.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    const list = filteredMemories();
    if (list.length) {
      state.activeId = list[0].id;
    }
    setStats(state.memories);
    renderList(list);
    renderDetail(list.find((item) => item.id === state.activeId) || list[0] || null);
  });

  els.filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.category = button.dataset.category;
    const list = filteredMemories();
    if (list.length) {
      state.activeId = list[0].id;
    }
    buildFilters(state.memories);
    renderList(list);
    renderDetail(list.find((item) => item.id === state.activeId) || list[0] || null);
  });

  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    setActive(button.dataset.id);
  });
}

async function loadMemories() {
  const response = await fetch('./data/memories.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load memories.json (${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function init() {
  try {
    state.memories = (await loadMemories()).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    buildFilters(state.memories);
    setStats(state.memories);
    const first = state.memories[0] || null;
    state.activeId = first?.id || null;
    renderList(filteredMemories());
    renderDetail(first);
    bindEvents();
  } catch (error) {
    console.error(error);
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
}

init();
