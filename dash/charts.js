/* Chart helpers for the dashboard catalog: window.C (helpers and colours) and window.DASH (renderer registry).
   Plain SVG and HTML, no libraries. Every helper returns a new element, sizes itself to its container's width
   and carries hover tooltips. Rules follow the dataviz skill: one y-scale per chart, a legend for two or more
   series, colour follows the entity, status colours only for state, text never in a series colour. */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const FONT = '"Public Sans", "Segoe UI", system-ui, sans-serif';

  /* ---------- colours (validated with the dataviz skill's validate_palette.js, light mode) ---------- */
  const SEQ = ['#eef6f0', '#d3e9da', '#b0d6bd', '#87bf9c', '#5ea67b', '#3a8b5d', '#1f7044', '#0f5230'];
  const CAT = ['#257de0', '#f47230', '#00b894', '#f2a600', '#ee7fac', '#008a17', '#6a4ce2', '#ec4647'];
  const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgb2hex = (a) => '#' + a.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = (h) => { const [r, g, b] = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const inkOn = (bg) => (lum(bg) > 0.33 ? '#14211a' : '#ffffff');
  function seqAt(t) { t = Math.max(0, Math.min(1, t || 0)) * (SEQ.length - 1); const i = Math.min(SEQ.length - 2, Math.floor(t)); return mix(SEQ[i], SEQ[i + 1], t - i); }
  const DIV = { low: '#2370cd', mid: '#efefef', high: '#c8382f' };
  function divAt(t) { t = Math.max(-1, Math.min(1, t || 0)); return t < 0 ? mix(DIV.mid, DIV.low, -t) : mix(DIV.mid, DIV.high, t); }
  const colors = {
    holder: { Urban: '#1a6b3c', QC: '#5457c8', Customer: '#c4541f', Field: '#008c99', Billing: '#8a6d0b', None: '#9aa39e' },
    type: { NMP: '#257de0', AMB: '#c2408a', SIG: '#7a8a12', NIA: '#7b5cd6', CR: '#a0522d', CM: '#2ea37a' },
    kind: { Queue: '#c99700', Work: '#1a6b3c', Review: '#5457c8', Customer: '#c4541f', Field: '#008c99' },
    stage: { P: '#84b9f3', F: '#519ced', M: '#257de0', L: '#1b64be', R: '#0f4a96', Prelim: '#84b9f3', Field: '#519ced', Model: '#257de0', 'Prelim results': '#1b64be', Report: '#0f4a96' },
    industry: { 'Oil & gas': CAT[0], 'Compressor station': CAT[1], 'Data center': CAT[2], Power: CAT[3], Mining: CAT[4] },
    split: { WO: CAT[0], 'Out of scope': CAT[1], General: CAT[2], 'Time off': CAT[3] },
    loop: { Locations: CAT[0], Data: CAT[1], Model: CAT[2], Prelim: CAT[3], Report: CAT[4] },
    cat: CAT.slice(),
    one: '#4b6a88', focus: '#1a6b3c', other: '#c3cbc6',
    status: { good: '#2e8540', warn: '#d98e04', bad: '#b3261e' },
    ink: '#14211a', mute: '#5f6b65', grid: '#e7ebe8', axis: '#c4ccc7', surface: '#ffffff',
    seq: (n) => Array.from({ length: n }, (_, i) => seqAt(n === 1 ? 0.75 : 0.15 + (0.85 * i) / (n - 1))),
    seqAt, div: DIV, divAt, inkOn, mix,
    pick: (keys) => { const o = {}; keys.forEach((k, i) => (o[k] = i < CAT.length ? CAT[i] : '#9aa39e')); return o; },
  };
  const OTHER = '#9aa39e';

  /* ---------- DOM and text ---------- */
  function h(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function s(tag, attrs) { const n = document.createElementNS(SVGNS, tag); if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]); return n; }
  function stext(x, y, str, attrs) { const t = s('text', Object.assign({ x, y }, attrs)); t.textContent = str; return t; }
  const add = (p, ...kids) => { kids.forEach((k) => k != null && p.appendChild(typeof k === 'string' ? document.createTextNode(k) : k)); return p; };
  let ctx2d = null;
  function tw(str, size, weight) { if (!ctx2d) ctx2d = document.createElement('canvas').getContext('2d'); ctx2d.font = `${weight || 400} ${size || 12}px ${FONT}`; return ctx2d.measureText(String(str)).width; }
  function clip(str, max, size, weight) { str = String(str == null ? '' : str); if (tw(str, size, weight) <= max) return str; while (str.length > 1 && tw(str + '…', size, weight) > max) str = str.slice(0, -1); return str + '…'; }
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (d) => (d instanceof Date ? `${MON[d.getMonth()]} ${d.getDate()}` + (d.getFullYear() !== 2026 ? ', ' + d.getFullYear() : '') : '');
  function fmtNum(v, dec) { if (v == null || isNaN(v)) return ''; if (dec == null) dec = Number.isInteger(+v) || Math.abs(v) >= 100 ? 0 : 1; return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function makeFmt(o) { if (o.fmt) return (v) => (v == null ? '' : o.fmt(v)); if (o.pct) return (v) => (v == null ? '' : fmtNum(v * 100, o.dec == null ? 0 : o.dec) + '%'); return (v) => (v == null ? '' : fmtNum(v, o.dec) + (o.unit || '')); }
  function tickFmt(o, step) { if (o.pct) return (v) => fmtNum(v * 100, step * 100 < 1 ? 1 : 0) + '%'; return (v) => (Math.abs(v) >= 10000 ? fmtNum(v / 1000, 0) + 'K' : fmtNum(v, step < 1 ? (step < 0.1 ? 2 : 1) : 0)); }
  /* int: the data are whole numbers (counts), so ticks never fall between them */
  const allInt = (a) => a.every((v) => v == null || isNaN(v) || Number.isInteger(+v));
  function nice(lo, hi, n, int) {
    if (hi === lo) { hi = lo + 1; }
    const raw = (hi - lo) / (n || 4), mag = Math.pow(10, Math.floor(Math.log10(raw))), e = raw / mag;
    let step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * mag;
    if (int && step < 1) step = 1;
    const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, ticks = [];
    for (let v = a; v <= b + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { lo: a, hi: b, step, ticks };
  }
  const colorOf = (d, o, i) => d.grey ? colors.other : d.color || (d.holder && colors.holder[d.holder]) || (d.type && colors.type[d.type]) || (o && o.color) || colors.one;
  function seriesColor(se, i) { return se.color || (se.holder && colors.holder[se.holder]) || (se.type && colors.type[se.type]) || colors.holder[se.name] || colors.type[se.name] || (i < CAT.length ? CAT[i] : OTHER); }

  /* rounded data end, square baseline. end: 'r' | 'l' | 't' | 'b' (which side is the data end). */
  function barPath(x, y, w, hgt, end, rad) {
    if (w <= 0 || hgt <= 0) return '';
    const r = Math.max(0, Math.min(rad == null ? 4 : rad, w / 2, hgt / 2));
    if (!r || !end) return `M${x},${y}h${w}v${hgt}h${-w}Z`;
    if (end === 'r') return `M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${hgt - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}Z`;
    if (end === 'l') return `M${x + w},${y}v${hgt}h${-(w - r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(hgt - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
    if (end === 't') return `M${x},${y + hgt}v${-(hgt - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${hgt - r}Z`;
    return `M${x},${y}h${w}v${hgt - r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}Z`;
  }

  /* ---------- tooltip (one shared element, created on first use) ---------- */
  let tipEl = null;
  function tipShow(ev, c) {
    if (!c) return;
    if (!tipEl) { tipEl = h('div', 'c-tip'); tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    tipEl.replaceChildren();
    if (c.title) tipEl.appendChild(h('div', 'c-tip-t', c.title));
    (c.rows || []).forEach((r) => {
      const row = h('div', 'c-tip-r' + (r.strong ? ' on' : ''));
      if (r.color) { const k = h('i', 'c-key' + (r.shape === 'rect' ? ' rect' : '')); k.style.background = r.color; row.appendChild(k); } else row.appendChild(h('i', 'c-key none'));
      row.appendChild(h('b', null, r.value == null ? '' : String(r.value)));
      if (r.label) row.appendChild(h('span', null, r.label));
      tipEl.appendChild(row);
    });
    if (c.note) tipEl.appendChild(h('div', 'c-tip-n', c.note));
    tipEl.style.display = 'block';
    const W = window.innerWidth, H = window.innerHeight, bw = tipEl.offsetWidth, bh = tipEl.offsetHeight;
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + bw > W - 8) x = ev.clientX - bw - 14; if (y + bh > H - 8) y = ev.clientY - bh - 14;
    tipEl.style.left = Math.max(4, x) + 'px'; tipEl.style.top = Math.max(4, y) + 'px';
  }
  function tipHide() { if (tipEl) tipEl.style.display = 'none'; }
  function hover(node, fn) { node.addEventListener('pointermove', (e) => tipShow(e, fn(e))); node.addEventListener('pointerleave', tipHide); node.classList && node.classList.add('c-hit'); return node; }

  /* ---------- responsive wrapper: draw(root, width) runs now at a nominal width, then again at the real width ---------- */
  function chart(cls, draw, o) {
    const root = h('div', 'c-chart ' + (cls || ''));
    let W = 0;
    const render = (w) => { W = w; root.replaceChildren(); draw(root, w); };
    render(Math.max(240, (o && o.width) || 520));
    if (!(o && o.width) && typeof ResizeObserver !== 'undefined') {
      let raf = 0;
      new ResizeObserver((es) => { const w = Math.floor(es[0].contentRect.width); if (w > 40 && Math.abs(w - W) > 6) { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => render(w)); } }).observe(root);
    }
    return root;
  }
  const emptyNode = (msg) => h('p', 'c-empty', msg || 'Nothing to show');
  function svgRoot(W, H) { const v = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'c-svg', role: 'img' }); return v; }

  /* ---------- legend ---------- */
  function legend(items, o) {
    o = o || {};
    const box = h('div', 'c-legend' + (o.align === 'right' ? ' right' : ''));
    (items || []).forEach((it) => {
      if (!it) return;
      const li = h('span', 'c-leg');
      const sw = h('i', 'c-sw ' + (it.shape || o.shape || 'rect'));
      if (it.shape === 'hatch') sw.style.backgroundImage = `repeating-linear-gradient(135deg, ${it.color || colors.mute} 0 2px, transparent 2px 5px)`;
      else if (it.shape === 'tick' || it.shape === 'target') sw.style.borderColor = it.color || colors.ink;
      else if (it.shape === 'ring') sw.style.borderColor = it.color || colors.mute;
      else sw.style.background = it.color || colors.one;
      li.appendChild(sw); li.appendChild(h('span', null, it.label)); box.appendChild(li);
    });
    return box;
  }
  const seriesLegend = (series, shape) => legend(series.map((se, i) => ({ label: se.name, color: seriesColor(se, i), shape })));

  /* ---------- axis helpers ---------- */
  function yAxis(g, scale, x0, x1, y, f) {
    scale.ticks.forEach((t) => {
      const yy = Math.round(y(t)) + 0.5;
      g.appendChild(s('line', { x1: x0, x2: x1, y1: yy, y2: yy, stroke: t === 0 ? colors.axis : colors.grid, 'stroke-width': 1 }));
      g.appendChild(stext(x0 - 6, yy + 4, f(t), { 'text-anchor': 'end', class: 'c-tick' }));
    });
  }
  function xLabels(g, labels, xc, band, y, maxW) {
    const widths = labels.map((l) => tw(l, 11));
    const need = Math.max(...widths, 1) + 8, step = Math.max(1, Math.ceil(need / Math.max(band, 1)));
    labels.forEach((l, i) => {
      if (i % step && i !== labels.length - 1) return;
      if (i !== labels.length - 1 && step > 1 && labels.length - 1 - i < step && (labels.length - 1) % step) return;
      g.appendChild(stext(xc(i), y, clip(l, Math.max(band * step - 4, 24), 11), { 'text-anchor': 'middle', class: 'c-tick' }));
    });
  }

  /* ---------- tiles ---------- */
  function sparkline(values, w, hgt) {
    const v = values.filter((x) => x != null), lo = Math.min(...v), hi = Math.max(...v), svg = s('svg', { width: w, height: hgt, class: 'c-spark' });
    const x = (i) => 2 + (i * (w - 4)) / Math.max(1, values.length - 1), y = (val) => hgt - 3 - ((val - lo) / (hi - lo || 1)) * (hgt - 6);
    let d = ''; values.forEach((val, i) => { if (val != null) d += (d ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(val).toFixed(1); });
    svg.appendChild(s('path', { d, fill: 'none', stroke: colors.other, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }));
    const li = values.length - 1; if (values[li] != null) svg.appendChild(s('circle', { cx: x(li), cy: y(values[li]), r: 3, fill: colors.focus }));
    return svg;
  }
  function tile(o) {
    const t = h('div', 'c-tile' + (o.status ? ' st-' + o.status : '') + (o.small ? ' small' : ''));
    if (o.color) t.style.setProperty('--c', o.color);
    t.appendChild(h('span', 'c-tile-l', o.label));
    const v = h('b', 'c-tile-v', typeof o.value === 'number' ? fmtNum(o.value, o.dec) + (o.unit || '') : o.value == null ? '' : String(o.value));
    t.appendChild(v);
    if (o.delta) { const dl = h('span', 'c-delta ' + (o.delta.tone || 'neutral'), o.delta.text); t.appendChild(dl); }
    if (o.sub) t.appendChild(h('span', 'c-tile-s', o.sub));
    if (o.spark && o.spark.filter((x) => x != null).length > 1) t.appendChild(sparkline(o.spark, 120, 26));
    if (o.tip) hover(t, () => ({ title: o.label, rows: [{ value: v.textContent }], note: o.tip }));
    return t;
  }
  function tiles(list, o) { const box = h('div', 'c-tiles'); if (o && o.min) box.style.setProperty('--min', o.min + 'px'); list.forEach((x) => box.appendChild(x instanceof Node ? x : tile(x))); return box; }

  /* ---------- small inline pieces ---------- */
  function chip(text, tone) { return h('span', 'c-chip ' + (tone || 'mute'), text); }
  function dot(holderOrColor) { const d = h('i', 'c-dot'); d.style.background = colors.holder[holderOrColor] || colors.type[holderOrColor] || holderOrColor || colors.mute; return d; }
  function pill(text, holder) { const p = h('span', 'c-pill', text); const c = colors.holder[holder] || colors.mute; p.style.background = mix(c, '#ffffff', 0.87); p.style.color = mix(c, '#000000', 0.25); return p; }
  function stageCell(g) {
    g = g || { s: 'todo' };
    const c = h('span', 'c-sc ' + g.s, g.s === 'done' ? '✓' : g.s === 'now' ? g.h || '' : g.s === 'warn' ? 'No ambient' : '');
    if (g.s === 'now') c.style.background = colors.holder[g.h] || colors.focus;
    c.title = g.t || { done: 'Done', todo: 'Not started', na: 'Not part of this job', warn: 'Ambient needed, no ambient WO linked' }[g.s] || '';
    return c;
  }
  function select(o) {
    const lab = h('label', 'c-select'); if (o.label) lab.appendChild(h('span', null, o.label));
    const sel = h('select'); (o.options || []).forEach((x) => { const opt = h('option', null, x.label != null ? x.label : String(x)); opt.value = x.value != null ? x.value : String(x); if (String(opt.value) === String(o.value)) opt.selected = true; sel.appendChild(opt); });
    sel.addEventListener('change', () => o.onChange && o.onChange(sel.value)); lab.appendChild(sel); return lab;
  }
  function button(text, onClick, o) { const b = h('button', 'c-btn' + (o && o.primary ? ' primary' : ''), text); b.type = 'button'; if (onClick) b.addEventListener('click', onClick); return b; }
  function note(text, o) { return h('p', 'c-note' + (o && o.tone ? ' ' + o.tone : ''), text); }
  function cellNode(v) { if (v instanceof Node) return v; if (v instanceof Date) return document.createTextNode(fmtDate(v)); if (Array.isArray(v)) { const f = document.createDocumentFragment(); v.forEach((x, i) => { if (i && !(x instanceof Node)) f.appendChild(document.createTextNode(' ')); f.appendChild(cellNode(x)); }); return f; } return document.createTextNode(v == null ? '' : String(v)); }

  /* ---------- list ---------- */
  function list(o) {
    const rows = o.rows || [], max = o.max == null ? 6 : o.max, box = h('div', 'c-list');
    if (!rows.length) { box.appendChild(emptyNode(o.empty || 'Nothing here right now')); return box; }
    const ul = h('ul'); let grp;
    rows.slice(0, max).forEach((r) => {
      if (r.group != null && r.group !== grp) { grp = r.group; ul.appendChild(h('li', 'c-grp', r.group)); }
      const li = h('li', 'c-row');
      if (r.holder || r.color) li.appendChild(dot(r.color || r.holder)); else if (rows.some((x) => x.holder || x.color)) li.appendChild(h('i', 'c-dot none'));
      const main = h('div', 'c-main'), line = h('div', 'c-rowline');
      if (r.title != null) line.appendChild(h('b', null, r.title));
      if (r.text != null) line.appendChild(h('span', null, r.text));
      main.appendChild(line);
      if (r.sub != null) main.appendChild(h('div', 'c-sub', r.sub));
      li.appendChild(main);
      const right = h('div', 'c-right');
      (r.chips || []).forEach((c) => right.appendChild(c instanceof Node ? c : chip(c.text, c.tone)));
      if (r.value != null) right.appendChild(h('span', 'c-val', r.value));
      li.appendChild(right);
      if (r.tip) hover(li, () => (typeof r.tip === 'string' ? { title: r.title, note: r.tip } : r.tip));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if (rows.length > max) box.appendChild(h('p', 'c-more', `and ${rows.length - max} more`));
    return box;
  }

  /* ---------- table (sortable) ---------- */
  function table(o) {
    const cols = o.columns || [], box = h('div', 'c-table-wrap' + (o.dense ? ' dense' : ''));
    let rows = (o.rows || []).slice(), sort = o.sort ? { key: o.sort.key, dir: o.sort.dir || 1 } : null, showAll = false;
    const valOf = (r, c) => (c.value ? c.value(r) : r[c.key]);
    function draw() {
      box.replaceChildren();
      if (!rows.length) { box.appendChild(emptyNode(o.empty)); return; }
      if (sort) { const c = cols.find((x) => x.key === sort.key); if (c) rows.sort((a, b) => { let x = valOf(a, c), y = valOf(b, c); if (x instanceof Date) x = +x; if (y instanceof Date) y = +y; if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; }); }
      const t = h('table', 'c-table'), thead = h('thead'), tr = h('tr');
      cols.forEach((c) => {
        const th = h('th', c.num ? 'num' : ''); if (c.width) th.style.width = c.width;
        if (o.sortable === false || c.sortable === false) th.textContent = c.label;
        else {
          const b = h('button', 'c-sort', c.label); b.type = 'button';
          th.setAttribute('aria-sort', sort && sort.key === c.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none');
          b.addEventListener('click', () => { sort = sort && sort.key === c.key ? { key: c.key, dir: -sort.dir } : { key: c.key, dir: c.num ? -1 : 1 }; draw(); });
          th.appendChild(b);
        }
        tr.appendChild(th);
      });
      thead.appendChild(tr); t.appendChild(thead);
      const tb = h('tbody'), lim = o.max && !showAll ? o.max : rows.length;
      rows.slice(0, lim).forEach((r) => {
        const row = h('tr'); if (o.grey && o.grey(r)) row.className = 'grey'; if (o.highlight && o.highlight(r)) row.className = 'hl';
        cols.forEach((c) => {
          const td = h('td', c.num ? 'num' : (c.cls || '') + (c.wrap || (!c.render && !c.fmt) ? '' : ' nw'));
          if (c.render) td.appendChild(cellNode(c.render(r)));
          else { const v = valOf(r, c); if (c.holder && r[c.holder]) td.appendChild(dot(r[c.holder])); td.appendChild(cellNode(c.fmt ? c.fmt(v, r) : typeof v === 'number' ? fmtNum(v, c.dec) : v)); }
          row.appendChild(td);
        });
        if (o.tip) hover(row, () => o.tip(r));
        tb.appendChild(row);
      });
      t.appendChild(tb);
      const sc = h('div', 'c-table-scroll'); if (o.maxHeight) sc.style.maxHeight = o.maxHeight + 'px'; sc.appendChild(t); box.appendChild(sc);
      if (o.max && rows.length > o.max) {
        const more = h('p', 'c-more'); more.appendChild(document.createTextNode(showAll ? '' : `and ${rows.length - o.max} more `));
        more.appendChild(button(showAll ? 'Show fewer' : 'Show all', () => { showAll = !showAll; draw(); }, {})); box.appendChild(more);
      }
    }
    draw();
    return box;
  }

  /* ---------- bar ---------- */
  function hbars(root, W, data, o, f) {
    const labelW = Math.min(Math.max(...data.map((d) => tw(d.label, 12))) + 12, W * (o.labelShare || 0.38));
    const showVals = o.labels !== false;
    const valW = showVals ? Math.max(...data.map((d) => tw(f(d.value), 12))) + 10 : 6;
    const vals = data.map((d) => d.value || 0), marks = data.map((d) => d.marker).filter((x) => x != null);
    const lo = Math.min(0, ...vals), hi = Math.max(o.max || 0, ...vals, ...marks, o.target ? o.target.value : 0) || 1;
    const top = o.target ? 18 : 2, rowH = o.rowHeight || 26, thick = Math.min(24, o.thickness || 14);
    const x0 = labelW, x1 = Math.max(x0 + 40, W - valW), x = (v) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
    const H = top + data.length * rowH + 4, svg = svgRoot(W, H);
    if (lo < 0) svg.appendChild(s('line', { x1: x(0), x2: x(0), y1: top, y2: H - 4, stroke: colors.axis }));
    data.forEach((d, i) => {
      const yc = top + i * rowH + rowH / 2, v = d.value || 0, c = colorOf(d, o, i);
      const g = s('g');
      g.appendChild(stext(0, yc + 4, clip(d.label, labelW - 10, 12), { class: 'c-lab' }));
      const xa = x(Math.min(0, v)), xb = x(Math.max(0, v));
      if (xb - xa > 0.5) g.appendChild(s('path', { d: barPath(xa, yc - thick / 2, xb - xa, thick, v < 0 ? 'l' : 'r'), fill: c, class: 'c-mark' }));
      if (d.marker != null) g.appendChild(s('line', { x1: x(d.marker), x2: x(d.marker), y1: yc - thick / 2 - 4, y2: yc + thick / 2 + 4, stroke: colors.ink, 'stroke-width': 2 }));
      if (showVals) { const lw = tw(f(d.value), 12), xm = d.marker != null ? x(d.marker) : null; let lx = xb + 5; if (xm != null && lx < xm + 4 && lx + lw > xm - 3) lx = xm + 5; g.appendChild(stext(v < 0 ? xa - 4 : lx, yc + 4, f(d.value), { class: 'c-val', 'text-anchor': v < 0 ? 'end' : 'start' })); }
      const hit = s('rect', { x: 0, y: top + i * rowH, width: W, height: rowH, fill: 'transparent' });
      hover(hit, () => ({ title: d.label, rows: [{ color: c, shape: 'rect', value: f(d.value), label: o.seriesName || '' }].concat(d.marker != null ? [{ color: colors.ink, value: f(d.marker), label: o.markerLabel || 'Marker' }] : []).concat(d.rows || []), note: d.tip }));
      g.appendChild(hit); svg.appendChild(g);
    });
    if (o.target) {
      const tx = x(o.target.value);
      svg.appendChild(s('line', { x1: tx, x2: tx, y1: top - 4, y2: H - 2, stroke: colors.ink, 'stroke-width': 1.5 }));
      const lbl = o.target.label || 'Target ' + f(o.target.value), lw = tw(lbl, 11);
      svg.appendChild(stext(Math.min(Math.max(tx, lw / 2), W - lw / 2), 11, lbl, { 'text-anchor': 'middle', class: 'c-tick' }));
    }
    root.appendChild(svg);
  }
  function vbars(root, W, data, o, f) {
    const plotH = o.height || 180, vals = data.map((d) => d.value || 0), marks = data.map((d) => d.marker).filter((x) => x != null);
    const sc = nice(Math.min(0, ...vals), Math.max(o.max || 0, ...vals, ...marks, o.target ? o.target.value : 0) || 1, 4, !o.pct && allInt(vals.concat(marks))), tf = tickFmt(o, sc.step);
    const left = Math.max(...sc.ticks.map((t) => tw(tf(t), 11))) + 10, top = 16, bottom = 22;
    const n = data.length, band = (W - left - 4) / Math.max(n, 1), bw = o.touch ? Math.max(1, band - 2) : Math.min(24, band * 0.62);
    const H = top + plotH + bottom, svg = svgRoot(W, H), y = (v) => top + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH, xc = (i) => left + band * i + band / 2;
    yAxis(svg, sc, left, W - 4, y, tf);
    const showVals = o.labels !== false && n <= 16 && !o.touch;
    data.forEach((d, i) => {
      const v = d.value || 0, c = colorOf(d, o, i), ya = y(Math.max(0, v)), yb = y(Math.min(0, v));
      if (yb - ya > 0.5) svg.appendChild(s('path', { d: barPath(xc(i) - bw / 2, ya, bw, yb - ya, v < 0 ? 'b' : 't', o.touch ? 2 : 4), fill: c, class: 'c-mark' }));
      if (d.marker != null) svg.appendChild(s('line', { x1: xc(i) - bw / 2 - 4, x2: xc(i) + bw / 2 + 4, y1: y(d.marker), y2: y(d.marker), stroke: colors.ink, 'stroke-width': 2 }));
      const lbl = f(d.value);
      if (showVals && tw(lbl, 11) <= band + 4 && d.value != null) svg.appendChild(stext(xc(i), Math.min(ya, d.marker != null ? y(d.marker) : ya) - 5, lbl, { 'text-anchor': 'middle', class: 'c-val small' }));
      const hit = s('rect', { x: left + band * i, y: top - 10, width: band, height: plotH + 10, fill: 'transparent' });
      hover(hit, () => ({ title: d.label, rows: [{ color: c, shape: 'rect', value: lbl, label: o.seriesName || '' }].concat(d.marker != null ? [{ color: colors.ink, value: f(d.marker), label: o.markerLabel || 'Marker' }] : []).concat(d.rows || []), note: d.tip }));
      svg.appendChild(hit);
    });
    xLabels(svg, data.map((d) => d.label), xc, band, top + plotH + 15);
    if (o.target) {
      const ty = y(o.target.value), lbl = o.target.label || 'Target ' + f(o.target.value);
      svg.appendChild(s('line', { x1: left, x2: W - 4, y1: ty, y2: ty, stroke: colors.ink, 'stroke-width': 1.5 }));
      root.appendChild(legend([{ label: lbl, shape: 'line', color: colors.ink }]));
    }
    if (o.yLabel) svg.appendChild(stext(0, 10, o.yLabel, { class: 'c-tick' }));
    root.appendChild(svg);
  }
  function bar(o) {
    let data = (o.data || []).slice();
    if (o.sort === 'desc') data.sort((a, b) => (b.value || 0) - (a.value || 0)); else if (o.sort === 'asc') data.sort((a, b) => (a.value || 0) - (b.value || 0));
    return chart('c-bar', (root, W) => {
      if (o.legend) root.appendChild(legend(o.legend));
      if (!data.length) { root.appendChild(emptyNode(o.empty)); return; }
      const f = makeFmt(o);
      (o.horizontal === false ? vbars : hbars)(root, W, data, o, f);
      if (data.some((d) => d.marker != null) && o.markerLabel) root.appendChild(legend([{ label: o.markerLabel, shape: 'tick', color: colors.ink }]));
    }, o);
  }

  /* ---------- stacked bar (absolute or 100%) ---------- */
  function stackedBar(o) {
    const cats = o.categories || [], series = o.series || [];
    return chart('c-stack', (root, W) => {
      if (o.legend !== false && series.length > 1) root.appendChild(seriesLegend(series, 'rect'));
      if (!cats.length) { root.appendChild(emptyNode(o.empty)); return; }
      const f = makeFmt(o), pf = (v) => fmtNum(v * 100, 0) + '%';
      const totals = cats.map((_, i) => series.reduce((t, se) => t + (se.values[i] || 0), 0));
      const val = (se, i) => (o.percent ? (totals[i] ? (se.values[i] || 0) / totals[i] : 0) : se.values[i] || 0);
      const tipFor = (i) => ({ title: cats[i], rows: series.map((se, k) => ({ color: seriesColor(se, k), shape: 'rect', value: o.percent ? `${pf(val(se, i))}  (${f(se.values[i] || 0)})` : f(se.values[i] || 0), label: se.name })).reverse().concat(o.percent ? [] : [{ value: f(totals[i]), label: 'Total' }]), note: o.tips && o.tips[i] });
      const horiz = o.horizontal === true;
      if (horiz) {
        const labelW = Math.min(Math.max(...cats.map((c) => tw(c, 12))) + 12, W * 0.34), totW = o.percent || o.totals === false ? 6 : Math.max(...totals.map((t) => tw(f(t), 12))) + 10;
        const rowH = o.rowHeight || 30, thick = Math.min(24, o.thickness || 18), H = cats.length * rowH + 4, svg = svgRoot(W, H);
        const hi = o.percent ? 1 : Math.max(o.max || 0, ...totals) || 1, x0 = labelW, x1 = W - totW, x = (v) => x0 + (v / hi) * (x1 - x0);
        cats.forEach((c, i) => {
          const yc = i * rowH + rowH / 2; let acc = 0;
          svg.appendChild(stext(0, yc + 4, clip(c, labelW - 10, 12), { class: 'c-lab' }));
          const lastK = series.map((se, k) => (val(se, i) > 0 ? k : -1)).reduce((a, b) => Math.max(a, b), -1);
          series.forEach((se, k) => {
            const v = val(se, i); if (v <= 0) return;
            const xa = x(acc) + (acc > 0 ? 1 : 0), xb = x(acc + v) - (k === lastK ? 0 : 1), col = seriesColor(se, k);
            if (xb - xa > 0.3) svg.appendChild(s('path', { d: barPath(xa, yc - thick / 2, xb - xa, thick, k === lastK ? 'r' : null), fill: col, class: 'c-mark' }));
            const lbl = o.percent ? pf(v) : f(se.values[i]);
            if (o.inside && tw(lbl, 11, 600) + 8 <= xb - xa) svg.appendChild(stext((xa + xb) / 2, yc + 4, lbl, { 'text-anchor': 'middle', class: 'c-in', fill: inkOn(col) }));
            acc += v;
          });
          if (!o.percent && o.totals !== false) svg.appendChild(stext(x(totals[i]) + 5, yc + 4, f(totals[i]), { class: 'c-val' }));
          const hit = s('rect', { x: 0, y: i * rowH, width: W, height: rowH, fill: 'transparent' }); hover(hit, () => tipFor(i)); svg.appendChild(hit);
        });
        root.appendChild(svg);
      } else {
        const plotH = o.height || 180, sc = o.percent ? { lo: 0, hi: 1, step: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1] } : nice(0, Math.max(o.max || 0, ...totals, o.target ? o.target.value : 0) || 1, 4, !o.pct && allInt(series.flatMap((se) => se.values)));
        const tf = o.percent ? (v) => fmtNum(v * 100, 0) + '%' : tickFmt(o, sc.step), left = Math.max(...sc.ticks.map((t) => tw(tf(t), 11))) + 10, top = 16, bottom = 22;
        const band = (W - left - 4) / cats.length, bw = Math.min(24, band * 0.62), H = top + plotH + bottom, svg = svgRoot(W, H);
        const y = (v) => top + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH, xc = (i) => left + band * i + band / 2;
        yAxis(svg, sc, left, W - 4, y, tf);
        cats.forEach((c, i) => {
          let acc = 0; const lastK = series.map((se, k) => (val(se, i) > 0 ? k : -1)).reduce((a, b) => Math.max(a, b), -1);
          series.forEach((se, k) => {
            const v = val(se, i); if (v <= 0) return;
            const yb = y(acc) - (acc > 0 ? 1 : 0), ya = y(acc + v) + (k === lastK ? 0 : 1), col = seriesColor(se, k);
            if (yb - ya > 0.3) svg.appendChild(s('path', { d: barPath(xc(i) - bw / 2, ya, bw, yb - ya, k === lastK ? 't' : null), fill: col, class: 'c-mark' }));
            acc += v;
          });
          if (!o.percent && o.totals !== false && cats.length <= 16 && tw(f(totals[i]), 11) <= band + 4) svg.appendChild(stext(xc(i), y(totals[i]) - 5, f(totals[i]), { 'text-anchor': 'middle', class: 'c-val small' }));
          const hit = s('rect', { x: left + band * i, y: top - 10, width: band, height: plotH + 10, fill: 'transparent' }); hover(hit, () => tipFor(i)); svg.appendChild(hit);
        });
        xLabels(svg, cats, xc, band, top + plotH + 15);
        if (o.target) { const ty = y(o.target.value); svg.appendChild(s('line', { x1: left, x2: W - 4, y1: ty, y2: ty, stroke: colors.ink, 'stroke-width': 1.5 })); root.appendChild(legend([{ label: o.target.label || 'Target ' + f(o.target.value), shape: 'line', color: colors.ink }])); }
        root.appendChild(svg);
      }
    }, o);
  }

  /* ---------- paired (grouped) bar ---------- */
  function pairedBar(o) {
    const cats = o.categories || [], series = o.series || [];
    return chart('c-paired', (root, W) => {
      if (o.legend !== false && series.length > 1) root.appendChild(seriesLegend(series, 'rect'));
      if (!cats.length) { root.appendChild(emptyNode(o.empty)); return; }
      const f = makeFmt(o), all = series.flatMap((se) => se.values.map((v) => v || 0)), m = series.length;
      const tipFor = (i) => ({ title: cats[i], rows: series.map((se, k) => ({ color: seriesColor(se, k), shape: 'rect', value: f(se.values[i]), label: se.name })), note: o.tips && o.tips[i] });
      if (o.horizontal) {
        const labelW = Math.min(Math.max(...cats.map((c) => tw(c, 12))) + 12, W * 0.34), valW = Math.max(...all.map((v) => tw(f(v), 11))) + 8;
        const thick = Math.min(12, o.thickness || 10), rowH = m * (thick + 2) + 12, H = cats.length * rowH + 4, svg = svgRoot(W, H);
        const hi = Math.max(o.max || 0, ...all) || 1, x0 = labelW, x = (v) => x0 + (v / hi) * (W - valW - x0);
        cats.forEach((c, i) => {
          const y0 = i * rowH + 6;
          svg.appendChild(stext(0, y0 + (m * (thick + 2)) / 2 + 3, clip(c, labelW - 10, 12), { class: 'c-lab' }));
          series.forEach((se, k) => { const v = se.values[i] || 0, yy = y0 + k * (thick + 2); if (v > 0) svg.appendChild(s('path', { d: barPath(x0, yy, x(v) - x0, thick, 'r', 3), fill: seriesColor(se, k), class: 'c-mark' })); svg.appendChild(stext(x(v) + 4, yy + thick - 1, f(se.values[i]), { class: 'c-val small' })); });
          const hit = s('rect', { x: 0, y: i * rowH, width: W, height: rowH, fill: 'transparent' }); hover(hit, () => tipFor(i)); svg.appendChild(hit);
        });
        root.appendChild(svg);
      } else {
        const plotH = o.height || 180, sc = nice(0, Math.max(o.max || 0, ...all) || 1, 4, !o.pct && allInt(all)), tf = tickFmt(o, sc.step), left = Math.max(...sc.ticks.map((t) => tw(tf(t), 11))) + 10, top = 14, bottom = 22;
        const band = (W - left - 4) / cats.length, bw = Math.max(2, Math.min(18, (band * 0.74 - (m - 1) * 2) / m)), H = top + plotH + bottom, svg = svgRoot(W, H);
        const y = (v) => top + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH, xc = (i) => left + band * i + band / 2;
        yAxis(svg, sc, left, W - 4, y, tf);
        cats.forEach((c, i) => {
          const gx = xc(i) - (m * bw + (m - 1) * 2) / 2;
          series.forEach((se, k) => { const v = se.values[i] || 0; if (v > 0) svg.appendChild(s('path', { d: barPath(gx + k * (bw + 2), y(v), bw, y(0) - y(v), 't', 3), fill: seriesColor(se, k), class: 'c-mark' })); });
          const hit = s('rect', { x: left + band * i, y: top - 10, width: band, height: plotH + 10, fill: 'transparent' }); hover(hit, () => tipFor(i)); svg.appendChild(hit);
        });
        xLabels(svg, cats, xc, band, top + plotH + 15);
        root.appendChild(svg);
      }
    }, o);
  }

  /* ---------- line (multi-series, crosshair) ---------- */
  function crosshair(svg, n, left, right, top, bottom, xc, tipFor, onMove) {
    const line = s('line', { y1: top, y2: bottom, stroke: colors.axis, 'stroke-width': 1, visibility: 'hidden' });
    svg.appendChild(line);
    const hit = s('rect', { x: left, y: top - 8, width: Math.max(0, right - left), height: bottom - top + 8, fill: 'transparent' });
    const idxAt = (e) => { const r = svg.getBoundingClientRect(), px = e.clientX - r.left; let best = 0, bd = 1e9; for (let i = 0; i < n; i++) { const d = Math.abs(xc(i) - px); if (d < bd) { bd = d; best = i; } } return best; };
    hit.addEventListener('pointermove', (e) => { const i = idxAt(e); line.setAttribute('x1', xc(i)); line.setAttribute('x2', xc(i)); line.setAttribute('visibility', 'visible'); onMove && onMove(i); tipShow(e, tipFor(i)); });
    hit.addEventListener('pointerleave', () => { line.setAttribute('visibility', 'hidden'); onMove && onMove(-1); tipHide(); });
    svg.appendChild(hit);
  }
  function line(o) {
    const x = o.x || [], series = o.series || [];
    return chart('c-line', (root, W) => {
      if (o.legend !== false && series.length > 1) root.appendChild(seriesLegend(series, 'line'));
      const extra = [o.target ? { label: o.target.label || 'Target ' + makeFmt(o)(o.target.value), shape: 'line', color: colors.ink } : null, o.greyLabel ? { label: o.greyLabel, shape: 'ring', color: colors.mute } : null].filter(Boolean);
      if (extra.length) root.appendChild(legend(extra));
      if (!x.length || !series.length) { root.appendChild(emptyNode(o.empty)); return; }
      const f = makeFmt(o), all = series.flatMap((se) => se.values).filter((v) => v != null);
      const isGrey = (si, xi) => (o.grey ? o.grey(si, xi) : series[si].grey ? !!series[si].grey[xi] : false);
      const lo = o.yMin != null ? o.yMin : Math.min(0, ...all), sc = nice(lo, Math.max(o.yMax || 0, ...all, o.target ? o.target.value : -Infinity, lo + 1e-9), 4, !o.pct && allInt(all)), tf = tickFmt(o, sc.step);
      const plotH = o.height || 180, top = 12, bottom = 22, left = Math.max(...sc.ticks.map((t) => tw(tf(t), 11))) + 10;
      const endLbl = series.length === 1 && o.endLabel !== false, lastI = endLbl ? series[0].values.reduce((a, v, i) => (v != null ? i : a), -1) : -1;
      const right = W - (endLbl && lastI >= 0 ? tw(f(series[0].values[lastI]), 11) + 10 : 8);
      const H = top + plotH + bottom, svg = svgRoot(W, H), n = x.length;
      const xc = (i) => (n === 1 ? (left + right) / 2 : left + 6 + (i * (right - left - 12)) / (n - 1)), y = (v) => top + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH;
      yAxis(svg, sc, left, W - 4, y, tf);
      if (o.target) { const ty = y(o.target.value); svg.appendChild(s('line', { x1: left, x2: W - 4, y1: ty, y2: ty, stroke: colors.ink, 'stroke-width': 1.5 })); }
      const showPts = o.points != null ? o.points : n <= 16, dots = [];
      series.forEach((se, si) => {
        const col = seriesColor(se, si);
        let d = '', area = '', open = false, segStart = null;
        se.values.forEach((v, i) => { if (v == null) { if (open && o.area && series.length === 1) area += `L${xc(i - 1)},${y(sc.lo)}L${xc(segStart)},${y(sc.lo)}Z`; open = false; return; } d += (open ? 'L' : 'M') + xc(i).toFixed(1) + ',' + y(v).toFixed(1); if (!open) segStart = i; open = true; });
        if (o.area && series.length === 1) { const pts = se.values.map((v, i) => (v == null ? null : [xc(i), y(v)])).filter(Boolean); if (pts.length > 1) svg.appendChild(s('path', { d: 'M' + pts.map((p) => p.join(',')).join('L') + `L${pts[pts.length - 1][0]},${y(Math.max(sc.lo, 0))}L${pts[0][0]},${y(Math.max(sc.lo, 0))}Z`, fill: col, 'fill-opacity': 0.1 })); }
        svg.appendChild(s('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': se.dashed ? '5 4' : null }));
        const sd = [];
        se.values.forEach((v, i) => {
          if (v == null) { sd.push(null); return; }
          const g = isGrey(si, i);
          const c = s('circle', { cx: xc(i), cy: y(v), r: g ? 3.5 : 4, fill: g ? '#ffffff' : col, stroke: g ? colors.mute : '#ffffff', 'stroke-width': g ? 1.5 : 2, visibility: showPts || g ? 'visible' : 'hidden' });
          svg.appendChild(c); sd.push(c);
        });
        dots.push(sd);
        if (endLbl && lastI >= 0) svg.appendChild(stext(xc(lastI) + 7, y(se.values[lastI]) + 4, f(se.values[lastI]), { class: 'c-val small' }));
      });
      const band = (right - left) / Math.max(1, n - 1 || 1);
      xLabels(svg, x, xc, n > 1 ? band : right - left, top + plotH + 15);
      crosshair(svg, n, left, W - 4, top, top + plotH, xc, (i) => ({ title: x[i], rows: series.map((se, si) => ({ color: seriesColor(se, si), value: se.values[i] == null ? 'No data' : f(se.values[i]), label: se.name + (isGrey(si, i) && o.greyLabel ? ', ' + o.greyLabel.toLowerCase() : '') })), note: o.tips && o.tips[i] }),
        (i) => { if (showPts) return; dots.forEach((sd, si) => sd.forEach((c, k) => c && c.setAttribute('visibility', k === i || isGrey(si, k) ? 'visible' : 'hidden'))); });
      root.appendChild(svg);
    }, o);
  }

  /* ---------- stacked area ---------- */
  function stackedArea(o) {
    const x = o.x || [], series = o.series || [];
    return chart('c-area', (root, W) => {
      if (series.length > 1) root.appendChild(seriesLegend(series, 'rect'));
      if (!x.length) { root.appendChild(emptyNode(o.empty)); return; }
      const f = makeFmt(o), n = x.length, totals = x.map((_, i) => series.reduce((t, se) => t + (se.values[i] || 0), 0));
      const val = (se, i) => (o.percent ? (totals[i] ? (se.values[i] || 0) / totals[i] : 0) : se.values[i] || 0);
      const sc = o.percent ? { lo: 0, hi: 1, step: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1] } : nice(0, Math.max(...totals) || 1, 4, !o.pct && allInt(series.flatMap((se) => se.values))), tf = o.percent ? (v) => fmtNum(v * 100, 0) + '%' : tickFmt(o, sc.step);
      const plotH = o.height || 180, top = 10, bottom = 22, left = Math.max(...sc.ticks.map((t) => tw(tf(t), 11))) + 10, right = W - 8;
      const H = top + plotH + bottom, svg = svgRoot(W, H), xc = (i) => left + 4 + (i * (right - left - 8)) / Math.max(1, n - 1), y = (v) => top + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH;
      yAxis(svg, sc, left, W - 4, y, tf);
      const base = x.map(() => 0);
      series.forEach((se, si) => {
        const col = seriesColor(se, si), topv = x.map((_, i) => base[i] + val(se, i));
        const d = 'M' + topv.map((v, i) => `${xc(i)},${y(v)}`).join('L') + 'L' + base.map((v, i) => `${xc(i)},${y(v)}`).reverse().join('L') + 'Z';
        svg.appendChild(s('path', { d, fill: col, 'fill-opacity': 0.55, class: 'c-mark' }));
        svg.appendChild(s('path', { d: 'M' + topv.map((v, i) => `${xc(i)},${y(v)}`).join('L'), fill: 'none', stroke: col, 'stroke-width': 1.5 }));
        topv.forEach((v, i) => (base[i] = v));
      });
      xLabels(svg, x, xc, (right - left) / Math.max(1, n - 1), top + plotH + 15);
      crosshair(svg, n, left, right, top, top + plotH, xc, (i) => ({ title: x[i], rows: series.map((se, si) => ({ color: seriesColor(se, si), shape: 'rect', value: o.percent ? fmtNum(val(se, i) * 100, 0) + '%' : f(se.values[i] || 0), label: se.name })).reverse().concat(o.percent ? [] : [{ value: f(totals[i]), label: 'Total' }]) }));
      root.appendChild(svg);
    }, o);
  }

  /* ---------- box plot ---------- */
  function quart(values) {
    const a = values.filter((v) => v != null && !isNaN(v)).sort((p, q) => p - q), n = a.length;
    const q = (p) => { if (!n) return null; const k = (n - 1) * p, lo = Math.floor(k), hi = Math.ceil(k); return a[lo] + (a[hi] - a[lo]) * (k - lo); };
    if (!n) return null;
    const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1, lw = a.find((v) => v >= q1 - 1.5 * iqr), hw = a.slice().reverse().find((v) => v <= q3 + 1.5 * iqr);
    return { n, min: a[0], max: a[n - 1], q1, med: q(0.5), q3, p80: q(0.8), lw, hw, out: a.filter((v) => v < lw || v > hw) };
  }
  function boxPlot(o) {
    const groups = (o.groups || []).map((g) => Object.assign({}, g, { q: quart(g.values || []) }));
    return chart('c-box', (root, W) => {
      if (o.legend) root.appendChild(legend(o.legend));
      if (!groups.some((g) => g.q)) { root.appendChild(emptyNode(o.empty)); return; }
      const f = makeFmt(o), all = groups.filter((g) => g.q).flatMap((g) => [g.q.min, g.q.max]);
      const tipFor = (g) => (g.q ? { title: g.label, rows: [{ value: f(g.q.med), label: 'median' }, { value: `${f(g.q.q1)} to ${f(g.q.q3)}`, label: 'middle half' }, { value: f(g.q.p80), label: '80th percentile' }, { value: `${f(g.q.min)} to ${f(g.q.max)}`, label: 'range' }, { value: String(g.q.n), label: g.q.n === 1 ? 'job' : o.countLabel || 'jobs' }], note: g.tip } : { title: g.label, note: 'No data' });
      const horiz = o.horizontal != null ? o.horizontal : groups.length > 8;
      const hi = Math.max(o.max || 0, ...all), lo = Math.min(0, ...all), sc = nice(lo, hi || 1, 4, !o.pct && allInt(groups.flatMap((g) => g.values || []))), tf = tickFmt(o, sc.step);
      if (horiz) {
        const labelW = Math.min(Math.max(...groups.map((g) => tw(g.label, 12))) + 12, W * 0.4), nW = 34, rowH = o.rowHeight || 24, top = 4, bottom = 20;
        const x0 = labelW, x1 = W - nW, x = (v) => x0 + ((v - sc.lo) / (sc.hi - sc.lo)) * (x1 - x0), H = top + groups.length * rowH + bottom, svg = svgRoot(W, H);
        sc.ticks.forEach((t) => { svg.appendChild(s('line', { x1: x(t), x2: x(t), y1: top, y2: H - bottom, stroke: t === 0 ? colors.axis : colors.grid })); svg.appendChild(stext(x(t), H - 6, tf(t), { 'text-anchor': 'middle', class: 'c-tick' })); });
        groups.forEach((g, i) => {
          const yc = top + i * rowH + rowH / 2, col = g.color || colors.type[g.label] || o.color || colors.one;
          svg.appendChild(stext(0, yc + 4, clip(g.label, labelW - 10, 12), { class: 'c-lab' }));
          if (g.q) {
            const q = g.q, bh = Math.min(14, rowH - 8);
            svg.appendChild(s('line', { x1: x(q.lw), x2: x(q.hw), y1: yc, y2: yc, stroke: col, 'stroke-width': 1.5 }));
            [q.lw, q.hw].forEach((v) => svg.appendChild(s('line', { x1: x(v), x2: x(v), y1: yc - 4, y2: yc + 4, stroke: col, 'stroke-width': 1.5 })));
            svg.appendChild(s('rect', { x: x(q.q1), y: yc - bh / 2, width: Math.max(1.5, x(q.q3) - x(q.q1)), height: bh, rx: 3, fill: mix(col, '#ffffff', 0.78), stroke: col, 'stroke-width': 1.5 }));
            svg.appendChild(s('line', { x1: x(q.med), x2: x(q.med), y1: yc - bh / 2, y2: yc + bh / 2, stroke: colors.ink, 'stroke-width': 2 }));
            if (o.p80) svg.appendChild(s('path', { d: `M${x(q.p80)},${yc - bh / 2 - 4}l3,-4h-6Z`, fill: colors.ink }));
            q.out.forEach((v) => svg.appendChild(s('circle', { cx: x(v), cy: yc, r: 2.5, fill: '#ffffff', stroke: col, 'stroke-width': 1.2 })));
          }
          svg.appendChild(stext(W - 2, yc + 4, g.q ? 'n=' + g.q.n : 'none', { 'text-anchor': 'end', class: 'c-tick' }));
          const hit = s('rect', { x: 0, y: top + i * rowH, width: W, height: rowH, fill: 'transparent' }); hover(hit, () => tipFor(g)); svg.appendChild(hit);
        });
        root.appendChild(svg);
      } else {
        const plotH = o.height || 180, top = 10, bottom = 34, left = Math.max(...sc.ticks.map((t) => tw(tf(t), 11))) + 10;
        const band = (W - left - 4) / groups.length, bwid = Math.min(28, band * 0.5), H = top + plotH + bottom, svg = svgRoot(W, H);
        const y = (v) => top + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH, xc = (i) => left + band * i + band / 2;
        yAxis(svg, sc, left, W - 4, y, tf);
        groups.forEach((g, i) => {
          const col = g.color || colors.type[g.label] || o.color || colors.one, cx = xc(i);
          if (g.q) {
            const q = g.q;
            svg.appendChild(s('line', { x1: cx, x2: cx, y1: y(q.lw), y2: y(q.hw), stroke: col, 'stroke-width': 1.5 }));
            [q.lw, q.hw].forEach((v) => svg.appendChild(s('line', { x1: cx - 5, x2: cx + 5, y1: y(v), y2: y(v), stroke: col, 'stroke-width': 1.5 })));
            svg.appendChild(s('rect', { x: cx - bwid / 2, y: y(q.q3), width: bwid, height: Math.max(1.5, y(q.q1) - y(q.q3)), rx: 3, fill: mix(col, '#ffffff', 0.78), stroke: col, 'stroke-width': 1.5 }));
            svg.appendChild(s('line', { x1: cx - bwid / 2, x2: cx + bwid / 2, y1: y(q.med), y2: y(q.med), stroke: colors.ink, 'stroke-width': 2 }));
            if (o.p80) svg.appendChild(s('path', { d: `M${cx + bwid / 2 + 3},${y(q.p80)}l5,-3v6Z`, fill: colors.ink }));
            q.out.forEach((v) => svg.appendChild(s('circle', { cx, cy: y(v), r: 2.5, fill: '#ffffff', stroke: col, 'stroke-width': 1.2 })));
          }
          svg.appendChild(stext(cx, top + plotH + 28, g.q ? 'n=' + g.q.n : 'none', { 'text-anchor': 'middle', class: 'c-tick small' }));
          const hit = s('rect', { x: left + band * i, y: top, width: band, height: plotH, fill: 'transparent' }); hover(hit, () => tipFor(g)); svg.appendChild(hit);
        });
        xLabels(svg, groups.map((g) => g.label), xc, band, top + plotH + 15);
        root.appendChild(svg);
      }
      if (o.p80) root.appendChild(legend([{ label: 'Median', shape: 'tick', color: colors.ink }, { label: '80th percentile', shape: 'tri', color: colors.ink }]));
    }, o);
  }

  /* ---------- histogram ---------- */
  function bucketize(values, o) {
    let bk = o.buckets;
    if (!bk) {
      const v = values.filter((x) => x != null && !isNaN(x)), lo = o.min != null ? o.min : Math.min(...v), hi = o.maxValue != null ? o.maxValue : Math.max(...v);
      const width = o.binWidth || nice(lo, hi, o.bins || 8, o.integer !== false && allInt(v)).step, start = Math.floor(lo / width) * width;
      bk = []; for (let a = start; a <= hi; a += width) bk.push([a, a + width - (o.integer === false ? 0 : 1)]);
      if (!bk.length) bk = [[0, width]];
    }
    const labels = o.labels || bk.map(([a, b]) => (b === Infinity ? `${a}+` : a === b ? String(a) : `${a} to ${b}`));
    const cont = o.integer === false, last = bk.length - 1;
    const count = (vals) => bk.map(([a, b], i) => vals.filter((x) => x != null && !isNaN(x) && x >= a && (b === Infinity || (cont && i < last ? x < b : x <= b))).length);
    return { labels, count };
  }
  function histogram(o) {
    const vals = o.values || (o.series || []).flatMap((se) => se.values);
    if (!vals.length) return chart('c-hist', (root) => root.appendChild(emptyNode(o.empty)), o);
    const bz = bucketize(vals, o);
    if (o.series && o.series.length > 1) return pairedBar({ categories: bz.labels, series: o.series.map((se) => ({ name: se.name, color: se.color, values: bz.count(se.values) })), height: o.height, unit: '', fmt: (v) => fmtNum(v, 0), tips: o.tips });
    const counts = bz.count(vals);
    const el = bar({ horizontal: false, touch: true, data: bz.labels.map((l, i) => ({ label: l, value: counts[i], color: o.color || (o.series && o.series[0] && o.series[0].color) })), height: o.height, fmt: (v) => fmtNum(v, 0) + (o.countUnit != null ? o.countUnit : ''), seriesName: o.seriesName || 'jobs', width: o.width });
    if (o.xLabel) el.appendChild(h('p', 'c-axis-x', o.xLabel));
    return el;
  }

  /* ---------- heatmap (HTML grid, values in cells) ---------- */
  function heatmap(o) {
    const rows = o.rows || [], cols = o.cols || [], vals = o.values || [], cv = o.colorValues || vals, box = h('div', 'c-heat');
    if (!rows.length || !cols.length) { box.appendChild(emptyNode(o.empty)); return box; }
    const f = makeFmt(o), flat = cv.flat().filter((v) => v != null && !isNaN(v));
    const lo = o.domain ? o.domain[0] : Math.min(0, ...flat), hi = o.domain ? o.domain[1] : Math.max(...flat, lo + 1e-9), mid = o.mid != null ? o.mid : 0, span = Math.max(Math.abs(hi - mid), Math.abs(lo - mid)) || 1;
    const colorFor = (v) => (v == null || isNaN(v) ? null : o.scale === 'div' ? divAt((v - mid) / span) : seqAt((v - lo) / (hi - lo || 1)));
    const grid = h('div', 'c-heat-grid');
    grid.style.gridTemplateColumns = `minmax(60px, ${o.labelWidth || 'max-content'}) repeat(${cols.length}, minmax(${o.minCell || 30}px, 1fr))`;
    grid.appendChild(h('span', 'c-heat-corner', o.corner || ''));
    cols.forEach((c) => { const t = h('span', 'c-heat-col', c); t.title = c; grid.appendChild(t); });
    rows.forEach((rl, ri) => {
      const lab = h('span', 'c-heat-row', rl); lab.title = rl; grid.appendChild(lab);
      cols.forEach((cl, ci) => {
        const v = vals[ri] ? vals[ri][ci] : null, c = colorFor(cv[ri] ? cv[ri][ci] : null), grey = o.grey && o.grey(ri, ci);
        const cell = h('span', 'c-cell' + (c ? '' : ' empty') + (grey ? ' grey' : ''));
        if (c && !grey) { cell.style.background = c; cell.style.color = inkOn(c); }
        if (o.showValues !== false && v != null) cell.appendChild(h('b', null, f(v)));
        const sub = o.sub && o.sub[ri] ? o.sub[ri][ci] : null; if (sub != null && sub !== '') cell.appendChild(h('small', null, String(sub)));
        hover(cell, () => ({ title: `${rl}, ${cl}`, rows: [{ value: v == null ? 'No data' : f(v), label: o.valueLabel || '' }].concat(sub != null && sub !== '' ? [{ value: String(sub), label: o.subLabel || '' }] : []).concat(o.colorValues && cv[ri] && cv[ri][ci] != null ? [{ value: (o.colorFmt || makeFmt({}))(cv[ri][ci]), label: o.colorLabel || 'colour' }] : []), note: grey ? o.greyLabel : o.tip ? o.tip(ri, ci) : null }));
        grid.appendChild(cell);
      });
    });
    box.appendChild(grid);
    if (o.legend !== false) {
      const lg = h('div', 'c-scale'), bar = h('i', 'c-scale-bar');
      bar.style.background = o.scale === 'div' ? `linear-gradient(90deg, ${DIV.low}, ${DIV.mid}, ${DIV.high})` : `linear-gradient(90deg, ${SEQ.join(',')})`;
      const lf = o.colorFmt || f;
      lg.appendChild(h('span', null, o.scale === 'div' ? o.lowLabel || lf(mid - span) : lf(lo))); lg.appendChild(bar); lg.appendChild(h('span', null, o.scale === 'div' ? o.highLabel || lf(mid + span) : lf(hi)));
      if (o.scale === 'div' && o.midLabel) lg.appendChild(h('span', 'c-scale-mid', 'Middle: ' + o.midLabel));
      if (o.scaleLabel) lg.insertBefore(h('span', 'c-scale-t', o.scaleLabel), lg.firstChild);
      if (o.greyLabel && o.grey) { const gl = h('span', 'c-scale-grey'); gl.appendChild(h('i', 'c-sw rect grey')); gl.appendChild(h('span', null, o.greyLabel)); lg.appendChild(gl); }
      box.appendChild(lg);
    }
    return box;
  }

  /* ---------- scatter ---------- */
  function scatter(o) {
    const pts = (o.points || []).filter((p) => p.x != null && p.y != null), series = o.series || [];
    return chart('c-scatter', (root, W) => {
      if (series.length > 1) root.appendChild(seriesLegend(series, 'dot'));
      if (!pts.length) { root.appendChild(emptyNode(o.empty)); return; }
      const fx = makeFmt({ unit: o.xUnit, fmt: o.xFmt, dec: o.xDec }), fy = makeFmt({ unit: o.yUnit, fmt: o.yFmt, dec: o.yDec });
      const sx = nice(Math.min(0, ...pts.map((p) => p.x)), Math.max(o.xMax || 0, ...pts.map((p) => p.x)), 5, allInt(pts.map((p) => p.x))), sy = nice(Math.min(0, ...pts.map((p) => p.y)), Math.max(o.yMax || 0, ...pts.map((p) => p.y)), 4, allInt(pts.map((p) => p.y)));
      const tfx = tickFmt({}, sx.step), tfy = tickFmt({}, sy.step), plotH = o.height || 220, top = 14, bottom = 34, left = Math.max(...sy.ticks.map((t) => tw(tfy(t), 11))) + 10, right = W - 10;
      const H = top + plotH + bottom, svg = svgRoot(W, H), x = (v) => left + ((v - sx.lo) / (sx.hi - sx.lo)) * (right - left), y = (v) => top + plotH - ((v - sy.lo) / (sy.hi - sy.lo)) * plotH;
      yAxis(svg, sy, left, right, y, tfy);
      sx.ticks.forEach((t) => { svg.appendChild(s('line', { x1: x(t), x2: x(t), y1: top, y2: top + plotH, stroke: t === 0 ? colors.axis : colors.grid })); svg.appendChild(stext(x(t), top + plotH + 14, tfx(t), { 'text-anchor': 'middle', class: 'c-tick' })); });
      if (o.xLabel) svg.appendChild(stext(right, H - 4, o.xLabel, { 'text-anchor': 'end', class: 'c-tick' }));
      if (o.yLabel) svg.appendChild(stext(left + 4, top - 3, o.yLabel, { class: 'c-tick' }));
      const colOf = (p) => p.color || (p.type && colors.type[p.type]) || (p.holder && colors.holder[p.holder]) || (p.series != null ? seriesColor(series.find((se) => se.name === p.series) || {}, series.findIndex((se) => se.name === p.series)) : o.color || colors.one);
      const marks = pts.map((p) => { const c = s('circle', { cx: x(p.x), cy: y(p.y), r: 4, fill: colOf(p), stroke: '#ffffff', 'stroke-width': 1.5, 'fill-opacity': 0.9 }); svg.appendChild(c); return c; });
      const ring = s('circle', { r: 7, fill: 'none', stroke: colors.ink, 'stroke-width': 1.5, visibility: 'hidden' }); svg.appendChild(ring);
      const hit = s('rect', { x: left, y: top, width: right - left, height: plotH, fill: 'transparent' });
      hit.addEventListener('pointermove', (e) => {
        const r = svg.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; let best = -1, bd = 24 * 24;
        pts.forEach((p, i) => { const d = (x(p.x) - px) ** 2 + (y(p.y) - py) ** 2; if (d < bd) { bd = d; best = i; } });
        if (best < 0) { ring.setAttribute('visibility', 'hidden'); tipHide(); return; }
        const p = pts[best]; ring.setAttribute('cx', x(p.x)); ring.setAttribute('cy', y(p.y)); ring.setAttribute('visibility', 'visible');
        tipShow(e, { title: p.label || '', rows: [{ color: colOf(p), value: fy(p.y), label: o.yName || 'y' }, { value: fx(p.x), label: o.xName || 'x' }], note: p.tip });
      });
      hit.addEventListener('pointerleave', () => { ring.setAttribute('visibility', 'hidden'); tipHide(); });
      svg.appendChild(hit);
      root.appendChild(svg);
    }, o);
  }

  /* ---------- gantt ---------- */
  let patId = 0;
  function gantt(o) {
    const rows = o.rows || [];
    return chart('c-gantt', (root, W) => {
      const used = new Set(); let hatch = false; const markLabels = new Map();
      rows.forEach((r) => { (r.bars || []).forEach((b) => { if (b.holder) used.add(b.holder); if (b.hatch) hatch = true; }); (r.marks || []).forEach((m) => m.label && markLabels.set(m.label, m.color || colors.ink)); });
      const items = o.legend || [...used].sort((a, b) => Object.keys(colors.holder).indexOf(a) - Object.keys(colors.holder).indexOf(b)).map((k) => ({ label: k, color: colors.holder[k] })).concat(hatch ? [{ label: 'On hold', shape: 'hatch', color: colors.mute }] : []).concat([...markLabels].map(([l, c]) => ({ label: l, shape: 'tick', color: c })));
      if (items.length) root.appendChild(legend(items));
      if (!rows.length) { root.appendChild(emptyNode(o.empty)); return; }
      const DAYMS = 864e5, start = o.start || new Date(Math.min(...rows.flatMap((r) => r.bars.map((b) => +b.start)))), end = o.end || new Date(Math.max(...rows.flatMap((r) => r.bars.map((b) => +(b.end || o.today || new Date())))));
      const labelW = Math.min(Math.max(...rows.map((r) => Math.max(tw(r.label, 12, 600), r.sub ? tw(r.sub, 11) : 0))) + 14, W * 0.32);
      const rowH = o.rowHeight || (rows.some((r) => r.sub) ? 32 : 24), top = 22, H = top + rows.length * rowH + 4, svg = svgRoot(W, H), x0 = labelW, x1 = W - 6;
      const x = (d) => x0 + ((+d - +start) / (+end - +start || 1)) * (x1 - x0);
      const defs = s('defs'); svg.appendChild(defs); const pats = {};
      const patFor = (c) => { if (pats[c]) return pats[c]; const id = 'c-hatch-' + ++patId; const p = s('pattern', { id, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }); p.appendChild(s('rect', { width: 5, height: 5, fill: mix(c, '#ffffff', 0.8) })); p.appendChild(s('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: c, 'stroke-width': 2 })); defs.appendChild(p); return (pats[c] = `url(#${id})`); };
      // ticks: weeks for short spans, months for long
      const days = (+end - +start) / DAYMS, ticks = [];
      if (days <= 84) { let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); while (d.getDay() !== 1) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); for (; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) ticks.push(d); }
      else { for (let d = new Date(start.getFullYear(), start.getMonth() + 1, 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) ticks.push(d); }
      const tickW = Math.max(...ticks.map((t) => tw(fmtDate(t), 11)), 30) + 8, every = Math.max(1, Math.ceil(tickW / Math.max(1, ((x1 - x0) / Math.max(1, ticks.length))))) ;
      const todayX = o.today && o.today >= start && o.today <= end ? x(o.today) : null;
      ticks.forEach((t, i) => { svg.appendChild(s('line', { x1: x(t), x2: x(t), y1: top - 4, y2: H - 4, stroke: colors.grid })); if (i % every === 0 && (todayX == null || x(t) + tickW < todayX - 4 || x(t) > todayX + 40)) svg.appendChild(stext(x(t) + 3, 12, days <= 84 ? fmtDate(t) : MON[t.getMonth()] + (t.getMonth() === 0 ? ' ' + t.getFullYear() : ''), { class: 'c-tick' })); });
      rows.forEach((r, i) => {
        const y0 = top + i * rowH, yc = y0 + rowH / 2;
        if (r.sub) { svg.appendChild(stext(0, yc - 2, clip(r.label, labelW - 10, 12, 600), { class: 'c-lab strong' })); svg.appendChild(stext(0, yc + 11, clip(r.sub, labelW - 10, 11), { class: 'c-tick' })); }
        else svg.appendChild(stext(0, yc + 4, clip(r.label, labelW - 10, 12, 600), { class: 'c-lab strong' }));
        svg.appendChild(s('line', { x1: 0, x2: W, y1: y0 + rowH - 0.5, y2: y0 + rowH - 0.5, stroke: colors.grid, 'stroke-width': 0.6 }));
        (r.bars || []).forEach((b) => {
          const bs = new Date(Math.max(+b.start, +start)), be = new Date(Math.min(+(b.end || o.today || end), +end)); if (be < bs) return;
          const col = b.color || colors.holder[b.holder] || colors.one, xa = x(bs), xb = Math.max(xa + 2, x(be));
          const rect = s('rect', { x: xa, y: yc - 6, width: Math.max(2, xb - xa - 1), height: 12, rx: 3, fill: b.hatch ? patFor(col) : b.light ? mix(col, '#ffffff', 0.7) : col, class: 'c-mark' });
          hover(rect, () => ({ title: r.label + (b.label ? ', ' + b.label : ''), rows: [{ color: col, shape: 'rect', value: `${fmtDate(b.start)} to ${b.end ? fmtDate(b.end) : 'today'}`, label: b.holder || '' }], note: b.tip }));
          svg.appendChild(rect);
        });
        (r.marks || []).forEach((m) => { if (m.date < start || m.date > end) return; const mx = x(m.date), c = m.color || colors.ink; const p = s('path', { d: `M${mx},${yc - 8}l4,4l-4,4l-4,-4Z`, fill: c, stroke: '#ffffff', 'stroke-width': 1 }); hover(p, () => ({ title: r.label, rows: [{ color: c, value: fmtDate(m.date), label: m.label || '' }] })); svg.appendChild(p); });
        if (r.tip) { const hit = s('rect', { x: 0, y: y0, width: labelW, height: rowH, fill: 'transparent' }); hover(hit, () => ({ title: r.label, note: r.tip })); svg.appendChild(hit); }
      });
      const today = o.today; if (today && today >= start && today <= end) { const tx = x(today); svg.appendChild(s('line', { x1: tx, x2: tx, y1: top - 6, y2: H - 2, stroke: colors.focus, 'stroke-width': 1.5 })); svg.appendChild(stext(tx > W - 40 ? tx - 3 : tx + 3, 12, 'Today', { class: 'c-tick strong', 'text-anchor': tx > W - 40 ? 'end' : 'start' })); }
      root.appendChild(svg);
    }, o);
  }

  /* ---------- calendar strip ---------- */
  function calendarStrip(o) {
    const n = o.days || 14, start = o.start || new Date(), items = o.items || [], box = h('div', 'c-cal'), maxPer = o.maxPerDay || 4;
    const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const used = new Map(); items.forEach((it) => { if (it.legend) used.set(it.legend, it.color || colors.holder[it.holder] || colors.one); });
    if (used.size) box.appendChild(legend([...used].map(([l, c]) => ({ label: l, color: c }))));
    const grid = h('div', 'c-cal-grid');
    for (let k = 0; k < n; k++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k), we = d.getDay() === 0 || d.getDay() === 6;
      if (o.skipWeekends && we) continue;
      const day = h('div', 'c-day' + (we ? ' we' : '') + (o.today && same(d, o.today) ? ' today' : ''));
      day.appendChild(h('div', 'c-day-h', `${DN[d.getDay()]} ${d.getDate()}${k === 0 || d.getDate() === 1 ? ' ' + MON[d.getMonth()] : ''}`));
      const list = items.filter((it) => same(it.date, d));
      list.slice(0, maxPer).forEach((it) => {
        const row = h('div', 'c-ev'); const bar = h('i'); bar.style.background = it.color || colors.holder[it.holder] || colors.one; row.appendChild(bar);
        const t = h('span', null, it.label); row.appendChild(t); if (it.sub) row.appendChild(h('small', null, it.sub));
        hover(row, () => ({ title: it.label, rows: it.rows || [], note: [it.sub, it.tip].filter(Boolean).join('. ') }));
        day.appendChild(row);
      });
      if (list.length > maxPer) day.appendChild(h('div', 'c-ev more', `and ${list.length - maxPer} more`));
      if (!list.length && o.emptyDay) day.appendChild(h('div', 'c-ev none', o.emptyDay));
      grid.appendChild(day);
    }
    box.appendChild(grid);
    return box;
  }

  /* ---------- pace bar ---------- */
  function paceBar(o) {
    return chart('c-pace', (root, W) => {
      const f = makeFmt(o), segs = o.segments || [{ name: o.label || 'Value', value: o.value, color: o.color || colors.focus }];
      const total = o.value != null ? o.value : segs.reduce((t, x) => t + (x.value || 0), 0);
      const head = h('div', 'c-pace-head'); head.appendChild(h('b', null, f(total))); head.appendChild(h('span', null, o.target != null ? `of ${f(o.target)}${o.targetLabel ? ' ' + o.targetLabel : ''}` : o.label || '')); root.appendChild(head);
      const max = o.max || Math.max(total, o.target || 0, ...(o.markers || []).map((m) => m.value)) * 1.08 || 1, H = 40, svg = svgRoot(W, H), x = (v) => 1 + (v / max) * (W - 2);
      svg.appendChild(s('rect', { x: 1, y: 8, width: W - 2, height: 12, rx: 6, fill: '#eef1ef' }));
      let acc = 0; const nz = segs.filter((sg) => sg.value > 0), last = nz[nz.length - 1];
      segs.forEach((sg, k) => { if (!(sg.value > 0)) return; const xa = x(acc) + (acc > 0 ? 1 : 0), xb = x(acc + sg.value) - (sg === last ? 0 : 1); const col = sg.color || seriesColor(sg, k); const p = s('path', { d: barPath(xa, 8, Math.max(1, xb - xa), 12, sg === last ? 'r' : null, 6), fill: col, class: 'c-mark' }); hover(p, () => ({ title: sg.name, rows: [{ color: col, shape: 'rect', value: f(sg.value), label: sg.name }] })); svg.appendChild(p); acc += sg.value; });
      if (o.target != null) { const tx = x(o.target); svg.appendChild(s('line', { x1: tx, x2: tx, y1: 3, y2: 25, stroke: colors.ink, 'stroke-width': 2 })); const l = o.targetName || f(o.target), lw = tw(l, 11); svg.appendChild(stext(Math.max(lw / 2, Math.min(W - lw / 2, tx)), 37, l, { 'text-anchor': 'middle', class: 'c-tick' })); }
      (o.markers || []).forEach((m) => { const mx = x(m.value); svg.appendChild(s('line', { x1: mx, x2: mx, y1: 5, y2: 23, stroke: m.color || colors.mute, 'stroke-width': 1.5 })); });
      root.appendChild(svg);
      if (segs.length > 1) root.appendChild(legend(segs.map((sg, k) => ({ label: sg.name, color: sg.color || seriesColor(sg, k) }))));
    }, o);
  }

  /* ---------- range bar with markers ---------- */
  function rangeBar(o) {
    const rows = o.rows || [];
    return chart('c-range', (root, W) => {
      const mk = new Map(); rows.forEach((r) => (r.markers || []).forEach((m, i) => mk.set(m.label, m.color || CAT[i])));
      const items = [{ label: o.rangeLabel || '20th to 80th percentile', color: mix(o.color || colors.one, '#ffffff', 0.65) }].concat([...mk].map(([l, c]) => ({ label: l, color: c, shape: 'dot' })));
      root.appendChild(legend(items));
      if (!rows.length) { root.appendChild(emptyNode(o.empty)); return; }
      const labelW = Math.min(Math.max(...rows.map((r) => tw(r.label, 12, 600))) + 14, W * 0.3), rowH = 52, H = rows.length * rowH + 4, svg = svgRoot(W, H);
      rows.forEach((r, i) => {
        const f = makeFmt({ unit: r.unit != null ? r.unit : o.unit, fmt: r.fmt || o.fmt, dec: r.dec != null ? r.dec : o.dec != null ? o.dec : 0 }), vals = [r.low, r.high, ...(r.markers || []).map((m) => m.value)].filter((v) => v != null);
        const max = r.max || o.max || Math.max(...vals) * 1.15 || 1, x0 = labelW, x1 = W - 12, x = (v) => x0 + (Math.max(0, Math.min(v, max)) / max) * (x1 - x0), yc = i * rowH + 24;
        svg.appendChild(stext(0, yc + 4, clip(r.label, labelW - 10, 12, 600), { class: 'c-lab strong' }));
        svg.appendChild(s('rect', { x: x0, y: yc - 2, width: x1 - x0, height: 4, rx: 2, fill: '#eef1ef' }));
        if (r.low != null && r.high != null) {
          svg.appendChild(s('rect', { x: x(r.low), y: yc - 7, width: Math.max(2, x(r.high) - x(r.low)), height: 14, rx: 7, fill: mix(o.color || colors.one, '#ffffff', 0.65) }));
          svg.appendChild(stext(x(r.low), yc + 22, f(r.low), { 'text-anchor': 'middle', class: 'c-tick' }));
          svg.appendChild(stext(x(r.high), yc + 22, f(r.high), { 'text-anchor': 'middle', class: 'c-tick' }));
        }
        (r.markers || []).forEach((m, k) => {
          const c = m.color || mk.get(m.label) || CAT[k], mx = x(m.value), over = m.value > max;
          const dotEl = s('circle', { cx: mx, cy: yc, r: 6, fill: c, stroke: '#ffffff', 'stroke-width': 2 });
          hover(dotEl, () => ({ title: r.label, rows: [{ color: c, value: f(m.value), label: m.label }].concat(r.low != null ? [{ value: `${f(r.low)} to ${f(r.high)}`, label: o.rangeLabel || '20th to 80th percentile' }] : []) }));
          svg.appendChild(dotEl);
          const lbl = (over ? 'over ' : '') + f(m.value), lw = tw(lbl, 11, 600);
          svg.appendChild(stext(Math.max(x0 + lw / 2, Math.min(W - lw / 2, mx)), yc - 11 - (k % 2) * 0, lbl, { 'text-anchor': 'middle', class: 'c-val small strong' }));
        });
      });
      root.appendChild(svg);
    }, o);
  }

  /* ---------- small multiples ---------- */
  function smallMultiples(o) {
    const box = h('div', 'c-multi'); box.style.setProperty('--min', (o.min || 200) + 'px');
    if (o.legend) box.appendChild(legend(o.legend));
    const grid = h('div', 'c-multi-grid');
    (o.items || []).forEach((it) => { const cell = h('div', 'c-multi-cell'); cell.appendChild(h('div', 'c-multi-t', it.title)); if (it.sub) cell.appendChild(h('div', 'c-multi-s', it.sub)); cell.appendChild(it.chart || it.node || emptyNode()); grid.appendChild(cell); });
    box.appendChild(grid);
    return box;
  }

  /* ---------- flow (arc diagram between a few nodes) ---------- */
  let flowId = 0;
  function flow(o) {
    const nodes = o.nodes || [], links = (o.links || []).filter((l) => l.value > 0 && l.from !== l.to);
    return chart('c-flow', (root, W) => {
      if (!links.length) { root.appendChild(emptyNode(o.empty)); return; }
      const f = makeFmt(o), max = Math.max(...links.map((l) => l.value)), colOf = (n) => (o.colors && o.colors[n]) || colors.holder[n] || colors.one;
      const n = nodes.length, padX = 40, gap = (W - 2 * padX) / Math.max(1, n - 1), xn = (k) => padX + k * gap, base = o.height ? o.height / 2 : 104, H = base * 2;
      const svg = svgRoot(W, H), defs = s('defs'); svg.appendChild(defs);
      const arrowFor = {}; nodes.forEach((nd) => { const id = 'c-arrow-' + ++flowId; const m = s('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: 'userSpaceOnUse', orient: 'auto' }); m.appendChild(s('path', { d: 'M0,0L10,5L0,10Z', fill: colOf(nd) })); defs.appendChild(m); arrowFor[nd] = `url(#${id})`; });
      const sorted = links.slice().sort((a, b) => b.value - a.value), labelMin = sorted[Math.min(sorted.length - 1, (o.labelTop || 6) - 1)].value;
      sorted.slice().reverse().forEach((l) => {
        const a = nodes.indexOf(l.from), b = nodes.indexOf(l.to); if (a < 0 || b < 0) return;
        const fwd = b > a, off = fwd ? 6 : -6, xa = xn(a) + off, xb = xn(b) - off, hgt = 16 + (base - 34) * (Math.abs(b - a) / Math.max(1, n - 1)), y = fwd ? base - 12 : base + 12, cy = fwd ? y - hgt * 2 : y + hgt * 2;
        const d = `M${xa},${y}Q${(xa + xb) / 2},${cy} ${xb},${y}`, wdt = 1.5 + 6.5 * (l.value / max), col = colOf(l.from);
        svg.appendChild(s('path', { d, fill: 'none', stroke: col, 'stroke-width': wdt, 'stroke-opacity': 0.5, 'marker-end': arrowFor[l.from], 'stroke-linecap': 'round' }));
        const hit = s('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': Math.max(14, wdt + 8) });
        hover(hit, () => ({ title: `${l.from} to ${l.to}`, rows: [{ color: col, value: f(l.value), label: o.valueLabel || 'changes' }], note: l.tip }));
        svg.appendChild(hit);
        if (l.value >= labelMin) { const ly = fwd ? y - hgt - 4 : y + hgt + 12; svg.appendChild(stext((xa + xb) / 2, ly, f(l.value), { 'text-anchor': 'middle', class: 'c-val small halo' })); }
      });
      nodes.forEach((nd, k) => {
        const outV = links.filter((l) => l.from === nd).reduce((t, l) => t + l.value, 0), inV = links.filter((l) => l.to === nd).reduce((t, l) => t + l.value, 0);
        const g = s('g'); g.appendChild(s('rect', { x: xn(k) - 34, y: base - 11, width: 68, height: 22, rx: 11, fill: colOf(nd) }));
        g.appendChild(stext(xn(k), base + 4, clip(nd, 62, 11, 600), { 'text-anchor': 'middle', class: 'c-in', fill: inkOn(colOf(nd)) }));
        hover(g, () => ({ title: nd, rows: [{ value: f(outV), label: 'out' }, { value: f(inV), label: 'in' }] }));
        svg.appendChild(g);
      });
      root.appendChild(svg);
      root.appendChild(h('p', 'c-note', o.caption || 'Arcs above run left to right, arcs below run right to left. Width is the count.'));
    }, o);
  }

  /* ---------- yes/no grid ---------- */
  function grid(o) {
    const rows = o.rows || [], cols = o.cols || [], box = h('div', 'c-yn');
    const states = Object.assign({ yes: { label: 'Yes', color: colors.status.good, glyph: '✓' }, no: { label: 'No', color: colors.status.bad, glyph: '✕' } }, o.states || {});
    box.appendChild(legend(Object.values(states).map((x) => ({ label: x.label, color: x.color })).concat(o.blankLabel ? [{ label: o.blankLabel, color: '#f1f3f2' }] : [])));
    if (!rows.length) { box.appendChild(emptyNode(o.empty)); return box; }
    const g = h('div', 'c-yn-grid'); g.style.gridTemplateColumns = `minmax(60px, max-content) repeat(${cols.length}, minmax(22px, 1fr))`;
    g.appendChild(h('span')); cols.forEach((c) => g.appendChild(h('span', 'c-yn-col', c)));
    rows.forEach((r, ri) => {
      const lab = h('span', 'c-yn-row', typeof r === 'string' ? r : r.label); if (r.sub) lab.appendChild(h('small', null, r.sub)); g.appendChild(lab);
      cols.forEach((c, ci) => {
        let v = o.cell ? o.cell(ri, ci) : o.cells ? o.cells[ri][ci] : null, tipTxt = null;
        if (v && typeof v === 'object') { tipTxt = v.tip; v = v.state; }
        const st = v === true ? states.yes : v === false ? states.no : v ? states[v] : null;
        const cell = h('span', 'c-yn-cell' + (st ? '' : ' blank'), st ? st.glyph || '' : '');
        if (st) { cell.style.background = st.color; cell.style.color = inkOn(st.color); }
        hover(cell, () => ({ title: `${typeof r === 'string' ? r : r.label}, ${c}`, rows: [{ color: st ? st.color : null, value: st ? st.label : o.blankLabel || 'Not applicable' }], note: tipTxt }));
        g.appendChild(cell);
      });
    });
    box.appendChild(g);
    return box;
  }

  /* ---------- export preview ---------- */
  function exportPreview(o) {
    const box = h('div', 'c-export'), cols = o.columns || [], rows = o.rows || [];
    box.appendChild(table({ columns: cols.map((c) => Object.assign({ sortable: false }, c)), rows: rows.slice(0, o.max || 6), sortable: false, dense: true }));
    const foot = h('div', 'c-export-foot');
    foot.appendChild(h('span', 'c-note', `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}${rows.length > (o.max || 6) ? `, showing ${o.max || 6}` : ''}`));
    const csvCell = (v) => { if (v instanceof Date) v = `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`; v = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    foot.appendChild(button(o.label || 'Download CSV', () => {
      const lines = [cols.map((c) => csvCell(c.label)).join(',')].concat(rows.map((r) => cols.map((c) => csvCell(c.csv ? c.csv(r) : c.value ? c.value(r) : r[c.key])).join(',')));
      const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' }), a = h('a'); a.href = URL.createObjectURL(blob); a.download = o.filename || 'export.csv';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }, { primary: true }));
    box.appendChild(foot);
    return box;
  }

  /* ---------- split ---------- */
  function split(nodes, o) {
    o = o || {};
    const box = h('div', 'c-split ' + (o.dir === 'col' ? 'col' : 'row'));
    if (o.dir !== 'col') box.style.setProperty('--cols', (o.widths || nodes.map(() => 1)).map((w) => `minmax(0, ${w}fr)`).join(' '));
    nodes.filter(Boolean).forEach((n) => { const cell = h('div', 'c-split-cell'); cell.appendChild(n); box.appendChild(cell); });
    return box;
  }

  window.C = {
    colors, tile, tiles, list, table, bar, stackedBar, pairedBar, line, stackedArea, boxPlot, histogram, heatmap, scatter, gantt, calendarStrip, paceBar, rangeBar, smallMultiples, flow, grid, legend, note, exportPreview, split,
    chip, dot, pill, stageCell, select, button, empty: emptyNode, fmtNum, fmtDate, quartiles: quart,
  };

  /* ---------- renderer registry ---------- */
  const R = {}, OPT = {}, errors = [];
  window.DASH = {
    chart(id, fn, opts) { R[id] = fn; OPT[id] = opts || {}; },
    has: (id) => !!R[id],
    ids: () => Object.keys(R),
    options: (id) => OPT[id] || {},
    errors,
    render(id, el) {
      if (!R[id]) return 'missing';
      try {
        R[id](el, { D: window.D, C: window.C, today: window.D.today, me: window.D.me });
        if (OPT[id].wide) el.dataset.wide = '1';
        return 'ok';
      } catch (e) {
        errors.push({ id, message: String((e && e.message) || e) });
        el.replaceChildren(note('This chart failed to draw: ' + ((e && e.message) || e), { tone: 'bad' }));
        el.dataset.error = '1';
        if (window.console) console.error(id, e);
        return 'error';
      }
    },
  };
})();
