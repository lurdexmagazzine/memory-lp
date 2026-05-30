/* app.jsx — estado, carregamento dos .md, filtros, mobile e Tweaks */
const { useState, useEffect, useMemo, useRef } = React;

/* ---------- presets de Tweaks ---------- */
const PALETTES = {
  "Lilás & rosa": { "--lilac-deep": "#7d5da8", "--lilac": "#ad94d1", "--lilac-soft": "#ddd0ee", "--lilac-wash": "#f1eafa", "--rose-deep": "#c8729c", "--rose": "#e7abc9", "--rose-soft": "#f6dde9", "--rose-wash": "#fcf0f5", "--magenta": "#ac4d7e", "--app-bg": "#ece4f0", "--app-bg-2": "#e7e7f0" },
  "Rosa & magenta": { "--lilac-deep": "#c0568f", "--lilac": "#e29bbf", "--lilac-soft": "#f3d4e3", "--lilac-wash": "#fceef4", "--rose-deep": "#b6457f", "--rose": "#eaa6c8", "--rose-soft": "#f8dbe8", "--rose-wash": "#fdf0f5", "--magenta": "#a23a78", "--app-bg": "#f1e3ec", "--app-bg-2": "#ece0ec" },
  "Roxo aubergine": { "--lilac-deep": "#6a4d8c", "--lilac": "#9a83bf", "--lilac-soft": "#d6cae8", "--lilac-wash": "#ece4f6", "--rose-deep": "#a96b95", "--rose": "#cfa6c4", "--rose-soft": "#eddbe8", "--rose-wash": "#f7eef4", "--magenta": "#894f74", "--app-bg": "#e7e1ee", "--app-bg-2": "#e4e0ec" },
  "Creme neutro": { "--lilac-deep": "#8a7aa0", "--lilac": "#b3a6c4", "--lilac-soft": "#ddd5e6", "--lilac-wash": "#f1edf5", "--rose-deep": "#bb8aa0", "--rose": "#dcc0cd", "--rose-soft": "#efe2e9", "--rose-wash": "#f8f1f4", "--magenta": "#9a7088", "--app-bg": "#ece7ea", "--app-bg-2": "#eae6e6" },
};
const TITLE_FONTS = {
  "Dancing": '"Dancing Script", cursive',
  "Parisienne": '"Parisienne", cursive',
  "Sacramento": '"Sacramento", cursive',
  "Great Vibes": '"Great Vibes", cursive',
  "Allura": '"Allura", cursive',
  "Tangerine": '"Tangerine", cursive',
  "Pinyon": '"Pinyon Script", cursive',
  "Caveat": '"Caveat", cursive',
  "DM Serif": '"DM Serif Display", Georgia, serif',
  "Cormorant": '"Cormorant Garamond", Georgia, serif',
};
const READ_FONTS = { Cormorant: '"Cormorant Garamond", Georgia, serif', Spectral: '"Spectral", Georgia, serif', Lora: '"Lora", Georgia, serif', Newsreader: '"Newsreader", Georgia, serif', Crimson: '"Crimson Pro", Georgia, serif' };
const DENSITY = {
  "Compacto": { card: 12, gap: 7, read: 42, sec: 21, lede: 16.5 },
  "Regular": { card: 15, gap: 11, read: 56, sec: 30, lede: 18.5 },
  "Espaçoso": { card: 20, gap: 17, read: 78, sec: 44, lede: 20.5 },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "Lilás & rosa",
  "titleFont": "Parisienne",
  "readFont": "Cormorant",
  "sidebarDensity": "Compacto",
  "pageDensity": "Espaçoso",
  "decorations": true
}/*EDITMODE-END*/;

/* ---------- carregamento dos .md ---------- */
function useEntries() {
  const [state, setState] = useState({ loading: true, error: null, entries: [] });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const idx = await fetch("entries/index.json").then((r) => {
          if (!r.ok) throw new Error("index.json não encontrado");
          return r.json();
        });
        const files = idx.entries || [];
        const raws = await Promise.all(
          files.map((f) =>
            fetch("entries/" + f).then((r) => (r.ok ? r.text() : null)).then((t) => ({ f, t })).catch(() => ({ f, t: null }))
          )
        );
        const parsed = raws
          .filter((x) => x.t)
          .map((x) => window.DiarioMD.parseEntry(x.t, x.f))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        if (alive) setState({ loading: false, error: null, entries: parsed });
      } catch (e) {
        if (alive) setState({ loading: false, error: e.message || String(e), entries: [] });
      }
    })();
    return () => { alive = false; };
  }, []);
  return state;
}

