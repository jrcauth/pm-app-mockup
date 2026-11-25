/* Task 4: Bottlenecks (BN), Cycle Time (CT), QC (QC), Field and monitors (FLD). */
(function () {
  'use strict';
  const reg = (id, fn, opt) => DASH.chart(id, fn, opt);

  // ---- local helpers -------------------------------------------------------
  // live(): a row of selects above a chart that is redrawn when one changes.
  function live(el, C, controls, draw) {
    const state = {};
    controls.forEach((c) => { state[c.key] = c.value !== undefined ? c.value : (typeof c.options[0] === 'object' ? c.options[0].value : c.options[0]); });
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px';
    const box = document.createElement('div');
    const paint = () => { box.innerHTML = ''; box.appendChild(draw(state)); };
    controls.forEach((c) => bar.appendChild(C.select({ label: c.label, options: c.options, value: state[c.key], onChange: (v) => { state[c.key] = v; paint(); } })));
    el.appendChild(bar); el.appendChild(box); paint();
  }

  const panel = (title, node) => { const d = document.createElement('div'); const h = document.createElement('div'); h.textContent = title; h.style.cssText = 'font-weight:600;font-size:12px;margin:0 0 4px'; d.appendChild(h); d.appendChild(node); return d; };

  const BUCKETS_AGE = [[0, 14], [15, 30], [31, 60], [61, 90], [91, Infinity]];
  const BUCKET_AGE_LABELS = ['0 to 14', '15 to 30', '31 to 60', '61 to 90', '90+'];

  // ===========================================================================
  // Bottlenecks
  // ===========================================================================
  reg('BN-1', (el, { D, C }) => {
    const active = D.wos.filter(D.active);
    const mx = Math.max(1, ...D.types.map((t) => Math.max(0, ...Object.values(D.countBy(active.filter((w) => w.type === t), (w) => D.st(w).name)))));
    const items = D.types.filter((t) => active.some((w) => w.type === t)).map((t) => {
      const cnt = D.countBy(active.filter((w) => w.type === t), (w) => D.st(w).name);
      const data = D.WF[t].filter((s) => s.kind !== 'Done' && s.name !== 'Delivered' && s.name !== 'Picked Up').map((s) => ({ label: s.name, value: cnt[s.name] || 0, holder: s.holder, tip: s.name + ': ' + (cnt[s.name] || 0) + ' active' }));
      return { title: t + ' (' + D.sum(data.map((d) => d.value)) + ' active)', chart: C.bar({ data, rowHeight: 15, thickness: 9, legend: [], max: mx, labelShare: 0.66 }) };
    });
    el.dataset.wide = '1';
    el.appendChild(C.legend(D.HOLDERS.map((h) => ({ label: h, color: C.colors.holder[h] }))));
    el.appendChild(C.note('Every panel uses the same scale, so bar lengths compare across types.'));
    el.appendChild(C.smallMultiples({ items, min: 380 }));
  }, { wide: true });

  reg('BN-2', (el, { D, C }) => {
    const from = D.addDays(D.today, -90);
    live(el, C, [
      { key: 'type', label: 'Type', options: D.types, value: 'NMP' },
      { key: 'hold', label: 'Hold time', options: [{ value: 'in', label: 'Included' }, { value: 'out', label: 'Taken out' }], value: 'in' },
    ], (s) => {
      const names = D.WF[s.type].filter((x) => x.kind !== 'Done' && x.name !== 'Delivered' && x.name !== 'Picked Up');
      const vs = D.wos.filter((w) => w.type === s.type).flatMap((w) => D.visits(w)).filter((v) => v.end && v.end >= from);
      const groups = names.map((n) => ({
        label: n.name, color: C.colors.holder[n.holder],
        values: vs.filter((v) => v.name === n.name).map((v) => (s.hold === 'out' ? Math.max(0, v.days - (v.holdDays || 0)) : v.days)),
      })).filter((g) => g.values.length);
      return C.boxPlot({ groups, unit: ' d', p80: true, legend: D.HOLDERS.map((h) => ({ label: h, color: C.colors.holder[h] })), empty: 'No status visits in the last 90 days' });
    });
  });

  reg('BN-3', (el, { D, C }) => {
    const weeks = D.weeks(12);
    const vs = D.wos.flatMap((w) => D.visits(w)).filter((v) => v.kind === 'Queue' && v.loop && v.end);
    const cell = (loop, wk) => vs.filter((v) => v.loop === loop && v.end >= wk.start && v.end <= wk.end).map((v) => v.days);
    el.appendChild(C.line({
      x: weeks.map((w) => w.label), unit: ' d', greyLabel: 'Fewer than 3 waits',
      series: D.QC_LOOPS.map((l) => ({ name: l, color: C.colors.loop[l], values: weeks.map((wk) => { const a = cell(l, wk); return a.length ? D.median(a) : null; }) })),
      grey: (si, xi) => cell(D.QC_LOOPS[si], weeks[xi]).length < 3,
    }));
  });

  reg('BN-4', (el, { D, C }) => {
    const stats = D.QC_LOOPS.map((l) => {
      const per = D.wos.map((w) => D.visits(w).filter((v) => v.loop === l && v.kind === 'Review').length).filter((n) => n > 0);
      return { l, avg: per.length ? D.mean(per) : 0, share: per.length ? per.filter((n) => n > 1).length / per.length : 0, n: per.length };
    });
    el.appendChild(C.split([
      panel('Average visits to In X QC per job', C.bar({ data: stats.map((s) => ({ label: s.l, value: s.avg, color: C.colors.loop[s.l], tip: s.l + ': ' + D.num(s.avg, 2) + ' reviews per job, ' + s.n + ' jobs' })), unit: ' reviews', dec: 2, horizontal: false, seriesName: 'Average visits to In X QC per job' })),
      panel('Share of jobs reviewed more than once', C.bar({ data: stats.map((s) => ({ label: s.l, value: s.share, color: C.colors.loop[s.l], tip: s.l + ': ' + Math.round(s.share * 100) + '% of ' + s.n + ' jobs reviewed more than once' })), pct: true, horizontal: false, seriesName: 'Share of jobs reviewed more than once' })),
    ]));
  });

  reg('BN-5', (el, { D, C }) => {
    const from = D.addDays(D.today, -365);
    const per = D.wos.filter((w) => w.created >= from).map((w) => ({ w, d: D.holderDays(w).Customer })).filter((x) => x.d > 0);
    const g = D.groupBy(per, (x) => x.w.cust);
    const data = Object.keys(g).filter((c) => g[c].length >= 2).map((c) => ({ label: c, value: D.median(g[c].map((x) => x.d)), tip: c + ': ' + g[c].length + ' jobs' }));
    el.appendChild(C.bar({ data, sort: 'desc', unit: ' d', max: 10 }));
  });

  reg('BN-6', (el, { D, C }) => {
    const active = D.wos.filter(D.active);
    const g = D.groupBy(active, (w) => D.st(w).name);
    const rows = [];
    Object.keys(g).forEach((name) => {
      g[name].sort((a, b) => D.daysIn(b) - D.daysIn(a)).slice(0, 3).forEach((w, i) => rows.push({ status: name, rank: i, w, key: w.key, type: w.type, cust: w.cust, who: D.who(w), days: D.daysIn(w), top: D.daysIn(g[name][0]) }));
    });
    rows.sort((a, b) => b.top - a.top || a.status.localeCompare(b.status) || a.rank - b.rank);
    el.dataset.wide = '1';
    el.appendChild(C.table({
      rows, max: 12, maxHeight: 340, dense: true,
      highlight: (r) => r.days >= 14,
      columns: [
        { key: 'status', label: 'Status', render: (r) => C.pill(r.status, D.st(r.w).holder), value: (r) => r.status },
        { key: 'key', label: 'Job', render: (r) => D.label(r.w), value: (r) => r.key },
        { key: 'type', label: 'Type' },
        { key: 'cust', label: 'Customer' },
        { key: 'who', label: 'Held by' },
        { key: 'days', label: 'Days in status', num: true },
      ],
    }));
  }, { wide: true });

  reg('BN-7', (el, { D, C }) => {
    const from = D.addDays(D.today, -90);
    const hs = D.wos.flatMap((w) => w.history.slice(1)).filter((h) => h.date >= from);
    const back = hs.filter((h) => h.back && D.between(h.date, h.entered) > 2);
    const skipped = hs.filter((h) => h.skipped > 0);
    const pct = (a) => (hs.length ? (a / hs.length) * 100 : 0);
    el.appendChild(C.tiles([
      { label: 'Backdated more than 2 days', value: pct(back.length), unit: '%', dec: 1, sub: back.length + ' of ' + hs.length + ' status changes', status: pct(back.length) > 10 ? 'warn' : undefined },
      { label: 'Skipped a status', value: pct(skipped.length), unit: '%', dec: 1, sub: skipped.length + ' of ' + hs.length + ' status changes', status: pct(skipped.length) > 10 ? 'warn' : undefined },
    ]));
    el.appendChild(C.note('Last 90 days. Backdated means the date set is more than 2 days before the day it was entered.'));
  });

  reg('BN-8', (el, { D, C }) => {
    const days = []; for (let i = 90; i >= 0; i--) days.push(D.addDays(D.today, -i));
    const groups = ['Urban', 'QC', 'Customer', 'Field'];
    const rows = days.map((d) => D.countBy(D.wos.filter((w) => D.activeAt(w, d) && D.stAt(w, d)), (w) => D.stAt(w, d).holder));
    const weeks = D.weeks(13);
    const arr = weeks.map((wk) => D.wos.filter((w) => !w.rev && D.inRange(w.created, wk)).length);
    const del = weeks.map((wk) => D.wos.filter((w) => !w.rev && D.deliveredAt(w) && D.inRange(D.deliveredAt(w), wk)).length);
    el.dataset.wide = '1';
    el.appendChild(C.split([
      panel('Active jobs by holder, each day', C.stackedArea({ x: days.map((d) => D.fmt(d)), series: groups.map((h) => ({ name: h, holder: h, color: C.colors.holder[h], values: rows.map((r) => r[h] || 0) })), unit: ' jobs' })),
      panel('Arrivals and deliveries per week', C.pairedBar({ categories: weeks.map((w) => w.label), series: [{ name: 'Arrived', values: arr }, { name: 'Delivered', values: del }] })),
    ]));
  }, { wide: true });

  reg('BN-9', (el, { D, C }) => {
    const active = D.wos.filter(D.active);
    const types = D.types.filter((t) => active.some((w) => w.type === t));
    const ages = (t) => active.filter((w) => w.type === t).map((w) => D.between(w.created, D.today));
    const mx = Math.max(1, ...types.map((t) => Math.max(...BUCKETS_AGE.map(([lo, hi]) => ages(t).filter((a) => a >= lo && a <= hi).length))));
    el.appendChild(C.smallMultiples({
      min: 190,
      items: types.map((t) => ({ title: t, sub: ages(t).length + ' active', chart: C.histogram({ values: ages(t), buckets: BUCKETS_AGE, labels: BUCKET_AGE_LABELS, color: C.colors.type[t], maxValue: mx, height: 110, countUnit: ' jobs', xLabel: 'Days since request' }) })),
    }));
  });

  reg('BN-10', (el, { D, C }) => {
    const q = D.quarters(2, false)[1];
    const jobs = D.wos.filter((w) => !w.rev && D.deliveredAt(w) && D.inRange(D.deliveredAt(w), q));
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    const tot = (t, k) => D.sum(jobs.filter((w) => w.type === t).map((w) => D.kindDays(w)[k] || 0));
    el.appendChild(C.stackedBar({
      categories: types.map((t) => t + ' (' + jobs.filter((w) => w.type === t).length + ')'), horizontal: true, percent: true, inside: true,
      series: D.KINDS.map((k) => ({ name: k, color: C.colors.kind[k], values: types.map((t) => tot(t, k)) })),
    }));
    el.appendChild(C.note('Jobs delivered in ' + q.label + '. Share of calendar days by status kind.'));
  });

  reg('BN-11', (el, { D, C }) => {
    const jobs = D.wos.filter((w) => w.type === 'NMP' || w.type === 'NIA');
    const vs = jobs.map((w) => ({ w, v: D.visits(w).filter((v) => v.name === 'Waiting on Customer: Info' && v.end) })).filter((x) => x.v.length);
    const twice = vs.filter((x) => x.v.length > 1).length / vs.length;
    const g = D.groupBy(vs.flatMap((x) => x.v.map((v) => ({ cust: x.w.cust, d: v.days }))), (x) => x.cust);
    const data = Object.keys(g).filter((c) => g[c].length >= 2).map((c) => ({ label: c, value: D.median(g[c].map((x) => x.d)), tip: c + ': ' + g[c].length + ' requests' }));
    el.appendChild(C.split([
      C.tile({ label: 'Jobs asked more than once', value: twice * 100, unit: '%', dec: 0, sub: vs.filter((x) => x.v.length > 1).length + ' of ' + vs.length + ' NMP and NIA jobs' }),
      C.bar({ data, sort: 'desc', unit: ' d', max: 8, seriesName: 'Median days per request' }),
    ], { widths: [1, 2] }));
  });

  reg('BN-12', (el, { D, C }) => {
    const names = ['Waiting on Customer Approval', 'Waiting on Surface Permission'];
    const vs = D.wos.filter((w) => ['AMB', 'CM', 'CR'].includes(w.type)).flatMap((w) => D.visits(w).filter((v) => names.includes(v.name) && v.end).map((v) => ({ cust: w.cust, n: v.name, d: v.days })));
    const custs = [...new Set(vs.map((v) => v.cust))].filter((c) => vs.filter((v) => v.cust === c).length >= 3);
    const m = (c, n) => { const a = vs.filter((v) => v.cust === c && v.n === n).map((v) => v.d); return a.length ? D.median(a) : 0; };
    custs.sort((a, b) => m(b, names[0]) + m(b, names[1]) - m(a, names[0]) - m(a, names[1]));
    el.appendChild(C.pairedBar({ categories: custs.slice(0, 8), horizontal: true, unit: ' d', series: [{ name: 'Location approval', values: custs.slice(0, 8).map((c) => m(c, names[0])) }, { name: 'Surface permission', values: custs.slice(0, 8).map((c) => m(c, names[1])) }] }));
  });

  reg('BN-13', (el, { D, C }) => {
    const months = D.months(12);
    const pts = D.wos.filter((w) => !w.rev).map((w) => { const v = D.visits(w).find((x) => x.kind === 'Work'); return v ? { t: w.type, d: D.between(w.created, v.start), at: v.start } : null; }).filter((x) => x && x.d >= 0);
    const cell = (t, m) => pts.filter((p) => p.t === t && D.inRange(p.at, m)).map((p) => p.d);
    el.appendChild(C.line({
      x: months.map((m) => m.label), unit: ' d', greyLabel: 'Fewer than 3 jobs',
      series: D.types.map((t) => ({ name: t, type: t, color: C.colors.type[t], values: months.map((m) => { const a = cell(t, m); return a.length ? D.median(a) : null; }) })),
      grey: (si, xi) => cell(D.types[si], months[xi]).length < 3,
    }));
  });

  reg('BN-14', (el, { D, C }) => {
    const from = D.addDays(D.today, -90);
    live(el, C, [{ key: 'type', label: 'Type', options: ['All'].concat(D.types) }], (s) => {
      const links = {};
      D.wos.filter((w) => s.type === 'All' || w.type === s.type).forEach((w) => {
        const vs = D.visits(w);
        for (let i = 1; i < vs.length; i++) {
          if (vs[i].start < from) continue;
          const a = vs[i - 1].holder, b = vs[i].holder;
          if (a === b || a === 'None' || b === 'None') continue;
          links[a + '|' + b] = (links[a + '|' + b] || 0) + 1;
        }
      });
      return C.flow({ nodes: D.HOLDERS, links: Object.keys(links).map((k) => { const [f, t] = k.split('|'); return { from: f, to: t, value: links[k] }; }), colors: C.colors.holder, valueLabel: 'status changes', caption: 'Status changes from one holder to the next, last 90 days.' });
    });
  });

  reg('BN-15', (el, { D, C }) => {
    const weeks = D.weeks(12);
    const at = (wk) => (wk.end > D.today ? D.today : wk.end);
    const groups = ['Urban', 'QC', 'Customer', 'Field'];
    const rows = weeks.map((wk) => D.countBy(D.wos.filter((w) => D.activeAt(w, at(wk)) && D.daysInAt(w, at(wk)) >= 14 && D.stAt(w, at(wk))), (w) => D.stAt(w, at(wk)).holder));
    el.appendChild(C.line({ x: weeks.map((w) => w.label), unit: ' jobs', yMin: 0, series: groups.map((h) => ({ name: h, color: C.colors.holder[h], values: rows.map((r) => r[h] || 0) })) }));
    el.appendChild(C.note('Stuck means active and 14 or more days in the same status.'));
  });

  // ===========================================================================
  // Cycle Time
  // ===========================================================================
  const deliveredJobs = (D) => D.wos.filter((w) => !w.rev && D.deliveredAt(w));
  const last12 = (D, jobs, fn) => jobs.filter((w) => { const d = fn(w); return d && D.between(d, D.today) <= 365; });

  reg('CT-1', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt);
    el.appendChild(C.boxPlot({ unit: ' d', p80: true, groups: D.types.map((t) => ({ label: t, color: C.colors.type[t], values: jobs.filter((w) => w.type === t).map(D.cycleTime) })).filter((g) => g.values.length) }));
    el.appendChild(C.note('Jobs delivered in the last 12 months.'));
  });

  reg('CT-2', (el, { D, C }) => {
    const months = D.months(12), jobs = deliveredJobs(D);
    const cell = (t, m) => jobs.filter((w) => w.type === t && D.inRange(D.deliveredAt(w), m)).map(D.cycleTime);
    el.appendChild(C.line({
      x: months.map((m) => m.label), unit: ' d', greyLabel: 'Fewer than 3 jobs',
      series: D.types.map((t) => ({ name: t, color: C.colors.type[t], values: months.map((m) => { const a = cell(t, m); return a.length ? D.median(a) : null; }) })),
      grey: (si, xi) => cell(D.types[si], months[xi]).length < 3,
    }));
  });

  reg('CT-3', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt);
    const names = D.STAGES.map(([c, n]) => [c, n]);
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    // first status of each stage, in workflow order; the next stage's first milestone ends the stage
    const bounds = (t) => { const out = []; D.WF[t].forEach((st) => { if (st.milestone && !out.some((o) => o.stage === st.stage)) out.push({ stage: st.stage, ms: st.milestone }); }); return out; };
    const med = (t, code) => {
      const b = bounds(t), k = b.findIndex((o) => o.stage === code);
      if (k < 0 || k === b.length - 1) return 0;
      const a = jobs.filter((w) => w.type === t).map((w) => { const x = D.milestone(w, b[k].ms), y = D.milestone(w, b[k + 1].ms); return x && y ? D.between(x, y) : null; }).filter((v) => v !== null && v >= 0);
      return a.length ? D.median(a) : 0;
    };
    el.appendChild(C.stackedBar({ categories: types, horizontal: true, unit: ' d', series: names.map(([c, n]) => ({ name: n, color: C.colors.stage[c], values: types.map((t) => med(t, c)) })) }));
    el.appendChild(C.note('Median days from the first milestone of a stage to the first milestone of the next, jobs delivered in the last 12 months. Medians per stage need not add up to the median Cycle Time.'));
  });

  reg('CT-4', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt).filter((w) => w.due);
    const on = (w) => D.deliveredAt(w) <= w.due;
    const share = (a) => a.filter(on).length / a.length;
    const bt = D.groupBy(jobs, (w) => w.type), bc = D.groupBy(jobs, (w) => w.cust);
    const late = jobs.filter((w) => !on(w)).map((w) => ({ w, d: D.between(w.due, D.deliveredAt(w)) })).sort((a, b) => b.d - a.d);
    el.dataset.wide = '1';
    el.appendChild(C.split([
      panel('On time, by type', C.bar({ pct: true, horizontal: false, seriesName: 'On time, by type', data: D.types.filter((t) => bt[t]).map((t) => ({ label: t, value: share(bt[t]), type: t, tip: t + ': ' + bt[t].filter(on).length + ' of ' + bt[t].length + ' on time' })) })),
      panel('On time, by customer', C.bar({ pct: true, seriesName: 'On time, by customer', sort: 'asc', max: 7, data: Object.keys(bc).filter((c) => bc[c].length >= 3).map((c) => ({ label: c, value: share(bc[c]), tip: c + ': ' + bc[c].filter(on).length + ' of ' + bc[c].length + ' on time' })) })),
      panel('Late jobs', C.list({ max: 6, rows: late.map((x) => ({ title: D.label(x.w), text: x.w.cust, sub: x.w.type, value: x.d + ' d late', chips: [C.chip('Late', 'bad')] })), empty: 'No late jobs' })),
    ]));
    el.appendChild(C.note('Jobs delivered in the last 12 months that had a client due date.'));
  }, { wide: true });

  reg('CT-5', (el, { D, C }) => {
    const jobs = deliveredJobs(D).filter((w) => w.due);
    const slack = (t) => jobs.filter((w) => w.type === t).map((w) => D.between(w.created, w.due));
    const types = D.types.filter((t) => slack(t).length >= 3);
    const B = [[0, 30], [31, 60], [61, 90], [91, 120], [121, Infinity]], L = ['0 to 30', '31 to 60', '61 to 90', '91 to 120', '121+'];
    const mx = Math.max(1, ...types.map((t) => Math.max(...B.map(([lo, hi]) => slack(t).filter((a) => a >= lo && a <= hi).length))));
    el.appendChild(C.smallMultiples({ min: 190, items: types.map((t) => ({ title: t, sub: slack(t).length + ' jobs, median ' + D.median(slack(t)) + ' d', chart: C.histogram({ values: slack(t), buckets: B, labels: L, color: C.colors.type[t], maxValue: mx, height: 110, countUnit: ' jobs', xLabel: 'Days from request to due date' }) })) }));
  });

  reg('CT-6', (el, { D, C }) => {
    const months = D.months(12), jobs = deliveredJobs(D);
    el.appendChild(C.stackedBar({ categories: months.map((m) => m.label), totals: false, series: D.types.map((t) => ({ name: t, type: t, color: C.colors.type[t], values: months.map((m) => jobs.filter((w) => w.type === t && D.inRange(D.deliveredAt(w), m)).length) })), unit: ' jobs' }));
  });

  reg('CT-7', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt);
    live(el, C, [{ key: 'by', label: 'Group by', options: ['Customer', 'Industry'] }], (s) => {
      const key = s.by === 'Customer' ? (w) => w.cust : (w) => w.industry;
      const rows = Object.keys(D.groupBy(jobs, key)).sort();
      const cell = (r, t) => jobs.filter((w) => key(w) === r && w.type === t).map(D.cycleTime);
      return C.heatmap({
        rows, cols: D.types, scale: 'seq', scaleLabel: 'Median Cycle Time (days)',
        values: rows.map((r) => D.types.map((t) => { const a = cell(r, t); return a.length ? D.median(a) : null; })),
        sub: rows.map((r) => D.types.map((t) => { const a = cell(r, t); return a.length ? 'n=' + a.length : ''; })), subLabel: 'Jobs',
        tip: (r, c) => { const a = cell(rows[r], D.types[c]); return rows[r] + ', ' + D.types[c] + ': ' + (a.length ? 'median ' + D.median(a) + ' d over ' + a.length + ' jobs' : 'no jobs'); },
      });
    });
  }, { wide: true });

  reg('CT-8', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt);
    const byReason = {};
    jobs.forEach((w) => w.holds.forEach((h) => { const d = D.between(h.start, h.end || D.today); (byReason[h.reason] = byReason[h.reason] || []).push(d); }));
    const holdDays = D.sum(jobs.map((w) => D.holdDays(w))), ct = D.sum(jobs.map(D.cycleTime));
    const held = jobs.filter((w) => w.holds.length).length;
    el.appendChild(C.split([
      C.tile({ label: 'Share of Cycle Time on hold', value: ct ? (holdDays / ct) * 100 : 0, unit: '%', dec: 1, sub: held + ' of ' + jobs.length + ' delivered jobs had a hold' }),
      C.bar({ data: Object.keys(byReason).map((r) => ({ label: r, value: D.mean(byReason[r]), tip: r + ': ' + byReason[r].length + ' holds, ' + D.sum(byReason[r]) + ' days in total' })), sort: 'desc', unit: ' d', seriesName: 'Average days per hold', empty: 'No holds on delivered jobs' }),
    ], { widths: [1, 2] }));
  });

  reg('CT-9', (el, { D, C }) => {
    const rows = D.wos.filter((w) => !w.rev).map((w) => ({ w, a: D.deliveredAt(w), b: D.first(w, 'Closed') })).filter((x) => x.a && x.b);
    const months = D.months(12);
    const spark = months.map((m) => { const a = rows.filter((x) => D.inRange(x.b, m)).map((x) => D.between(x.a, x.b)); return a.length ? D.median(a) : null; });
    const filled = spark.map((v, i) => (v === null ? (spark.slice(0, i).reverse().find((x) => x !== null) || 0) : v));
    el.appendChild(C.tile({ label: 'Median days from Delivered to Closed', value: D.median(rows.map((x) => D.between(x.a, x.b))), unit: ' d', sub: rows.length + ' closed jobs', spark: filled }));
  });

  reg('CT-10', (el, { D, C }) => {
    const orig = deliveredJobs(D), revs = D.wos.filter((w) => w.rev);
    const parentOf = (r) => D.byId(r.parent);
    const rate = (keyFn, k) => { const base = orig.filter((w) => keyFn(w) === k).length; const n = revs.filter((r) => parentOf(r) && keyFn(parentOf(r)) === k).length; return { base, n, v: base ? n / base : 0 }; };
    const byT = D.types.map((t) => ({ t, ...rate((w) => w.type, t) })).filter((x) => x.base);
    const custs = D.customers.map((c) => c.name).map((c) => ({ c, ...rate((w) => w.cust, c) })).filter((x) => x.base >= 3);
    el.dataset.wide = '1';
    el.appendChild(C.split([
      panel('Revisions per delivered job, by type', C.bar({ horizontal: false, dec: 2, seriesName: 'By type', data: byT.map((x) => ({ label: x.t, value: x.v, type: x.t, tip: x.t + ': ' + x.n + ' revisions on ' + x.base + ' delivered jobs' })) })),
      panel('By customer', C.bar({ sort: 'desc', max: 7, dec: 2, seriesName: 'By customer', data: custs.map((x) => ({ label: x.c, value: x.v, tip: x.c + ': ' + x.n + ' revisions on ' + x.base + ' delivered jobs' })) })),
    ]));
  }, { wide: true });

  reg('CT-11', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt);
    const rows = D.types.map((t) => { const a = jobs.filter((w) => w.type === t).map(D.cycleTime); return a.length ? { type: t, n: a.length, min: Math.min(...a), med: D.median(a), p80: Math.round(D.pct(a, 80)), p95: Math.round(D.pct(a, 95)), max: Math.max(...a) } : null; }).filter(Boolean);
    el.dataset.wide = '1';
    el.appendChild(C.table({ rows, dense: true, columns: [
      { key: 'type', label: 'Type', render: (r) => [C.dot(r.type), ' ' + r.type] },
      { key: 'n', label: 'Jobs', num: true }, { key: 'min', label: 'Fastest', num: true }, { key: 'med', label: 'Median', num: true },
      { key: 'p80', label: '80th percentile', num: true }, { key: 'p95', label: '95th percentile', num: true }, { key: 'max', label: 'Slowest', num: true },
    ] }));
    el.appendChild(C.note('Cycle Time in calendar days, jobs delivered in the last 12 months. Promise the 80th percentile.'));
  }, { wide: true });

  reg('CT-12', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt);
    const types = D.types.filter((t) => jobs.some((w) => w.type === t));
    const of = (t) => jobs.filter((w) => w.type === t);
    el.appendChild(C.pairedBar({ categories: types, unit: ' d', series: [
      { name: 'Cycle Time', values: types.map((t) => D.median(of(t).map(D.cycleTime))) },
      { name: 'Without Customer days', values: types.map((t) => D.median(of(t).map((w) => D.cycleTime(w) - D.holderDays(w).Customer))) },
    ] }));
  });

  reg('CT-13', (el, { D, C }) => {
    const del = deliveredJobs(D);
    const rows = D.wos.filter(D.active).map((w) => {
      const name = D.st(w).name;
      const same = del.filter((j) => j.type === w.type).map((j) => { const a = D.first(j, name); return a ? D.between(a, D.deliveredAt(j)) : null; }).filter((x) => x !== null);
      const left = D.median(same) || 0;
      const exp = D.addDays(D.today, Math.round(left));
      return { w, key: w.key, type: w.type, status: name, left, exp, due: w.due, slip: w.due ? D.between(w.due, exp) : null };
    }).sort((a, b) => (b.slip === null ? -999 : b.slip) - (a.slip === null ? -999 : a.slip));
    el.dataset.wide = '1';
    el.appendChild(C.table({ rows, max: 8, maxHeight: 330, dense: true, columns: [
      { key: 'key', label: 'Job', render: (r) => D.label(r.w) }, { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status', render: (r) => C.pill(r.status, D.st(r.w).holder) },
      { key: 'exp', label: 'Expected delivery', value: (r) => r.exp.getTime(), fmt: (v, r) => D.fmt(r.exp) },
      { key: 'due', label: 'Client due date', value: (r) => (r.due ? r.due.getTime() : 0), fmt: (v, r) => (r.due ? D.fmt(r.due) : 'None') },
      { key: 'slip', label: 'Against due date', value: (r) => (r.slip === null ? -999 : r.slip), render: (r) => (r.slip === null ? C.chip('No due date', 'warn') : r.slip > 0 ? C.chip(r.slip + ' d late', 'bad') : C.chip(-r.slip + ' d spare', 'good')) },
    ] }));
  }, { wide: true });

  reg('CT-14', (el, { D, C }) => {
    const jobs = last12(D, deliveredJobs(D), D.deliveredAt);
    const amb = jobs.filter((w) => w.type === 'AMB' && w.monitors);
    const B = [['1 to 2', 1, 2], ['3 to 4', 3, 4], ['5 to 6', 5, 6], ['7+', 7, 999]];
    const byMon = B.map(([l, lo, hi]) => { const a = amb.filter((w) => w.monitors >= lo && w.monitors <= hi).map(D.cycleTime); return { label: l, value: a.length ? D.median(a) : 0, n: a.length }; }).filter((x) => x.n);
    const byPh = D.PHASES.map((p) => { const a = jobs.filter((w) => (w.phase || []).includes(p)).map(D.cycleTime); return { label: p, value: a.length ? D.median(a) : 0, n: a.length }; }).filter((x) => x.n);
    el.appendChild(C.split([
      panel('AMB jobs, by monitors required', C.bar({ horizontal: false, unit: ' d', seriesName: 'AMB, by monitors required', data: byMon.map((x) => ({ label: x.label + ' monitors', value: x.value, type: 'AMB', tip: x.label + ' monitors: ' + x.n + ' jobs' })) })),
      panel('All types, by phase of operation', C.bar({ horizontal: false, unit: ' d', seriesName: 'All types, by phase of operation', data: byPh.map((x) => ({ label: x.label, value: x.value, tip: x.label + ': ' + x.n + ' jobs' })) })),
    ]));
    el.appendChild(C.note('Median Cycle Time, jobs delivered in the last 12 months.'));
  });

  reg('CT-15', (el, { D, C }) => {
    const revs = D.wos.filter((w) => w.rev && D.deliveredAt(w));
    el.appendChild(C.boxPlot({ unit: ' d', groups: D.types.map((t) => ({ label: t, color: C.colors.type[t], values: revs.filter((w) => w.type === t).map(D.cycleTime) })).filter((g) => g.values.length), empty: 'No delivered revisions' }));
    el.appendChild(C.note('Revision records, request received to delivered.'));
  });

  reg('CT-16', (el, { D, C }) => {
    const v = D.wos.filter((w) => w.rev).map((w) => { const p = D.byId(w.parent); return p && D.deliveredAt(p) ? D.between(D.deliveredAt(p), w.created) : null; }).filter((x) => x !== null && x >= 0);
    el.appendChild(C.histogram({ values: v, buckets: [[0, 7], [8, 14], [15, 30], [31, 60], [61, Infinity]], labels: ['0 to 7', '8 to 14', '15 to 30', '31 to 60', '61+'], countUnit: ' revisions', xLabel: 'Days from delivery to revision request' }));
    el.appendChild(C.note(v.length + ' revisions. Median ' + D.median(v) + ' days after delivery.'));
  });

  reg('CT-17', (el, { D, C }) => {
    const jobs = D.wos.filter((w) => !w.rev && ['AMB', 'CM', 'CR'].includes(w.type));
    const gap = (w, a, b) => { const x = D.milestone(w, a), y = D.milestone(w, b); return x && y ? D.between(x, y) : null; };
    const steps = [['Approved to deployed', 'Locations approved by customer', 'Monitors deployed'], ['Deployed to picked up', 'Monitors deployed', 'Monitors picked up'], ['Picked up to processing started', 'Monitors picked up', 'Data processing started']];
    const med = (t, s) => { const a = jobs.filter((w) => w.type === t).map((w) => gap(w, s[1], s[2])).filter((x) => x !== null && x >= 0); return a.length ? D.median(a) : 0; };
    const types = ['AMB', 'CR', 'CM'].filter((t) => jobs.some((w) => w.type === t));
    el.appendChild(C.stackedBar({ categories: types, horizontal: true, unit: ' d', series: steps.map((s, i) => ({ name: s[0], color: C.colors.cat[i], values: types.map((t) => med(t, s)) })) }));
    el.appendChild(C.note('Median days per step. CM jobs have no data processing.'));
  });

  // ===========================================================================
  // QC
  // ===========================================================================
  const reviewVisits = (D, kind) => D.wos.flatMap((w) => D.visits(w).filter((v) => v.loop && v.kind === kind).map((v) => ({ w, v })));

  reg('QC-1', (el, { D, C }) => {
    const pile = D.wos.filter((w) => D.active(w) && D.st(w).holder === 'QC' && D.st(w).loop);
    const who = (w) => w.qc || 'No reviewer';
    const names = D.reviewers.concat(pile.some((w) => !w.qc) ? ['No reviewer'] : []);
    const cnt = (n, kind) => pile.filter((w) => who(w) === n && D.st(w).kind === kind).length;
    const oldest = (n) => Math.max(0, ...pile.filter((w) => who(w) === n && D.st(w).kind === 'Queue').map(D.daysIn));
    el.appendChild(C.stackedBar({ categories: names, horizontal: true, unit: ' jobs', series: [
      { name: 'Waiting for QC', color: C.colors.kind.Queue, values: names.map((n) => cnt(n, 'Queue')) },
      { name: 'In QC', color: C.colors.kind.Review, values: names.map((n) => cnt(n, 'Review')) },
    ], tips: names.map((n) => n + ': oldest wait ' + oldest(n) + ' days') }));
    el.appendChild(C.table({ dense: true, rows: names.map((n) => ({ n, oldest: oldest(n) })), columns: [{ key: 'n', label: 'Reviewer' }, { key: 'oldest', label: 'Oldest wait (days)', num: true }] }));
  });

  reg('QC-2', (el, { D, C }) => {
    const vs = reviewVisits(D, 'Review').filter((x) => x.v.end);
    el.appendChild(C.boxPlot({ unit: ' d', p80: true, groups: D.QC_LOOPS.map((l) => ({ label: l, color: C.colors.loop[l], values: vs.filter((x) => x.v.loop === l).map((x) => x.v.days) })).filter((g) => g.values.length) }));
  });

  reg('QC-3', (el, { D, C }) => {
    const months = D.months(12), jobs = D.wos.filter((w) => !w.rev && D.deliveredAt(w));
    const cell = (l, m) => jobs.filter((w) => D.inRange(D.deliveredAt(w), m)).map((w) => D.visits(w).filter((v) => v.loop === l && v.kind === 'Review').length).filter((n) => n > 0);
    el.appendChild(C.line({
      x: months.map((m) => m.label), pct: true, yMin: 0, yMax: 1, greyLabel: 'Fewer than 3 jobs',
      series: D.QC_LOOPS.map((l) => ({ name: l, color: C.colors.loop[l], values: months.map((m) => { const a = cell(l, m); return a.length ? a.filter((n) => n === 1).length / a.length : null; }) })),
      grey: (si, xi) => cell(D.QC_LOOPS[si], months[xi]).length < 3,
    }));
  });

  reg('QC-4', (el, { D, C }) => {
    const weeks = D.weeks(12), vs = reviewVisits(D, 'Review').filter((x) => x.v.end && x.w.qc);
    const col = C.colors.pick(D.reviewers);
    el.appendChild(C.stackedBar({ categories: weeks.map((w) => w.label), unit: ' reviews', series: D.reviewers.map((r) => ({ name: r, color: col[r], values: weeks.map((wk) => vs.filter((x) => x.w.qc === r && x.v.end >= wk.start && x.v.end <= wk.end).length) })) }));
  });

  reg('QC-5', (el, { D, C }) => {
    const vs = reviewVisits(D, 'Work').filter((x) => x.v.end);
    const loops = D.QC_LOOPS.filter((l) => vs.some((x) => x.v.loop === l));
    const data = loops.map((l) => { const a = vs.filter((x) => x.v.loop === l).map((x) => x.v.days); return { label: l, color: C.colors.loop[l], value: D.mean(a), tip: l + ': average ' + D.num(D.mean(a), 1) + ' d, median ' + D.median(a) + ' d, 80th percentile ' + D.pct(a, 80) + ' d, longest ' + Math.max(...a) + ' d, ' + a.length + ' visits' }; });
    el.appendChild(C.bar({ data, horizontal: false, unit: ' d', dec: 1, seriesName: 'Average days per edits visit' }));
    const none = D.QC_LOOPS.filter((l) => !loops.includes(l));
    el.appendChild(C.note('Average days per edits visit. Hover a bar for the median and 80th percentile.' + (none.length ? ' ' + none.join(' and ') + ' have no edits status in the workflow.' : '')));
  });

  reg('QC-6', (el, { D, C }) => {
    const jobs = D.wos.filter((w) => !w.rev && D.deliveredAt(w) && D.hasHT(w));
    const hrs = (w) => D.sum(D.entriesFor(w).filter((e) => D.isHT(e) && D.QC_SUBS.includes(e.sub)).map((e) => e.hours));
    el.appendChild(C.bar({ horizontal: false, unit: ' h', dec: 1, data: D.types.map((t) => { const a = jobs.filter((w) => w.type === t); const m = a.length ? D.median(a.map(hrs)) : 0; return m > 0 ? { label: t, type: t, value: m, tip: t + ': ' + a.length + ' delivered jobs' } : null; }).filter(Boolean) }));
    el.appendChild(C.note('Median hours on QC sub-tasks per delivered job. Jobs created since time entries began.'));
  });

  // ===========================================================================
  // Field and monitors
  // ===========================================================================
  const fieldJobs = (D) => D.wos.filter((w) => !w.rev && ['AMB', 'CR', 'CM', 'SIG'].includes(w.type));
  const outStart = (w) => w.deploy || w.planned;
  const outEnd = (D, w) => w.pickup || (outStart(w) && D.addDays(outStart(w), w.studyLen || 1));

  reg('FLD-1', (el, { D, C }) => {
    const a = D.addDays(D.today, -14), b = D.addDays(D.today, 42);
    const rows = fieldJobs(D).filter((w) => outStart(w)).map((w) => ({ w, s: outStart(w), e: outEnd(D, w) })).filter((x) => x.e >= a && x.s <= b).sort((p, q) => p.s - q.s).slice(0, 14);
    el.dataset.wide = '1';
    el.appendChild(C.gantt({ start: a, end: b, today: D.today, rows: rows.map((x) => ({ label: D.label(x.w), sub: x.w.type + ', ' + x.w.cust, bars: [{ start: x.s, end: x.e, holder: 'Field', light: !x.w.deploy, tip: D.label(x.w) + ': ' + (x.w.deploy ? 'deployed ' : 'planned ') + D.fmt(x.s) + ' to ' + (x.w.pickup ? 'picked up ' : 'due back ') + D.fmt(x.e) }] })), legend: [{ label: 'Out in the field (light bars are planned)', color: C.colors.holder.Field }] }));
  }, { wide: true });

  reg('FLD-2', (el, { D, C }) => {
    const first = D.weekStart(D.addDays(D.today, -357)), weeks = [];
    for (let i = 0; i < 58; i++) { const s = D.addDays(first, i * 7); weeks.push({ start: s, end: D.addDays(s, 6) }); }
    const jobs = fieldJobs(D).filter((w) => w.monitors && outStart(w));
    const t = ['AMB', 'CR', 'CM'];
    const cnt = (ty, wk) => D.sum(jobs.filter((w) => w.type === ty && outStart(w) <= wk.end && outEnd(D, w) >= wk.start).map((w) => w.monitors));
    const ti = weeks.findIndex((w) => w.end >= D.today);
    el.dataset.wide = '1';
    el.appendChild(C.stackedBar({ categories: weeks.map((w, i) => (i === ti ? 'Today' : i % 8 === 0 && Math.abs(i - ti) > 3 ? D.fmt(w.start) : '')), totals: false, unit: ' monitors', series: t.map((ty) => ({ name: ty, type: ty, color: C.colors.type[ty], values: weeks.map((wk) => (wk.end >= D.today ? 0 : cnt(ty, wk))) })).concat(t.map((ty) => ({ name: ty + ' planned', color: C.colors.mix(C.colors.type[ty], C.colors.surface, 0.55), values: weeks.map((wk) => (wk.end >= D.today ? cnt(ty, wk) : 0)) }))), tips: weeks.map((w) => 'Week of ' + D.fmt(w.start) + (w.end >= D.today ? ' (this week and later use planned dates)' : '')) }));
    el.appendChild(C.note('Monitors required on jobs out in the field that week. The weeks from today on are the next 6 weeks, drawn in lighter colours from planned dates.'));
  }, { wide: true });

  reg('FLD-3', (el, { D, C }) => {
    const v = fieldJobs(D).filter((w) => w.deploy && w.planned).map((w) => D.between(w.planned, w.deploy));
    el.appendChild(C.histogram({ values: v, buckets: [[-Infinity, -3], [-2, -1], [0, 0], [1, 2], [3, 5], [6, Infinity]], labels: ['3+ early', '1 to 2 early', 'On the day', '1 to 2 late', '3 to 5 late', '6+ late'], countUnit: ' jobs', xLabel: 'Actual against planned deploy' }));
    el.appendChild(C.note(v.length + ' jobs. ' + Math.round((v.filter((x) => x === 0).length / v.length) * 100) + '% went out on the planned day.'));
  });

  reg('FLD-4', (el, { D, C }) => {
    const rows = fieldJobs(D).filter((w) => ['AMB', 'CR'].includes(w.type) && w.deploy && w.studyLen && !(D.done(w) && !w.pickup)).map((w) => { const days = D.between(w.deploy, w.pickup || D.today); return { w, key: w.key, cust: w.cust, sold: w.studyLen, days, over: days - w.studyLen, out: !w.pickup }; }).sort((a, b) => b.over - a.over);
    el.dataset.wide = '1';
    el.appendChild(C.table({ rows, max: 8, dense: true, highlight: (r) => r.over > 0, columns: [
      { key: 'key', label: 'Job', render: (r) => D.label(r.w) }, { key: 'cust', label: 'Customer' },
      { key: 'sold', label: 'Study length sold (days)', num: true }, { key: 'days', label: 'Days deployed', num: true },
      { key: 'over', label: 'Against sold', render: (r) => (r.over > 0 ? C.chip(r.over + ' d over' + (r.out ? ', still out' : ''), 'bad') : C.chip(r.over === 0 ? 'On length' : -r.over + ' d under', 'good')), value: (r) => r.over },
    ] }));
  }, { wide: true });

  reg('FLD-5', (el, { D, C }) => {
    const months = D.months(12);
    const pts = fieldJobs(D).map((w) => { const a = D.milestone(w, 'Monitors picked up'), b = D.milestone(w, 'Data processing started'); return a && b ? { d: D.between(a, b), at: b } : null; }).filter(Boolean);
    const cell = (m) => pts.filter((p) => D.inRange(p.at, m)).map((p) => p.d);
    el.appendChild(C.line({ x: months.map((m) => m.label), unit: ' d', greyLabel: 'Fewer than 3 jobs', series: [{ name: 'Median days', values: months.map((m) => { const a = cell(m); return a.length ? D.median(a) : null; }) }], grey: (si, xi) => cell(months[xi]).length < 3 }));
  });

  reg('FLD-6', (el, { D, C }) => {
    const jobs = fieldJobs(D).filter((w) => w.monitors && D.hasHT(w));
    const per = (w) => D.sum(D.entriesFor(w).filter((e) => D.isHT(e) && e.task === 'Field Work').map((e) => e.hours)) / w.monitors;
    const data = ['AMB', 'CR', 'CM'].map((t) => { const a = jobs.filter((w) => w.type === t).map(per).filter((x) => x > 0); return a.length ? { label: t, type: t, value: D.median(a), tip: t + ': ' + a.length + ' jobs' } : null; }).filter(Boolean);
    el.appendChild(C.bar({ data, horizontal: false, unit: ' h', dec: 1 }));
    el.appendChild(C.note('Median Field Work hours per monitor required.'));
  });

  reg('FLD-7', (el, { D, C }) => {
    const due = (w) => D.addDays(w.deploy, w.studyLen);
    const row = (w, d) => ({ title: D.label(w), text: w.cust + ', ' + w.site, sub: (w.monitors ? w.monitors + ' monitors, ' : '') + 'due back ' + D.fmt(due(w)), holder: 'Field', value: d });
    const rows = D.wos.filter((w) => D.open(w) && w.deploy && !w.pickup && w.studyLen && due(w) < D.today).map((w) => ({ w, d: D.between(due(w), D.today) })).sort((a, b) => b.d - a.d);
    if (rows.length) { el.appendChild(C.list({ rows: rows.map((x) => row(x.w, x.d + ' d overdue')) })); return; }
    el.appendChild(C.empty('No overdue pickups'));
    const ex = D.wos.filter((w) => D.open(w) && w.deploy && !w.pickup && w.studyLen).sort((a, b) => due(a) - due(b))[0];
    if (ex) { const l = C.list({ rows: [Object.assign(row(ex, 'due back ' + D.fmt(due(ex))), { chips: [C.chip('Example row', 'mute')], sub: 'Not overdue yet. Shows how an overdue job would look.' })] }); l.style.opacity = '0.7'; el.appendChild(l); }
  });

})();
