import { useEffect, useMemo, useRef, useState } from 'react';

const MOBILE_QUERY = '(max-width: 979px)';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CATEGORY_ORDER = ['all', 'brand', 'voice', 'workflow', 'product', 'project', 'platform', 'memory'];

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

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function safeTitle(memory) {
  return memory.title || memory.content.split(' :: ')[0].slice(0, 42);
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Memória';
}

function formatDate(value) {
  const parsed = parseDate(value);
  if (!parsed) return 'sem data';
  return longDateFormatter.format(parsed);
}

function formatTime(value) {
  const parsed = parseDate(value);
  if (!parsed) return 'agora';
  return timeFormatter.format(parsed);
}

function excerpt(text, limit = 148) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

function splitParagraphs(text) {
  const blocks = String(text || '')
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return blocks.length ? blocks : [''];
}

function buildSignature(list) {
  return JSON.stringify(
    list.map((item) => [item.id, item.updated_at, item.created_at, item.title, item.category, item.content]),
  );
}

function App() {
  const [memories, setMemories] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('carregando acervo…');
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  const spotlightRef = useRef(null);
  const memoriesRef = useRef([]);
  const signatureRef = useRef('');
  const activeIdRef = useRef(null);

  const visibleMemories = useMemo(() => {
    const q = query.trim().toLowerCase();

    return memories.filter((memory) => {
      const matchesCategory = category === 'all' || memory.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;

      const haystack = [memory.title, memory.content, memory.category, ...(Array.isArray(memory.tags) ? memory.tags : [])]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [memories, query, category]);

  const activeMemory = useMemo(() => {
    if (!visibleMemories.length) return null;
    return visibleMemories.find((item) => item.id === activeId) || visibleMemories[0];
  }, [visibleMemories, activeId]);

  const categories = useMemo(() => {
    const found = new Set(memories.map((item) => item.category).filter(Boolean));
    return CATEGORY_ORDER.filter((item) => item === 'all' || found.has(item));
  }, [memories]);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsMobile(event.matches);

    setIsMobile(media.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
    } else {
      media.addListener(onChange);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', onChange);
      } else {
        media.removeListener(onChange);
      }
    };
  }, []);

  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

  useEffect(() => {
    if (!visibleMemories.length) {
      if (activeId !== null) setActiveId(null);
      return;
    }

    const activeStillVisible = visibleMemories.some((item) => item.id === activeId);
    if (!activeId || !activeStillVisible) {
      setActiveId(visibleMemories[0].id);
    }
  }, [visibleMemories, activeId]);

  useEffect(() => {
    if (activeMemory) {
      activeIdRef.current = activeMemory.id;
    }
  }, [activeMemory]);

  useEffect(() => {
    const sync = async () => {
      try {
        setStatus('atualizando o acervo…');
        const response = await fetch(`./data/memories.json?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Falha ao carregar data/memories.json (${response.status})`);
        }

        const data = await response.json();
        const nextMemories = Array.isArray(data)
          ? [...data].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
          : [];

        const nextSignature = buildSignature(nextMemories);
        const changed = nextSignature !== signatureRef.current;

        if (changed || !memoriesRef.current.length) {
          setMemories(nextMemories);
          signatureRef.current = nextSignature;
        }

        setError('');
        setStatus(`atualizado às ${formatTime(new Date())}`);
      } catch (err) {
        console.error(err);
        setStatus('não foi possível atualizar');
        if (!memoriesRef.current.length) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
        }
      }
    };

    sync();
    const interval = window.setInterval(sync, REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (!document.hidden) sync();
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !activeMemory) return;

    const handle = window.requestAnimationFrame(() => {
      spotlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(handle);
  }, [activeMemory, isMobile]);

  function handleSelect(id) {
    setActiveId(id);
    if (isMobile) {
      window.requestAnimationFrame(() => {
        spotlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  const visibleCount = visibleMemories.length;
  const totalCount = memories.length;
  const activeParagraphs = activeMemory ? splitParagraphs(activeMemory.content) : [];
  const activeTags = activeMemory?.tags || [];

  return (
    <main className="issue-shell">
      <div className="issue-backdrop issue-backdrop--one" aria-hidden="true" />
      <div className="issue-backdrop issue-backdrop--two" aria-hidden="true" />

      <header className="cover">
        <div className="cover__label">Acervo público · edição viva</div>

        <div className="cover__layout">
          <div className="cover__copy">
            <p className="cover__eyebrow">Leitura reservada</p>
            <h1>Memórias para ler sem pressa.</h1>
            <p className="cover__lede">
              Um diário editorial aberto à consulta, com registros organizados para leitura confortável no celular e no desktop.
            </p>
          </div>

          <div className="cover__panel" aria-label="Resumo do acervo">
            <div className="cover-fact cover-fact--featured">
              <span className="cover-fact__label">Memórias disponíveis</span>
              <strong className="cover-fact__value">{totalCount || '—'}</strong>
              <span className="cover-fact__note">acervo aberto para leitura</span>
            </div>

            <div className="cover-fact">
              <span className="cover-fact__label">Visíveis agora</span>
              <strong className="cover-fact__value cover-fact__value--smaller">{visibleCount || '—'}</strong>
              <span className="cover-fact__note">recorte atual</span>
            </div>

            <div className="cover-fact">
              <span className="cover-fact__label">Sincronização</span>
              <strong className="cover-fact__value cover-fact__value--status" aria-live="polite">
                {status}
              </strong>
              <span className="cover-fact__note">fonte: snapshot exportado</span>
            </div>
          </div>
        </div>
      </header>

      <section className="editorial-bar" aria-label="Busca e filtros">
        <label className="search search--wide" htmlFor="search">
          <span>Buscar no acervo</span>
          <input
            id="search"
            type="search"
            placeholder="Título, tema ou data"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="filter-group" aria-label="Filtrar por assunto">
          {categories.map((item) => (
            <button
              key={item}
              className={`filter-chip ${category === item ? 'is-active' : ''}`}
              type="button"
              onClick={() => setCategory(item)}
            >
              {getCategoryLabel(item)}
            </button>
          ))}
        </div>
      </section>

      <section className="spotlight" ref={spotlightRef} tabIndex={-1} aria-label="Leitura em destaque">
        <div className="section-kicker">Leitura em destaque</div>

        {activeMemory ? (
          <article className="spotlight__frame" aria-labelledby={`spotlight-title-${activeMemory.id}`}>
            <div className="spotlight__meta">
              <p className="spotlight__eyebrow">
                {getCategoryLabel(activeMemory.category)} · {formatDate(activeMemory.created_at)}
              </p>
              <p className="spotlight__meta-note">Texto preservado na íntegra</p>
            </div>

            <h2 className="spotlight__title" id={`spotlight-title-${activeMemory.id}`}>
              {safeTitle(activeMemory)}
            </h2>

            <p className="spotlight__lede">{excerpt(activeMemory.content, 190)}</p>

            <div className="spotlight__body">
              {activeParagraphs.map((paragraph, index) => (
                <p key={`${activeMemory.id}-${index}`}>{paragraph}</p>
              ))}
            </div>

            <div className="spotlight__footer">
              <div className="spotlight__label">Assuntos</div>
              <div className="tag-row">
                {activeTags.length ? (
                  activeTags.map((tag) => (
                    <span key={`${activeMemory.id}-${tag}`} className="tag-pill">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="tag-pill tag-pill--quiet">Sem tópicos</span>
                )}
              </div>
            </div>

            <p className="spotlight__note">Atualizado automaticamente.</p>
          </article>
        ) : error ? (
          <div className="spotlight__empty">
            <p className="empty-state__eyebrow">Erro</p>
            <h2>Não foi possível abrir este acervo</h2>
            <p>{error}</p>
          </div>
        ) : (
          <div className="spotlight__empty">
            <p className="empty-state__eyebrow">Leitura</p>
            <h2>Nenhuma memória nesta seleção</h2>
            <p>Ajuste a busca ou mude os filtros. O acervo continua intacto, só saiu deste recorte.</p>
          </div>
        )}
      </section>

      <section className="archive" aria-label="Índice de memórias">
        <div className="archive__head">
          <div>
            <p className="archive__eyebrow">Índice editorial</p>
            <h2>Arquivos recentes</h2>
          </div>
          <p className="archive__hint">Toque em uma memória para abrir a leitura acima.</p>
        </div>

        {visibleMemories.length ? (
          <div className="archive__grid">
            {visibleMemories.map((memory) => {
              const isActive = memory.id === activeMemory?.id;
              return (
                <button
                  key={memory.id}
                  type="button"
                  className={`archive-card ${isActive ? 'is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => handleSelect(memory.id)}
                >
                  <div className="archive-card__head">
                    <p className="archive-card__meta">
                      {getCategoryLabel(memory.category)} · {formatDate(memory.created_at)}
                    </p>
                    <span className="archive-card__status">{isActive ? 'Em leitura' : 'Abrir'}</span>
                  </div>

                  <h3>{safeTitle(memory)}</h3>
                  <p className="archive-card__excerpt">{excerpt(memory.content)}</p>

                  <div className="archive-card__tags">
                    {(memory.tags || []).slice(0, 3).map((tag) => (
                      <span key={`${memory.id}-${tag}`} className="tag-pill tag-pill--small">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="archive__empty">
            <p className="empty-state__eyebrow">Nada por aqui</p>
            <h3>Nenhuma memória aparece neste recorte</h3>
            <p>Ajuste a busca ou mude os filtros para voltar ao índice completo.</p>
          </div>
        )}
      </section>

      <footer className="colophon" aria-label="Notas do arquivo">
        <p>
          Leitura somente. Snapshot sincronizado automaticamente. Fonte: <code>data/memories.json</code>.
        </p>
      </footer>
    </main>
  );
}

export default App;
