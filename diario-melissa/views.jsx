/* views.jsx — Sidebar, ReadingView, Filters, Today, decorações. Exporta p/ window. */

const { useState } = React;
const { formatDatePt, formatDateShort, monthNamePt } = window.DiarioMD;

/* ---- decorações geométricas (buds = elipses, haste/folhas = linhas) ---- */
function Lavender() {
  const buds = [];
  let id = 0;
  // três espigas de lavanda
  [[64, 14, 0], [40, 34, -10], [88, 30, 9]].forEach(([cx, top, rot]) => {
    for (let r = 0; r < 6; r++) {
      const y = top + r * 11;
      const spread = 3 + r * 0.7;
      buds.push(<ellipse key={id++} cx={cx - spread} cy={y} rx="3.4" ry="5" fill="#b79bd6" opacity={0.92 - r * 0.05} transform={`rotate(${rot} ${cx} ${y})`} />);
      buds.push(<ellipse key={id++} cx={cx + spread} cy={y + 4} rx="3.4" ry="5" fill="#caa9e0" opacity={0.92 - r * 0.05} transform={`rotate(${rot} ${cx} ${y})`} />);
    }
  });
  return (
    <svg className="deco deco-lavender" width="130" height="180" viewBox="0 0 130 180" fill="none">
      {/* hastes */}
      <path d="M64 70 C 63 110 65 140 66 172" stroke="#9bb589" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M44 86 C 50 120 58 145 66 172" stroke="#9bb589" strokeWidth="2" strokeLinecap="round" />
      <path d="M86 80 C 80 118 70 146 66 172" stroke="#9bb589" strokeWidth="2" strokeLinecap="round" />
      {/* folhas */}
      <path d="M64 150 C 50 146 44 152 40 160" stroke="#9bb589" strokeWidth="2" strokeLinecap="round" />
      <path d="M66 158 C 80 154 88 160 92 168" stroke="#9bb589" strokeWidth="2" strokeLinecap="round" />
      {buds}
    </svg>
  );
}
function Paperclip({ className }) {
  return (
    <svg className={"deco deco-clip " + (className || "")} width="44" height="44" viewBox="0 0 44 44" fill="none">
      <path d="M14 12 v16 a8 8 0 0 0 16 0 V12 a5.5 5.5 0 0 0 -11 0 v15 a3 3 0 0 0 6 0 V14"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ---- menu de opções (…) ---- */
function MoreMenu({ fav, onToggleFav, onPrint, onCopy }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button className="icon-btn" title="Mais opções" onClick={() => setOpen((o) => !o)}><I.more s={17} /></button>
      {open && (
        <>
          <div className="menu-scrim" onClick={() => setOpen(false)} />
          <div className="more-menu" role="menu">
            <button className="mm-item" onClick={() => { onToggleFav && onToggleFav(); setOpen(false); }}>
              {fav ? <I.bookmarkFill s={16} /> : <I.bookmark s={16} />}
              {fav ? "Remover dos favoritos" : "Favoritar página"}
            </button>
            <button className="mm-item" onClick={() => { setOpen(false); onCopy && onCopy(); }}>
              <I.tag s={16} />Copiar texto
            </button>
            <div className="mm-sep" />
            <button className="mm-item" onClick={() => { setOpen(false); setTimeout(() => onPrint && onPrint(), 60); }}>
              <I.printer s={16} />Imprimir / Salvar em PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Sidebar ---------- */
function Sidebar({ entries, all, selected, onSelect, view, setView, query, setQuery, openFilters, filterCount, favs, onToggleFav }) {
  return (
    <aside className="sidebar desktop-sidebar">
      <div className="sb-head">
        <div className="eyebrow">Diário</div>
        <div className="sb-title-row">
          <span className="sb-title">Melissa</span>
          <span className="sb-feather"><I.feather s={18} /></span>
        </div>
        <div className="sb-sub">
          <span className="sync-dot" />
          <span>{all.length} páginas · sincronizado às 22:00</span>
        </div>
      </div>

      <div className="sb-tools">
        <label className="search">
          <I.search s={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar páginas, temas, marcas…" />
        </label>
        <button className={"btn-filter" + (filterCount ? " on" : "")} onClick={openFilters}>
          <I.filter s={16} />
          {filterCount ? <span className="count">{filterCount}</span> : "Filtros"}
        </button>
      </div>

      <div className="tabs">
        <button className={"tab" + (view !== "today" ? " active" : "")} onClick={() => setView("read")}>Diário</button>
        <button className={"tab" + (view === "today" ? " active" : "")} onClick={() => setView("today")}>
          Hoje<span className="dot" />
        </button>
      </div>

      <div className="chapter">
        <span className="chapter-name">Maio de 2026</span>
        <span className="chapter-count">{entries.length} {entries.length === 1 ? "página" : "páginas"}</span>
      </div>

      <div className="timeline scroll">
        <div className="tl-rail" />
        {entries.length === 0 ? (
          <div className="empty">
            <div className="e-title">Nada por aqui</div>
            <div>Nenhuma página corresponde à sua busca.</div>
          </div>
        ) : (
          entries.map((e) => (
            <EntryCard key={e.filename} entry={e}
              active={view !== "today" && selected && selected.filename === e.filename}
              fav={favs && favs.has(e.filename)} onToggleFav={() => onToggleFav(e.filename)}
              onClick={() => onSelect(e)} />
          ))
        )}
      </div>
    </aside>
  );
}

/* ---------- Reading page ---------- */
function Section({ sec }) {
  const Icon = SECTION_ICON[sec.kind] || I.dot;
  return (
    <section className={"sec t-" + sec.kind}>
      <div className="sec-head">
        <span className="sec-mark"><Icon s={15} /></span>
        <h2 className="sec-title">{sec.title}</h2>
      </div>
      {sec.type === "prose" ? (
        <div className="sec-prose" dangerouslySetInnerHTML={{ __html: sec.html }} />
      ) : (
        <div className="sec-list">
          {sec.items.map((it, i) => (
            <div className="li-block" key={i}>
              <span className="li-mark"><I.dot s={11} /></span>
              <span className="li-text" dangerouslySetInnerHTML={{ __html: it.html }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReadingView({ entry, index, total, onPrev, onNext, isMobile, fav, onToggleFav, onPrint, onCopy }) {
  if (!entry) {
    return <div className="empty" style={{ margin: "auto" }}><div className="e-title">Selecione uma página</div></div>;
  }
  const mood = moodFor(entry);
  const resumo = entry.sections.find((s) => s.kind === "resumo");
  const rest = entry.sections.filter((s) => s.kind !== "resumo");
  return (
    <div className="reading">
      <div className="read-top">
        <div className="read-crumb">
          <span className="pill">Leitura</span>
          <span className="page-of">Página {index + 1} de {total}</span>
        </div>
        <div className="read-actions">
          <button className="nav-btn" onClick={onPrev} disabled={index <= 0}><I.chevL s={15} />Anterior</button>
          <button className="nav-btn" onClick={onNext} disabled={index >= total - 1}>Próxima<I.chevR s={15} /></button>
          <button className={"icon-btn" + (fav ? " active" : "")} title={fav ? "Remover dos favoritos" : "Favoritar"} onClick={onToggleFav}>
            {fav ? <I.bookmarkFill s={17} /> : <I.bookmark s={17} />}
          </button>
          <MoreMenu fav={fav} onToggleFav={onToggleFav} onPrint={onPrint} onCopy={onCopy} />
        </div>
      </div>

      <div className="read-scroll scroll">
        <div className="read-inner">
          <div className="read-date-line">
            <I.calendar s={14} />
            <span>{formatDatePt(entry.date)} · 22:00</span>
          </div>
          <h1 className="read-title">{entry.title}</h1>

          {resumo && <div className="read-lede" dangerouslySetInnerHTML={{ __html: resumo.html }} />}
          {entry.contexto && <p className="read-callout">{entry.contexto}</p>}

          <div className="meta-grid">
            <div className="meta-cell">
              <div className="eyebrow"><I.calendar s={13} /> Data</div>
              <div className="mv">{formatDateShort(entry.date)}</div>
            </div>
            <div className="meta-cell">
              <div className="eyebrow"><I.tag s={13} /> Tema</div>
              <div className="mv" style={{ fontSize: 13, lineHeight: 1.35, fontWeight: 600 }}>{entry.tema || "—"}</div>
            </div>
            <div className="meta-cell">
              <div className="eyebrow"><I.sparkle s={13} /> Humor</div>
              <div className="mv"><span className={"badge-mood " + mood.k}>{mood.label}</span></div>
            </div>
          </div>

          {entry.tags.length > 0 && (
            <>
              <div className="section-eyebrow"><span className="eyebrow">Marcas</span></div>
              <div className="marcas">
                {entry.tags.map((t, i) => <Chip key={i} variant={i % 2 ? "rose" : ""}>{t}</Chip>)}
              </div>
            </>
          )}

          {rest.map((sec, i) => <Section key={i} sec={sec} />)}

          {/* post-it de anotação */}
          {entry.annotation && (
            <div className="postit">
              <span className="pin" />
              <div className="pi-label">Anotação</div>
              <div className="pi-text">{entry.annotation}</div>
              <span className="pi-heart"><I.heart s={18} /></span>
            </div>
          )}
        </div>
      </div>

      <div className="read-foot">
        <button className="nav-btn" onClick={onPrev} disabled={index <= 0}><I.arrowL s={15} />Anterior</button>
        <span className="rf-mid">{formatDateShort(entry.date)} · Melissa</span>
        <button className="nav-btn" onClick={onNext} disabled={index >= total - 1}>Próxima<I.arrowR s={15} /></button>
      </div>
    </div>
  );
}

/* ---------- Filters ---------- */
function Filters({ months, tags, sel, setSel, onClose, onClear }) {
  const toggle = (key, val) => {
    setSel((prev) => {
      const set = new Set(prev[key]);
      set.has(val) ? set.delete(val) : set.add(val);
      return { ...prev, [key]: [...set] };
    });
  };
  return (
    <>
      <div className="filters-scrim" onClick={onClose} />
      <div className="filters">
        <div className="filters-head">
          <span className="ft">Filtros</span>
          <button className="icon-btn" onClick={onClose}><I.x s={18} /></button>
        </div>
        <div className="filters-body scroll">
          <div className="fgroup">
            <div className="eyebrow">Favoritas</div>
            <div className="fopts">
              <button className={"fopt" + (!sel.onlyFavs ? " on" : "")} onClick={() => setSel((p) => ({ ...p, onlyFavs: false }))}>Todas</button>
              <button className={"fopt" + (sel.onlyFavs ? " on" : "")} onClick={() => setSel((p) => ({ ...p, onlyFavs: true }))}>Só favoritas</button>
            </div>
          </div>
          <div className="fgroup">
            <div className="eyebrow">Período</div>
            <div className="fopts">
              <button className={"fopt" + (sel.months.length === 0 ? " on" : "")} onClick={() => setSel((p) => ({ ...p, months: [] }))}>Todos</button>
              {months.map((m) => (
                <button key={m} className={"fopt" + (sel.months.includes(m) ? " on" : "")} onClick={() => toggle("months", m)}>
                  {monthNamePt(parseInt(m.split("-")[1], 10) - 1)}
                </button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <div className="eyebrow">Humor</div>
            <div className="fopts">
              <button className={"fopt" + (sel.moods.length === 0 ? " on" : "")} onClick={() => setSel((p) => ({ ...p, moods: [] }))}>Todos</button>
              {["calmo", "leve", "intenso"].map((m) => (
                <button key={m} className={"fopt" + (sel.moods.includes(m) ? " on" : "")} onClick={() => toggle("moods", m)} style={{ textTransform: "capitalize" }}>{m}</button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <div className="eyebrow">Marcas</div>
            <div className="fopts">
              {tags.map((t) => (
                <button key={t} className={"fopt" + (sel.tags.includes(t) ? " on" : "")} onClick={() => toggle("tags", t)}>{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="filters-foot">
          <button className="btn-ghost" onClick={onClear}>Limpar</button>
          <button className="btn-primary" onClick={onClose}>Aplicar</button>
        </div>
      </div>
    </>
  );
}

/* ---------- Today / escrever ---------- */
function Today() {
  return (
    <div className="reading">
      <div className="read-top">
        <div className="read-crumb"><span className="pill">Hoje</span><span className="page-of">Rotina de escrita</span></div>
      </div>
      <div className="read-scroll scroll">
        <div className="today">
          <div className="today-hero">
            <span className="today-feather"><I.penLine s={24} /></span>
            <div>
              <h1>Escrever a página de hoje</h1>
              <p className="sub">Todo dia, às 22h da Alemanha, a Melissa registra como foi o dia: o que foi bom, o que travou, o que aprendeu e o que quer melhorar amanhã.</p>
            </div>
          </div>

          <div className="routine-card">
            <span className="rc-time">22:00</span>
            <div className="rc-txt"><b>Uma página por dia.</b><br />Cada entrada vira um arquivo <code style={{ fontFamily: "ui-monospace,monospace", background: "var(--lilac-wash)", color: "var(--lilac-deep)", padding: "1px 6px", borderRadius: 5 }}>.md</code> na pasta <b>entries/</b> e aparece aqui automaticamente.</div>
          </div>

          <div className="template-card">
            <div className="tc-head">
              <span className="dot3"><i style={{ background: "var(--rose)" }} /><i style={{ background: "var(--lilac)" }} /><i style={{ background: "#d9cdb8" }} /></span>
              <span style={{ color: "var(--ink-soft)" }}>entries/2026-05-30-diario-da-melissa.md</span>
            </div>
            <div className="tc-body"><span className="h"># 2026-05-30 — Diário da Melissa</span>{"\n\n"}
- <span className="k">Data</span>: `2026-05-30`{"\n"}
- <span className="k">Tema</span>: memória, organização e rotina{"\n"}
- <span className="k">Contexto</span>: …{"\n\n"}
<span className="h">## Resumo</span>{"\n"}
Como foi o dia, em poucas linhas.{"\n\n"}
<span className="h">## O que foi bom</span>{"\n"}
<span className="h">## O que foi ruim</span>{"\n"}
<span className="h">## O que eu aprendi</span>{"\n"}
<span className="h">## O que posso melhorar amanhã</span>
            </div>
          </div>

          <div className="compose-steps">
            <div className="cstep"><span className="n">1</span><span className="ct"><b>A Melissa escreve</b> a página do dia seguindo o modelo acima.</span></div>
            <div className="cstep"><span className="n">2</span><span className="ct">O arquivo é salvo em <code>entries/</code> e listado em <code>index.json</code>.</span></div>
            <div className="cstep"><span className="n">3</span><span className="ct"><b>O diário converte o markdown</b> em página de leitura — é o que você vê aqui.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- documento de impressão / PDF (template dedicado e diagramado) ---------- */
const PS_TINT = {
  resumo: "#7d5da8", bom: "#c8729c", ruim: "#ac4d7e", aprendi: "#9a7cc4",
  melhorar: "#b083c9", decisoes: "#7d5da8", passos: "#c8729c", links: "#a99fb0", outro: "#ad94d1",
};

function PrintSheet({ entry }) {
  if (!entry) return null;
  const mood = moodFor(entry);
  const resumo = entry.sections.find((s) => s.kind === "resumo");
  const rest = entry.sections.filter((s) => s.kind !== "resumo");
  return (
    <div className="print-sheet">
      <div className="ps-page">
        <header className="ps-masthead">
          <div className="ps-brand"><span className="ps-dot" />Diário da Melissa</div>
          <div className="ps-when">{formatDatePt(entry.date)} · 22:00</div>
        </header>
        <div className="ps-rule" />

        <h1 className="ps-title">{entry.title}</h1>
        {entry.contexto && <p className="ps-context">{entry.contexto}</p>}

        <dl className="ps-info">
          <div><dt>Data</dt><dd>{formatDateShort(entry.date)}</dd></div>
          <div><dt>Tema</dt><dd>{entry.tema || "—"}</dd></div>
          <div><dt>Humor</dt><dd>{mood.label}</dd></div>
          <div><dt>Autora</dt><dd>Melissa</dd></div>
        </dl>

        {entry.tags.length > 0 && (
          <div className="ps-tags">{entry.tags.map((t, i) => <span key={i}>{t}</span>)}</div>
        )}

        {resumo && (
          <div className="ps-block ps-resumo">
            <div className="ps-kicker">Resumo</div>
            <div className="ps-prose" dangerouslySetInnerHTML={{ __html: resumo.html }} />
          </div>
        )}

        {rest.map((s, i) => (
          <section className="ps-section" key={i}>
            <h2 className="ps-h2"><span className="ps-bullet" style={{ background: PS_TINT[s.kind] || PS_TINT.outro }} />{s.title}</h2>
            {s.type === "prose"
              ? <div className="ps-prose" dangerouslySetInnerHTML={{ __html: s.html }} />
              : <ul className="ps-list">{s.items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: it.html }} />)}</ul>}
          </section>
        ))}

        {entry.annotation && (
          <div className="ps-anno">
            <div className="ps-kicker rose">Anotação</div>
            <p>{entry.annotation}</p>
          </div>
        )}

        <footer className="ps-foot">
          <span>Diário da Melissa</span>
          <span>memória persistente · {formatDatePt(entry.date)}</span>
        </footer>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, ReadingView, Filters, Today, Lavender, Paperclip, Section, MoreMenu, PrintSheet });