function applyFilters(entries, query, sel, favs) {
  let r = entries;
  const q = query.trim().toLowerCase();
  if (q) {
    r = r.filter((e) => {
      const body = e.sections.map((s) => s.plain || (s.items ? s.items.map((i) => i.text).join(" ") : "")).join(" ");
      return (e.title + " " + e.tema + " " + e.excerpt + " " + e.tags.join(" ") + " " + body).toLowerCase().includes(q);
    });
  }
  if (sel.onlyFavs && favs) r = r.filter((e) => favs.has(e.filename));
  if (sel.months.length) r = r.filter((e) => sel.months.includes(e.date.slice(0, 7)));
  if (sel.moods.length) r = r.filter((e) => sel.moods.includes(window.moodFor(e).k));
  if (sel.tags.length) r = r.filter((e) => e.tags.some((t) => sel.tags.includes(t)));
  return r;
}

/* ---------- App ---------- */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { loading, error, entries } = useEntries();

  const [query, setQuery] = useState("");
  const [view, setView] = useState("read"); // read | today
  const [selKey, setSelKey] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sel, setSel] = useState({ months: [], moods: [], tags: [], onlyFavs: false });
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("diario.favs") || "[]")); } catch (e) { return new Set(); }
  });
  const toggleFav = (filename) => {
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(filename) ? next.delete(filename) : next.add(filename);
      try { localStorage.setItem("diario.favs", JSON.stringify([...next])); } catch (e) {}
      return next;
    });
  };
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 980px)").matches);
  const [mScreen, setMScreen] = useState("list"); // list | read | today
  const searchRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const fn = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const filtered = useMemo(() => applyFilters(entries, query, sel, favs), [entries, query, sel, favs]);
  const months = useMemo(() => [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse(), [entries]);
  const allTags = useMemo(() => [...new Set(entries.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b, "pt")), [entries]);

  // seleção padrão
  useEffect(() => {
    if (!selKey && filtered.length) setSelKey(filtered[0].filename);
  }, [filtered, selKey]);

  const selected = useMemo(() => entries.find((e) => e.filename === selKey) || null, [entries, selKey]);
  const navList = filtered.length ? filtered : entries;
  const index = navList.findIndex((e) => e.filename === selKey);
  const total = navList.length;

  const selectEntry = (e) => { setSelKey(e.filename); setView("read"); setMScreen("read"); };
  const goPrev = () => { if (index > 0) setSelKey(navList[index - 1].filename); };
  const goNext = () => { if (index < total - 1) setSelKey(navList[index + 1].filename); };
  const filterCount = sel.months.length + sel.moods.length + sel.tags.length + (sel.onlyFavs ? 1 : 0);

  const handlePrint = () => {
    const f = selected ? selected.filename : "";
    const url = encodeURI("Diário da Melissa-print.html") + (f ? "?entry=" + encodeURIComponent(f) : "");
    window.open(url, "_blank");
  };
  const handleCopy = () => {
    if (!selected) return;
    const parts = [selected.title, ""];
    if (selected.contexto) parts.push(selected.contexto, "");
    selected.sections.forEach((s) => {
      parts.push(s.title);
      if (s.type === "prose") parts.push((s.paragraphs || []).join("\n\n"));
      else (s.items || []).forEach((it) => parts.push("\u2022 " + it.text));
      parts.push("");
    });
    try { navigator.clipboard && navigator.clipboard.writeText(parts.join("\n")); } catch (e) {}
  };

  // aplica tweaks como CSS vars no root
  const pal = PALETTES[t.palette] || PALETTES["Lilás & rosa"];
  const ds = DENSITY[t.sidebarDensity] || DENSITY.Compacto;
  const dp = DENSITY[t.pageDensity] || DENSITY["Espaçoso"];
  const rootStyle = {
    ...pal,
    "--font-title": TITLE_FONTS[t.titleFont] || TITLE_FONTS.Cormorant,
    "--font-read": READ_FONTS[t.readFont] || READ_FONTS.Spectral,
    "--accent": pal["--lilac-deep"],
    "--card-pad": ds.card + "px",
    "--list-gap": ds.gap + "px",
    "--read-pad": (isMobile ? 26 : dp.read) + "px",
    "--sec-gap": dp.sec + "px",
    "--lede-size": dp.lede + "px",
    "--bookmark-mask": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 4h12v16l-6-4-6 4z'/%3E%3C/svg%3E\")",
  };

  if (loading) {
    return <div className="app" style={rootStyle}><div className="empty" style={{ margin: "auto" }}><div className="e-title">Abrindo o diário…</div></div></div>;
  }
  if (error) {
    return (
      <div className="app" style={rootStyle}>
        <div className="empty" style={{ margin: "auto", maxWidth: 420 }}>
          <div className="e-title">Não consegui ler as páginas</div>
          <div style={{ marginBottom: 10 }}>{error}</div>
          <div style={{ fontSize: 12 }}>Sirva os arquivos por http (não <code>file://</code>) e confira <code>entries/index.json</code>.</div>
        </div>
      </div>
    );
  }

  const readPane = view === "today"
    ? <Today />
    : <ReadingView entry={selected} index={index} total={total} onPrev={goPrev} onNext={goNext} isMobile={isMobile}
        fav={selected && favs.has(selected.filename)} onToggleFav={() => selected && toggleFav(selected.filename)}
        onPrint={handlePrint} onCopy={handleCopy} />;

  return (
    <React.Fragment>
    <div className="app" data-deco={t.decorations ? "full" : "min"} style={rootStyle}>
      {!isMobile && (
        <>
          <Sidebar entries={filtered} all={entries} selected={selected} onSelect={selectEntry}
            view={view} setView={setView} query={query} setQuery={setQuery}
            openFilters={() => setFiltersOpen(true)} filterCount={filterCount}
            favs={favs} onToggleFav={toggleFav} />
          <main className="stage"><div className="page-wrap">{readPane}</div></main>
        </>
      )}

      {isMobile && (
        <>
          <MobileTop screen={mScreen} setScreen={setMScreen} view={view}
            entry={selected} onSearch={() => { setMScreen("list"); setTimeout(() => searchRef.current && searchRef.current.focus(), 50); }}
            openFilters={() => setFiltersOpen(true)} filterCount={filterCount}
            fav={selected && favs.has(selected.filename)} onToggleFav={() => selected && toggleFav(selected.filename)}
            onPrint={handlePrint} onCopy={handleCopy} />
          <div className="m-view scroll">
            {mScreen === "list" && (
              <MobileList entries={filtered} all={entries} selected={selected} onSelect={selectEntry}
                query={query} setQuery={setQuery} searchRef={searchRef} favs={favs} onToggleFav={toggleFav} />
            )}
            {mScreen === "read" && <div className="stage"><div className="page-wrap">
              <ReadingView entry={selected} index={index} total={total} onPrev={goPrev} onNext={goNext} isMobile={true}
                fav={selected && favs.has(selected.filename)} onToggleFav={() => selected && toggleFav(selected.filename)}
                onPrint={handlePrint} onCopy={handleCopy} />
            </div></div>}
            {mScreen === "today" && <div className="stage"><div className="page-wrap"><Today /></div></div>}
          </div>
          <nav className="m-bottomnav">
            <button className={"m-nav-btn" + (mScreen === "list" ? " on" : "")} onClick={() => setMScreen("list")}><I.book s={21} />Diário</button>
            <button className={"m-nav-btn" + (mScreen === "read" ? " on" : "")} onClick={() => { setView("read"); setMScreen("read"); }}><I.bookmark s={21} />Leitura</button>
            <button className={"m-nav-btn" + (mScreen === "today" ? " on" : "")} onClick={() => { setView("today"); setMScreen("today"); }}><I.penLine s={21} />Hoje</button>
            <button className={"m-nav-btn" + (filterCount ? " on" : "")} onClick={() => setFiltersOpen(true)}><I.filter s={21} />Filtros</button>
          </nav>
        </>
      )}

      {filtersOpen && (
        <Filters months={months} tags={allTags} sel={sel} setSel={setSel}
          onClose={() => setFiltersOpen(false)} onClear={() => setSel({ months: [], moods: [], tags: [], onlyFavs: false })} />
      )}

      <TweaksPanel>
        <TweakSection label="Paleta" />
        <TweakSelect label="Cores" value={t.palette} options={Object.keys(PALETTES)} onChange={(v) => setTweak("palette", v)} />
        <TweakToggle label="Enfeites de caderno" value={t.decorations} onChange={(v) => setTweak("decorations", v)} />
        <TweakSection label="Tipografia" />
        <TweakSelect label="Títulos" value={t.titleFont} options={Object.keys(TITLE_FONTS)} onChange={(v) => setTweak("titleFont", v)} />
        <TweakSelect label="Leitura" value={t.readFont} options={Object.keys(READ_FONTS)} onChange={(v) => setTweak("readFont", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Barra lateral" value={t.sidebarDensity} options={Object.keys(DENSITY)} onChange={(v) => setTweak("sidebarDensity", v)} />
        <TweakRadio label="Página" value={t.pageDensity} options={Object.keys(DENSITY)} onChange={(v) => setTweak("pageDensity", v)} />
      </TweaksPanel>
    </div>
    <PrintSheet entry={view === "today" ? null : selected} />
    </React.Fragment>
  );
}

/* ---------- mobile pieces ---------- */
function MobileTop({ screen, setScreen, view, entry, onSearch, openFilters, filterCount, fav, onToggleFav, onPrint, onCopy }) {
  if (screen === "read") {
    return (
      <div className="m-topbar">
        <button className="icon-btn" onClick={() => setScreen("list")}><I.arrowL s={20} /></button>
        <div><div className="m-eyebrow eyebrow">Leitura</div><div style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>{entry ? window.DiarioMD.formatDateShort(entry.date) : ""}</div></div>
        <span className="spacer" />
        <button className={"icon-btn" + (fav ? " active" : "")} onClick={onToggleFav}>{fav ? <I.bookmarkFill s={19} /> : <I.bookmark s={19} />}</button>
        <MoreMenu fav={fav} onToggleFav={onToggleFav} onPrint={onPrint} onCopy={onCopy} />
      </div>
    );
  }
  if (screen === "today") {
    return (
      <div className="m-topbar">
        <button className="icon-btn" onClick={() => setScreen("list")}><I.arrowL s={20} /></button>
        <div className="m-title">Hoje</div>
      </div>
    );
  }
  return (
    <div className="m-topbar">
      <div><div className="m-eyebrow eyebrow">Diário</div><div className="m-title">Melissa</div></div>
      <span className="spacer" />
      <button className="icon-btn" onClick={onSearch}><I.search s={19} /></button>
      <button className={"icon-btn" + (filterCount ? " active" : "")} onClick={openFilters}><I.filter s={19} /></button>
    </div>
  );
}

function MobileList({ entries, all, selected, onSelect, query, setQuery, searchRef, favs, onToggleFav }) {
  return (
    <div>
      <div style={{ padding: "12px 14px 4px" }}>
        <label className="search">
          <I.search s={17} />
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar páginas, temas, marcas…" />
        </label>
      </div>
      <div className="chapter">
        <span className="chapter-name">Maio de 2026</span>
        <span className="chapter-count">{entries.length} {entries.length === 1 ? "página" : "páginas"}</span>
      </div>
      <div className="timeline">
        <div className="tl-rail" />
        {entries.length === 0
          ? <div className="empty"><div className="e-title">Nada por aqui</div><div>Nenhuma página corresponde à busca.</div></div>
          : entries.map((e) => <EntryCard key={e.filename} entry={e} active={selected && selected.filename === e.filename} fav={favs && favs.has(e.filename)} onToggleFav={() => onToggleFav(e.filename)} onClick={() => onSelect(e)} />)}
      </div>
    </div>
  );
}

Object.assign(window, { MobileTop, MobileList });

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
