/* Task 5: Hours (HRS), Standard times (STD), Capacity (CAP), WO page (WO) */
(function () {
  'use strict';
  const D = window.D, C = window.C, DASH = window.DASH;
  if (!D || !C || !DASH) return;

  // ---- Task to stage mapping (stage names as in D.STAGES) -------------------
  const STAGE_NAMES = D.STAGES.map((s) => s[1]); // Prelim, Field, Model, Prelim results, Report
  const TASK_STAGE = {
    'Project Administrative': 'Prelim',
    'Customer Communication': 'Prelim',
    'Field Work': 'Field',
    'Data Processing': 'Field',
    'Modeling': 'Model',
    'Report': 'Report',
  };
  const SUB_STAGE = { 'Customer Communication|Preliminary Results': 'Prelim results' };
  const stageOf = (e) => SUB_STAGE[e.task + '|' + e.sub] || TASK_STAGE[e.task] || null;

  // ---- small local helpers ---------------------------------------------------
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const TODAY = D.today;
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
  const med = (a) => D.median(a.filter((v) => v != null));
  const people = () => D.engineers.concat(D.reviewers);
  const delivered = () => D.wos.filter((w) => !w.rev && D.deliveredAt(w));
  const deliveredHT = () => delivered().filter(D.hasHT);
  const htEntries = (w) => D.entriesFor(w).filter(D.isHT);
  const hoursBy = (w, fn) => D.hoursBy(htEntries(w), fn);
  const typeJobs = (t) => deliveredHT().filter((w) => w.type === t);
  const typesWith = (fn) => D.types.filter((t) => fn(t));
  // Tukey fences: leaves outliers out (N20)
  function trim(values) {
    const v = values.filter((x) => x != null);
    if (v.length < 4) return v;
    const q = C.quartiles(v), k = 1.5 * (q.q3 - q.q1);
    return v.filter((x) => x >= q.q1 - k && x <= q.q3 + k);
  }
  const typeMedianHT = {};
  D.types.forEach((t) => { typeMedianHT[t] = med(typeJobs(t).map(D.humanTime)); });
  const expectedLeft = (w) => Math.max(0, (typeMedianHT[w.type] || 0) - D.humanTime(w));
  function drill(el0, label, options, value, build) {
    const box = el('div');
    const sel = C.select({ label, options, value, onChange: (v) => { box.replaceChildren(build(v)); } });
    el0.appendChild(sel); el0.appendChild(box); box.appendChild(build(value));
  }
  const taskColors = () => C.colors.pick(Object.keys(D.TASKS.NMP).concat(['Field Work', 'Data Processing']));
  const ALL_TASKS = ['Project Administrative', 'Customer Communication', 'Field Work', 'Data Processing', 'Modeling', 'Report'];

  // ===========================================================================
  // HOURS
  // ===========================================================================
  DASH.chart('HRS-1', (el0) => {
    el0.appendChild(C.boxPlot({ unit: ' h', dec: 0, p80: true, groups: D.types.map((t) => ({ label: t, type: t, color: C.colors.type[t], values: typeJobs(t).map(D.humanTime) })) }));
    el0.appendChild(C.note('Delivered jobs created since 2026-04-01, when Human Time starts. Outliers are drawn as rings.'));
  });

  DASH.chart('HRS-2', (el0) => {
    const colors = C.colors.pick(ALL_TASKS);
    const cats = D.types.filter((t) => typeJobs(t).length);
    const byType = {};
    cats.forEach((t) => { const o = {}; typeJobs(t).forEach((w) => { const h = hoursBy(w, (e) => e.task); for (const k in h) o[k] = (o[k] || 0) + h[k]; }); byType[t] = o; });
    el0.appendChild(C.stackedBar({
      horizontal: true, percent: true, inside: true, unit: ' h', categories: cats,
      series: ALL_TASKS.map((k) => ({ name: k, color: colors[k], values: cats.map((t) => byType[t][k] || 0) })),
    }));
    drill(el0, 'Sub-task view for', cats, cats[0], (t) => {
      const o = {}; typeJobs(t).forEach((w) => { const h = hoursBy(w, (e) => e.task + ': ' + e.sub); for (const k in h) o[k] = (o[k] || 0) + h[k]; });
      const tot = D.sum(Object.values(o));
      return C.bar({ data: Object.keys(o).map((k) => ({ label: k, value: o[k] / tot, tip: k + ': ' + D.num(o[k]) + ' h' })), pct: true, dec: 0, sort: 'desc', max: 8, color: C.colors.type[t], seriesName: 'share of hours' });
    });
  });

  DASH.chart('HRS-3', (el0) => {
    const jobs = typeJobs('AMB');
    const buckets = [['1 to 2', 1, 2], ['3 to 4', 3, 4], ['5 to 6', 5, 6], ['7 or more', 7, 999]];
    el0.appendChild(C.bar({
      horizontal: false, unit: ' h', dec: 0, type: 'AMB', seriesName: 'median Human Time',
      data: buckets.map(([l, lo, hi]) => { const j = jobs.filter((w) => w.monitors >= lo && w.monitors <= hi); return { label: l + ' (' + j.length + ' jobs)', value: med(j.map(D.humanTime)) || 0, tip: l + ' monitors: ' + j.length + ' jobs' }; }),
    }));
  });

  DASH.chart('HRS-4', (el0) => {
    const jobs = deliveredHT();
    const mk = (key, label) => {
      const g = D.groupBy(jobs, (w) => w[key]);
      return C.table({
        sort: { key: 'total', dir: -1 }, max: 6, dense: true,
        columns: [{ key: 'name', label }, { key: 'n', label: 'Jobs', num: true }, { key: 'total', label: 'Total h', num: true, dec: 0 }, { key: 'med', label: 'Median h per job', num: true, dec: 0 }],
        rows: Object.keys(g).map((k) => { const h = g[k].map(D.humanTime); return { name: k, n: g[k].length, total: D.sum(h), med: med(h) }; }),
      });
    };
    el0.dataset.wide = '1';
    el0.appendChild(C.split([mk('cust', 'Customer'), mk('industry', 'Industry')], { dir: 'row' }));
  });

  DASH.chart('HRS-5', (el0) => {
    const jobs = deliveredHT();
    const xMax = Math.ceil(Math.max(...jobs.map(D.cycleTime)) / 20) * 20, yMax = Math.ceil(Math.max(...jobs.map(D.humanTime)) / 20) * 20;
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    el0.dataset.wide = '1';
    el0.appendChild(C.smallMultiples({
      min: 300,
      items: types.map((t) => {
        const j = jobs.filter((w) => w.type === t);
        return { title: t, sub: j.length + ' jobs', chart: C.scatter({ height: 150, xMax, yMax, xName: 'Cycle Time', yName: 'Human Time', xLabel: 'Cycle Time (days)', yLabel: 'Human Time (hours)', xUnit: ' d', yUnit: ' h', points: j.map((w) => ({ x: D.cycleTime(w), y: D.humanTime(w), type: t, label: D.label(w), tip: D.label(w) + ' ' + w.cust + ': ' + D.cycleTime(w) + ' d, ' + D.num(D.humanTime(w), 1) + ' h' })) }) };
      }),
    }));
    el0.appendChild(C.note('One panel per type, same scales. Far right and low means waiting, not work.'));
  });

  DASH.chart('HRS-6', (el0) => {
    const es = D.entries.filter((e) => e.wo && e.oos && D.isHT(e));
    const byCust = D.groupBy(es, (e) => D.byKey(e.wo).cust);
    const custs = Object.keys(byCust).sort((a, b) => D.sum(byCust[b].map((e) => e.hours)) - D.sum(byCust[a].map((e) => e.hours))).slice(0, 8);
    const types = D.types.filter((t) => es.some((e) => D.byKey(e.wo).type === t));
    el0.appendChild(C.stackedBar({
      horizontal: true, unit: ' h', categories: custs,
      series: types.map((t) => ({ name: t, type: t, values: custs.map((c) => D.sum(byCust[c].filter((e) => D.byKey(e.wo).type === t).map((e) => e.hours))) })),
    }));
    el0.appendChild(C.note('Out-of-scope WO hours, top 8 customers.'));
  });

  DASH.chart('HRS-7', (el0) => {
    const revs = D.wos.filter((w) => w.rev);
    const types = D.types.filter((t) => revs.some((w) => w.type === t));
    const byCust = D.groupBy(revs, (w) => w.cust);
    el0.appendChild(C.split([
      C.bar({ horizontal: false, unit: ' h', dec: 0, seriesName: 'Human Time on revisions', data: types.map((t) => ({ label: t, type: t, value: D.sum(revs.filter((w) => w.type === t).map(D.humanTime)), tip: t + ': ' + revs.filter((w) => w.type === t).length + ' revision records' })) }),
      C.table({ dense: true, sort: { key: 'h', dir: -1 }, max: 5, columns: [{ key: 'c', label: 'Customer' }, { key: 'n', label: 'Revisions', num: true }, { key: 'h', label: 'Hours', num: true, dec: 0 }], rows: Object.keys(byCust).map((c) => ({ c, n: byCust[c].length, h: D.sum(byCust[c].map(D.humanTime)) })) }),
    ], { widths: [3, 2] }));
  });

  DASH.chart('HRS-8', (el0) => {
    const phases = D.PHASES, jobs = deliveredHT();
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    el0.appendChild(C.pairedBar({
      categories: types, unit: ' h', dec: 0,
      series: phases.map((p, i) => ({ name: p, color: C.colors.cat[i], values: types.map((t) => med(jobs.filter((w) => w.type === t && w.phase.includes(p)).map(D.humanTime)) || 0) })),
    }));
    el0.appendChild(C.note('Median Human Time per job. A job with two phases counts in both. A zero means no jobs.'));
  });

  DASH.chart('HRS-9', (el0) => {
    el0.dataset.wide = '1';
    const jobs = D.wos.filter((w) => !w.rev && D.hasHT(w) && D.humanTime(w) > 0);
    el0.appendChild(C.table({
      max: 8, dense: true, sort: { key: 'total', dir: -1 },
      columns: [{ key: 'wo', label: 'WO', value: (r) => r.w.key, render: (r) => D.label(r.w) }, { key: 'type', label: 'Type', render: (r) => [C.dot(r.w.type), ' ' + r.w.type] }, { key: 'cust', label: 'Customer', value: (r) => r.w.cust }]
        .concat(ALL_TASKS.map((t) => ({ key: t, label: t.replace('Project Administrative', 'Admin').replace('Customer Communication', 'Customer comms'), num: true, dec: 0, value: (r) => r.h[t] || 0, fmt: (v) => (v ? D.num(v, 0) : '') })))
        .concat([{ key: 'total', label: 'Total h', num: true, dec: 0 }]),
      rows: jobs.map((w) => { const h = hoursBy(w, (e) => e.task); return { w, h, total: D.humanTime(w) }; }),
    }));
  });

  DASH.chart('HRS-10', (el0) => {
    const ms = D.months(12, false).filter((m) => m.start >= D.entriesStart), ht = D.entries.filter(D.isHT);
    const typeOf = (e) => (e.wo ? D.byKey(e.wo).type : 'General');
    const by = D.groupBy(ht, (e) => D.monthKey(e.date) + '|' + typeOf(e));
    const val = (m, k) => D.sum((by[m.key + '|' + k] || []).map((e) => e.hours));
    el0.appendChild(C.stackedArea({ x: ms.map((m) => m.label), unit: ' h', series: D.types.map((t) => ({ name: t, type: t, values: ms.map((m) => val(m, t)) })) }));
    el0.appendChild(C.note('Work orders only, complete months since April, Human Time. General hours are left out so the work order types stay readable. General per month: ' + ms.map((m) => m.label + ' ' + D.num(val(m, 'General'))).join(', ') + ' h.'));
  });

  DASH.chart('HRS-11', (el0) => {
    const types = ['AMB', 'SIG', 'CM', 'CR'];
    const rows = types.map((t) => {
      const jobs = D.wos.filter((w) => !w.rev && w.type === t && D.hasHT(w));
      const f = jobs.map((w) => D.sum(htEntries(w).filter((e) => e.task === 'Field Work').map((e) => e.hours))).filter((v) => v > 0);
      return { label: t + ' (' + f.length + ' jobs)', type: t, value: med(f) || 0, marker: D.pct(f, 80) || undefined };
    });
    el0.appendChild(C.bar({ data: rows, unit: ' h', dec: 0, horizontal: false, markerLabel: '80th percentile', seriesName: 'median Field Work hours' }));
    el0.appendChild(C.note('Per job with Field Work logged. Driving and on-site are not split yet (Roadmap).'));
  });

  DASH.chart('HRS-12', (el0) => {
    el0.dataset.wide = '1';
    const jobs = deliveredHT(), types = D.types.filter((t) => jobs.some((w) => w.type === t));
    el0.appendChild(C.table({
      sortable: false, dense: true,
      columns: [{ key: 'name', label: 'Engineer' }].concat(types.map((t) => ({ key: t, label: t, render: (r) => { const j = r.j[t]; return j.length ? [D.num(med(j.map(D.humanTime))) + ' h', el('span', 'c-mute', '  (' + j.length + ' ' + (j.length === 1 ? 'job' : 'jobs') + ')')] : ''; } }))),
      rows: people().slice().sort().map((p) => ({ name: p, j: Object.fromEntries(types.map((t) => [t, jobs.filter((w) => w.eng === p && w.type === t)])) })),
    }));
    el0.appendChild(C.note('Delivered jobs only. Alphabetical on purpose: this is not a ranking.'));
  });

  DASH.chart('HRS-13', (el0) => {
    el0.dataset.wide = '1';
    const jobs = deliveredHT(), types = D.types.filter((t) => jobs.some((w) => w.type === t));
    const per = {}; // type -> sub -> [hours per job]
    jobs.forEach((w) => { const h = hoursBy(w, (e) => e.sub || 'Not set'); for (const s in h) { ((per[w.type] = per[w.type] || {})[s] = (per[w.type][s] || [])).push(h[s]); } });
    const subs = [...new Set(jobs.flatMap((w) => Object.keys(hoursBy(w, (e) => e.sub || 'Not set'))))];
    const tot = (s) => D.sum(types.map((t) => D.sum((per[t] || {})[s] || [])));
    subs.sort((a, b) => tot(b) - tot(a));
    el0.appendChild(C.heatmap({
      rows: subs, cols: types, scale: 'seq', scaleLabel: 'Median hours per job', labelWidth: '170px',
      values: subs.map((s) => types.map((t) => { const a = (per[t] || {})[s]; return a ? r1(med(a)) : null; })),
      tip: (r, c) => subs[r] + ', ' + types[c] + ': ' + (((per[types[c]] || {})[subs[r]] || []).length) + ' jobs logged it',
    }));
    el0.appendChild(C.note('Rows are sub-tasks, columns are types (24 sub-tasks do not fit across). Median over jobs that logged the sub-task.'));
  });

  const stageHours = (w) => hoursBy(w, (e) => stageOf(e) || 'Prelim');
  const stageMed = (t) => STAGE_NAMES.map((s) => med(typeJobs(t).map((w) => stageHours(w)[s] || 0)));

  DASH.chart('HRS-14', (el0) => {
    const types = D.types.filter((t) => typeJobs(t).length);
    const m = types.map(stageMed);
    el0.appendChild(C.stackedBar({
      horizontal: true, unit: ' h', dec: 0, categories: types,
      series: STAGE_NAMES.map((s, i) => ({ name: s, color: C.colors.stage[s], values: m.map((row) => row[i]) })),
    }));
    el0.appendChild(C.note('Median hours per job in each stage (end label is the sum of the stage medians), so segments do not add to the median total. Task to stage: Project Administrative and Customer Communication to Prelim (Preliminary Results to Prelim results), Field Work and Data Processing to Field, Modeling to Model, Report to Report.'));
  });

  const shareBar = (el0, fn, label, note) => {
    const rows = D.types.filter((t) => typeJobs(t).length).map((t) => {
      const v = typeJobs(t).map((w) => { const tot = D.humanTime(w); return tot > 0 ? fn(w) / tot : null; });
      return { label: t, type: t, value: med(v) || 0 };
    });
    el0.appendChild(C.bar({ data: rows, pct: true, dec: 0, horizontal: false, seriesName: label }));
    el0.appendChild(C.note(note));
  };
  DASH.chart('HRS-15', (el0) => shareBar(el0, (w) => D.sum(htEntries(w).filter((e) => D.QC_SUBS.includes(e.sub)).map((e) => e.hours)), 'median QC share of hours', 'QC sub-tasks: Model QC, Report QC, Data Processing QC. Median per type.'));
  DASH.chart('HRS-16', (el0) => shareBar(el0, (w) => D.sum(htEntries(w).filter((e) => e.sub === 'Post QC Edits').map((e) => e.hours)), 'median Post QC Edits share of hours', 'Post QC Edits hours as a share of all hours on the job, median per type.'));

  DASH.chart('HRS-17', (el0) => {
    const orig = {}, revs = {};
    D.types.forEach((t) => { orig[t] = 0; revs[t] = 0; });
    D.wos.forEach((w) => {
      if (w.rev) { revs[w.type] += D.humanTime(w); return; }
      const d = D.deliveredAt(w); if (!d) return;
      orig[w.type] += D.sum(htEntries(w).filter((e) => e.date > d).map((e) => e.hours));
    });
    const types = D.types.filter((t) => orig[t] + revs[t] > 0);
    el0.appendChild(C.stackedBar({
      horizontal: false, unit: ' h', dec: 0, categories: types,
      series: [{ name: 'Original WO', color: C.colors.cat[0], values: types.map((t) => orig[t]) }, { name: 'Revision records', color: C.colors.cat[1], values: types.map((t) => revs[t]) }],
    }));
    el0.appendChild(C.note('Original WO is hours logged after the Delivered date. Revision records are all hours on revision WOs.'));
  });

  DASH.chart('HRS-18', (el0) => {
    const qs = D.quarters(4);
    const canc = D.wos.filter((w) => !w.rev && D.st(w).name === 'Cancelled');
    const at = (w) => w.history[w.history.length - 1].date;
    const types = D.types.filter((t) => canc.some((w) => w.type === t));
    el0.appendChild(C.stackedBar({
      horizontal: false, unit: ' h', dec: 0, categories: qs.map((q) => q.label),
      series: types.map((t) => ({ name: t, type: t, values: qs.map((q) => D.sum(canc.filter((w) => w.type === t && D.inRange(at(w), q)).map(D.humanTime))) })),
    }));
    el0.appendChild(C.note(canc.length + ' cancelled WOs. Human Time starts April 2026, so earlier cancellations show zero.'));
  });

  DASH.chart('HRS-19', (el0) => {
    const jobs = D.wos.filter((w) => !w.rev && w.created >= D.entriesStart);
    const g = D.groupBy(jobs, (w) => w.cust);
    const rows = Object.keys(g).map((c) => ({ label: c + ' (' + g[c].length + ')', value: med(g[c].map((w) => D.sum(htEntries(w).filter((e) => e.task === 'Customer Communication').map((e) => e.hours)))) || 0 }));
    el0.appendChild(C.bar({ data: rows, unit: ' h', dec: 1, sort: 'desc', max: 8, seriesName: 'median per job' }));
    el0.appendChild(C.note('Customer Communication hours per job since April 2026 (the period Human Time covers). Job count in brackets.'));
  });

  DASH.chart('HRS-20', (el0) => {
    const jobs = D.wos.filter((w) => D.active(w) && !w.rev && w.type !== 'CM');
    const budgetOf = (w) => (w.budget != null ? w.budget : Math.max(5, Math.round((typeMedianHT[w.type] || 20) / 5) * 5));
    const synth = jobs.some((w) => w.budget == null);
    const rows = jobs.map((w) => ({ w, h: D.humanTime(w), b: budgetOf(w) })).sort((a, b) => b.h / b.b - a.h / a.b).slice(0, 10);
    el0.appendChild(C.bar({
      unit: ' h', dec: 0, markerLabel: 'Budget hours', seriesName: 'logged so far',
      data: rows.map((r) => ({ label: D.label(r.w) + ' ' + r.w.type, value: r.h, marker: r.b, color: r.h > r.b ? C.colors.status.bad : undefined, type: r.h > r.b ? undefined : r.w.type, tip: D.label(r.w) + ' ' + r.w.cust + ': ' + D.num(r.h, 1) + ' of ' + r.b + ' h' + (r.h > r.b ? ' (over budget)' : '') })),
    }));
    el0.appendChild(C.note('Red bars are over budget. Ten most-used active jobs.' + (synth ? ' Jobs with no budget in the mock data use the type median rounded to 5 (invented for this mock).' : '')));
  });

  DASH.chart('HRS-21', (el0) => {
    el0.dataset.wide = '1';
    const jobs = deliveredHT();
    const dims = { Type: (w) => w.type, Customer: (w) => w.cust, Industry: (w) => w.industry, Site: (w) => w.site };
    const optsFor = (d) => [...new Set(jobs.map(dims[d]))].sort();
    const box = el('div'), valBox = el('div');
    let dim = 'Type', val = 'NMP';
    const draw = () => {
      const rows = jobs.filter((w) => dims[dim](w) === val);
      box.replaceChildren(C.table({
        max: 6, dense: true, sort: { key: 'ct', dir: -1 },
        columns: [{ key: 'wo', label: 'WO', value: (w) => w.key, render: (w) => D.label(w) }, { key: 'cust', label: 'Customer' }, { key: 'type', label: 'Type' }, { key: 'mon', label: 'Monitors', num: true, value: (w) => w.monitors, fmt: (v) => (v == null ? '' : v) }, { key: 'ht', label: 'Human Time', num: true, value: (w) => D.humanTime(w), fmt: (v) => D.num(v, 0) + ' h' }, { key: 'ct', label: 'Cycle Time', num: true, value: (w) => D.cycleTime(w), fmt: (v) => v + ' d' }],
        rows,
      }));
      box.appendChild(C.note(rows.length + ' past delivered jobs. Median ' + D.num(med(rows.map(D.humanTime)) || 0) + ' h and ' + (med(rows.map(D.cycleTime)) || 0) + ' d.'));
    };
    const drawVal = () => { valBox.replaceChildren(C.select({ label: dim, options: optsFor(dim), value: val, onChange: (v) => { val = v; draw(); } })); };
    const bar = el('div', 'c-row');
    bar.appendChild(C.select({ label: 'Look up by', options: Object.keys(dims), value: dim, onChange: (v) => { dim = v; val = optsFor(v)[0]; drawVal(); draw(); } }));
    bar.appendChild(valBox);
    el0.appendChild(bar); el0.appendChild(box); drawVal(); draw();
  });

  // ===========================================================================
  // STANDARD TIMES
  // ===========================================================================
  const last12 = () => delivered().filter((w) => D.deliveredAt(w) >= D.addDays(TODAY, -365));
  const statRow = (jobs) => {
    const ht = trim(jobs.filter(D.hasHT).map(D.humanTime)), ct = trim(jobs.map(D.cycleTime));
    return { n: jobs.length, htm: med(ht), ht80: D.pct(ht, 80), ctm: med(ct), ct80: D.pct(ct, 80), nHT: ht.length };
  };
  const statCols = [
    { key: 'n', label: 'Jobs', num: true },
    { key: 'htm', label: 'Median hours', num: true, dec: 0 },
    { key: 'ht80', label: '80th pct hours', num: true, dec: 0 },
    { key: 'ctm', label: 'Median days', num: true, dec: 0 },
    { key: 'ct80', label: '80th pct days', num: true, dec: 0 },
  ];

  DASH.chart('STD-1', (el0) => {
    const jobs = last12();
    el0.appendChild(C.table({
      sortable: false, dense: true,
      columns: [{ key: 'type', label: 'Type', render: (r) => [C.dot(r.type), ' ' + r.type] }].concat(statCols),
      rows: D.types.map((t) => Object.assign({ type: t }, statRow(jobs.filter((w) => w.type === t)))),
    }));
    el0.appendChild(C.note('Jobs delivered in the last 12 months, outliers left out. Hours are available only for jobs created since April 2026. Hours and days only.'));
  });

  DASH.chart('STD-2', (el0) => {
    el0.dataset.wide = '1';
    const jobs = last12();
    const bucketsOf = {
      'Monitors required': [['1 to 2', (w) => w.monitors >= 1 && w.monitors <= 2], ['3 to 4', (w) => w.monitors >= 3 && w.monitors <= 4], ['5 to 6', (w) => w.monitors >= 5 && w.monitors <= 6], ['7 or more', (w) => w.monitors >= 7]],
      'Phase of operation': D.PHASES.map((p) => [p, (w) => w.phase.includes(p)]),
      'Industry': D.INDUSTRIES.map((i) => [i, (w) => w.industry === i]),
    };
    const box = el('div'), bar = el('div', 'c-row');
    let dim = 'Monitors required', type = 'AMB';
    const draw = () => {
      const base = type === 'All types' ? jobs : jobs.filter((w) => w.type === type);
      const rows = bucketsOf[dim].map(([l, fn]) => Object.assign({ label: l }, statRow(base.filter(fn))));
      box.replaceChildren(C.table({
        sortable: false, dense: true, grey: (r) => r.n < 5,
        columns: [{ key: 'label', label: dim }].concat(statCols),
        rows,
      }));
      box.appendChild(C.note('Greyed rows have fewer than 5 jobs.'));
    };
    bar.appendChild(C.select({ label: 'Split by', options: Object.keys(bucketsOf), value: dim, onChange: (v) => { dim = v; draw(); } }));
    bar.appendChild(C.select({ label: 'Type', options: ['All types'].concat(D.types), value: type, onChange: (v) => { type = v; draw(); } }));
    el0.appendChild(bar); el0.appendChild(box); draw();
  });

  DASH.chart('STD-3', (el0) => {
    const types = D.types.filter((t) => typeJobs(t).length);
    el0.appendChild(C.table({
      sortable: false, dense: true,
      columns: [{ key: 'type', label: 'Type', render: (r) => [C.dot(r.type), ' ' + r.type] }].concat(STAGE_NAMES.map((s, i) => ({ key: 's' + i, label: s, num: true, dec: 0 }))).concat([{ key: 'n', label: 'Jobs', num: true }]),
      rows: types.map((t) => { const m = stageMed(t); const o = { type: t, n: typeJobs(t).length }; m.forEach((v, i) => { o['s' + i] = v; }); return o; }),
    }));
    el0.appendChild(C.note('Median hours per job in each stage. Same numbers as HRS-14.'));
  });

  DASH.chart('STD-4', (el0) => {
    el0.dataset.wide = '1';
    const jobs = delivered();
    const stageName = { P: 'Prelim', F: 'Field', M: 'Model', L: 'Prelim results', R: 'Report' };
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    const rows = types.map((t) => {
      const j = jobs.filter((w) => w.type === t), o = { type: t, n: j.length };
      D.STAGES.forEach(([code, name], i) => { o['s' + i] = med(j.map((w) => D.sum(D.visits(w).filter((v) => v.stage === code && v.end).map((v) => v.days)))); });
      const cust = D.sum(j.map((w) => D.holderDays(w).Customer)), tot = D.sum(j.map((w) => D.cycleTime(w)));
      o.wait = tot ? cust / tot : null;
      return o;
    });
    el0.appendChild(C.table({
      sortable: false, dense: true,
      columns: [{ key: 'type', label: 'Type', render: (r) => [C.dot(r.type), ' ' + r.type] }].concat(STAGE_NAMES.map((s, i) => ({ key: 's' + i, label: s, num: true, dec: 0 }))).concat([{ key: 'wait', label: 'Waiting %', num: true, fmt: (v) => (v == null ? '' : Math.round(v * 100) + '%') }, { key: 'n', label: 'Jobs', num: true }]),
      rows,
    }));
    el0.appendChild(C.note('Median days per job in each stage, all delivered jobs. Waiting share is Customer days over Cycle Time.'));
  });

  DASH.chart('STD-5', (el0) => {
    const qs = D.quarters(6), jobs = delivered();
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    const win = (t, q, htOnly) => jobs.filter((w) => w.type === t && (!htOnly || D.hasHT(w)) && D.deliveredAt(w) <= q.end && D.deliveredAt(w) > D.addDays(q.end, -365));
    const mk = (htOnly, fn, unit) => C.line({
      x: qs.map((q) => q.label), unit, height: 160, greyLabel: 'Fewer than 3 jobs',
      series: types.map((t) => ({ name: t, type: t, color: C.colors.type[t], values: qs.map((q) => { const j = win(t, q, htOnly); return j.length >= 1 ? med(j.map(fn)) : null; }), grey: qs.map((q) => win(t, q, htOnly).length < 3) })),
    });
    el0.dataset.wide = '1';
    el0.appendChild(C.split([
      C.split([el('p', 'c-sub', 'Median Human Time, rolling 12 months'), mk(true, D.humanTime, ' h')], { dir: 'col' }),
      C.split([el('p', 'c-sub', 'Median Cycle Time, rolling 12 months'), mk(false, D.cycleTime, ' d')], { dir: 'col' }),
    ], { dir: 'row' }));
    el0.appendChild(C.note('Hollow points rest on fewer than 3 jobs. Human Time starts April 2026, so early quarters have no hours.'));
  });

  // ===========================================================================
  // CAPACITY
  // ===========================================================================
  const WEEK_N = 12;
  const weeksDone = (n) => D.weeks(n, false);
  const hoursIn = (es, p) => D.sum(es.filter((e) => D.inRange(e.date, p)).map((e) => e.hours));

  DASH.chart('CAP-1', (el0) => {
    el0.dataset.wide = '1';
    const ws = weeksDone(WEEK_N), ps = D.people.map((p) => p.name);
    const ht = D.entries.filter(D.isHT);
    const by = D.groupBy(ht, (e) => e.person);
    const hours = ps.map((p) => ws.map((w) => hoursIn(by[p] || [], w)));
    const avail = ps.map((p) => ws.map((w) => D.available(p, w.start)));
    el0.appendChild(C.heatmap({
      rows: ps, cols: ws.map((w) => w.label), values: hours.map((r) => r.map((v) => Math.round(v))),
      colorValues: hours.map((r, i) => r.map((v, j) => v - avail[i][j])), scale: 'div', mid: 0, domain: [-20, 20],
      scaleLabel: 'Hours against available', lowLabel: 'Under', highLabel: 'Over', midLabel: 'On target', labelWidth: '110px',
      grey: (r, c) => avail[r][c] === 0,
      tip: (r, c) => ps[r] + ', week of ' + ws[c].label + ': ' + D.num(hours[r][c], 1) + ' h logged, ' + avail[r][c] + ' h available',
    }));
    el0.appendChild(C.note('Cell text is hours logged. Colour is hours against available, after time off. Zero weeks are shown. Last 12 complete weeks.'));
  });

  DASH.chart('CAP-2', (el0) => {
    const ws = D.weeks(26, false).filter((w) => w.start >= D.entriesStart);
    const team = people(), ht = D.entries.filter((e) => D.isHT(e) && e.wo && !e.oos && team.includes(e.person));
    const vals = ws.map((w) => { const a = D.sum(team.map((p) => D.available(p, w.start))); return a ? hoursIn(ht, w) / a : null; });
    el0.appendChild(C.line({ x: ws.map((w) => w.label), pct: true, dec: 0, yMin: 0, series: [{ name: 'In-scope WO hours over available hours', values: vals }], endLabel: false }));
    el0.appendChild(C.note('Engineers and QC reviewers. Complete weeks since April.'));
  });

  DASH.chart('CAP-3', (el0) => {
    const act = D.wos.filter(D.active), names = people().concat(['Unassigned']);
    const hs = ['Urban', 'QC', 'Customer', 'Field'];
    el0.appendChild(C.stackedBar({
      horizontal: true, categories: names,
      series: hs.map((h) => ({ name: h, holder: h, values: names.map((n) => act.filter((w) => (w.eng || 'Unassigned') === n && D.st(w).holder === h).length) })),
    }));
  });

  DASH.chart('CAP-4', (el0) => {
    el0.dataset.wide = '1';
    const start = D.weekStart(TODAY), end = D.addDays(start, 13);
    const inW = D.timeOff.filter((t) => t.date >= start && t.date <= end);
    const kinds = D.TIME_OFF_TYPES.filter((k) => k !== 'Holiday').concat(['Company holiday']);
    const col = C.colors.pick(kinds);
    const items = [];
    inW.filter((t) => t.type !== 'Holiday').forEach((t) => items.push({ date: t.date, label: t.person, sub: t.type, color: col[t.type], legend: t.type }));
    [...new Set(inW.filter((t) => t.type === 'Holiday').map((t) => +t.date))].forEach((d) => items.push({ date: new Date(d), label: 'Company holiday', color: col['Company holiday'], legend: 'Company holiday' }));
    el0.appendChild(C.calendarStrip({ start, days: 14, today: TODAY, items, skipWeekends: true }));
  });

  DASH.chart('CAP-5', (el0) => {
    const wk0 = D.weekStart(TODAY), ws = [0, 1, 2, 3].map((i) => { const st = D.addDays(wk0, 7 * i); return { start: st, end: D.addDays(st, 6), label: D.fmt(st) }; }), act = D.wos.filter((w) => D.active(w) && !w.rev && w.type !== 'CM');
    const load = ws.map(() => 0);
    act.forEach((w) => {
      const left = expectedLeft(w); if (!left) return;
      let last = w.due ? ws.findIndex((p) => w.due <= p.end) : ws.length - 1; // no due date: spread across all four
      if (last < 0) last = ws.length - 1;
      const k = last + 1; // overdue jobs fall into week 1
      for (let i = 0; i < k; i++) load[i] += left / k;
    });
    const avail = ws.map((p) => D.sum(people().map((n) => D.available(n, p.start))));
    el0.appendChild(C.pairedBar({
      categories: ws.map((w) => w.label), unit: ' h', dec: 0,
      series: [{ name: 'Expected load', color: C.colors.cat[0], values: load.map(Math.round) }, { name: 'Available', color: C.colors.cat[2], values: avail }],
    }));
    el0.appendChild(C.note('Expected hours left (type median less logged) spread evenly up to each due date. Jobs with no due date are spread over all four weeks. Engineers and QC reviewers.'));
  });

  DASH.chart('CAP-6', (el0) => {
    const ms = D.months(9).filter((m) => m.start >= D.entriesStart), ht = D.entries.filter((e) => D.isHT(e) && D.isWeekend(e.date));
    const pp = D.groupBy(ht, (e) => e.person);
    const rows = Object.keys(pp).map((p) => ({ title: p, value: D.num(D.sum(pp[p].map((e) => e.hours)), 1) + ' h', n: D.sum(pp[p].map((e) => e.hours)) })).sort((a, b) => b.n - a.n);
    el0.appendChild(C.split([
      C.bar({ horizontal: false, unit: ' h', dec: 0, seriesName: 'weekend hours', data: ms.map((m) => ({ label: m.label, value: hoursIn(ht, m) })) }),
      C.list({ max: 5, rows, empty: 'No weekend hours.' }),
    ], { widths: [3, 2] }));
    el0.appendChild(C.note('Saturday and Sunday hours (November is to date). Entries carry no time of day, so evenings are not measured.'));
  });

  DASH.chart('CAP-7', (el0) => {
    el0.dataset.wide = '1';
    const ws = weeksDone(8), ht = D.entries.filter((e) => D.isHT(e) && e.wo), by = D.groupBy(ht, (e) => e.person);
    const cnt = (p, w) => new Set((by[p] || []).filter((e) => D.inRange(e.date, w)).map((e) => e.wo)).size;
    el0.appendChild(C.table({
      sortable: false, dense: true, highlight: (r) => Math.max(...ws.map((w, i) => r['w' + i])) >= 6,
      columns: [{ key: 'name', label: 'Person' }].concat(ws.map((w, i) => ({ key: 'w' + i, label: w.label, num: true }))),
      rows: people().map((p) => { const o = { name: p }; ws.forEach((w, i) => { o['w' + i] = cnt(p, w); }); return o; }),
    }));
    el0.appendChild(C.note('Distinct WOs with hours, per week. Highlighted rows reached 6 or more in a week.'));
  });

  DASH.chart('CAP-8', (el0) => {
    const act = D.wos.filter((w) => D.active(w) && !w.rev && w.type !== 'CM');
    el0.appendChild(C.bar({
      unit: ' h', dec: 0, sort: 'desc', seriesName: 'expected hours left',
      data: people().map((p) => { const j = act.filter((w) => w.eng === p); return { label: p, value: D.sum(j.map(expectedLeft)), tip: p + ': ' + j.length + ' active jobs' }; }),
    }));
    el0.appendChild(C.note('Type median Human Time less hours logged, not below zero.'));
  });

  DASH.chart('CAP-9', (el0) => {
    el0.dataset.wide = '1';
    const ws = weeksDone(WEEK_N), ht = D.entries.filter(D.isHT), by = D.groupBy(ht, (e) => e.person);
    const over = (p, w) => { const x = hoursIn(by[p] || [], w) - D.available(p, w.start); return x > 2 ? x : 0; };
    const rows = people().map((p) => { const o = { name: p, weeks: 0, total: 0 }; ws.forEach((w, i) => { const v = over(p, w); o['w' + i] = v; o.total += v; if (v > 0) o.weeks++; }); return o; });
    el0.appendChild(C.table({
      sort: { key: 'weeks', dir: -1 }, dense: true,
      columns: [{ key: 'name', label: 'Person' }, { key: 'weeks', label: 'Weeks over', num: true }, { key: 'total', label: 'Hours over', num: true, dec: 0 }].concat(ws.map((w, i) => ({ key: 'w' + i, label: w.label, num: true, dec: 0, fmt: (v) => (v > 0 ? D.num(v, 0) : '') }))),
      rows,
    }));
    el0.appendChild(C.note('Hours above available (after time off), last 12 complete weeks. A week counts as over only above available plus 2 hours. Blank means not over.'));
  });

  DASH.chart('CAP-10', (el0) => {
    const jobs = last12(), names = people();
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    el0.appendChild(C.heatmap({
      rows: names, cols: types, scale: 'seq', scaleLabel: 'Jobs delivered', labelWidth: '110px',
      values: names.map((p) => types.map((t) => { const n = jobs.filter((w) => w.eng === p && w.type === t).length; return n || null; })),
    }));
    el0.appendChild(C.note('Delivered in the last 12 months. Blank means none.'));
  });

  DASH.chart('CAP-11', (el0) => {
    const end = D.addDays(TODAY, 28);
    const act = D.wos.filter((w) => D.active(w) && w.due && w.eng && w.due >= TODAY && w.due <= end);
    const off = (p) => D.timeOff.filter((t) => t.person === p);
    const rows = [];
    act.forEach((w) => {
      const o = off(w.eng).find((t) => D.between(t.date, w.due) === 0);
      const near = o ? null : off(w.eng).find((t) => t.type !== 'Holiday' && Math.abs(D.between(t.date, w.due)) <= 2);
      const hit = o || near; if (!hit) return;
      rows.push({ w, hit, exact: !!o });
    });
    rows.sort((a, b) => a.w.due - b.w.due);
    el0.appendChild(C.list({
      rows: rows.map(({ w, hit, exact }) => ({ title: D.label(w), text: w.cust + ', ' + w.eng, sub: 'Due ' + D.fmt(w.due) + (exact ? ', out that day' : ', out ' + D.fmt(hit.date)), value: hit.type, holder: D.st(w).holder, chips: [C.chip(exact ? 'Due while out' : 'Due near time off', exact ? 'bad' : 'warn')] })),
      empty: 'No active job falls due while its engineer is off.',
    }));
    el0.appendChild(C.note('Next 4 weeks. Includes jobs due within 2 days of the engineer\'s time off, so near misses show.'));
  });

  // ===========================================================================
  // WO PAGE (one work order)
  // ===========================================================================
  function woPage(el0, build) {
    const pool = deliveredHT().filter((w) => w.type === 'NMP').sort((a, b) => D.holderDays(b).Customer - D.holderDays(a).Customer);
    const live = D.wos.filter((w) => !w.rev && D.open(w) && !D.deliveredAt(w) && w.type !== 'CM');
    const held = live.filter((w) => D.holdNow(w)), run = live.filter((w) => !D.holdNow(w) && w.eng).slice(0, 5);
    const past = deliveredHT().filter((w) => w.holds.length && w.type !== 'NMP').slice(0, 2);
    const all = pool.slice(0, 12).concat(held, run, past);
    const tag = (w) => (D.holdNow(w) ? ', on hold' : D.deliveredAt(w) ? '' : ', active');
    drill(el0, 'Work order', all.map((w) => ({ value: w.key, label: D.label(w) + ' ' + w.type + ', ' + w.cust + tag(w) })), all[0].key, (k) => build(D.byKey(k)));
  }

  DASH.chart('WO-1', (el0) => {
    el0.dataset.wide = '1';
    woPage(el0, (w) => {
      const vs = D.visits(w);
      const box = el('div');
      box.appendChild(C.gantt({
        start: w.created, end: TODAY, today: TODAY, rowHeight: 34,
        rows: [
          { label: 'Status', bars: vs.map((v) => ({ start: v.start, end: v.end || TODAY, holder: v.holder === 'None' ? undefined : v.holder, label: v.holder === 'None' ? 'Delivered' : '', tip: v.name + ', ' + v.days + ' d (' + v.holder + ')' })) },
          { label: 'Holds', bars: w.holds.map((h) => ({ start: h.start, end: h.end || TODAY, hatch: true, color: C.colors.holder.None, tip: h.reason + ', ' + D.between(h.start, h.end || TODAY) + ' d' })) },
        ],
      }));
      box.appendChild(C.note(D.label(w) + ', ' + w.cust + '. Cycle Time ' + D.cycleTime(w) + ' d. ' + (w.holds.length ? w.holds.length + ' hold(s) hatched.' : 'No holds on this job.') + ' The grey stretch is Delivered: nobody holds the job.'));
      return box;
    });
  });

  DASH.chart('WO-2', (el0) => {
    woPage(el0, (w) => {
      const h = D.holderDays(w);
      return C.tiles(D.HOLDERS.map((k) => ({ label: k, value: h[k] || 0, unit: ' d', sub: 'with ' + k })), { min: 80 });
    });
  });

  DASH.chart('WO-3', (el0) => {
    woPage(el0, (w) => {
      const jobs = typeJobs(w.type), tasks = Object.keys(D.TASKS[w.type]);
      const mine = hoursBy(w, (e) => e.task);
      const box = el('div');
      box.appendChild(C.bar({
        unit: ' h', dec: 1, markerLabel: 'Median for delivered ' + w.type + ' jobs', seriesName: 'this job',
        data: tasks.map((t) => ({ label: t, value: mine[t] || 0, marker: med(jobs.map((j) => hoursBy(j, (e) => e.task)[t] || 0)) || 0 })),
        type: w.type,
      }));
      box.appendChild(C.note('Total on this job: ' + D.num(D.humanTime(w), 1) + ' h, against a median of ' + D.num(typeMedianHT[w.type] || 0) + ' h.'));
      return box;
    });
  });

  DASH.chart('WO-4', (el0) => {
    woPage(el0, (w) => {
      const es = htEntries(w); if (!es.length) return C.empty('No hours logged.');
      const first = D.weekStart(es.reduce((a, e) => (e.date < a ? e.date : a), es[0].date)), last = D.weekStart(es.reduce((a, e) => (e.date > a ? e.date : a), es[0].date));
      const ws = []; for (let d = first; d <= last; d = D.addDays(d, 7)) ws.push({ start: d, end: D.addDays(d, 6), label: D.fmt(d) });
      return C.stackedBar({
        horizontal: false, unit: ' h', dec: 1, categories: ws.map((x) => x.label),
        series: [{ name: 'In scope', color: C.colors.split.WO, values: ws.map((x) => hoursIn(es.filter((e) => !e.oos), { start: x.start, end: x.end })) }, { name: 'Out of scope', color: C.colors.split['Out of scope'], values: ws.map((x) => hoursIn(es.filter((e) => e.oos), { start: x.start, end: x.end })) }],
      });
    });
  });

  DASH.chart('WO-5', (el0) => {
    woPage(el0, (w) => {
      const jobs = typeJobs(w.type), ht = jobs.map(D.humanTime), ct = delivered().filter((j) => j.type === w.type).map(D.cycleTime);
      const ctNow = D.between(w.created, D.deliveredAt(w) || TODAY);
      const box = el('div');
      box.appendChild(C.rangeBar({
        rangeLabel: '20th to 80th percentile for ' + w.type,
        rows: [
          { label: 'Cycle Time', unit: ' d', low: D.pct(ct, 20), high: D.pct(ct, 80), markers: [{ label: 'This job', value: ctNow }] },
          { label: 'Human Time', unit: ' h', low: D.pct(ht, 20), high: D.pct(ht, 80), markers: [{ label: 'This job', value: D.humanTime(w) }] },
        ],
      }));
      box.appendChild(C.note('Median for delivered ' + w.type + ' jobs: ' + med(ct) + ' d and ' + D.num(med(ht)) + ' h.'));
      return box;
    });
  });
})();
