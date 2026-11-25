/* Task 6: Training & ramp-up (TRN), Customers & industries (CUS), Team time (TEAM), Intake & demand (IN), Data health (DH). */
(function () {
  'use strict';
  const D = window.D, C = window.C, DASH = window.DASH;
  const T = D.today;

  // ---------- shared data ----------
  const HT = D.entries.filter(D.isHT);
  const jobs = D.wos.filter((w) => !w.rev);
  const delivered = jobs.filter((w) => D.deliveredAt(w));
  const custNames = D.customers.map((c) => c.name);
  const hrs = (a) => D.sum(a.map((e) => e.hours));
  const med = (a) => D.median(a);
  const inP = (d, p) => D.inRange(d, p);
  const isTraining = (e) => !!e.training;

  // local helper: drill-down with a select that redraws a body
  function drill(el, label, options, def, draw) {
    const body = document.createElement('div');
    const put = (v) => { body.innerHTML = ''; body.appendChild(draw(v)); };
    el.appendChild(C.select({ label, options, value: def, onChange: put }));
    el.appendChild(body);
    put(def);
  }
  const dash = (v, f) => (v == null || (typeof v === 'number' && isNaN(v)) ? 'None' : f ? f(v) : String(v));
  // empty state plus muted example rows (real records that do NOT match the rule)
  function emptyWithExamples(el, msg, rows) {
    el.appendChild(C.list({ rows: [], empty: msg }));
    if (rows.length) {
      el.appendChild(C.note('Example rows, not matches:'));
      el.appendChild(C.list({ rows: rows.map((r) => Object.assign({}, r, { chips: [C.chip('Example row', 'mute')] })), max: 2 }));
    }
  }
  const pctS = (v) => Math.round(v * 100) + '%';

  // month-since-start windows (30 days each)
  function ramp(p) {
    const out = [];
    for (let m = 0; ; m++) {
      const a = D.addDays(p.start, m * 30), b = D.addDays(p.start, (m + 1) * 30);
      if (a > T) break;
      out.push({ m, a, b, partial: b > T, noData: a < D.entriesStart });
    }
    return out;
  }
  const rampLabels = (n) => Array.from({ length: n }, (_, i) => 'Month ' + (i + 1));
  const personCol = (name, i) => C.colors.cat[i % C.colors.cat.length];

  // ---------- TRN ----------
  DASH.chart('TRN-1', (el) => {
    const ms = D.months(8).filter((m) => m.end >= D.entriesStart);
    const tr = HT.filter(isTraining);
    const val = (kind, m) => hrs(tr.filter((e) => e.training.kind === kind && inP(e.date, m)));
    el.appendChild(C.line({
      x: ms.map((m) => m.label), unit: ' h', dec: 0, yMin: 0,
      grey: (s, i) => i === ms.length - 1, greyLabel: 'Month not finished',
      series: [
        { name: 'Received', color: C.colors.cat[0], values: ms.map((m) => val('Received', m)) },
        { name: 'Administered', color: C.colors.cat[1], values: ms.map((m) => val('Administered', m)) },
      ],
    }));
  });

  DASH.chart('TRN-2', (el) => {
    const tr = HT.filter(isTraining);
    const by = D.hoursBy(tr, (e) => e.training.category);
    el.appendChild(C.bar({
      unit: ' h', sort: 'desc', seriesName: 'training hours',
      data: D.TRAINING_CATS.map((c) => ({ label: c, value: by[c] || 0 })),
    }));
  });

  DASH.chart('TRN-3', (el) => {
    const hires = D.people.filter((p) => p.role === 'Engineer' && p.start.getFullYear() === 2026);
    const n = Math.max(...hires.map((p) => ramp(p).length));
    const x = rampLabels(n);
    const per = (p, f) => { const r = ramp(p); return Array.from({ length: n }, (_, i) => (i < r.length && !r[i].noData ? f(r[i]) : null)); };
    const mine = (p, r) => HT.filter((e) => e.person === p.name && e.date >= r.a && e.date < r.b);
    const trainH = hires.map((p) => per(p, (r) => hrs(mine(p, r).filter(isTraining))));
    const woSh = hires.map((p) => per(p, (r) => { const a = mine(p, r), t = hrs(a); return t ? hrs(a.filter((e) => e.wo)) / t : null; }));
    const exp = D.engineers.filter((nm) => !hires.some((h) => h.name === nm));
    const allExp = HT.filter((e) => exp.includes(e.person));
    const expShare = hrs(allExp.filter((e) => e.wo)) / hrs(allExp);
    const grey = (si, xi) => { const r = ramp(hires[si]); return !!(r[xi] && r[xi].partial); };
    const series = (vals) => hires.map((p, i) => ({ name: p.name + ' (from ' + D.fmt(p.start) + ')', color: personCol(p.name, i), values: vals[i] }));
    el.appendChild(C.split([
      C.line({ x, series: series(trainH), unit: ' h', yMin: 0, grey, greyLabel: 'Month not finished', height: 150 }),
      C.line({ x, series: series(woSh), pct: true, yMin: 0, yMax: 1, grey, greyLabel: 'Month not finished', height: 150, target: { value: expShare, label: 'Experienced engineers' } }),
    ], { dir: 'col' }));
    el.insertBefore(C.note('Top: training received, hours. Bottom: share of hours on WOs. Months with no time data (before April 2026) are blank.'), el.firstChild);
    el.dataset.wide = '1';
  });

  DASH.chart('TRN-4', (el) => {
    const ms = D.months(6);
    const tr = HT.filter((e) => e.training && e.training.kind === 'Administered');
    const rows = D.people.map((p) => {
      const r = { person: p.name };
      ms.forEach((m, i) => (r['m' + i] = hrs(tr.filter((e) => e.person === p.name && inP(e.date, m)))));
      r.total = D.sum(ms.map((m, i) => r['m' + i]));
      return r;
    }).filter((r) => r.total > 0);
    el.appendChild(C.table({
      rows, sort: { key: 'total', dir: -1 }, dense: true,
      columns: [{ key: 'person', label: 'Person' }]
        .concat(ms.map((m, i) => ({ key: 'm' + i, label: m.label, num: true, dec: 0, fmt: (v) => (v ? D.num(v, 1) : '') })))
        .concat([{ key: 'total', label: 'Total', num: true, fmt: (v) => D.num(v, 1) }]),
    }));
    el.appendChild(C.note('Hours of training administered.'));
  });

  DASH.chart('TRN-5', (el) => {
    const tr = HT.filter(isTraining);
    const by = D.hoursBy(tr, (e) => e.genClass || 'General');
    el.appendChild(C.bar({
      unit: ' h', sort: 'desc', seriesName: 'training hours',
      data: Object.keys(by).map((k) => ({ label: k, value: by[k] })),
    }));
  });

  DASH.chart('TRN-6', (el) => {
    const hires = D.people.filter((p) => p.role === 'Engineer' && p.start.getFullYear() === 2026);
    const rows = hires.map((p) => {
      const r = { person: p.name, start: p.start };
      D.types.forEach((t) => {
        const ds = delivered.filter((w) => w.eng === p.name && w.type === t && D.deliveredAt(w) >= p.start).map((w) => D.deliveredAt(w)).sort((a, b) => a - b);
        r[t] = ds.length ? D.between(p.start, ds[0]) : null;
      });
      return r;
    });
    el.appendChild(C.table({
      rows,
      columns: [{ key: 'person', label: 'New hire' }, { key: 'start', label: 'Started', value: (r) => r.start, fmt: (v) => D.fmt(v) }]
        .concat(D.types.map((t) => ({ key: t, label: t, num: true, fmt: (v) => dash(v, (x) => x + ' d') }))),
    }));
    el.appendChild(C.note('Days from start date to the first delivered job of that type as assigned engineer. "None" means not yet.'));
  });

  DASH.chart('TRN-7', (el) => {
    const hires = D.people.filter((p) => p.role === 'Engineer' && p.start.getFullYear() === 2026);
    const trips = (w) => {
      const by = D.groupBy(D.visits(w).filter((v) => v.kind === 'Review' && v.loop), (v) => v.loop);
      return { n: Object.keys(by).length, t: D.sum(Object.values(by).map((a) => Math.max(0, a.length - 1))) };
    };
    const reviewed = jobs.filter((w) => trips(w).n > 0);
    const team = reviewed.filter((w) => !hires.some((h) => h.name === w.eng) && w.created >= D.addDays(T, -365));
    const teamMean = D.mean(team.map((w) => trips(w).t));
    const n = Math.max(...hires.map((p) => ramp(p).length));
    const cells = hires.map((p) => ramp(p).map((r) => reviewed.filter((w) => w.eng === p.name && (w.assignedAt || w.created) >= r.a && (w.assignedAt || w.created) < r.b)));
    el.appendChild(C.line({
      x: rampLabels(n), unit: '', dec: 1, yMin: 0, greyLabel: 'Fewer than 2 reviewed jobs',
      grey: (si, xi) => !!(cells[si][xi] && cells[si][xi].length < 2),
      target: { value: teamMean, label: 'Team average' },
      series: hires.map((p, i) => ({ name: p.name, color: personCol(p.name, i), values: Array.from({ length: n }, (_, k) => (cells[i][k] && cells[i][k].length ? D.mean(cells[i][k].map((w) => trips(w).t)) : null)) })),
    }));
    el.appendChild(C.note('QC round-trips per reviewed job, by 30-day month since start date. Team average is the last 12 months, new hires excluded.'));
  });

  // ---------- CUS ----------
  const since12 = D.addDays(T, -365);
  const custStats = (name) => {
    const js = jobs.filter((w) => w.cust === name && w.created >= since12);
    const del = js.filter((w) => D.deliveredAt(w));
    const htJobs = js.filter(D.hasHT);
    const dueJobs = del.filter((w) => w.due);
    return {
      cust: name, industry: (D.customers.find((c) => c.name === name) || {}).industry, jobs: js.length,
      ht: hrs(js.flatMap((w) => D.entriesFor(w).filter(D.isHT))),
      mht: med(htJobs.map(D.humanTime)), mct: med(del.map(D.cycleTime)),
      wait: med(del.map((w) => D.holderDays(w).Customer)),
      ontime: dueJobs.length ? dueJobs.filter((w) => D.deliveredAt(w) <= w.due).length / dueJobs.length : null,
    };
  };

  DASH.chart('CUS-1', (el) => {
    el.dataset.wide = '1';
    el.appendChild(C.table({
      rows: custNames.map(custStats), sort: { key: 'jobs', dir: -1 }, dense: true,
      columns: [
        { key: 'cust', label: 'Customer' }, { key: 'industry', label: 'Industry' },
        { key: 'jobs', label: 'Jobs', num: true },
        { key: 'ht', label: 'Human Time', num: true, fmt: (v) => D.num(v, 0) + ' h' },
        { key: 'mht', label: 'Median Human Time per job', num: true, fmt: (v) => dash(v, (x) => D.num(x, 1) + ' h') },
        { key: 'mct', label: 'Median Cycle Time', num: true, fmt: (v) => dash(v, (x) => x + ' d') },
        { key: 'wait', label: 'Median customer wait', num: true, fmt: (v) => dash(v, (x) => x + ' d') },
        { key: 'ontime', label: 'On time', num: true, fmt: (v) => dash(v, pctS) },
      ],
    }));
    el.appendChild(C.note('Jobs created in the last 12 months. Human Time counts only jobs created since April 2026.'));
  });

  DASH.chart('CUS-2', (el) => {
    const qs = D.quarters(6);
    const inds = D.INDUSTRIES;
    const jobsQ = (q, i) => jobs.filter((w) => w.industry === i && inP(w.created, q)).length;
    const qh = D.quarters(8).filter((q) => q.end >= D.entriesStart);
    const htQ = (q, i) => hrs(HT.filter((e) => e.wo && inP(e.date, q) && (D.byKey(e.wo) || {}).industry === i));
    const mkSeries = (qq, f) => inds.map((i) => ({ name: i, color: C.colors.industry[i], values: qq.map((q) => f(q, i)) }));
    el.appendChild(C.split([
      C.stackedBar({ categories: qs.map((q) => q.label), series: mkSeries(qs, jobsQ), tips: undefined, height: 170 }),
      C.stackedBar({ categories: qh.map((q) => q.label), series: mkSeries(qh, htQ), unit: ' h', height: 170 }),
    ], { dir: 'row' }));
    el.insertBefore(C.note('Top: jobs created per quarter. Bottom: Human Time hours per quarter (from April 2026). Q4 2026 is not finished.'), el.firstChild);
  });

  DASH.chart('CUS-3', (el) => {
    el.dataset.wide = '1';
    const ms = D.months(12);
    const top = custNames.map((c) => ({ c, n: jobs.filter((w) => w.cust === c && w.created >= ms[0].start).length })).sort((a, b) => b.n - a.n).slice(0, 8).map((o) => o.c);
    const vals = top.map((c) => ms.map((m) => jobs.filter((w) => w.cust === c && inP(w.created, m)).length));
    const yMax = Math.max(4, ...vals.flat());
    el.appendChild(C.smallMultiples({
      items: top.map((c, i) => ({
        title: c, sub: D.sum(vals[i]) + ' jobs',
        chart: C.line({ x: ms.map((m) => m.label), series: [{ name: c, color: C.colors.one, values: vals[i] }], yMax, yMin: 0, height: 90 }),
      })),
    }));
    el.appendChild(C.note('Jobs created per month, last 12 months, on one shared scale.'));
  });

  DASH.chart('CUS-4', (el) => {
    el.dataset.wide = '1';
    const order = custNames.slice().sort((a, b) => jobs.filter((w) => w.cust === b).length - jobs.filter((w) => w.cust === a).length);
    const values = order.map((c) => D.types.map((t) => jobs.filter((w) => w.cust === c && w.type === t).length || null));
    el.appendChild(C.heatmap({ rows: order, cols: D.types, values, fmt: (v) => String(v), scaleLabel: 'Jobs', valueLabel: 'jobs' }));
  });

  DASH.chart('CUS-5', (el) => {
    const qs = D.quarters(6);
    const first = {};
    jobs.forEach((w) => { if (custNames.includes(w.cust) && (!first[w.cust] || w.created < first[w.cust])) first[w.cust] = w.created; });
    const active = (q) => [...new Set(jobs.filter((w) => custNames.includes(w.cust) && inP(w.created, q)).map((w) => w.cust))];
    const nw = qs.map((q) => active(q).filter((c) => inP(first[c], q)).length);
    const rep = qs.map((q, i) => active(q).length - nw[i]);
    el.appendChild(C.stackedBar({
      categories: qs.map((q) => q.label),
      series: [{ name: 'New customers', color: C.colors.cat[0], values: nw }, { name: 'Returning customers', color: C.colors.cat[1], values: rep }],
    }));
    el.appendChild(C.note('A customer is new in the quarter of its first WO on record (records start December 2024).'));
  });

  DASH.chart('CUS-6', (el) => {
    const def = D.sites.map((s) => s.cust).sort((a, b) => jobs.filter((w) => w.cust === b).length - jobs.filter((w) => w.cust === a).length)[0];
    drill(el, 'Customer', custNames, def, (c) => {
      const rows = D.sites.filter((s) => s.cust === c).map((s) => {
        const js = jobs.filter((w) => w.cust === c && w.site === s.name);
        return { site: s.name, jobs: js.length, ht: hrs(js.flatMap((w) => D.entriesFor(w).filter(D.isHT))), last: js.length ? js[js.length - 1].created : null };
      });
      return C.table({
        rows, sort: { key: 'jobs', dir: -1 }, dense: true,
        columns: [
          { key: 'site', label: 'Site' }, { key: 'jobs', label: 'Jobs', num: true },
          { key: 'ht', label: 'Human Time', num: true, fmt: (v) => (v ? D.num(v, 0) + ' h' : '') },
          { key: 'last', label: 'Last job', value: (r) => r.last, fmt: (v) => (v ? D.fmt(v, true) : 'None') },
        ],
      });
    });
  });

  DASH.chart('CUS-7', (el) => {
    el.dataset.wide = '1';
    const rows = D.wos.slice().sort((a, b) => b.created - a.created).map((w) => ({
      wo: D.label(w), cust: w.cust, site: w.site, industry: w.industry, type: w.type, phase: (w.phase || []).join(' / '),
      ht: D.hasHT(w) ? D.humanTime(w) : null,
      inv: w.invoices.map((i) => i.no).join('; '), invDate: w.invoices.map((i) => D.fmt(i.date, true)).join('; '),
    }));
    el.appendChild(C.exportPreview({
      rows, filename: 'hours-for-quickbooks.csv', max: 6,
      columns: [
        { key: 'wo', label: 'WO#' }, { key: 'cust', label: 'Customer' }, { key: 'site', label: 'Site' }, { key: 'industry', label: 'Industry' },
        { key: 'type', label: 'Type' }, { key: 'phase', label: 'Phase' },
        { key: 'ht', label: 'Human Time', num: true, fmt: (v) => (v == null ? '' : D.num(v, 2)), csv: (r) => (r.ht == null ? '' : r.ht) },
        { key: 'inv', label: 'Invoice numbers' }, { key: 'invDate', label: 'Invoice dates' },
      ],
    }));
  });

  DASH.chart('CUS-8', (el) => {
    el.dataset.wide = '1';
    const def = custNames.slice().sort((a, b) => jobs.filter((w) => w.cust === b).length - jobs.filter((w) => w.cust === a).length)[0];
    drill(el, 'Customer', custNames, def, (c) => {
      const all = D.wos.filter((w) => w.cust === c), js = all.filter((w) => !w.rev);
      const open = js.filter(D.open), del = js.filter((w) => D.deliveredAt(w) && D.deliveredAt(w) >= since12);
      const wait = js.filter((w) => w.created >= since12).reduce((s, w) => s + D.holderDays(w).Customer, 0);
      const htv = hrs(all.filter((w) => w.created >= since12).flatMap((w) => D.entriesFor(w).filter(D.isHT)));
      const oos = hrs(all.flatMap((w) => D.entriesFor(w).filter((e) => D.isHT(e) && e.oos)));
      const revs = all.filter((w) => w.rev && w.created >= since12).length;
      const tiles = C.tiles([
        { label: 'Open jobs', value: open.length },
        { label: 'Delivered', value: del.length, sub: 'Last 12 months' },
        { label: 'Human Time', value: D.num(htv, 0), unit: ' h', sub: 'Since April 2026' },
        { label: 'Median Cycle Time', value: dash(med(del.map(D.cycleTime)), (x) => x + ' d') },
        { label: 'Days waiting on them', value: wait, sub: 'Last 12 months' },
        { label: 'Out-of-scope hours', value: D.num(oos, 0), unit: ' h' },
        { label: 'Revisions', value: revs },
      ], { min: 110 });
      const list = C.list({
        max: 6, empty: 'No open jobs.',
        rows: open.sort((a, b) => D.daysIn(b) - D.daysIn(a)).map((w) => ({ title: D.label(w), text: w.type + ', ' + w.site, sub: D.st(w).name, holder: D.st(w).holder, value: D.daysIn(w) + ' d' })),
      });
      return C.split([tiles, list], { widths: [3, 2] });
    });
  });

  DASH.chart('CUS-9', (el) => {
    el.dataset.wide = '1';
    const names = D.sites.map((s) => s.name);
    const def = names.slice().sort((a, b) => D.wos.filter((w) => w.site === b).length - D.wos.filter((w) => w.site === a).length)[0];
    drill(el, 'Site', names, def, (s) => {
      const rows = D.wos.filter((w) => w.site === s).sort((a, b) => b.created - a.created).map((w) => ({
        wo: D.label(w), type: w.type, created: w.created, delivered: D.deliveredAt(w), eng: w.eng || 'Unassigned',
        ht: D.hasHT(w) ? D.humanTime(w) : null,
      }));
      return C.table({
        rows, dense: true, max: 8,
        columns: [
          { key: 'wo', label: 'WO' }, { key: 'type', label: 'Type' },
          { key: 'created', label: 'Created', value: (r) => r.created, fmt: (v) => D.fmt(v, true) },
          { key: 'delivered', label: 'Delivered', value: (r) => r.delivered, fmt: (v) => (v ? D.fmt(v, true) : 'Not yet') },
          { key: 'eng', label: 'Engineer' },
          { key: 'ht', label: 'Human Time', num: true, fmt: (v) => (v == null ? 'Not tracked' : D.num(v, 1) + ' h') },
        ],
      });
    });
  });

  DASH.chart('CUS-10', (el) => {
    const rows = custNames.map((c) => {
      const js = D.wos.filter((w) => w.cust === c).sort((a, b) => b.created - a.created);
      return { c, last: js[0] };
    }).filter((o) => o.last && o.last.created < since12 && o.last.created >= D.addDays(T, -365 * 3))
      .sort((a, b) => b.last.created - a.last.created)
      .map((o) => ({ title: o.c, text: 'Last job ' + D.label(o.last) + ', ' + o.last.type + ' at ' + o.last.site, value: D.fmt(o.last.created, true), chips: [C.chip(Math.round(D.between(o.last.created, T) / 30) + ' months quiet', 'warn')] }));
    el.appendChild(C.list({ rows, empty: 'No quiet customers.' }));
  });

  // ---------- TEAM ----------
  const teams = [...new Set(D.people.map((p) => p.team))];
  const offSet = new Set(D.timeOff.map((t) => t.person + '|' + D.iso(t.date)));
  const loggedSet = new Set(D.entries.map((e) => e.person + '|' + D.iso(e.date)));
  const byPW = D.groupBy(D.entries, (e) => e.person + '|' + D.weekKey(e.date));
  const missingDays = (p, wk) => {
    let n = 0;
    for (let i = 0; i < 5; i++) {
      const d = D.addDays(wk.start, i);
      if (d >= T) break;
      if (d < D.entriesStart || d < p.start || offSet.has(p.name + '|' + D.iso(d)) || loggedSet.has(p.name + '|' + D.iso(d))) continue;
      n++;
    }
    return n;
  };
  const weekEntries = (p, wk) => byPW[p.name + '|' + wk.key] || [];
  const isIn = (es) => es.length > 0 && es.every((e) => e.status === 'submitted' || e.status === 'approved');
  const isApproved = (es) => es.length > 0 && es.every((e) => e.status === 'approved');
  const offHours = (p, a, b) => 8 * D.timeOff.filter((t) => (!p || t.person === p) && t.date >= a && t.date <= b && t.date <= T).length;

  DASH.chart('TEAM-1', (el) => {
    const wk = D.weeks(2)[0];
    const rows = teams.map((t) => {
      const ps = D.people.filter((p) => p.team === t && p.start <= wk.end);
      return {
        team: t, people: ps.length,
        sub: ps.filter((p) => isIn(weekEntries(p, wk))).length / ps.length,
        appr: ps.filter((p) => isApproved(weekEntries(p, wk))).length / ps.length,
        miss: D.sum(ps.map((p) => missingDays(p, wk))),
      };
    });
    el.appendChild(C.table({
      rows, sort: { key: 'miss', dir: -1 },
      columns: [
        { key: 'team', label: 'Team' }, { key: 'people', label: 'People', num: true },
        { key: 'sub', label: 'Submitted', num: true, fmt: pctS },
        { key: 'appr', label: 'Approved', num: true, fmt: pctS },
        { key: 'miss', label: 'Missing working days', num: true },
      ],
    }));
    el.appendChild(C.note('Last week: ' + wk.long + '.'));
  });

  DASH.chart('TEAM-2', (el) => {
    const ms = D.months(8).filter((m) => m.end >= D.entriesStart);
    const val = (m, f) => hrs(HT.filter((e) => inP(e.date, m) && f(e)));
    const genAll = HT.filter((e) => !e.wo);
    const classes = [...new Set(genAll.map((e) => e.genClass))].sort((x, y) => hrs(genAll.filter((e) => e.genClass === y)) - hrs(genAll.filter((e) => e.genClass === x)));
    const top = classes.slice(0, 3);
    const tint = [0, 0.35, 0.6, 0.8];
    const genSer = top.map((c, i) => ({ name: 'General: ' + c, color: C.colors.mix(C.colors.split.General, C.colors.surface, tint[i]), values: ms.map((m) => val(m, (e) => !e.wo && e.genClass === c)) }));
    if (classes.length > 3) genSer.push({ name: 'General: other', color: C.colors.mix(C.colors.split.General, C.colors.surface, tint[3]), values: ms.map((m) => val(m, (e) => !e.wo && !top.includes(e.genClass))) });
    const ser = [
      { name: 'WO', color: C.colors.split.WO, values: ms.map((m) => val(m, (e) => e.wo && !e.oos)) },
      { name: 'Out of scope', color: C.colors.split['Out of scope'], values: ms.map((m) => val(m, (e) => e.wo && e.oos)) },
    ].concat(genSer).concat([
      { name: 'Time off', color: C.colors.split['Time off'], values: ms.map((m) => offHours(null, m.start < D.entriesStart ? D.entriesStart : m.start, m.end)) },
    ]);
    el.appendChild(C.stackedBar({ categories: ms.map((m) => m.label), series: ser, unit: ' h', totals: true }));
    el.appendChild(C.note('Whole company, hours. General is split by class (smaller classes folded into other); the last month is not finished.'));
  });

  DASH.chart('TEAM-3', (el) => {
    const gen = HT.filter((e) => !e.wo && !e.training);
    const byTask = D.hoursBy(gen, (e) => e.task);
    const tasks = Object.keys(byTask).sort((a, b) => byTask[b] - byTask[a]).slice(0, 8);
    const classes = [...new Set(gen.map((e) => e.genClass))].sort((a, b) => hrs(gen.filter((e) => e.genClass === b)) - hrs(gen.filter((e) => e.genClass === a))).slice(0, 8);
    const col = C.colors.pick(classes);
    el.appendChild(C.stackedBar({
      horizontal: true, categories: tasks, unit: ' h',
      series: classes.map((c) => ({ name: c, color: col[c], values: tasks.map((t) => hrs(gen.filter((e) => e.task === t && e.genClass === c))) })),
    }));
    el.appendChild(C.note('General hours by Task, split by General class. Training is left out.'));
  });

  DASH.chart('TEAM-4', (el) => {
    const ms = D.months(10).filter((m) => m.end >= D.entriesStart);
    const types = D.TIME_OFF_TYPES;
    const col = C.colors.pick(types);
    const cnt = (m, t) => D.timeOff.filter((x) => x.type === t && inP(x.date, m)).length;
    const perPerson = D.people.map((p) => ({ label: p.name, value: D.timeOff.filter((x) => x.person === p.name && x.type !== 'Holiday' && x.date >= ms[0].start).length })).filter((d) => d.value > 0);
    el.appendChild(C.split([
      C.stackedBar({ categories: ms.map((m) => m.label), series: types.map((t) => ({ name: t, color: col[t], values: ms.map((m) => cnt(m, t)) })), unit: ' d', height: 160 }),
      C.bar({ data: perPerson, sort: 'desc', unit: ' d', max: 8, seriesName: 'days off, not holidays' }),
    ], { dir: 'col' }));
    el.insertBefore(C.note('Top: days off by type per month, planned time off included. Bottom: days off per person over the same months, holidays left out.'), el.firstChild);
  });

  DASH.chart('TEAM-5', (el) => {
    const wks = D.weeks(5, false).slice(-4);
    const a = wks[0].start, b = wks[wks.length - 1].end;
    const rows = D.people.map((p) => {
      const es = HT.filter((e) => e.person === p.name && e.date >= a && e.date <= b);
      const r = { person: p.name, wo: hrs(es.filter((e) => e.wo && !e.oos)), oos: hrs(es.filter((e) => e.oos)), gen: hrs(es.filter((e) => !e.wo)), off: offHours(p.name, a, b) };
      r.tot = r.wo + r.oos + r.gen + r.off;
      return r;
    });
    const f = (v) => (v ? D.num(v, 1) : '');
    el.appendChild(C.table({
      rows, sort: { key: 'tot', dir: -1 }, dense: true, max: 10,
      columns: [
        { key: 'person', label: 'Person' },
        { key: 'wo', label: 'WO', num: true, fmt: f }, { key: 'oos', label: 'Out of scope', num: true, fmt: f },
        { key: 'gen', label: 'General', num: true, fmt: f }, { key: 'off', label: 'Time off', num: true, fmt: f },
        { key: 'tot', label: 'Total', num: true, fmt: f },
      ],
    }));
    el.appendChild(C.note('Hours, ' + D.fmt(a) + ' to ' + D.fmt(b) + ' (last four complete weeks).'));
  });

  DASH.chart('TEAM-6', (el) => {
    const wks = D.weeks(10, false).filter((w) => w.start >= D.entriesStart);
    const deadline = (w) => { const d = D.addDays(w.start, 7); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); };
    const share = (t, w) => {
      const ps = D.people.filter((p) => p.team === t && p.start <= w.end);
      if (!ps.length) return null;
      return ps.filter((p) => { const es = weekEntries(p, w); return es.length && es.every((e) => e.submittedAt && e.submittedAt <= deadline(w)); }).length / ps.length;
    };
    const col = C.colors.pick(teams);
    el.appendChild(C.line({
      x: wks.map((w) => w.label), pct: true, yMin: 0, yMax: 1,
      series: teams.map((t) => ({ name: t, color: col[t], values: wks.map((w) => share(t, w)) })),
    }));
    el.appendChild(C.note('Share of people whose week was submitted by Monday noon after it. Small teams swing in steps of one person.'));
  });

  DASH.chart('TEAM-7', (el) => {
    const since = D.addDays(T, -56);
    const seen = new Set(), by = {};
    D.entries.filter((e) => e.approvedAt && e.submittedAt && e.approvedAt >= since).forEach((e) => {
      const k = e.person + '|' + D.weekKey(e.date);
      if (seen.has(k)) return;
      seen.add(k);
      (by[e.approver] = by[e.approver] || []).push((e.approvedAt - e.submittedAt) / 86400000);
    });
    el.appendChild(C.bar({
      unit: ' d', dec: 1, sort: 'desc', seriesName: 'median wait', horizontal: true,
      data: Object.keys(by).map((a) => ({ label: a, value: med(by[a]), tip: a + ': ' + by[a].length + ' weeks approved' })),
    }));
    el.appendChild(C.note('Median days from Submit Week to approval, last 8 weeks.'));
  });

  // ---------- IN ----------
  const firstCreated = jobs.reduce((m, w) => (w.created < m ? w.created : m), T);

  DASH.chart('IN-1', (el) => {
    const ms = D.months(24).filter((m) => m.end >= firstCreated);
    el.appendChild(C.stackedBar({
      categories: ms.map((m) => m.label),
      series: D.types.map((t) => ({ name: t, type: t, values: ms.map((m) => jobs.filter((w) => w.type === t && inP(w.created, m)).length) })),
    }));
    el.appendChild(C.note('WOs created per month. Records start December 2024, and the last month is not finished.'));
  });

  DASH.chart('IN-2', (el) => {
    const ms = D.months(36, false);
    const firstFull = new Date(firstCreated.getFullYear(), firstCreated.getMonth() + (firstCreated.getDate() > 1 ? 1 : 0), 1);
    const full = ms.filter((m) => m.start >= firstFull);
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const nOcc = names.map((n, i) => full.filter((m) => m.start.getMonth() === i).length);
    const values = names.map((n, i) => D.types.map((t) => (nOcc[i] ? jobs.filter((w) => w.type === t && w.created.getMonth() === i && full.some((m) => inP(w.created, m))).length / nOcc[i] : null)));
    el.appendChild(C.heatmap({ rows: names, cols: D.types, values, fmt: (v) => D.num(v, 1), scaleLabel: 'WOs a month', valueLabel: 'WOs a month' }));
    el.appendChild(C.note('Average WOs created in that calendar month, over complete months on record.'));
  });

  DASH.chart('IN-3', (el) => {
    const ms = D.months(12);
    const vals = ms.map((m) => jobs.filter((w) => w.assignedAt && inP(w.created, m)).map((w) => D.between(w.created, w.assignedAt)));
    el.appendChild(C.line({
      x: ms.map((m) => m.label), unit: ' d', dec: 1, yMin: 0, greyLabel: 'Fewer than 3 WOs',
      grey: (s, i) => vals[i].length < 3,
      series: [{ name: 'Median days to assign', color: C.colors.one, values: vals.map((v) => (v.length ? med(v) : null)) }],
    }));
  });

  DASH.chart('IN-4', (el) => {
    const qs = D.quarters(8).filter((q) => q.end >= firstCreated);
    el.appendChild(C.stackedBar({
      categories: qs.map((q) => q.label),
      series: D.INDUSTRIES.map((i) => ({ name: i, color: C.colors.industry[i], values: qs.map((q) => jobs.filter((w) => w.industry === i && inP(w.created, q)).length) })),
    }));
  });

  DASH.chart('IN-5', (el) => {
    const medCT = {};
    D.types.forEach((t) => (medCT[t] = med(delivered.filter((w) => w.type === t).map(D.cycleTime))));
    const base = jobs.filter((w) => w.due && medCT[w.type]);
    const rush = (w) => D.between(w.created, w.due) < 0.5 * medCT[w.type];
    const rows = custNames.map((c) => { const b = base.filter((w) => w.cust === c); return { c, n: b.length, r: b.filter(rush).length }; }).filter((o) => o.n >= 3);
    const share = base.filter(rush).length / base.length;
    el.appendChild(C.split([
      C.tile({ label: 'Rush requests', value: Math.round(share * 100), unit: '%', sub: base.filter(rush).length + ' of ' + base.length + ' WOs with a due date' }),
      C.bar({ pct: true, sort: 'desc', max: 8, seriesName: 'rush share', data: rows.map((o) => ({ label: o.c, value: o.r / o.n, tip: o.c + ': ' + o.r + ' of ' + o.n + ' WOs' })) }),
    ], { widths: [1, 2] }));
    el.appendChild(C.note('Rush means the client due date at intake is less than half the median Cycle Time for the type away.'));
  });

  // ---------- DH ----------
  DASH.chart('DH-1', (el) => {
    el.dataset.wide = '1';
    const wks = D.weeks(6).filter((w) => w.end >= D.entriesStart);
    const rows = D.people.map((p) => {
      const r = { person: p.name, total: 0 };
      wks.forEach((w, i) => {
        const done = w.end < T;
        r['m' + i] = missingDays(p, w);
        r['s' + i] = done && p.start <= w.end && !isIn(weekEntries(p, w));
        r.total += r['m' + i] + (r['s' + i] ? 1 : 0);
      });
      return r;
    });
    rows.sort((a, b) => b.total - a.total);
    el.appendChild(C.table({
      rows, dense: true, max: 8,
      columns: [{ key: 'person', label: 'Person' }].concat(wks.map((w, i) => ({
        key: 'm' + i, label: w.label, num: true,
        render: (r) => [r['m' + i] ? r['m' + i] + ' d' : '', r['s' + i] ? C.chip('not submitted', 'warn') : null].filter((x) => x),
      }))),
    }));
    el.appendChild(C.note('Working days with no entry (time off left out) and weeks not yet submitted. The current week shows missing days only.'));
  });

  DASH.chart('DH-2', (el) => {
    const drafts = D.entries.filter((e) => e.status === 'draft' && D.between(e.date, T) > 7);
    const byP = D.groupBy(drafts, (e) => e.person);
    const rows = Object.keys(byP).map((p) => {
      const es = byP[p], oldest = es.map((e) => e.date).sort((a, b) => a - b)[0];
      return { group: 'Drafts older than 7 days', title: p, text: es.length + ' entries, ' + D.num(hrs(es), 1) + ' h, oldest ' + D.fmt(oldest), value: D.between(oldest, T) + ' d', n: D.between(oldest, T) };
    }).sort((a, b) => b.n - a.n);
    const rej = D.entries.filter((e) => e.status === 'rejected' && D.between(e.date, T) > 3).sort((a, b) => a.date - b.date)
      .map((e) => ({ group: 'Rejected and not fixed after 3 days', title: e.person, text: (e.rejectReason || 'Rejected') + ', ' + D.fmt(e.date) + (e.wo ? ', ' + e.wo : ''), value: D.between(e.date, T) + ' d' }));
    el.appendChild(C.list({ rows: rows.slice(0, 4).concat(rej), max: 9, empty: 'Nothing stuck.' }));
  });

  DASH.chart('DH-3', (el) => {
    const wks = D.weeks(12);
    const hist = D.wos.flatMap((w) => w.history.map((h) => ({ w, h })));
    const late = (x) => D.between(x.h.date, x.h.entered) > 2;
    const skip = (x) => x.h.skipped > 0;
    const inW = (x, wk) => inP(x.h.entered, wk);
    const recent = hist.filter((x) => x.h.entered >= wks[0].start);
    const byWho = D.groupBy(recent.filter((x) => late(x) || skip(x)), (x) => x.h.by || 'Unknown');
    const who = Object.keys(byWho).map((n) => ({ n, c: byWho[n].length, b: byWho[n].filter(late).length, s: byWho[n].filter(skip).length })).sort((a, b) => b.c - a.c);
    el.appendChild(C.split([
      C.line({
        x: wks.map((w) => w.label), unit: '', yMin: 0, height: 150,
        series: [
          { name: 'Backdated more than 2 days', color: C.colors.cat[0], values: wks.map((w) => hist.filter((x) => inW(x, w) && late(x)).length) },
          { name: 'Skipped statuses', color: C.colors.cat[1], values: wks.map((w) => hist.filter((x) => inW(x, w) && skip(x)).length) },
        ],
      }),
      C.list({ max: 5, empty: 'None.', rows: who.map((o) => ({ title: o.n, text: o.b + ' backdated, ' + o.s + ' skipped', value: o.c + ' changes' })) }),
    ], { dir: 'col' }));
    el.insertBefore(C.note('Status changes per week. List: who made them in the last 12 weeks.'), el.firstChild);
  });

  DASH.chart('DH-4', (el) => {
    const cutoff = D.addDays(T, -14);
    const quiet = (w) => D.daysIn(w) >= 14 && !D.entriesFor(w).some((e) => e.date >= cutoff) && !(w.comments[0] && w.comments[0].date >= cutoff);
    const act = D.wos.filter(D.active);
    const strict = act.filter(quiet);
    const mk = (w) => ({ title: D.label(w), text: w.cust + ', ' + D.st(w).name, holder: D.st(w).holder, value: D.daysIn(w) + ' d' });
    if (strict.length) el.appendChild(C.list({ rows: strict.sort((a, b) => D.daysIn(b) - D.daysIn(a)).map(mk), empty: 'None.' }));
    else emptyWithExamples(el, 'No active job has been untouched for 14 days.', act.filter((w) => D.daysIn(w) >= 14).slice(0, 2).map((w) => Object.assign(mk(w), { text: w.cust + ', ' + D.st(w).name + ' (has hours or comments)' })));
  });

  DASH.chart('DH-5', (el) => {
    const ord = 'PFMLR';
    const rows = [];
    jobs.forEach((w) => {
      const es = D.entriesFor(w).filter((e) => e.wo);
      const early = es.filter((e) => { const s = D.stAt(w, e.date), ts = D.taskStage(e); return s && ts && s.stage !== 'D' && ord.indexOf(ts) > ord.indexOf(s.stage); });
      const dAt = D.deliveredAt(w);
      const after = dAt ? es.filter((e) => e.date > dAt) : [];
      if (early.length) rows.push({ title: D.label(w), text: 'Later-stage hours before that stage started', value: D.num(hrs(early), 1) + ' h', n: hrs(early), chips: [C.chip(early.length + ' entries', 'warn')] });
      if (after.length) rows.push({ title: D.label(w), text: 'Hours after Delivered, not on a revision', value: D.num(hrs(after), 1) + ' h', n: hrs(after), chips: [C.chip(after.length + ' entries', 'warn')] });
    });
    el.appendChild(C.note('Two checks: hours on a later stage than the job has reached, and hours after Delivered not logged to a revision.'));
    el.appendChild(C.list({ rows: rows.sort((a, b) => b.n - a.n), empty: 'No mismatches.' }));
  });

  DASH.chart('DH-6', (el) => {
    const del = delivered.filter((w) => D.hasHT(w));
    const zero = del.filter((w) => D.humanTime(w) === 0);
    const mk = (w) => ({ title: D.label(w), text: w.cust + ', ' + w.type + ', delivered ' + D.fmt(D.deliveredAt(w)), value: D.num(D.humanTime(w), 1) + ' h' });
    if (zero.length) el.appendChild(C.list({ rows: zero.map((w) => Object.assign(mk(w), { chips: [C.chip('No hours', 'bad')] })), empty: 'None.' }));
    else emptyWithExamples(el, 'Every delivered job has hours on it.', del.slice().sort((a, b) => D.humanTime(a) - D.humanTime(b)).slice(0, 2).map(mk));
  });

  DASH.chart('DH-7', (el) => {
    const openCust = {};
    D.wos.filter(D.open).forEach((w) => (openCust[w.cust] = (openCust[w.cust] || 0) + 1));
    const rows = [];
    D.entries.filter((e) => !e.wo && !e.training && e.note).forEach((e) => {
      const c = Object.keys(openCust).find((k) => e.note.toLowerCase().includes(k.toLowerCase()));
      if (c) rows.push({ date: e.date, title: e.person, text: e.note, value: D.fmt(e.date) + ', ' + D.num(e.hours, 2) + ' h', chips: [C.chip(openCust[c] + ' open WO' + (openCust[c] > 1 ? 's' : ''), 'info')] });
    });
    rows.sort((a, b) => b.date - a.date);
    el.appendChild(C.tile({ label: 'General entries naming a customer with an open WO', value: rows.length, small: true }));
    el.appendChild(C.list({ rows, max: 5, empty: 'None.' }));
  });

  DASH.chart('DH-8', (el) => {
    const rows = [];
    D.wos.filter((w) => D.open(w) && !D.deliveredAt(w)).forEach((w) => {
      const miss = [];
      if (!w.due) miss.push('Client due date');
      if (!w.industry) miss.push('Industry');
      if (!w.eng) miss.push('Engineer');
      if (['AMB', 'CM', 'CR'].includes(w.type) && !w.monitors) miss.push('Monitors required');
      if (miss.length) rows.push({ title: D.label(w), text: w.type + ', ' + w.cust, sub: D.st(w).name, holder: D.st(w).holder, chips: miss.map((m) => C.chip(m, 'warn')) });
    });
    el.appendChild(C.list({ rows, max: 6, empty: 'No gaps.' }));
  });

  DASH.chart('DH-9', (el) => {
    const wks = D.weeks(12).filter((w) => w.end >= D.entriesStart);
    const late = (e) => D.between(e.date, e.createdAt) > 2;
    const share = (es) => (es.length ? es.filter(late).length / es.length : null);
    const per = D.people.map((p) => {
      const es = D.entries.filter((e) => e.person === p.name && e.date >= wks[0].start);
      return { person: p.name, n: es.length, late: es.filter(late).length, share: share(es) };
    }).filter((r) => r.n);
    el.appendChild(C.split([
      C.line({ x: wks.map((w) => w.label), pct: true, yMin: 0, height: 150, series: [{ name: 'Entered more than 2 days late', color: C.colors.one, values: wks.map((w) => share(D.entries.filter((e) => inP(e.date, w)))) }] }),
      C.table({
        rows: per, sort: { key: 'share', dir: -1 }, dense: true, max: 5,
        columns: [{ key: 'person', label: 'Person' }, { key: 'n', label: 'Entries', num: true }, { key: 'late', label: 'Late', num: true }, { key: 'share', label: 'Share late', num: true, fmt: (v) => dash(v, pctS) }],
      }),
    ], { dir: 'col' }));
    el.insertBefore(C.note('Share of entries created more than 2 days after their work date, per week. Table: last 12 weeks.'), el.firstChild);
  });

  DASH.chart('DH-10', (el) => {
    const rows = [];
    D.entries.filter((e) => e.hours > 10).forEach((e) => rows.push({ group: 'Single entry over 10 hours', title: e.person, text: (e.wo || e.task) + ', ' + D.fmt(e.date), value: D.num(e.hours, 2) + ' h' }));
    const day = D.hoursBy(D.entries, (e) => e.person + '|' + D.iso(e.date));
    Object.keys(day).filter((k) => day[k] > 12).forEach((k) => rows.push({ group: 'Day over 12 hours', title: k.split('|')[0], text: D.fmt(new Date(k.split('|')[1] + 'T12:00:00')), value: D.num(day[k], 2) + ' h' }));
    const dup = D.groupBy(D.entries, (e) => [e.person, D.iso(e.date), e.wo, e.task, e.hours].join('|'));
    Object.values(dup).filter((a) => a.length > 1).forEach((a) => rows.push({ group: 'Exact duplicate', title: a[0].person, text: (a[0].wo || a[0].task) + ', ' + D.fmt(a[0].date), value: a.length + ' x ' + D.num(a[0].hours, 2) + ' h' }));
    el.appendChild(C.list({ rows, max: 9, empty: 'Nothing unusual.' }));
  });

  DASH.chart('DH-11', (el) => {
    const op = D.wos.filter((w) => D.open(w) && !w.rev);
    const rows = [];
    for (let i = 0; i < op.length; i++) for (let j = i + 1; j < op.length; j++) {
      const a = op[i], b = op[j];
      if (a.cust === b.cust && a.site === b.site && a.type === b.type && Math.abs(D.between(a.created, b.created)) <= 30) {
        rows.push({ title: D.label(a) + ' and ' + D.label(b), text: a.cust + ', ' + a.site + ', ' + a.type, value: Math.abs(D.between(a.created, b.created)) + ' d apart', n: Math.abs(D.between(a.created, b.created)) });
      }
    }
    el.appendChild(C.list({ rows: rows.sort((x, y) => x.n - y.n), max: 6, empty: 'No likely duplicates.' }));
  });

  DASH.chart('DH-12', (el) => {
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const digits = (s) => (s.match(/\d+/g) || []).join('-');
    const lev = (a, b) => {
      const m = [];
      for (let i = 0; i <= a.length; i++) m[i] = [i];
      for (let j = 1; j <= b.length; j++) m[0][j] = j;
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return m[a.length][b.length];
    };
    const count = (f, v) => D.wos.filter((w) => w[f] === v).length;
    const find = (kind, f, names) => {
      const out = [];
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
        const a = names[i], b = names[j], na = norm(a), nb = norm(b);
        const d = lev(na, nb);
        if (digits(a) === digits(b) && d <= Math.min(4, Math.floor(Math.max(na.length, nb.length) * 0.2))) out.push({ kind, a, b, ca: count(f, a), cb: count(f, b) });
      }
      return out;
    };
    const cn = [...new Set(custNames.concat(D.wos.map((w) => w.cust)))], sn = [...new Set(D.sites.map((s) => s.name).concat(D.wos.map((w) => w.site)))];
    const pairs = find('Customer', 'cust', cn).concat(find('Site', 'site', sn));
    let synthetic = false;
    if (pairs.length < 3) {
      // deterministic example pairs built from real names (one letter dropped from the middle)
      synthetic = true;
      const drop = (s) => s.slice(0, Math.floor(s.length / 2)) + s.slice(Math.floor(s.length / 2) + 1);
      D.customers.slice(0, 3 - pairs.length).forEach((c) => pairs.push({ kind: 'Customer', a: c.name, b: drop(c.name), ca: count('cust', c.name), cb: 0, example: true }));
    }
    el.appendChild(C.list({
      max: 6, empty: 'No similar names.',
      rows: pairs.map((p) => ({ group: p.kind + ' names', title: p.a + ' and ' + p.b, text: p.ca + ' WOs and ' + p.cb + (p.cb === 1 ? ' WO' : ' WOs'), chips: p.example ? [C.chip('Example', 'mute')] : [] })),
    }));
    el.appendChild(C.note('Names that differ only by case, spacing, punctuation or a small typo.' + (synthetic ? ' Some pairs are made-up examples.' : '')));
  });

  DASH.chart('DH-13', (el) => {
    const rows = [];
    D.wos.filter((w) => w.eng).forEach((w) => D.visits(w).forEach((v) => {
      if (v.kind !== 'Work' || v.start < D.entriesStart) return;
      const end = v.end || T, d = D.between(v.start, end);
      if (d <= 2) return;
      if (D.entriesFor(w).some((e) => e.person === w.eng && e.date >= v.start && e.date <= end)) return;
      rows.push({ title: D.label(w), text: v.name + ', ' + w.eng, holder: v.holder, value: d + ' d', n: d, chips: [C.chip('No hours', 'warn')] });
    }));
    el.appendChild(C.list({ rows: rows.sort((a, b) => b.n - a.n), max: 6, empty: 'None.' }));
  });
})();
