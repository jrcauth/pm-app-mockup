/* Task 2: Engineer home (ENG-1..17), Eng manager home (MGR-1..19), Schedule (SCH-1..7). */
(function () {
  'use strict';
  const D = window.D, C = window.C, DASH = window.DASH;
  const T = D.today, ME = D.me, MGR = D.manager;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // ---------- small local helpers (no drawing, only data shaping) ----------
  const wk0 = () => D.weekStart(T);
  const dueChip = (w) => {
    if (!w.due) return C.chip('No due date', 'warn');
    const d = D.between(T, w.due);
    return d < 0 ? C.chip(-d + ' d late', 'bad') : d <= 7 ? C.chip(d ? 'in ' + d + ' d' : 'today', 'warn') : null;
  };
  const jobRow = (w, o) => Object.assign({
    title: D.label(w), text: w.cust, sub: D.st(w).name + ', ' + D.daysIn(w) + ' d in status',
    holder: D.st(w).holder, chips: [dueChip(w)].filter(Boolean), value: w.due ? D.fmt(w.due) : 'No date',
  }, o || {});
  const byPri = (a, b) => (a.pri || 999) - (b.pri || 999);
  const isMine = (w) => w.eng === ME;
  const listTile = (tile, list, widths) => C.split([C.tile(tile), C.list(list)], { widths: widths || [1, 2.4] });
  const sub = (w) => w.type + ', ' + D.st(w).name;
  const delivered = () => D.wos.filter((w) => !w.rev && D.deliveredAt(w) && D.st(w).name !== 'Cancelled');
  const lastHist = (w) => w.history[w.history.length - 1];
  const prevWorkday = () => { let d = D.addDays(T, -1); while (D.isWeekend(d) || D.holidays.some((h) => D.iso(h) === D.iso(d))) d = D.addDays(d, -1); return d; };
  const isQcQueue = (s) => s.holder === 'QC' && s.kind === 'Queue';
  const typeMedianHT = (() => { let m; return () => { if (m) return m; m = {}; D.types.forEach((t) => { const v = delivered().filter((w) => w.type === t && D.hasHT(w)).map(D.humanTime); const q = C.quartiles(v); m[t] = D.median(v.filter((x) => x >= q.lw && x <= q.hw)); }); return m; }; })();
  const wrapPlain = (nodes) => C.split(nodes, { dir: 'col' });

  // ================= ENGINEER HOME =================
  DASH.chart('ENG-1', (el) => {
    const rows = D.wos.filter((w) => D.open(w) && D.yourMove(w)).sort(byPri);
    el.appendChild(C.list({ rows: rows.map((w) => jobRow(w, { text: w.cust + (w.qc === ME && w.eng !== ME ? ', I review' : '') })), max: 6, empty: 'Nothing waiting on you.' }));
  });

  DASH.chart('ENG-2', (el) => {
    const rows = D.wos.filter((w) => D.active(w) && isMine(w) && ['QC', 'Customer', 'Field'].includes(D.st(w).holder) && !D.yourMove(w))
      .sort((a, b) => D.daysIn(b) - D.daysIn(a));
    el.appendChild(C.list({ rows: rows.map((w) => jobRow(w, { text: w.cust + ', with ' + D.who(w), value: D.daysIn(w) + ' d', chips: D.daysIn(w) >= 14 ? [C.chip('Stuck', 'bad')] : [] })), max: 6 }));
  });

  DASH.chart('ENG-3', (el) => {
    const rows = D.wos.filter((w) => D.active(w) && isMine(w) && w.due && D.between(T, w.due) <= 7).sort((a, b) => a.due - b.due);
    el.appendChild(C.list({ rows: rows.map((w) => jobRow(w, { sub: sub(w) })), max: 6, empty: 'Nothing due in the next 7 days.' }));
  });

  DASH.chart('ENG-4', (el) => {
    const from = D.addDays(T, -7), rows = [];
    D.wos.forEach((w) => w.history.forEach((h, i) => {
      if (h.by === ME && h.date >= from && i > 0) rows.push({ w, h, prev: D.WF[w.type][w.history[i - 1].si] });
    }));
    rows.sort((a, b) => b.h.date - a.h.date);
    el.appendChild(C.list({ max: 6, empty: 'No status changes in the last 7 days.', rows: rows.map(({ w, h, prev }) => ({
      title: D.label(w), text: (prev ? prev.name + ' to ' : 'To ') + D.WF[w.type][h.si].name, sub: w.cust, holder: D.WF[w.type][h.si].holder, value: D.fmt(h.date),
    })) }));
  });

  DASH.chart('ENG-5', (el) => {
    const ws = wk0(), mine = D.entries.filter((e) => e.person === ME && e.date >= ws && e.date < D.addDays(ws, 7));
    const per = D.person(ME).weeklyHours / 5;
    const sumDay = (i, f) => D.sum(mine.filter((e) => D.between(ws, e.date) === i && f(e)).map((e) => e.hours));
    const off = (i) => D.timeOff.some((t) => t.person === ME && D.iso(t.date) === D.iso(D.addDays(ws, i))) ? per : 0;
    const series = [
      { name: 'WO', color: C.colors.split.WO, values: DAYS.map((d, i) => sumDay(i, (e) => e.wo && !e.oos)) },
      { name: 'Out of scope', color: C.colors.split['Out of scope'], values: DAYS.map((d, i) => sumDay(i, (e) => e.oos)) },
      { name: 'General', color: C.colors.split.General, values: DAYS.map((d, i) => sumDay(i, (e) => !e.wo)) },
      { name: 'Time off', color: C.colors.split['Time off'], values: DAYS.map((d, i) => off(i)) },
    ];
    const logged = D.sum(mine.map((e) => e.hours));
    const pace = C.paceBar({ unit: ' h', target: D.available(ME, ws), targetLabel: 'available', segments: series.slice(0, 3).map((s) => ({ name: s.name, value: D.sum(s.values), color: s.color })) });
    const empty = DAYS.slice(0, 5).filter((d, i) => D.addDays(ws, i) <= T && !off(i) && !sumDay(i, () => true));
    const nodes = [pace, C.stackedBar({ categories: DAYS, series, unit: ' h', totals: true, tips: undefined })];
    if (empty.length) nodes.push(C.note('No hours logged on ' + empty.join(', ') + '.', { tone: 'bad' }));
    el.appendChild(wrapPlain(nodes));
  });

  DASH.chart('ENG-6', (el) => {
    const ws = wk0(), mine = D.entries.filter((e) => e.person === ME && e.date >= ws);
    const t = (s, label, status) => ({ label, value: mine.filter((e) => e.status === s).length, sub: D.num(D.sum(mine.filter((e) => e.status === s).map((e) => e.hours)), 1) + ' h', status });
    el.appendChild(C.tiles([t('draft', 'Draft'), t('submitted', 'Submitted'), t('approved', 'Approved'), Object.assign(t('rejected', 'Rejected'), { status: mine.some((e) => e.status === 'rejected') ? 'bad' : undefined })]));
  });

  DASH.chart('ENG-7', (el) => {
    const rows = D.entries.filter((e) => e.person === ME && e.status === 'rejected').sort((a, b) => b.date - a.date);
    el.appendChild(C.list({ max: 6, empty: 'No rejected entries.', rows: rows.map((e) => ({ title: D.fmt(e.date) + ', ' + (e.wo || 'General'), text: e.rejectReason || 'No reason given', sub: e.task + (e.sub ? ', ' + e.sub : ''), value: D.num(e.hours, 2) + ' h', chips: [C.chip('Rejected', 'bad')] })) }));
  });

  DASH.chart('ENG-8', (el) => {
    const from = D.addDays(T, -90), mine = D.entries.filter((e) => e.person === ME && e.date >= from && D.isHT(e));
    const data = [];
    D.types.forEach((t) => { const v = D.sum(mine.filter((e) => e.wo && D.byKey(e.wo).type === t).map((e) => e.hours)); if (v) data.push({ label: t, value: v, type: t }); });
    const gen = D.hoursBy(mine.filter((e) => !e.wo), (e) => e.genClass || 'General');
    Object.keys(gen).forEach((k) => data.push({ label: 'General, ' + k, value: gen[k], color: C.colors.split.General }));
    const off = D.timeOff.filter((t) => t.person === ME && t.date >= from && t.date <= T).length * (D.person(ME).weeklyHours / 5);
    if (off) data.push({ label: 'Time off', value: off, color: C.colors.split['Time off'] });
    el.appendChild(C.bar({ data, unit: ' h', seriesName: 'Human Time' }));
  });

  DASH.chart('ENG-9', (el) => {
    const ms = D.months(12).filter((m) => m.start.getFullYear() === 2026 && m.end >= D.entriesStart);
    const tr = D.entries.filter((e) => e.person === ME && e.training && D.isHT(e));
    const h = (m, kind) => D.sum(tr.filter((e) => e.training.kind === kind && D.inRange(e.date, m)).map((e) => e.hours));
    const rec = D.sum(tr.filter((e) => e.training.kind === 'Received').map((e) => e.hours)), adm = D.sum(tr.filter((e) => e.training.kind === 'Administered').map((e) => e.hours));
    el.appendChild(C.split([
      C.tile({ label: 'Training this year', value: rec + adm, unit: ' h', dec: 1, sub: D.num(rec, 1) + ' h received, ' + D.num(adm, 1) + ' h administered' }),
      C.line({ x: ms.map((m) => m.label), unit: ' h', dec: 1, height: 150, series: [{ name: 'Received', color: C.colors.cat[0], values: ms.map((m) => h(m, 'Received')) }, { name: 'Administered', color: C.colors.cat[1], values: ms.map((m) => h(m, 'Administered')) }] }),
    ], { widths: [1, 2.2] }));
  });

  DASH.chart('ENG-10', (el) => {
    const from = D.addDays(T, -3), rows = [];
    D.wos.filter((w) => D.open(w) && isMine(w)).forEach((w) => {
      w.history.forEach((h, i) => { if (i > 0 && h.by !== ME && h.date >= from) rows.push({ date: h.date, w, text: 'Status changed to ' + D.WF[w.type][h.si].name, by: h.by }); });
      w.comments.forEach((c) => { if (c.by !== ME && c.date >= from) rows.push({ date: c.date, w, text: 'Comment: ' + c.text, by: c.by }); });
    });
    rows.sort((a, b) => b.date - a.date);
    el.appendChild(C.list({ max: 6, empty: 'Nothing new on your jobs.', rows: rows.map((r) => ({ title: D.label(r.w), text: r.text, sub: r.by, holder: D.st(r.w).holder, value: D.fmt(r.date) })) }));
  });

  DASH.chart('ENG-11', (el) => {
    const med = typeMedianHT();
    const jobs = D.wos.filter((w) => D.active(w) && isMine(w));
    el.appendChild(C.bar({ unit: ' h', dec: 1, markerLabel: 'Median for the type', seriesName: 'logged so far', data: jobs.map((w) => ({ label: D.label(w) + ' ' + w.type, value: D.humanTime(w), marker: med[w.type], type: w.type })) }));
  });

  DASH.chart('ENG-12', (el) => {
    const ws = wk0();
    const rows = D.wos.filter((w) => D.active(w) && isMine(w) && D.st(w).holder === 'Urban' && !D.entries.some((e) => e.person === ME && e.wo === w.key && e.date >= ws));
    if (rows.length) { el.appendChild(C.list({ max: 6, rows: rows.map((w) => jobRow(w, { value: D.daysIn(w) + ' d', chips: [] })) })); return; }
    const ex = D.wos.find((w) => D.active(w) && isMine(w) && D.st(w).holder === 'Urban');
    const nodes = [C.empty('Every job of yours has hours this week.')];
    if (ex) nodes.push(C.note('Example row, not a real gap:'), C.list({ rows: [jobRow(ex, { value: D.daysIn(ex) + ' d', chips: [C.chip('No hours this week', 'mute')] })] }));
    el.appendChild(wrapPlain(nodes));
  });

  DASH.chart('ENG-13', (el) => {
    const rows = D.wos.filter((w) => D.open(w) && isMine(w) && ['NMP', 'NIA'].includes(w.type) && w.ambNeeded && !w.ambWO);
    el.appendChild(C.list({ max: 6, empty: 'Every ambient need is linked.', rows: rows.map((w) => jobRow(w, { sub: 'Ambient needed, none linked', value: D.between(w.created, T) + ' d old', chips: [C.chip('No ambient', 'warn')] })) }));
  });

  DASH.chart('ENG-14', (el) => {
    const rows = [];
    D.wos.filter((w) => D.open(w) && isMine(w)).forEach((w) => {
      if (w.planned && !w.deploy) { const d = D.between(T, w.planned); if (d >= 0 && d <= 14) rows.push({ w, date: w.planned, text: (w.type === 'SIG' ? 'Field day' : 'Deploy') + (w.monitors ? ', ' + w.monitors + ' monitors' : '') }); }
      else if (w.deploy && !w.pickup && w.studyLen) { const p = D.addDays(w.deploy, w.studyLen); if (D.between(T, p) <= 14) rows.push({ w, date: p, text: 'Pickup due' + (w.monitors ? ', ' + w.monitors + ' monitors' : '') }); }
    });
    rows.sort((a, b) => a.date - b.date);
    el.appendChild(C.list({ max: 6, empty: 'No field work in the next 14 days.', rows: rows.map((r) => ({ title: D.label(r.w), text: r.text, sub: r.w.cust + ', ' + r.w.site, holder: 'Field', value: D.fmt(r.date), chips: D.between(T, r.date) < 0 ? [C.chip('Overdue', 'bad')] : [] })) }));
  });

  DASH.chart('ENG-15', (el) => {
    let jobs = D.wos.filter((w) => D.open(w) && isMine(w) && w.si <= 1);
    if (!jobs.length) jobs = D.wos.filter((w) => D.active(w) && isMine(w)).slice(0, 3);
    jobs = jobs.slice(0, 3);
    const rows = [];
    jobs.forEach((w) => {
      const prior = D.wos.filter((p) => !p.rev && p.site === w.site && p.id !== w.id && p.created < w.created).sort((a, b) => b.created - a.created);
      const g = D.label(w) + ' at ' + w.site;
      if (!prior.length) rows.push({ group: g, title: 'No earlier work orders', text: 'First job at this site' });
      prior.forEach((p) => rows.push({ group: g, title: D.label(p), text: p.type + ', ' + p.cust, sub: p.eng || 'No engineer', value: D.deliveredAt(p) ? 'Delivered ' + D.fmt(D.deliveredAt(p), true) : 'Not delivered' }));
    });
    el.appendChild(C.list({ rows, max: 8 }));
  });

  DASH.chart('ENG-16', (el) => {
    const from = D.addDays(T, -90);
    const trips = (w) => D.visits(w).filter((v) => v.holder === 'QC' && v.kind === 'Review').length;
    const mine = delivered().filter((w) => isMine(w) && D.deliveredAt(w) >= from);
    const team = delivered().filter((w) => D.deliveredAt(w) >= from);
    const mm = D.median(mine.map(trips)), tm = D.median(team.map(trips));
    el.appendChild(listTile(
      { label: 'Median QC visits per job', value: mm == null ? 0 : mm, dec: 1, sub: 'Team median ' + D.num(tm || 0, 1) + ', ' + mine.length + ' jobs', delta: mm != null && tm != null ? { text: mm > tm ? 'Above team' : 'At or below team', tone: mm > tm ? 'bad' : 'good' } : undefined },
      { max: 5, empty: 'No delivered jobs in the last 90 days.', rows: mine.sort((a, b) => trips(b) - trips(a)).map((w) => ({ title: D.label(w), text: w.type + ', ' + w.cust, value: trips(w) + (trips(w) === 1 ? ' visit' : ' visits') })) }));
  });

  DASH.chart('ENG-17', (el) => {
    const wks = D.weeks(12, false);
    const val = (p) => { const av = D.available(ME, p.start); if (!av) return null; return D.sum(D.entries.filter((e) => e.person === ME && e.wo && !e.oos && D.inRange(e.date, p)).map((e) => e.hours)) / av; };
    const vals = wks.map(val), cur = vals.filter((v) => v != null);
    const avg = cur.length ? D.mean(cur) : 0;
    el.appendChild(C.split([
      C.tile({ label: 'Average, last 12 weeks', value: Math.round(avg * 100) + '%', sub: 'In-scope WO hours over available hours' }),
      C.line({ x: wks.map((p) => p.label), series: [{ name: 'WO share', values: vals, color: C.colors.one }], pct: true, height: 150, yMin: 0, yMax: Math.max(1, ...cur) }),
    ], { widths: [1, 2.2] }));
  });

  // ================= ENG MANAGER HOME =================
  DASH.chart('MGR-1', (el) => {
    const first = (w) => D.WF[w.type][0].name;
    const rows = D.wos.filter((w) => D.open(w) && (!w.eng || (D.st(w).name === first(w) && D.daysIn(w) > 2))).sort((a, b) => a.created - b.created);
    el.appendChild(listTile({ label: 'Waiting to be assigned', value: rows.length, status: rows.length ? 'warn' : undefined }, { max: 5, empty: 'Nothing waiting.', rows: rows.map((w) => jobRow(w, { text: w.cust, sub: w.type + ', ' + (w.eng ? 'assigned to ' + w.eng : 'no engineer') + ', requested ' + D.fmt(w.created), value: D.between(w.created, T) + ' d' })) }));
  });

  DASH.chart('MGR-2', (el) => {
    const rows = D.wos.filter(D.overdue).sort((a, b) => a.due - b.due);
    el.appendChild(listTile({ label: 'Overdue', value: rows.length, status: rows.length ? 'bad' : undefined, sub: 'Active and past the client due date' }, { max: 5, rows: rows.map((w) => jobRow(w, { text: w.cust + ', ' + D.who(w), chips: [C.chip(D.between(w.due, T) + ' d late', 'bad')], value: D.fmt(w.due) })) }));
  });

  DASH.chart('MGR-3', (el) => {
    const rows = D.wos.filter((w) => D.active(w) && w.due && D.between(T, w.due) >= 0 && D.between(T, w.due) <= 14).sort((a, b) => a.due - b.due);
    el.appendChild(C.list({ max: 8, empty: 'Nothing due in the next 14 days.', rows: rows.map((w) => jobRow(w, { group: 'Week of ' + D.fmt(D.weekStart(w.due)), text: w.cust + ', ' + D.who(w), chips: [], value: D.fmt(w.due) })) }));
  });

  DASH.chart('MGR-4', (el) => {
    const rows = D.wos.filter(D.stuck).sort((a, b) => D.HOLDERS.indexOf(D.st(a).holder) - D.HOLDERS.indexOf(D.st(b).holder) || D.daysIn(b) - D.daysIn(a));
    el.appendChild(listTile({ label: 'Stuck 14 days or more', value: rows.length, status: rows.length ? 'warn' : undefined }, { max: 6, empty: 'Nothing stuck.', rows: rows.map((w) => jobRow(w, { group: D.st(w).holder, text: w.cust + ', ' + D.who(w), value: D.daysIn(w) + ' d', chips: [] })) }));
  });

  DASH.chart('MGR-5', (el) => {
    const q = D.wos.filter((w) => D.active(w) && isQcQueue(D.st(w))).sort((a, b) => D.daysIn(b) - D.daysIn(a));
    const by = D.countBy(q, (w) => w.qc || 'No reviewer');
    const oldest = q.length ? D.daysIn(q[0]) : 0;
    el.appendChild(C.split([
      C.tiles([{ label: 'In the QC queue', value: q.length }, { label: 'Oldest wait', value: oldest, unit: ' d', status: oldest >= 14 ? 'bad' : oldest >= 7 ? 'warn' : undefined }].concat(Object.keys(by).map((k) => ({ label: k, value: by[k], small: true })))),
      C.list({ max: 5, empty: 'The QC queue is empty.', rows: q.map((w) => jobRow(w, { sub: D.st(w).name, text: w.cust + ', ' + (w.qc || 'No reviewer'), value: D.daysIn(w) + ' d', chips: [] })) }),
    ], { dir: 'col' }));
  });

  DASH.chart('MGR-6', (el) => {
    const rows = D.wos.filter((w) => D.active(w) && D.st(w).holder === 'Customer').sort((a, b) => (a.cust < b.cust ? -1 : a.cust > b.cust ? 1 : 0) || D.daysIn(b) - D.daysIn(a));
    el.appendChild(listTile({ label: 'Jobs waiting on a customer', value: rows.length, sub: rows.filter((w) => D.daysIn(w) > 14).length + ' over 14 days' }, { max: 6, rows: rows.map((w) => jobRow(w, { group: w.cust, title: D.label(w), text: D.st(w).name, sub: w.eng || 'No engineer', value: D.daysIn(w) + ' d', chips: D.daysIn(w) > 14 ? [C.chip('Over 14 d', 'bad')] : [] })) }));
  });

  DASH.chart('MGR-7', (el) => {
    const rows = D.wos.filter((w) => D.open(w) && D.holdNow(w)).sort((a, b) => D.holdNow(a).start - D.holdNow(b).start);
    el.appendChild(listTile({ label: 'On hold', value: rows.length }, { max: 5, rows: rows.map((w) => ({ title: D.label(w), text: D.holdNow(w).reason, sub: w.cust + ', ' + D.st(w).name, value: D.between(D.holdNow(w).start, T) + ' d' })) }));
  });

  DASH.chart('MGR-8', (el) => {
    const engs = D.engineers.concat(D.reviewers), ws = wk0();
    const active = D.wos.filter(D.active);
    const mv = engs.map((e) => active.filter((w) => w.eng === e && D.yourMove(w, e)).length);
    const wt = engs.map((e) => active.filter((w) => w.eng === e).length - mv[engs.indexOf(e)]);
    const rows = engs.map((e, i) => ({ name: e, hours: D.sum(D.entries.filter((x) => x.person === e && x.date >= ws).map((x) => x.hours)), avail: D.available(e, ws) }));
    el.appendChild(wrapPlain([
      C.stackedBar({ horizontal: true, categories: engs, series: [{ name: 'Their move', color: C.colors.holder.Urban, values: mv }, { name: 'Waiting', color: C.colors.other, values: wt }] }),
      C.table({ dense: true, sortable: false, columns: [{ key: 'name', label: 'Hours this week' }, { key: 'hours', label: 'Logged', num: true, dec: 1, fmt: (v) => D.num(v, 1) + ' h' }, { key: 'avail', label: 'Available', num: true, fmt: (v) => v + ' h' }, { key: 'pct', label: 'Logged share', num: true, value: (r) => (r.avail ? r.hours / r.avail : 0), fmt: (v) => Math.round(v * 100) + '%' }], rows }),
    ]));
  });

  DASH.chart('MGR-9', (el) => {
    const lws = D.addDays(wk0(), -7), team = D.people.filter((p) => p.name !== MGR);
    const inLast = (p) => D.entries.filter((e) => e.person === p.name && e.date >= lws && e.date < D.addDays(lws, 7));
    const waiting = team.filter((p) => inLast(p).some((e) => e.status === 'submitted'));
    const none = team.filter((p) => { const en = inLast(p); return !en.some((e) => e.status === 'submitted' || e.status === 'approved'); });
    el.appendChild(wrapPlain([
      C.tiles([{ label: 'Weeks waiting for approval', value: waiting.length, status: waiting.length ? 'warn' : undefined, sub: 'Week of ' + D.fmt(lws) }, { label: 'Nothing submitted last week', value: none.length, status: none.length ? 'bad' : undefined }]),
      C.list({ max: 6, rows: waiting.map((p) => ({ title: p.name, text: 'Submitted, waiting for approval', chips: [C.chip('Approve', 'warn')] })).concat(none.map((p) => ({ title: p.name, text: 'Nothing submitted', chips: [C.chip('Missing', 'bad')] }))) }),
    ]));
  });

  DASH.chart('MGR-10', (el) => {
    const ws = wk0(), cnt = (s, e) => delivered().filter((w) => { const d = D.deliveredAt(w); return d >= s && d <= e; }).length;
    const now = cnt(ws, T), prev = [1, 2, 3, 4].map((i) => cnt(D.addDays(ws, -7 * i), D.addDays(ws, -7 * i + 6))), avg = D.mean(prev);
    el.appendChild(C.tile({ label: 'Delivered this week', value: now, sub: 'Average of the last 4 weeks: ' + D.num(avg, 1), delta: { text: (now - avg >= 0 ? '+' : '') + D.num(now - avg, 1) + ' against the average', tone: now >= avg ? 'good' : 'bad' }, spark: prev.slice().reverse().concat([now]) }));
  });

  DASH.chart('MGR-11', (el) => {
    const open = D.wos.filter(D.open), act = D.wos.filter(D.active), custs = D.customers.map((c) => c.name);
    const dup = {}; let dups = 0; D.entries.forEach((e) => { const k = [e.person, D.iso(e.date), e.wo, e.task, e.sub, e.hours].join('|'); if (dup[k]) dups++; dup[k] = 1; });
    const checks = [
      ['Active jobs with no due date', act.filter((w) => !w.due).length],
      ['Active jobs with no QC reviewer', act.filter((w) => !w.qc).length],
      ['Open jobs with no engineer', open.filter((w) => !w.eng).length],
      ['Ambient needed, not linked', open.filter((w) => ['NMP', 'NIA'].includes(w.type) && w.ambNeeded && !w.ambWO).length],
      ['Modeling started, information not complete', open.filter((w) => !w.rev && ['NMP', 'NIA'].includes(w.type) && D.first(w, 'Modeling') && !w.infoDate).length],
      ['Customer name not in the list', D.wos.filter((w) => !custs.includes(w.cust)).length],
      ['Duplicate time entries', dups],
      ['Entries over 10 hours', D.entries.filter((e) => e.hours > 10).length],
    ];
    const total = D.sum(checks.map((c) => c[1]));
    el.appendChild(listTile({ label: 'Open data warnings', value: total, status: total ? 'warn' : 'good', sub: 'Checks run on Data health' }, { max: 6, rows: checks.filter((c) => c[1]).map((c) => ({ title: c[0], value: c[1] })) }));
  });

  DASH.chart('MGR-12', (el) => {
    const since = prevWorkday(), rows = [];
    D.wos.forEach((w) => {
      const who = w.eng || 'Unassigned';
      w.history.forEach((h, i) => { if (h.date >= since && i > 0) rows.push({ g: who, w, text: 'Moved to ' + D.WF[w.type][h.si].name, date: h.date }); });
      if (w.created >= since) rows.push({ g: who, w, text: 'New work order, ' + w.type, date: w.created });
      w.holds.forEach((x) => { if (x.start >= since) rows.push({ g: who, w, text: 'New hold: ' + x.reason, date: x.start }); });
      w.comments.forEach((c) => { if (c.date >= since) rows.push({ g: who, w, text: 'Comment from ' + c.by + ': ' + c.text, date: c.date }); });
    });
    rows.sort((a, b) => (a.g < b.g ? -1 : a.g > b.g ? 1 : 0) || b.date - a.date);
    el.appendChild(C.list({ max: 8, empty: 'No changes since ' + D.fmt(since) + '.', rows: rows.map((r) => ({ group: r.g, title: D.label(r.w), text: r.text, sub: r.w.cust, holder: D.st(r.w).holder, value: D.fmt(r.date) })) }));
  });

  const risk = (() => {
    const cache = {};
    const expected = (w) => {
      const k = w.type + '|' + D.st(w).name;
      if (k in cache) return cache[k];
      const v = delivered().filter((x) => x.type === w.type).map((x) => { const f = D.first(x, D.st(w).name); return f ? D.between(f, D.deliveredAt(x)) - D.holdDays(x) : null; }).filter((x) => x != null);
      return (cache[k] = v.length >= 3 ? D.median(v) : null);
    };
    return (w) => { if (!D.active(w) || !w.due || w.due < T) return null; const left = D.between(T, w.due), e0 = expected(w), e = e0 == null ? null : Math.max(0, e0 - D.daysIn(w)); return e != null && e > left ? { e: Math.round(e), left } : null; };
  })();
  DASH.chart('MGR-13', (el) => {
    const rows = D.wos.map((w) => ({ w, r: risk(w) })).filter((x) => x.r && true).sort((a, b) => (b.r.e - b.r.left) - (a.r.e - a.r.left));
    el.appendChild(listTile({ label: 'Jobs at risk', value: rows.length, status: rows.length ? 'warn' : undefined, sub: 'Not yet late; usual days left minus hold time' }, { max: 5, empty: 'No job is expected to miss its date.', rows: rows.map(({ w, r }) => jobRow(w, { sub: 'Usually ' + r.e + ' d from here, ' + r.left + ' d left', chips: [C.chip(Math.round(r.e - r.left) + ' d short', 'warn')], value: D.fmt(w.due) })) }));
  });

  DASH.chart('MGR-14', (el) => {
    const rows = D.wos.filter((w) => D.active(w) && !w.qc && (isQcQueue(D.st(w)) || (D.WF[w.type][w.si + 1] && isQcQueue(D.WF[w.type][w.si + 1])) ));
    el.appendChild(C.list({ max: 6, empty: 'Every job near review has a reviewer.', rows: rows.map((w) => jobRow(w, { sub: D.st(w).name + ', next ' + (D.WF[w.type][w.si + 1] ? D.WF[w.type][w.si + 1].name : 'none'), chips: [C.chip('No reviewer', 'warn')], value: w.eng || 'No engineer' })) }));
  });

  DASH.chart('MGR-15', (el) => {
    const rows = D.wos.filter((w) => D.open(w) && ['NMP', 'NIA'].includes(w.type) && w.ambNeeded && !w.ambWO).sort((a, b) => a.created - b.created);
    el.appendChild(C.list({ max: 6, empty: 'Every ambient need is linked.', rows: rows.map((w) => jobRow(w, { text: w.cust + ', ' + (w.eng || 'No engineer'), sub: w.type + ', ' + D.st(w).name, value: D.between(w.created, T) + ' d', chips: [C.chip('No ambient', 'warn')] })) }));
  });

  DASH.chart('MGR-16', (el) => {
    const items = [], end = D.addDays(T, 14);
    D.wos.filter(D.open).forEach((w) => {
      if (w.planned && !w.deploy && w.planned >= T && w.planned < end) items.push({ date: w.planned, label: D.label(w), sub: (w.type === 'SIG' ? 'Field day' : 'Deploy') + (w.monitors ? ', ' + w.monitors + ' monitors' : ''), holder: 'Field', legend: w.type === 'SIG' ? 'Field day' : 'Deploy' });
      if (w.deploy && !w.pickup && w.studyLen) { const p = D.addDays(w.deploy, w.studyLen); if (p >= T && p < end) items.push({ date: p, label: D.label(w), sub: 'Pickup' + (w.monitors ? ', ' + w.monitors + ' monitors' : ''), color: C.colors.cat[1], legend: 'Pickup' }); }
    });
    el.dataset.wide = '1';
    el.appendChild(C.calendarStrip({ start: T, days: 14, today: T, items, skipWeekends: true }));
  });

  DASH.chart('MGR-17', (el) => {
    const rows = D.wos.filter((w) => w.rev && D.open(w)).sort((a, b) => a.created - b.created);
    el.appendChild(listTile({ label: 'Open revisions', value: rows.length }, { max: 5, empty: 'No open revisions.', rows: rows.map((w) => jobRow(w, { sub: D.st(w).name + ', ' + (w.eng || 'No engineer'), chips: [], value: D.between(w.created, T) + ' d' })) }));
  });

  DASH.chart('MGR-18', (el) => {
    const wks = D.weeks(12), dl = delivered();
    el.appendChild(C.pairedBar({ categories: wks.map((p) => p.label), series: [
      { name: 'Created', color: C.colors.cat[0], values: wks.map((p) => D.wos.filter((w) => !w.rev && D.inRange(w.created, p)).length) },
      { name: 'Delivered', color: C.colors.cat[1], values: wks.map((p) => dl.filter((w) => D.inRange(D.deliveredAt(w), p)).length) },
    ] }));
  });

  DASH.chart('MGR-19', (el) => {
    const rows = D.wos.filter((w) => D.open(w) && !w.rev && ['NMP', 'NIA'].includes(w.type) && D.first(w, 'Modeling') && !w.infoDate).sort((a, b) => D.first(a, 'Modeling') - D.first(b, 'Modeling'));
    el.appendChild(C.list({ max: 6, empty: 'No job is being modeled on partial information.', rows: rows.map((w) => jobRow(w, { sub: D.st(w).name + ', ' + (w.eng || 'No engineer'), chips: [C.chip('Info incomplete', 'warn')], value: D.between(D.first(w, 'Modeling'), T) + ' d' })) }));
  });

  // ================= SCHEDULE =================
  const spread = (n, filter) => {
    const act = D.wos.filter((w) => D.active(w) && (!filter || filter(w))), out = [];
    D.types.forEach((t) => { const f = act.find((w) => w.type === t); if (f && out.length < n) out.push(f); });
    act.forEach((w) => { if (out.length < n && !out.includes(w)) out.push(w); });
    return out;
  };
  const woCol = { key: 'wo', label: 'WO', value: (w) => w.key, render: (w) => D.label(w) };
  const custCol = { key: 'cust', label: 'Customer' };
  const statusCol = { key: 'st', label: 'Status', value: (w) => D.st(w).name, render: (w) => C.pill(D.st(w).name, D.st(w).holder) };
  const dueCol = { key: 'due', label: 'Due', value: (w) => w.due, render: (w) => [w.due ? D.fmt(w.due) : '', dueChip(w)].filter(Boolean) };
  const daysChip = (w) => { const d = D.daysIn(w); return C.chip(d + ' d', d >= 14 ? 'bad' : d >= 7 ? 'warn' : 'mute'); };
  const tbl = (rows, columns, o) => C.table(Object.assign({ columns, rows, sortable: false }, o || {}));

  DASH.chart('SCH-1', (el) => {
    const rows = spread(6);
    el.dataset.wide = '1';
    el.appendChild(wrapPlain([
      tbl(rows, [woCol, { key: 'type', label: 'Type', value: (w) => w.type }].concat(D.STAGES.map(([c, n]) => ({ key: c, label: n, render: (w) => C.stageCell(D.stage(w, c)) })))),
      C.note('Each cell says done, in progress with who has it, not started, or not part of the job type. An NMP or NIA shows its linked ambient under Field.'),
    ]));
  });

  DASH.chart('SCH-2', (el) => {
    el.appendChild(wrapPlain([
      tbl(spread(6), [woCol, custCol, statusCol, { key: 'h', label: 'Held by', value: (w) => D.st(w).holder, render: (w) => [C.dot(D.st(w).holder), ' ' + D.st(w).holder] }]),
      C.legend(D.HOLDERS.map((h) => ({ label: h, color: C.colors.holder[h], shape: 'rect' }))),
    ]));
  });

  DASH.chart('SCH-3', (el) => {
    const act = D.wos.filter(D.active).filter((w) => w.due).sort((a, b) => a.due - b.due);
    const rows = act.filter((w) => w.due < T).slice(0, 2).concat(act.filter((w) => w.due >= T).slice(0, 3), act.filter((w) => D.between(T, w.due) > 7).slice(0, 1));
    el.appendChild(tbl(rows, [woCol, custCol, dueCol]));
  });

  DASH.chart('SCH-4', (el) => {
    const rows = D.wos.filter(D.active).sort((a, b) => D.daysIn(b) - D.daysIn(a)).filter((w, i) => i < 2 || i % 6 === 0).slice(0, 6).concat(D.wos.filter((w) => D.active(w) && D.daysIn(w) < 7).slice(0, 1));
    el.appendChild(wrapPlain([
      tbl(rows, [woCol, statusCol, { key: 'days', label: 'Days in status', num: true, value: (w) => D.daysIn(w), render: daysChip }]),
      C.note('Grey under 7 days, amber from 7, red from 14.'),
    ]));
  });

  DASH.chart('SCH-5', (el) => {
    const mine = D.wos.filter((w) => D.active(w) && D.yourMove(w, w.eng) && D.WF[w.type][w.si + 1]).slice(0, 3);
    const rows = mine.concat(D.wos.filter((w) => D.active(w) && !D.yourMove(w, w.eng) && D.WF[w.type][w.si + 1]).slice(0, 3));
    el.appendChild(wrapPlain([
      tbl(rows, [woCol, statusCol, { key: 'next', label: 'Next status', render: (w) => (D.yourMove(w, w.eng) ? C.button(D.WF[w.type][w.si + 1].name) : D.WF[w.type][w.si + 1].name) }]),
      C.note('A button on rows that are the engineer\'s move; other rows show the next status as text.'),
    ]));
  });

  DASH.chart('SCH-6', (el) => {
    const act = D.wos.filter((w) => D.open(w) && (D.active(w) || D.holdNow(w)));
    const defs = [
      ['all', 'All in flight', () => true],
      ['move', 'My move', (w) => D.yourMove(w)],
      ['late', 'Late', (w) => D.overdue(w)],
      ['qc', 'With QC', (w) => D.active(w) && D.st(w).holder === 'QC'],
      ['cust', 'With customer', (w) => D.active(w) && D.st(w).holder === 'Customer'],
      ['hold', 'On hold', (w) => !!D.holdNow(w)],
    ];
    let cur = 'all';
    const tiles = document.createElement('div'), list = document.createElement('div');
    tiles.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-bottom:8px';
    const draw = () => {
      const f = defs.find((d) => d[0] === cur)[2];
      list.replaceChildren(tbl(act.filter(f).sort((a, b) => D.daysIn(b) - D.daysIn(a)), [woCol, statusCol, dueCol], { max: 4 }));
      Array.from(tiles.children).forEach((b) => b.style.outline = b.dataset.k === cur ? '2px solid ' + C.colors.holder.Urban : 'none');
    };
    defs.forEach(([k, label, f]) => {
      const b = document.createElement('div');
      b.dataset.k = k; b.setAttribute('role', 'button'); b.tabIndex = 0; b.style.cursor = 'pointer';
      b.appendChild(C.tile({ label, value: act.filter(f).length, small: true }));
      const go = () => { cur = k; draw(); };
      b.addEventListener('click', go); b.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      tiles.appendChild(b);
    });
    el.append(tiles, list); draw();
  });

  DASH.chart('SCH-7', (el) => {
    const jobs = spread(8);
    const rows = jobs.map((w) => {
      const bars = D.visits(w).map((v) => ({ start: v.start, end: v.end || T, holder: v.holder === 'None' ? undefined : v.holder, tip: v.name + ', ' + v.days + ' d' }));
      if (w.due && w.due > T) bars.push({ start: T, end: w.due, holder: D.st(w).holder, light: true, tip: 'Planned, to the client due date' });
      return { label: D.label(w), sub: w.type + ', ' + w.cust, bars, marks: w.due ? [{ date: w.due, label: 'Due' }] : [] };
    });
    const starts = jobs.map((w) => w.created), ends = jobs.map((w) => w.due || T).concat([T]);
    el.dataset.wide = '1';
    el.appendChild(C.gantt({ rows, today: T, start: new Date(Math.min(...starts)), end: D.addDays(new Date(Math.max(...ends)), 3), legend: D.HOLDERS.map((h) => ({ label: h, color: C.colors.holder[h] })).concat([{ label: 'Still to go', color: C.colors.other, shape: 'rect' }, { label: 'Due date', color: C.colors.ink, shape: 'tick' }]) }));
  });
})();
