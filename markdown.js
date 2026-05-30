/* markdown.js — parser focado no formato de diário da Melissa.
   Expõe window.parseEntry, window.mdInline e helpers. Sem dependências. */
(function () {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Inline markdown -> html: **bold**, *italic*, `code`, em-dash já vem pronto.
  function mdInline(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    return s;
  }

  function stripInline(text) {
    return String(text).replace(/[`*]/g, "").trim();
  }

  // classifica a seção por título para escolher um ícone/cor
  function classifySection(title) {
    const t = title.toLowerCase();
    if (t.includes("resumo")) return "resumo";
    if (t.includes("bom")) return "bom";
    if (t.includes("ruim")) return "ruim";
    if (t.includes("aprend")) return "aprendi";
    if (t.includes("melhorar")) return "melhorar";
    if (t.includes("decis")) return "decisoes";
    if (t.includes("próximos") || t.includes("proximos") || t.includes("passos"))
      return "passos";
    if (t.includes("links") || t.includes("relacionad")) return "links";
    return "outro";
  }

  function monthNamePt(m) {
    return [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
    ][m];
  }

  function formatDatePt(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    const d = parseInt(m[3], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = m[1];
    return d + " de " + monthNamePt(mo) + " de " + y;
  }
  function formatDateShort(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    return parseInt(m[3], 10) + " de " + monthNamePt(parseInt(m[2], 10) - 1);
  }

  function parseEntry(raw, filename) {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const entry = {
      filename: filename || "",
      rawTitle: "",
      date: "",
      title: "",
      tema: "",
      contexto: "",
      tags: [],
      meta: [],
      sections: [],
      resumoHtml: "",
      excerpt: "",
      annotation: "",
    };

    let i = 0;
    // título principal
    while (i < lines.length && !/^#\s+/.test(lines[i])) i++;
    if (i < lines.length) {
      entry.rawTitle = lines[i].replace(/^#\s+/, "").trim();
      i++;
    }
    // separa data — título  (em-dash ou hífen com espaços)
    const parts = entry.rawTitle.split(/\s+[—–-]\s+/);
    if (parts.length >= 2) {
      entry.date = parts[0].trim();
      entry.title = parts.slice(1).join(" — ").trim();
    } else {
      entry.title = entry.rawTitle;
    }

    // meta bullets até o primeiro ##
    while (i < lines.length && !/^##\s+/.test(lines[i])) {
      const line = lines[i].trim();
      const mm = /^[-*]\s+([^:]+):\s*(.+)$/.exec(line);
      if (mm) {
        const key = mm[1].trim();
        const val = stripInline(mm[2]);
        entry.meta.push({ key: key, value: val });
        const kl = key.toLowerCase();
        if (kl === "data") entry.date = entry.date || val;
        else if (kl === "tema") entry.tema = val;
        else if (kl === "contexto") entry.contexto = val;
      }
      i++;
    }

    // tags a partir do tema
    if (entry.tema) {
      entry.tags = entry.tema
        .split(/,| e /i)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && t.length < 40);
    }

    // seções
    let cur = null;
    function pushCur() {
      if (cur) {
        finalizeSection(cur);
        entry.sections.push(cur);
      }
    }
    for (; i < lines.length; i++) {
      const line = lines[i];
      const hm = /^##\s+(.+)$/.exec(line);
      if (hm) {
        pushCur();
        cur = { title: hm[1].trim(), kind: classifySection(hm[1]), buffer: [] };
        continue;
      }
      if (cur) cur.buffer.push(line);
    }
    pushCur();

    function finalizeSection(sec) {
      const buf = sec.buffer;
      const isList = buf.some((l) => /^[-*]\s+/.test(l.trim()));
      if (isList) {
        sec.type = "list";
        sec.items = buf
          .filter((l) => /^[-*]\s+/.test(l.trim()))
          .map((l) => l.trim().replace(/^[-*]\s+/, ""))
          .map((l) => ({ html: mdInline(l), text: stripInline(l) }));
      } else {
        sec.type = "prose";
        const paras = [];
        let acc = [];
        buf.forEach((l) => {
          if (l.trim() === "") {
            if (acc.length) {
              paras.push(acc.join(" ").trim());
              acc = [];
            }
          } else acc.push(l.trim());
        });
        if (acc.length) paras.push(acc.join(" ").trim());
        sec.paragraphs = paras;
        sec.html = paras.map((p) => "<p>" + mdInline(p) + "</p>").join("");
        sec.plain = paras.join(" ");
      }
      delete sec.buffer;
    }

    const resumo = entry.sections.find((s) => s.kind === "resumo");
    if (resumo) {
      entry.resumoHtml = resumo.html;
      const plain = resumo.plain || "";
      entry.excerpt = plain.length > 150 ? plain.slice(0, 150).trim() + "…" : plain;
    } else if (entry.sections[0] && entry.sections[0].type === "prose") {
      entry.excerpt = (entry.sections[0].plain || "").slice(0, 150);
    }

    const aprendi = entry.sections.find((s) => s.kind === "aprendi");
    if (aprendi && aprendi.items && aprendi.items[0]) {
      entry.annotation = aprendi.items[0].text;
    } else if (entry.excerpt) {
      entry.annotation = entry.excerpt;
    }

    return entry;
  }

  window.DiarioMD = {
    parseEntry: parseEntry,
    mdInline: mdInline,
    formatDatePt: formatDatePt,
    formatDateShort: formatDateShort,
    monthNamePt: monthNamePt,
  };
})();
