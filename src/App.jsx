import { useEffect, useMemo, useRef, useState } from 'react';

    const MOBILE_QUERY = '(max-width: 979px)';
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

    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    function safeTitle(memory) {
      return memory.title || memory.content.split(' :: ')[0].slice(0, 42);
    }

    function getCategoryLabel(category) {
      return CATEGORY_LABELS[category] || category || 'Memória';
    }

    function formatDate(value) {
      if (!value) return 'sem data';
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
    }

    function formatTime(value) {
      if (!value) return 'agora';
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? 'agora' : timeFormatter.format(parsed);
    }

    function excerpt(text, limit = 152) {
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
      const [status, setStatus] = useState('atualizando…');
      const [error, setError] = useState('');
      const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(MOBILE_QUERY).matches;
      });
      const [sheetOpen, setSheetOpen] = useState(false);

      const detailRef = useRef(null);
      const closeButtonRef = useRef(null);
      const activeMemoryIdRef = useRef(null);
      const memoriesRef = useRef([]);
      const signatureRef = useRef('');

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

      const mobileSheetActive = isMobile && Boolean(activeMemory) && sheetOpen;

      useEffect(() => {
        const media = window.matchMedia(MOBILE_QUERY);
        const onChange = (event) => {
          setIsMobile(event.matches);
          if (!event.matches) {
            setSheetOpen(false);
          }
        };

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
        document.body.classList.toggle('is-reader-open', mobileSheetActive);
        return () => {
          document.body.classList.remove('is-reader-open');
        };
      }, [mobileSheetActive]);

      useEffect(() => {
        if (!visibleMemories.length) {
          if (activeId !== null) setActiveId(null);
          setSheetOpen(false);
          return;
        }

        const activeStillVisible = visibleMemories.some((item) => item.id === activeId);
        if (!activeId || !activeStillVisible) {
          setActiveId(visibleMemories[0].id);
        }
      }, [visibleMemories, activeId]);

      useEffect(() => {
        if (!activeMemory) return;
        activeMemoryIdRef.current = activeMemory.id;
      }, [activeMemory]);

      useEffect(() => {
        memoriesRef.current = memories;
      }, [memories]);

      useEffect(() => {
        const lockState = async () => {
          try {
            setStatus('atualizando…');
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
            if (!memories.length) {
              setError(err instanceof Error ? err.message : 'Erro desconhecido');
            }
          }
        };

        lockState();
        const interval = window.setInterval(lockState, REFRESH_INTERVAL_MS);
        const onVisible = () => {
          if (!document.hidden) lockState();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
          window.clearInterval(interval);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, []);

      useEffect(() => {
        if (mobileSheetActive) {
          requestAnimationFrame(() => {
            detailRef.current?.scrollTo({ top: 0, behavior: 'auto' });
            closeButtonRef.current?.focus({ preventScroll: true });
          });
        }
      }, [mobileSheetActive, activeMemory]);

      function handleSelect(id) {
        setActiveId(id);
        if (isMobile) setSheetOpen(true);
      }

      function handleClose() {
        setSheetOpen(false);
        window.requestAnimationFrame(() => {
          const card = document.querySelector(`[data-memory-id="${activeMemoryIdRef.current}"]`);
          card?.focus({ preventScroll: true });
        });
      }

      function handleBackdropClick() {
        if (isMobile) handleClose();
      }

      const emptyState = !visibleMemories.length;
      const activeParagraphs = activeMemory ? splitParagraphs(activeMemory.content) : [];
      const activeTags = activeMemory?.tags || [];

      return (
        <main className="app-shell">
          <header className="masthead">
            <div className="masthead__intro">
              <p className="eyebrow">Arquivo editorial · leitura reservada</p>
              <h1>Memórias para ler sem pressa.</h1>
              <p className="lede">
                Um acervo público, somente leitura, com notas e decisões organizadas para consulta
                confortável no celular e no desktop.
              </p>
            </div>

            <div className="masthead__meta" aria-label="Resumo do acervo">
              <div className="meta-card">
                <span className="meta-card__label">Memórias disponíveis</span>
                <strong className="meta-card__value">{memories.length || '—'}</strong>
                <span className="meta-card__note">acervo aberto para leitura</span>
                <span className="meta-card__status" aria-live="polite">
                  {status}
                </span>
              </div>
            </div>
          </header>

          <section className="chrome" aria-label="Leitura das memórias">
            <aside className="surface rail" aria-label="Painel de contexto">
              <div className="rail__block">
                <p className="rail__eyebrow">Status</p>
                <p className="rail__title">Arquivo público</p>
                <p className="rail__body">Leitura reservada, atualizada por snapshot.</p>
              </div>

              <div className="rail__block rail__block--accent">
                <span className="rail__label">Visíveis</span>
                <strong className="rail__count">{visibleMemories.length || 0}</strong>
                <span className="rail__hint">na seleção atual</span>
              </div>

              <div className="rail__block rail__block--compact">
                <span className="rail__label">Modo</span>
                <strong className="rail__value">Somente leitura</strong>
              </div>
            </aside>

            <aside className="surface index-panel" aria-label="Lista de memórias">
              <div className="toolbar">
                <label className="search" htmlFor="search">
                  <span>Pesquisar no acervo</span>
                  <input
                    id="search"
                    type="search"
                    placeholder="Palavra, tema ou data"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <p className="toolbar__hint">Selecione uma memória para abrir a leitura.</p>
                <div className="filters" aria-label="Filtros de categoria">
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
              </div>

              <div className="memory-list" role="list" aria-label="Índice de memórias">
                {emptyState ? (
                  <div className="reader-placeholder">
                    <p className="reader-placeholder__eyebrow">Nada por aqui</p>
                    <h2>Nenhuma memória nesta seleção</h2>
                    <p>Ajuste a busca ou os filtros. O acervo continua inteiro, só saiu deste recorte.</p>
                  </div>
                ) : (
                  visibleMemories.map((memory) => {
                    const isActive = memory.id === activeMemory?.id;
                    return (
                      <button
                        key={memory.id}
                        type="button"
                        className={`memory-row ${isActive ? 'is-active' : ''}`}
                        data-memory-id={memory.id}
                        aria-pressed={isActive}
                        onClick={() => handleSelect(memory.id)}
                      >
                        <div className="memory-row__head">
                          <p className="memory-row__meta">
                            {getCategoryLabel(memory.category)} · {formatDate(memory.created_at)}
                          </p>
                          <span className="memory-row__action">Ler</span>
                        </div>
                        <h3>{safeTitle(memory)}</h3>
                        <p className="memory-row__summary">{excerpt(memory.content)}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <aside
              ref={detailRef}
              className={`surface reader-stage ${mobileSheetActive ? 'is-open' : ''}`}
              aria-label="Leitura da memória"
              role="dialog"
              aria-modal={mobileSheetActive}
            >
              {activeMemory ? (
                <article className="reader" aria-labelledby={`reader-title-${activeMemory.id}`}>
                  <div className="reader__section reader__header">
                    <div className="reader__mobilebar">
                      <span className="reader__handle" aria-hidden="true" />
                      <button ref={closeButtonRef} className="reader__close" type="button" onClick={handleClose}>
                        Fechar
                      </button>
                    </div>
                    <p className="reader__eyebrow">
                      {getCategoryLabel(activeMemory.category)} · {formatDate(activeMemory.created_at)}
                    </p>
                    <h2 className="reader__title" id={`reader-title-${activeMemory.id}`}>
                      {safeTitle(activeMemory)}
                    </h2>
                    <p className="reader__lede">Texto preservado na íntegra.</p>
                  </div>

                  <div className="reader__body">
                    {activeParagraphs.map((paragraph, index) => (
                      <p key={`${activeMemory.id}-${index}`}>{paragraph}</p>
                    ))}
                  </div>

                  <div className="reader__footer">
                    <div className="reader__label">Assuntos</div>
                    <div className="tag-row">
                      {activeTags.map((tag) => (
                        <span key={`${activeMemory.id}-${tag}`} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="reader__note">Atualizado automaticamente.</p>
                </article>
              ) : error ? (
                <div className="reader-placeholder">
                  <p className="reader-placeholder__eyebrow">Erro</p>
                  <h2>Não foi possível exibir esta memória</h2>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="reader-placeholder">
                  <p className="reader-placeholder__eyebrow">Leitura</p>
                  <h2>Escolha uma memória</h2>
                  <p>O texto completo aparece aqui.</p>
                </div>
              )}
            </aside>
          </section>

          <div className="backdrop" hidden={!mobileSheetActive} onClick={handleBackdropClick} />
        </main>
      );
    }

    export default App;
