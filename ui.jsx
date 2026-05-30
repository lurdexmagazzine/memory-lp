/* ui.jsx — ícones (SVG stroke) + componentes pequenos. Exporta para window. */

const Svg = ({ s = 18, sw = 1.7, children, ...p }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);

const I = {
  feather: (p) => <Svg {...p}><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="7.5"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>,
  filter: (p) => <Svg {...p}><line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2.4" fill="var(--paper)"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="15" cy="17" r="2.4" fill="var(--paper)"/></Svg>,
  bookmark: (p) => <Svg {...p}><path d="M6 4h12v16l-6-4-6 4z"/></Svg>,
  bookmarkFill: (p) => <Svg {...p} fill="currentColor"><path d="M6 4h12v16l-6-4-6 4z"/></Svg>,
  calendar: (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/></Svg>,
  tag: (p) => <Svg {...p}><path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-7.5 7.5z"/><circle cx="7.5" cy="7.5" r="1.3"/></Svg>,
  sparkle: (p) => <Svg {...p}><path d="M12 3l1.8 5.6L19.5 10l-5.7 1.4L12 17l-1.8-5.6L4.5 10l5.7-1.4z"/></Svg>,
  heart: (p) => <Svg {...p} fill="currentColor" stroke="none"><path d="M12 20s-7-4.4-7-9.3A3.8 3.8 0 0 1 12 7.6 3.8 3.8 0 0 1 19 10.7C19 15.6 12 20 12 20z"/></Svg>,
  heartLine: (p) => <Svg {...p}><path d="M12 20s-7-4.4-7-9.3A3.8 3.8 0 0 1 12 7.6 3.8 3.8 0 0 1 19 10.7C19 15.6 12 20 12 20z"/></Svg>,
  chevL: (p) => <Svg {...p}><polyline points="15 18 9 12 15 6"/></Svg>,
  chevR: (p) => <Svg {...p}><polyline points="9 18 15 12 9 6"/></Svg>,
  more: (p) => <Svg {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></Svg>,
  x: (p) => <Svg {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></Svg>,
  arrowL: (p) => <Svg {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 18 5 12 11 6"/></Svg>,
  arrowR: (p) => <Svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></Svg>,
  book: (p) => <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><line x1="4" y1="5.5" x2="4" y2="20.5"/></Svg>,
  penLine: (p) => <Svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5"/><polyline points="12 7.5 12 12 15 13.5"/></Svg>,
  lightbulb: (p) => <Svg {...p}><path d="M9 18h6"/><path d="M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-.7.9-1.3 1.6-1.5 3h-5c-.2-1.4-.8-2.1-1.5-3z"/></Svg>,
  trendUp: (p) => <Svg {...p}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></Svg>,
  flag: (p) => <Svg {...p}><path d="M5 21V4"/><path d="M5 4h12l-2 3.5L17 11H5"/></Svg>,
  cloud: (p) => <Svg {...p}><path d="M7 16a4 4 0 0 1 .5-7.97A5 5 0 0 1 17 9a3.5 3.5 0 0 1 .2 7H7z"/><line x1="9" y1="20" x2="8.5" y2="21.5"/><line x1="13" y1="20" x2="12.5" y2="21.5"/></Svg>,
  link: (p) => <Svg {...p}><path d="M10 13a4 4 0 0 0 5.7.4l3-3a4 4 0 0 0-5.7-5.7L11.3 6"/><path d="M14 11a4 4 0 0 0-5.7-.4l-3 3a4 4 0 0 0 5.7 5.7L12.7 18"/></Svg>,
  dot: (p) => <Svg {...p}><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></Svg>,
  home: (p) => <Svg {...p}><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></Svg>,
  check: (p) => <Svg {...p}><polyline points="5 12.5 10 17.5 19 7"/></Svg>,
  printer: (p) => <Svg {...p}><polyline points="6 9 6 3 18 3 18 9"/><path d="M6 18H4.5A1.5 1.5 0 0 1 3 16.5V11A1.5 1.5 0 0 1 4.5 9.5h15A1.5 1.5 0 0 1 21 11v5.5a1.5 1.5 0 0 1-1.5 1.5H18"/><rect x="6.5" y="14" width="11" height="7" rx="1.2"/></Svg>,
  star: (p) => <Svg {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/></Svg>,
};

const SECTION_ICON = {
  resumo: I.book, bom: I.sparkle, ruim: I.cloud, aprendi: I.lightbulb,
  melhorar: I.trendUp, decisoes: I.flag, passos: I.arrowR, links: I.link, outro: I.dot,
};

/* mood derivado do conteúdo da entrada (sem inventar dado: lê palavras-chave) */
function moodFor(entry) {
  const t = (entry.tema + " " + (entry.excerpt || "")).toLowerCase();
  if (/intens|irrit|bronca|peso|velocidade|rápid/.test(t)) return { k: "intenso", label: "Intenso" };
  if (/primeiro|começ|leve|ansios/.test(t)) return { k: "leve", label: "Leve" };
  return { k: "calmo", label: "Calmo" };
}

function Chip({ children, variant }) {
  return <span className={"chip" + (variant ? " " + variant : "")}>{children}</span>;
}

function EntryCard({ entry, active, onClick, fav, onToggleFav }) {
  const tags = entry.tags.slice(0, 2);
  const extra = entry.tags.length - tags.length;
  const mood = moodFor(entry);
  return (
    <article className={"entry-card" + (active ? " active" : "")} onClick={onClick}>
      <span className="tl-node" />
      <div className="ec-top">
        <div className="ec-meta">
          <span>{window.DiarioMD.formatDateShort(entry.date)}</span>
          <span className="sep">·</span>
          <span className="ec-author">Melissa</span>
        </div>
        <span className={"badge-mood " + mood.k}>{mood.label}</span>
      </div>
      <h3 className="ec-title">{entry.title}</h3>
      <p className="ec-excerpt">{entry.excerpt}</p>
      <div className="ec-tags">
        {tags.map((t, i) => <Chip key={i} variant={i === 1 ? "rose" : ""}>{t}</Chip>)}
        {extra > 0 && <Chip variant="more">+{extra}</Chip>}
        <button className={"ec-bookmark" + (fav ? " on" : "")} title={fav ? "Remover dos favoritos" : "Favoritar"}
          onClick={(e) => { e.stopPropagation(); onToggleFav && onToggleFav(); }}>
          {fav ? <I.bookmarkFill s={16} /> : <I.bookmark s={16} />}
        </button>
      </div>
    </article>
  );
}

Object.assign(window, { I, Svg, SECTION_ICON, moodFor, Chip, EntryCard });
