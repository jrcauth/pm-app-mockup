/* Task 3: Scorecard (LDR), Finance home (FIN), Billing flow (BILL). Billing is dates and counts only. */
(function () {
  'use strict';
  const reg = (id, fn, opt) => DASH.chart(id, fn, opt);
  const T = D.today;

  // ---- shared helpers (local) ----
  const isDelivered = (w) => !w.rev && D.deliveredAt(w) && D.st(w).name !== 'Cancelled';
  const delivered = D.wos.filter(isDelivered);
  const firstInv = (w) => (w.invoices.length ? new Date(Math.min.apply(null, w.invoices.map((i) => +i.date))) : null);
  const lastInv = (w) => (w.invoices.length ? new Date(Math.max.apply(null, w.invoices.map((i) => +i.date))) : null);
  const wait = (w) => (firstInv(w) ? Math.max(0, D.between(D.deliveredAt(w), firstInv(w))) : null);
  const closedAt = (w) => D.first(w, 'Closed');
  const inP = (d, p) => !!d && D.inRange(d, p);
  const ready = (w) => !w.rev && D.open(w) && !!D.deliveredAt(w) && !w.invoices.length;
  const Q2 = D.quarters(2, false), qPrev = Q2[0], qLast = Q2[1];
  const ms12 = () => D.months(12);
  const nz = (v) => (v == null ? null : v);
  const dec1 = (v) => (v == null ? '-' : D.num(v, 1));
  const delta = (cur, prev, unit, lowerIsBetter, label) => {
    if (cur == null || prev == null) return undefined;
    const d = Math.round((cur - prev) * 10) / 10;
    return { text: (d > 0 ? '+' : '') + D.num(d, 1) + unit + ' against ' + label, tone: d === 0 ? 'neutral' : (d > 0) === !!lowerIsBetter ? 'bad' : 'good' };
  };
  // days of Cycle Time by holder, clipped to the Delivered date
  const cycleHolder = (w) => {
    const out = { Urban: 0, QC: 0, Customer: 0, Field: 0 }, end = D.deliveredAt(w);
    D.visits(w).forEach((v) => {
      if (!out.hasOwnProperty(v.holder) || v.start >= end) return;
      const e = v.end && v.end < end ? v.end : end;
      out[v.holder] += Math.max(0, D.between(v.start, e));
    });
    return out;
  };
  const sumHolder = (jobs) => { const o = { Urban: 0, QC: 0, Customer: 0, Field: 0 }; jobs.forEach((w) => { const h = cycleHolder(w); for (const k in o) o[k] += h[k]; }); return o; };
  const ht = (w) => D.humanTime(w);
  const medHT = {};
  D.types.forEach((t) => { medHT[t] = D.median(delivered.filter((w) => w.type === t && D.hasHT(w)).map(ht)); });
  const rowLabel = (w) => D.label(w);
  const team = D.engineers.concat(D.reviewers);
  const sub = (a) => a.filter(Boolean).join(', ');
  const billingFields = (w) => sub([w.deploy ? 'Deployed ' + D.fmt(w.deploy) : null, w.pickup ? 'Pickup ' + D.fmt(w.pickup) : null, w.monitors ? w.monitors + ' monitors' : null, w.studyLen ? w.studyLen + ' d study' : null]);
  const ago = (d) => D.between(d, T) + ' d';

  // ---- LDR ----
  reg('LDR-1', (el, { C }) => {
    const ms = ms12();
    const revs = D.wos.filter((w) => w.rev && D.deliveredAt(w) && D.deliveredAt(w) >= ms[0].start).length;
    el.appendChild(C.stackedBar({ categories: ms.map((m) => m.label), series: D.types.map((t) => ({ name: t, type: t, values: ms.map((m) => delivered.filter((w) => w.type === t && inP(D.deliveredAt(w), m)).length) })) }));
    el.appendChild(C.note('The last month is to date. Revisions delivered in the same period are counted separately: ' + revs + '.'));
  });

  reg('LDR-2', (el, { C }) => {
    const ms = ms12(), end = (m) => (m.end > T ? T : m.end);
    const act = (t, m) => D.wos.filter((w) => w.type === t && D.activeAt(w, end(m))).length;
    const now = D.wos.filter(D.active);
    const weekly = D.sum(D.engineers.concat(D.reviewers).map((p) => D.available(p, D.weekStart(T))));
    const hrs = D.sum(now.map((w) => Math.max(0, (medHT[w.type] || 0) - ht(w))));
    const full = D.sum(team.map((p) => D.person(p).weeklyHours));
    const weeks = hrs / full;
    el.appendChild(C.split([
      C.tile({ label: 'Active jobs', value: now.length, sub: D.num(weeks, 1) + ' weeks of backlog', tip: 'Remaining median Human Time of active jobs divided by weekly engineering hours (' + D.num(full) + ' h, ignoring time off; this week ' + D.num(weekly) + ' h available)' }),
      C.line({ x: ms.map((m) => m.label), height: 150, series: D.types.map((t) => ({ name: t, type: t, values: ms.map((m) => act(t, m)) })) }),
    ], { widths: [1, 2.4] }));
  });

  reg('LDR-3', (el, { C }) => {
    const ms = ms12(), withDue = delivered.filter((w) => w.due);
    const rate = (p) => { const j = withDue.filter((w) => inP(D.deliveredAt(w), p)); return { n: j.length, v: j.length ? j.filter((w) => D.deliveredAt(w) <= w.due).length / j.length : null }; };
    const r = rate(qLast), nodue = delivered.filter((w) => !w.due && inP(D.deliveredAt(w), qLast)).length;
    el.appendChild(C.split([
      C.tile({ label: 'On time, ' + qLast.label, value: r.v == null ? '-' : Math.round(r.v * 100) + '%', sub: r.n + ' jobs with a due date' + (nodue ? '; ' + nodue + ' with no due date' : ''), delta: r.v != null && rate(qPrev).v != null ? delta(r.v * 100, rate(qPrev).v * 100, ' pts', false, qPrev.label) : undefined }),
      C.line({ x: ms.map((m) => m.label), height: 150, pct: true, yMin: 0, yMax: 1, greyLabel: 'Fewer than 3 jobs', series: [{ name: 'On time', values: ms.map((m) => rate(m).v), grey: ms.map((m) => rate(m).n < 3) }] }),
    ], { widths: [1, 2.4] }));
  });

  const typeTiles = (el, C, valueOf, unit, lowerBetter) => {
    el.appendChild(C.tiles(D.types.map((t) => {
      const cur = valueOf(t, qLast), prev = valueOf(t, qPrev);
      return { label: t, small: true, value: cur.v == null ? '-' : D.num(cur.v, 0) + unit, sub: cur.n + ' jobs in ' + qLast.label + (cur.alt != null ? '. No holds: ' + D.num(cur.alt, 0) + unit : ''), delta: cur.n >= 3 && prev.n >= 3 ? delta(cur.v, prev.v, unit, lowerBetter, qPrev.label.split(' ')[0]) : undefined };
    }), { min: 130 }));
    el.appendChild(C.note('Change is shown when both quarters have at least 3 jobs.'));
  };
  reg('LDR-4', (el, { C }) => typeTiles(el, C, (t, q) => { const j = delivered.filter((w) => w.type === t && inP(D.deliveredAt(w), q)); return { n: j.length, v: D.median(j.map(D.cycleTime)), alt: D.median(j.map((w) => D.cycleTime(w) - D.holdDays(w))) }; }, ' d', true));
  reg('LDR-5', (el, { C }) => {
    typeTiles(el, C, (t, q) => { const j = delivered.filter((w) => w.type === t && D.hasHT(w) && inP(D.deliveredAt(w), q)); return { n: j.length, v: D.median(j.map(ht)) }; }, ' h', true);
    const revH = D.sum(D.wos.filter((w) => w.rev).map(ht));
    el.appendChild(C.note('Jobs created since ' + D.fmt(D.entriesStart) + ' only. Revisions are separate: ' + D.num(revH) + ' h in total.'));
  });

  reg('LDR-6', (el, { C }) => {
    const ms = D.months(8, false).filter((m) => m.start >= D.entriesStart);
    const wk = D.weeks(40, false), wkOf = {};
    wk.forEach((p) => (wkOf[p.key] = p));
    const hrs = {}, all = {}, av = {};
    D.entries.filter((e) => D.isHT(e) && team.includes(e.person)).forEach((e) => { const k = D.monthKey(D.weekStart(e.date)); all[k] = (all[k] || 0) + e.hours; if (e.wo && !e.oos) hrs[k] = (hrs[k] || 0) + e.hours; });
    wk.forEach((p) => { if (p.start >= D.entriesStart) { const k = D.monthKey(p.start); av[k] = (av[k] || 0) + D.sum(team.map((n) => D.available(n, p.start))); } });
    const a = ms.map((m) => (av[m.key] ? (hrs[m.key] || 0) / av[m.key] : null)), b = ms.map((m) => (all[m.key] ? (hrs[m.key] || 0) / all[m.key] : null));
    const last = a[a.length - 1];
    el.appendChild(C.split([
      C.tile({ label: 'WO hours / available, ' + ms[ms.length - 1].label, value: last == null ? '-' : Math.round(last * 100) + '%', sub: 'Engineering, in-scope hours', delta: a.length > 1 ? delta(last * 100, a[a.length - 2] * 100, ' pts', false, ms[ms.length - 2].label) : undefined }),
      C.line({ x: ms.map((m) => m.label), height: 150, pct: true, yMin: 0, series: [{ name: 'In-scope WO hours / available hours', values: a }, { name: 'WO hours / all logged hours', values: b, dashed: true }] }),
    ], { widths: [1, 2.4] }));
  });

  reg('LDR-7', (el, { C }) => {
    const types = D.types.filter((t) => delivered.some((w) => w.type === t && inP(D.deliveredAt(w), qLast)));
    const sums = types.map((t) => sumHolder(delivered.filter((w) => w.type === t && inP(D.deliveredAt(w), qLast))));
    el.appendChild(C.stackedBar({ horizontal: true, percent: true, inside: true, unit: ' d', categories: types, series: ['Urban', 'QC', 'Customer', 'Field'].map((h) => ({ name: h, holder: h, values: sums.map((x) => x[h]) })) }));
    el.appendChild(C.note('Jobs delivered in ' + qLast.label + '. Billing time starts after Delivered, so it is not part of Cycle Time.'));
  });

  reg('LDR-8', (el, { C }) => {
    const med = (p) => D.median(delivered.filter((w) => firstInv(w) && inP(firstInv(w), p)).map(wait));
    const ms = D.months(8, false);
    const cur = med(qLast), prev = med(qPrev);
    el.appendChild(C.split([
      C.tile({ label: 'Delivered to first invoice, ' + qLast.label, value: cur == null ? '-' : cur + ' d', sub: 'Median days', delta: delta(cur, prev, ' d', true, qPrev.label) }),
      C.line({ x: ms.map((m) => m.label), height: 140, unit: ' d', series: [{ name: 'Median days', values: ms.map(med) }] }),
    ], { widths: [1, 2.4] }));
  });

  reg('LDR-9', (el, { C }) => {
    const e = D.entries.filter((x) => D.isHT(x) && x.wo);
    const oos = e.filter((x) => x.oos), share = D.sum(oos.map((x) => x.hours)) / D.sum(e.map((x) => x.hours));
    const by = D.hoursBy(oos, (x) => D.byKey(x.wo).cust);
    const top = Object.keys(by).sort((a, b) => by[b] - by[a]).slice(0, 5);
    el.appendChild(C.split([
      C.tile({ label: 'Out-of-scope share of WO hours', value: (share * 100).toFixed(1) + '%', sub: D.num(D.sum(oos.map((x) => x.hours))) + ' h since ' + D.fmt(D.entriesStart) }),
      C.bar({ unit: ' h', seriesName: 'Out-of-scope hours', data: top.map((c) => ({ label: c, value: by[c] })) }),
    ], { widths: [1, 2] }));
  });

  reg('LDR-10', (el, { C }) => {
    const ms = ms12(), revs = D.wos.filter((w) => w.rev);
    const per = ms.map((m) => revs.filter((w) => inP(w.created, m)).length);
    const dl = delivered.filter((w) => D.deliveredAt(w) >= ms[0].start), withRev = dl.filter((w) => revs.some((r) => r.parent === w.id));
    el.appendChild(C.tiles([
      { label: 'Revisions opened, last 12 months', value: D.sum(per), spark: per, sub: 'Opened this month: ' + per[per.length - 1] },
      { label: 'Revision hours', value: D.num(D.sum(revs.map(ht))), unit: ' h', sub: 'Human Time on revision records' },
      { label: 'Delivered jobs with a revision', value: dl.length ? Math.round((withRev.length / dl.length) * 100) + '%' : '-', sub: withRev.length + ' of ' + dl.length + ' delivered' },
    ]));
  });

  reg('LDR-11', (el, { C }) => {
    const from = D.addDays(T, -365), jobs = D.wos.filter((w) => !w.rev && w.created >= from);
    const rows = Object.entries(D.groupBy(jobs, (w) => w.cust)).map(([c, js]) => {
      const dj = js.filter(isDelivered);
      return { cust: c, jobs: js.length, ht: D.sum(js.map(ht)), ct: D.median(dj.map(D.cycleTime)), cw: D.median(dj.map((w) => D.holderDays(w).Customer)) };
    }).sort((a, b) => b.jobs - a.jobs).slice(0, 10);
    el.dataset.wide = '1';
    el.appendChild(C.table({ sort: { key: 'jobs', dir: -1 }, columns: [
      { key: 'cust', label: 'Customer' }, { key: 'jobs', label: 'Jobs', num: true },
      { key: 'ht', label: 'Human Time', num: true, fmt: (v) => D.num(v) + ' h' },
      { key: 'ct', label: 'Median Cycle Time', num: true, fmt: (v) => (v == null ? '-' : v + ' d') },
      { key: 'cw', label: 'Median days waiting on customer', num: true, fmt: (v) => (v == null ? '-' : v + ' d') },
    ], rows }));
    el.appendChild(C.note('Last 12 months. Human Time exists from ' + D.fmt(D.entriesStart) + '.'));
  }, { wide: true });

  reg('LDR-12', (el, { C }) => {
    const qs = D.quarters(6), ind = D.INDUSTRIES;
    const jobs = qs.map((q) => ind.map((i) => delivered.filter((w) => w.industry === i && inP(D.deliveredAt(w), q)).length));
    const hq = D.quarters(3).filter((q) => q.end >= D.entriesStart);
    const hrs = hq.map((q) => ind.map((i) => D.sum(D.entries.filter((e) => D.isHT(e) && e.wo && inP(e.date, q) && D.byKey(e.wo).industry === i).map((e) => e.hours))));
    el.appendChild(C.note('Jobs delivered per quarter'));
    el.appendChild(C.stackedBar({ categories: qs.map((q) => q.label), series: ind.map((i, k) => ({ name: i, color: C.colors.industry[i], values: jobs.map((r) => r[k]) })) }));
    el.appendChild(C.note('Share of Human Time per quarter'));
    el.appendChild(C.stackedBar({ percent: true, categories: hq.map((q) => q.label), series: ind.map((i, k) => ({ name: i, color: C.colors.industry[i], values: hrs.map((r) => r[k]) })) }));
  });

  reg('LDR-13', (el, { C }) => {
    const wk = D.weeks(2, false), last = wk[wk.length - 1], ppl = D.people.filter((p) => p.role === 'Engineer' || p.role === 'QC');
    const notIn = ppl.filter((p) => { const e = D.entries.filter((x) => x.person === p.name && inP(x.date, last)); return !e.length || e.some((x) => x.status === 'draft'); });
    const waiting = new Set(D.entries.filter((e) => e.status === 'submitted' && team.includes(e.person)).map((e) => e.person + '|' + D.weekKey(e.date))).size;
    el.appendChild(C.tiles([
      { label: 'People with last week not submitted', value: notIn.length, status: notIn.length ? 'warn' : 'good', sub: 'Week of ' + last.label + (notIn.length ? ': ' + notIn.map((p) => p.name.split(' ')[0]).join(', ') : '') },
      { label: 'Weeks waiting for approval', value: waiting, sub: 'Person weeks submitted, not yet approved' },
    ]));
  });

  reg('LDR-14', (el, { C }) => {
    const ms = ms12(), jobs = D.wos.filter((w) => !w.rev);
    el.appendChild(C.stackedBar({ categories: ms.map((m) => m.label), series: D.types.map((t) => ({ name: t, type: t, values: ms.map((m) => jobs.filter((w) => w.type === t && inP(w.created, m)).length) })) }));
    el.appendChild(C.note('Jobs delivered in the same months'));
    el.appendChild(C.line({ x: ms.map((m) => m.label), height: 100, series: [{ name: 'Jobs delivered', values: ms.map((m) => delivered.filter((w) => inP(D.deliveredAt(w), m)).length) }] }));
  });

  reg('LDR-15', (el, { C }) => {
    const qs = D.quarters(4), can = D.wos.filter((w) => !w.rev && D.st(w).name === 'Cancelled');
    const at = (w) => D.first(w, 'Cancelled') || w.created, reasons = D.CANCEL_REASONS;
    const last12 = can.filter((w) => at(w) >= D.addDays(T, -365));
    el.appendChild(C.split([
      C.tile({ label: 'Cancelled, last 12 months', value: last12.length, sub: D.num(D.sum(last12.map(ht))) + ' h already logged' }),
      C.stackedBar({ height: 140, max: 2, categories: qs.map((q) => q.label), series: reasons.map((r, i) => ({ name: r, color: C.colors.cat[i], values: qs.map((q) => can.filter((w) => w.cancelReason === r && inP(at(w), q)).length) })) }),
    ], { widths: [1, 2.4] }));
  });

  reg('LDR-16', (el, { C }) => {
    const j = delivered.filter((w) => w.due && inP(D.deliveredAt(w), qLast)), late = j.filter((w) => D.deliveredAt(w) > w.due), on = j.filter((w) => D.deliveredAt(w) <= w.due);
    const s = [sumHolder(late), sumHolder(on)];
    el.appendChild(C.stackedBar({ horizontal: true, percent: true, inside: true, unit: ' d', categories: ['Late (' + late.length + ' jobs)', 'On time (' + on.length + ' jobs)'], series: ['Urban', 'QC', 'Customer', 'Field'].map((h) => ({ name: h, holder: h, values: s.map((x) => x[h]) })) }));
    el.appendChild(C.note('Jobs delivered in ' + qLast.label + ' with a due date.'));
  });

  reg('LDR-17', (el, { C }) => {
    const a = { start: D.addDays(T, -365), end: T }, b = { start: D.addDays(T, -730), end: D.addDays(T, -366) };
    const jobs = (p) => D.wos.filter((w) => !w.rev && inP(w.created, p));
    const top3 = (js) => { const c = D.countBy(js, (w) => w.cust); return Object.keys(c).sort((x, y) => c[y] - c[x]).slice(0, 3); };
    const share = (js) => { const t = top3(js); return js.length ? js.filter((w) => t.includes(w.cust)).length / js.length : null; };
    const ja = jobs(a), t = top3(ja), shareNow = share(ja), shareThen = share(jobs(b));
    const h = D.entries.filter((e) => D.isHT(e) && e.wo), hs = D.sum(h.filter((e) => t.includes(D.byKey(e.wo).cust)).map((e) => e.hours)) / D.sum(h.map((e) => e.hours));
    el.appendChild(C.split([
      C.tile({ label: 'Top three customers, share of jobs', value: Math.round(shareNow * 100) + '%', sub: t.join(', '), delta: shareThen != null ? delta(shareNow * 100, shareThen * 100, ' pts', true, 'the 12 months before') : undefined }),
      C.bar({ pct: true, horizontal: true, labels: true, data: [{ label: 'Jobs, 12 months before', value: shareThen, color: C.colors.other }, { label: 'Jobs, last 12 months', value: shareNow }, { label: 'Human Time, since ' + D.fmt(D.entriesStart), value: hs }] }),
    ], { widths: [1, 1.6] }));
  });

  reg('LDR-18', (el, { C }) => {
    const ms = D.months(9).filter((m) => m.end >= D.entriesStart), jobs = delivered.filter(D.hasHT);
    const types = D.types.filter((t) => jobs.filter((w) => w.type === t).length >= 5);
    const j = (t, m) => jobs.filter((w) => w.type === t && inP(D.deliveredAt(w), m));
    el.appendChild(C.line({ x: ms.map((m) => m.label), unit: ' h', greyLabel: 'Fewer than 3 jobs', series: types.map((t) => ({ name: t, type: t, values: ms.map((m) => D.median(j(t, m).map(ht))), grey: ms.map((m) => j(t, m).length < 3) })) }));
  });

  reg('LDR-19', (el, { C }) => {
    const qs = D.quarters(3).filter((q) => q.end >= D.entriesStart);
    const hrs = (q) => D.sum(D.entries.filter((e) => D.isHT(e) && e.training && inP(e.date, q)).map((e) => e.hours));
    const av = (q) => D.sum(D.weeks(60).filter((p) => p.start >= D.weekStart(q.start) && p.start >= D.entriesStart && p.start <= q.end && p.start <= T).map((p) => D.sum(D.people.map((x) => D.available(x.name, p.start)))));
    const v = qs.map((q) => hrs(q) / av(q));
    el.appendChild(C.split([
      C.tile({ label: 'Training share, ' + qs[qs.length - 1].label, value: (v[v.length - 1] * 100).toFixed(1) + '%', sub: D.num(hrs(qs[qs.length - 1])) + ' h received and administered. Q4 is to date.' }),
      C.bar({ horizontal: false, pct: true, dec: 1, seriesName: 'Training share', data: qs.map((q, i) => ({ label: q.label, value: v[i] })) }),
    ], { widths: [1, 1.6] }));
  });

  reg('LDR-20', (el, { C }) => {
    const qs = D.quarters(5, false), holder = document.createElement('div');
    const j = (q) => delivered.filter((w) => inP(D.deliveredAt(w), q));
    const metrics = (q) => {
      const d = j(q), withDue = d.filter((w) => w.due);
      const end = q.end > T ? T : q.end;
      return [
        ['Jobs delivered', d.length],
        ['Active jobs at quarter end', D.wos.filter((w) => D.activeAt(w, end)).length],
        ['On-time rate', withDue.length ? Math.round((withDue.filter((w) => D.deliveredAt(w) <= w.due).length / withDue.length) * 100) + '%' : '-'],
        ['Median Cycle Time, days', D.median(d.map(D.cycleTime)) == null ? '-' : D.median(d.map(D.cycleTime))],
        ['Median Delivered to first invoice, days', D.median(d.filter(firstInv).map(wait)) == null ? '-' : D.median(d.filter(firstInv).map(wait))],
        ['Jobs cancelled', D.wos.filter((w) => !w.rev && D.st(w).name === 'Cancelled' && inP(D.first(w, 'Cancelled'), q)).length],
        ['Revisions opened', D.wos.filter((w) => w.rev && inP(w.created, q)).length],
      ];
    };
    const defs = ['WOs reaching Delivered in the quarter (first visit)', 'Open, not yet Delivered, not on hold, on the last day', 'Delivered on or before the client due date, jobs with a due date', 'Calendar days, Request received to Delivered, median', 'Days from Delivered to the first invoice date, median', 'WOs that reached Cancelled in the quarter', 'Revision records created in the quarter'];
    const draw = (idx) => {
      const q = qs[idx], p = qs[idx - 1], a = metrics(q), b = metrics(p);
      holder.replaceChildren(C.exportPreview({ filename: 'board-pack-' + q.key + '.csv', max: 8, label: 'Download CSV',
        columns: [{ key: 'm', label: 'Measure' }, { key: 'a', label: q.label, num: true }, { key: 'b', label: p.label, num: true }, { key: 'd', label: 'Definition', wrap: true }],
        rows: a.map((r, i) => ({ m: r[0], a: r[1], b: b[i][1], d: defs[i] })) }));
    };
    el.appendChild(C.select({ label: 'Quarter', value: qs[qs.length - 1].key, options: qs.slice(1).map((q) => ({ value: q.key, label: q.label })), onChange: (v) => draw(qs.findIndex((q) => q.key === v)) }));
    el.appendChild(holder);
    draw(qs.length - 1);
    el.appendChild(C.note('Mock of the export: the real one gives a PDF and an Excel file with the same rows and definitions.'));
  }, { wide: true });

  // ---- FIN ----
  const jobRow = (w, extra) => Object.assign({ title: rowLabel(w), text: w.cust, holder: D.st(w).holder }, extra || {});

  reg('FIN-1', (el, { C }) => {
    const r = D.wos.filter(ready).sort((a, b) => D.deliveredAt(a) - D.deliveredAt(b));
    el.appendChild(C.split([
      C.tile({ label: 'Ready to invoice', value: r.length, status: r.some((w) => D.between(D.deliveredAt(w), T) > 30) ? 'warn' : undefined, sub: 'Delivered, no invoice yet' }),
      C.list({ rows: r.map((w) => jobRow(w, { sub: sub([billingFields(w), w.billingComment ? 'Billing comment' : null]), value: ago(D.deliveredAt(w)), chips: w.billingComment ? [C.chip('Comment', 'info')] : [] })) }),
    ], { widths: [1, 2.4] }));
  });

  reg('FIN-2', (el, { C }) => {
    const r = D.wos.filter((w) => !w.rev && D.open(w) && D.deliveredAt(w) && w.invoices.length && D.st(w).name !== 'Closed').sort((a, b) => lastInv(a) - lastInv(b));
    el.appendChild(C.list({ rows: r.map((w) => jobRow(w, { sub: w.invoices.length + (w.invoices.length === 1 ? ' invoice' : ' invoices') + ', last ' + D.fmt(lastInv(w)), value: ago(lastInv(w)) })) }));
  });

  const out = () => D.wos.filter((w) => ['AMB', 'SIG', 'CM', 'CR'].includes(w.type) && D.open(w) && w.deploy && !w.pickup);
  reg('FIN-3', (el, { C }) => {
    const r = out().sort((a, b) => D.between(b.deploy, T) - D.between(a.deploy, T));
    el.appendChild(C.list({ rows: r.map((w) => { const d = D.between(w.deploy, T), over = w.studyLen && d > w.studyLen; return jobRow(w, { sub: sub([w.monitors ? w.monitors + ' monitors' : null, w.studyLen ? 'planned ' + w.studyLen + ' d' : null]), value: d + ' d', chips: over ? [C.chip((d - w.studyLen) + ' d past plan', 'bad')] : [] }); }) }));
  });

  reg('FIN-4', (el, { C }) => {
    const ms = { start: new Date(T.getFullYear(), T.getMonth(), 1), end: T };
    const r = D.wos.filter((w) => w.pickup && inP(w.pickup, ms)).sort((a, b) => b.pickup - a.pickup);
    el.appendChild(C.list({ empty: 'No pickups yet this month.', rows: r.map((w) => jobRow(w, { sub: sub(['Picked up ' + D.fmt(w.pickup), w.monitors ? w.monitors + ' monitors' : null]), value: Math.max(1, D.between(w.deploy, w.pickup)) + ' d deployed' })) }));
  });

  reg('FIN-5', (el, { C }) => {
    const cut = D.addDays(T, -30);
    const r = D.wos.filter((w) => !w.rev && D.open(w) && D.deliveredAt(w) && w.invoices.length && !D.entriesFor(w).some((e) => e.date >= cut)).sort((a, b) => lastInv(a) - lastInv(b));
    el.appendChild(C.list({ rows: r.map((w) => jobRow(w, { sub: 'Last invoice ' + D.fmt(lastInv(w)), value: ago(D.deliveredAt(w)) + ' since delivery' })) }));
  });

  reg('FIN-6', (el, { C }) => {
    const wk = D.weeks(12), at = (p) => (p.end > T ? T : p.end);
    const waiting = (p) => delivered.filter((w) => D.deliveredAt(w) <= at(p) && (!firstInv(w) || firstInv(w) > at(p)) && (!closedAt(w) || closedAt(w) > at(p)));
    const n = wk.map((p) => waiting(p).length), med = wk.map((p) => D.median(waiting(p).map((w) => D.between(D.deliveredAt(w), at(p)))));
    el.appendChild(C.tiles([{ label: 'Delivered, not invoiced', value: n[n.length - 1], sub: 'Median wait ' + (med[med.length - 1] == null ? '-' : med[med.length - 1] + ' d') }]));
    el.appendChild(C.note('Count at each week end'));
    el.appendChild(C.line({ x: wk.map((p) => p.label), height: 110, series: [{ name: 'Jobs waiting', values: n }] }));
    el.appendChild(C.note('Median days waiting at each week end'));
    el.appendChild(C.line({ x: wk.map((p) => p.label), height: 110, unit: ' d', series: [{ name: 'Median days', values: med }] }));
  });

  reg('FIN-7', (el, { C }) => {
    const r = D.wos.filter((w) => ready(w) && w.billingComment).sort((a, b) => D.deliveredAt(a) - D.deliveredAt(b));
    const all = D.wos.filter((w) => w.billingComment && !w.rev);
    el.appendChild(C.list({ empty: 'No ready-to-invoice job has a billing comment.', rows: r.map((w) => jobRow(w, { sub: w.billingComment, value: ago(D.deliveredAt(w)) })) }));
    if (!r.length) el.appendChild(C.note(all.length + ' jobs have a billing comment in total, none waiting to be invoiced.'));
  });

  reg('FIN-8', (el, { C }) => {
    const from = D.addDays(T, -30);
    const back = D.wos.filter((w) => w.history.some((h, k) => k && h.date >= from && D.WF[w.type][w.history[k - 1].si].kind === 'Done' && h.si < w.history[k - 1].si) && w.invoices.length);
    // Revisions opened on a job that was already invoiced count as a reopen
    const revs = D.wos.filter((w) => w.rev && w.created >= from && D.byId(w.parent) && D.byId(w.parent).invoices.length);
    const rows = back.map((w) => jobRow(w, { sub: 'Reopened after ' + w.invoices.length + ' invoice', value: D.fmt(w.history[w.history.length - 1].date) })).concat(revs.map((w) => { const p = D.byId(w.parent); return jobRow(w, { sub: 'Revision of ' + p.id + ', invoiced ' + D.fmt(firstInv(p)), value: D.fmt(w.created) }); }));
    if (rows.length) el.appendChild(C.list({ rows }));
    else {
      el.appendChild(C.list({ rows: [], empty: 'Nothing reopened after invoicing in the last 30 days.' }));
      const ex = D.wos.filter((w) => w.rev && D.byId(w.parent) && D.byId(w.parent).invoices.length).sort((a, b) => b.created - a.created)[0];
      if (ex) { const p = D.byId(ex.parent); el.appendChild(C.note('Example row')); el.appendChild(C.list({ rows: [jobRow(ex, { sub: 'Revision of ' + p.id + ', invoiced ' + D.fmt(firstInv(p)), value: D.fmt(ex.created), chips: [C.chip('Example row', 'mute')] })] })); }
    }
    el.appendChild(C.note('Last 30 days. The mock has no status that goes back after Closed, so a reopen here is a revision opened on a job that was already invoiced.'));
  });

  reg('FIN-9', (el, { C }) => {
    const m = { start: new Date(T.getFullYear(), T.getMonth(), 1), end: T };
    const r = D.wos.filter((w) => w.type === 'CM' && w.deploy && w.deploy <= T && (!w.pickup || w.pickup >= m.start) && !w.invoices.some((i) => inP(i.date, m)));
    el.appendChild(C.list({ empty: 'Every deployed CM job has an invoice this month.', rows: r.map((w) => { const s = w.deploy > m.start ? w.deploy : m.start, e = w.pickup && w.pickup < T ? w.pickup : T; return jobRow(w, { sub: sub([w.monitors ? w.monitors + ' monitors' : null, 'last invoice ' + (lastInv(w) ? D.fmt(lastInv(w)) : 'none')]), value: Math.max(1, D.between(s, e)) + ' d deployed' }); }) }));
  });

  reg('FIN-10', (el, { C }) => {
    const m = { start: new Date(T.getFullYear(), T.getMonth(), 1), end: T };
    const rows = [];
    D.wos.forEach((w) => w.invoices.forEach((i) => { if (inP(i.date, m)) rows.push({ w, i }); }));
    rows.sort((a, b) => b.i.date - a.i.date);
    const byT = D.countBy(rows, (r) => r.w.type);
    el.appendChild(C.split([
      C.tile({ label: 'Invoices this month', value: rows.length, sub: D.types.filter((t) => byT[t]).map((t) => t + ' ' + byT[t]).join(', ') }),
      C.list({ rows: rows.map((r) => jobRow(r.w, { sub: 'Invoice ' + r.i.no, value: D.fmt(r.i.date) })) }),
    ], { widths: [1, 2.4] }));
  });

  reg('FIN-11', (el, { C }) => {
    const from = D.addDays(T, -7);
    const r = D.wos.filter((w) => D.deliveredAt(w) && D.deliveredAt(w) > from && !w.rev).sort((a, b) => D.deliveredAt(b) - D.deliveredAt(a));
    el.appendChild(C.list({ empty: 'Nothing delivered in the last 7 days.', rows: r.map((w) => jobRow(w, { sub: sub([w.type, w.invoices.length ? w.invoices.length + ' invoice' : 'not invoiced']), value: D.fmt(D.deliveredAt(w)) })) }));
  });

  reg('FIN-12', (el, { C }) => {
    const r = D.wos.filter((w) => !w.rev && D.deliveredAt(w) && (D.st(w).name === 'Closed' || D.open(w))).map((w) => ({ w, es: D.entriesFor(w).filter((e) => e.date > D.deliveredAt(w)) })).filter((x) => x.es.length).sort((a, b) => D.sum(b.es.map((e) => e.hours)) - D.sum(a.es.map((e) => e.hours)));
    el.appendChild(C.list({ empty: 'No hours after delivery.', rows: r.map((x) => jobRow(x.w, { sub: x.es.length + (x.es.length === 1 ? ' entry after ' : ' entries after ') + D.fmt(D.deliveredAt(x.w)) + ', last ' + D.fmt(x.es[x.es.length - 1].date), value: D.num(D.sum(x.es.map((e) => e.hours)), 1) + ' h' })) }));
  });

  reg('FIN-13', (el, { C }) => {
    const r = D.wos.filter(ready).map((w) => ({ w, es: D.entriesFor(w).filter((e) => e.oos) })).filter((x) => x.es.length).sort((a, b) => D.sum(b.es.map((e) => e.hours)) - D.sum(a.es.map((e) => e.hours)));
    el.appendChild(C.list({ empty: 'No ready-to-invoice job has out-of-scope hours.', rows: r.map((x) => jobRow(x.w, { sub: x.es.map((e) => e.note).filter(Boolean)[0] || 'No comment on the entries', value: D.num(D.sum(x.es.map((e) => e.hours)), 1) + ' h' })) }));
  });

  reg('FIN-14', (el, { C }) => {
    const from = D.addDays(T, -90);
    const r = D.wos.filter((w) => D.st(w).name === 'Cancelled' && (D.first(w, 'Cancelled') || w.created) >= from && ht(w) > 0).sort((a, b) => ht(b) - ht(a));
    el.appendChild(C.list({ empty: 'No cancelled job with hours in the last 90 days.', rows: r.map((w) => jobRow(w, { holder: undefined, sub: w.cancelReason || 'No reason given', value: D.num(ht(w), 1) + ' h' })) }));
  });

  reg('FIN-15', (el, { C }) => {
    const miss = (w) => {
      const m = [];
      if (['AMB', 'CR', 'CM', 'SIG'].includes(w.type) && !w.deploy) m.push('Deploy date');
      if (['AMB', 'CR', 'CM'].includes(w.type)) { if (!w.pickup) m.push('Pickup date'); if (!w.monitors) m.push('Monitors'); if (!w.studyLen) m.push('Study length'); }
      return m;
    };
    const r = D.wos.filter(ready).map((w) => ({ w, m: miss(w) })).filter((x) => x.m.length);
    el.appendChild(C.list({ empty: 'Every ready-to-invoice job has its billing fields.', rows: r.map((x) => jobRow(x.w, { sub: 'Missing: ' + x.m.join(', '), chips: x.m.map((t) => C.chip(t, 'bad')) })) }));
    if (!r.length) {
      const ex = D.wos.filter(ready).slice(0, 2), fields = ['Pickup date', 'Monitors'];
      el.appendChild(C.note('Example rows, not real gaps'));
      el.appendChild(C.list({ rows: ex.map((w, i) => jobRow(w, { sub: 'Missing: ' + fields[i], chips: [C.chip(fields[i], 'mute'), C.chip('Example row', 'mute')] })) }));
    }
  });

  // ---- BILL ----
  reg('BILL-1', (el, { C }) => {
    const ms = ms12(), j = (m) => delivered.filter((w) => firstInv(w) && inP(firstInv(w), m)).map(wait);
    el.appendChild(C.line({ x: ms.map((m) => m.label), unit: ' d', yMin: 0, greyLabel: 'Fewer than 3 jobs', series: [{ name: 'Median', values: ms.map((m) => D.median(j(m))), grey: ms.map((m) => j(m).length < 3) }, { name: '80th percentile', values: ms.map((m) => D.pct(j(m), 80)), grey: ms.map((m) => j(m).length < 3) }] }));
  });

  reg('BILL-2', (el, { C }) => {
    const wk = D.weeks(12), at = (p) => (p.end > T ? T : p.end);
    const bk = [[0, 7, '0 to 7 days'], [8, 30, '8 to 30 days'], [31, 60, '31 to 60 days'], [61, Infinity, 'Over 60 days']], sq = C.colors.seq(4);
    const waiting = (p) => delivered.filter((w) => D.deliveredAt(w) <= at(p) && (!firstInv(w) || firstInv(w) > at(p)) && (!closedAt(w) || closedAt(w) > at(p))).map((w) => D.between(D.deliveredAt(w), at(p)));
    const data = wk.map(waiting);
    el.appendChild(C.stackedBar({ categories: wk.map((p) => p.label), series: bk.map((b, i) => ({ name: b[2], color: sq[i], values: data.map((d) => d.filter((x) => x >= b[0] && x <= b[1]).length) })) }));
  });

  reg('BILL-3', (el, { C }) => {
    const ms = ms12(), inv = [];
    D.wos.forEach((w) => w.invoices.forEach((i) => inv.push({ w, i })));
    el.appendChild(C.stackedBar({ categories: ms.map((m) => m.label), series: D.types.map((t) => ({ name: t, type: t, values: ms.map((m) => inv.filter((x) => x.w.type === t && inP(x.i.date, m)).length) })) }));
    el.appendChild(C.note('Counts of invoices sent. The last month is to date.'));
  });

  reg('BILL-4', (el, { C }) => {
    const ms = ms12(), jobs = D.wos.filter((w) => w.deploy && w.monitors);
    const days = (w, m) => { const s = w.deploy > m.start ? w.deploy : m.start, e0 = w.pickup || T, e = e0 < m.end ? e0 : m.end; return e >= s ? (D.between(s, e) + 1) * w.monitors : 0; };
    const from = ms[0].start, byCust = {};
    jobs.forEach((w) => { byCust[w.cust] = (byCust[w.cust] || 0) + D.sum(ms.map((m) => days(w, m))); });
    const top = Object.keys(byCust).sort((a, b) => byCust[b] - byCust[a]).slice(0, 6);
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    el.appendChild(C.stackedBar({ categories: ms.map((m) => m.label), series: types.map((t) => ({ name: t, type: t, values: ms.map((m) => D.sum(jobs.filter((w) => w.type === t).map((w) => days(w, m)))) })) }));
    el.appendChild(C.note('Monitor-days by customer, last 12 months, top 6'));
    el.appendChild(C.bar({ unit: ' monitor-days', seriesName: 'Monitor-days', data: top.map((c) => ({ label: c, value: byCust[c] })) }));
  });

  reg('BILL-5', (el, { C }) => {
    const ms = D.months(10), closedJobs = delivered.filter(closedAt);
    const d = (w) => D.between(D.deliveredAt(w), closedAt(w)), med = (p) => D.median(closedJobs.filter((w) => inP(closedAt(w), p)).map(d));
    const cur = med(qLast), prev = med(qPrev);
    el.appendChild(C.split([
      C.tile({ label: 'Delivered to closed, ' + qLast.label, value: cur == null ? '-' : cur + ' d', sub: 'Median days', delta: delta(cur, prev, ' d', true, qPrev.label) }),
      C.line({ x: ms.map((m) => m.label), height: 140, unit: ' d', series: [{ name: 'Median days', values: ms.map(med) }] }),
    ], { widths: [1, 2.4] }));
  });

  reg('BILL-6', (el, { C }) => {
    const ms = ms12();
    el.appendChild(C.pairedBar({ categories: ms.map((m) => m.label), series: [
      { name: 'Delivered', color: C.colors.cat[0], values: ms.map((m) => delivered.filter((w) => inP(D.deliveredAt(w), m)).length) },
      { name: 'First invoice sent', color: C.colors.cat[1], values: ms.map((m) => D.wos.filter((w) => !w.rev && firstInv(w) && inP(firstInv(w), m)).length) },
    ] }));
  });

  reg('BILL-7', (el, { C }) => {
    const from = D.addDays(T, -365), by = D.groupBy(delivered.filter((w) => firstInv(w) && D.deliveredAt(w) >= from), (w) => w.cust);
    const data = Object.entries(by).map(([c, js]) => ({ label: c + ' (' + js.length + ')', n: js.length, value: D.median(js.map(wait)) })).filter((x) => x.value != null);
    el.appendChild(C.bar({ unit: ' d', sort: 'desc', seriesName: 'Median days to first invoice', data: data.map((x) => Object.assign(x, { grey: x.n < 3 })) }));
    el.appendChild(C.note('Jobs delivered in the last 12 months; the number of jobs is in brackets. Grey bars have fewer than 3 jobs.'));
  });

  reg('BILL-8', (el, { C }) => {
    const ms = D.months(9, false), cms = D.wos.filter((w) => w.type === 'CM' && w.deploy && (w.pickup || T) >= ms[0].start);
    el.appendChild(C.grid({ rows: cms.map((w) => ({ label: D.label(w), sub: w.cust })), cols: ms.map((m) => m.label), states: { yes: { label: 'Invoiced', color: C.colors.status.good, glyph: '✓' }, no: { label: 'Deployed, no invoice', color: C.colors.status.bad, glyph: '✕' } }, blankLabel: 'Not deployed',
      cell: (ri, ci) => {
        const w = cms[ri], m = ms[ci];
        if (!(w.deploy <= m.end && (w.pickup || T) >= m.start)) return null;
        const inv = w.invoices.find((x) => x.date > m.end && x.date <= D.addDays(m.end, 31)) || w.invoices.find((x) => inP(x.date, m));
        return { state: inv ? 'yes' : 'no', tip: inv ? 'Invoice ' + inv.no + ', ' + D.fmt(inv.date) : 'No invoice for this month' };
      } }));
    el.appendChild(C.note('An invoice counts for a month when it is dated in that month or the month after.'));
  }, { wide: true });
})();
