/* Shared mock data and behaviour for the three layout mockups.
   Everything here is invented: people, customers, sites, hours. Status names come from the workflow tabs of spec/PM-App-Spec.xlsx. */
(function () {
  const USG = (window.USG = {});
  const TODAY = new Date(2026, 10, 25);
  const DAY = 864e5;
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  USG.e = e;

  /* ---------- workflows ---------- */
  const wf = (s) => s.split(';').map((x) => { const [name, kind, holder] = x.split('|'); return { name, kind, holder }; });
  const FIELD = 'Request Received|Queue|Urban;Selecting Locations|Work|Urban;Waiting for Locations QC|Queue|QC;In Locations QC|Review|QC;Waiting on Customer Approval|Customer|Customer;Waiting on Surface Permission|Customer|Customer;Scheduled|Field|Field;Deployed|Field|Field;';
  const PROC = 'Waiting for Processing|Queue|Urban;Processing|Work|Urban;Waiting for Processing QC|Queue|QC;In Processing QC|Review|QC;Processing Edits|Work|Urban;';
  const REPORT = 'Ready for Report|Queue|Urban;Writing Report|Work|Urban;Waiting for Report QC|Queue|QC;In Report QC|Review|QC;Report Edits|Work|Urban;Delivered|Queue|Billing;Closed|Done|None';
  const MODEL = 'Request Received|Queue|Urban;Info Review|Work|Urban;Waiting on Customer: Info|Customer|Customer;Ready for Modeling|Queue|Urban;Modeling|Work|Urban;Waiting for Model QC|Queue|QC;In Model QC|Review|QC;Model Edits|Work|Urban;Waiting for Prelim QC|Queue|QC;In Prelim QC|Review|QC;Waiting on Customer: Prelim Approval|Customer|Customer;';
  const SIG = 'Request Received|Queue|Urban;Arranging Site & Timing|Customer|Customer;Scheduled|Field|Field;Waiting for Data Processing|Queue|Urban;SWL Processing|Work|Urban;Ready for Calibration Model|Queue|Urban;Calibration Model|Work|Urban;Waiting for Calibration QC|Queue|QC;In Calibration QC|Review|QC;Calibration Edits|Work|Urban;Ready for Generic Model|Queue|Urban;Generic Model|Work|Urban;Waiting for Generic Model QC|Queue|QC;In Generic Model QC|Review|QC;Generic Model Edits|Work|Urban;';
  const WF = (USG.WF = {
    AMB: wf(FIELD + PROC + REPORT), NMP: wf(MODEL + REPORT), NIA: wf(MODEL + REPORT),
    SIG: wf(SIG + REPORT), CM: wf(FIELD + 'Picked Up|Queue|Billing;Closed|Done|None'), CR: wf(FIELD + PROC + REPORT),
  });
  USG.HOLDERS = ['Urban', 'QC', 'Customer', 'Field', 'Billing'];

  /* ---------- mock work orders ---------- */
  function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const r = rng(11);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const ENG = (USG.ENG = ['Sam Carter', 'Dana Whitlow', 'Marco Ruiz', 'Priya Nair', 'Tom Becker']);
  const QC = ['Lena Ortiz', 'Grant Hale'];
  USG.me = 'Sam Carter';
  const CUST = [['Northfield Energy', 'Oil and gas'], ['Bison Midstream', 'Midstream'], ['Tallgrass Operating', 'Oil and gas'], ['Kestrel Resources', 'Oil and gas'], ['Red Mesa Oil & Gas', 'Oil and gas'], ['Pinyon Power', 'Power'], ['Front Range Aggregates', 'Mining']];
  const SITES = ['Coyote 12-4 Pad', 'Larkspur Compressor Station', 'Harlan 7H Pad', 'Sage Draw Pad', 'Miller Ranch 3-22', 'Antelope Booster', 'Windrow Substation', 'Dry Creek Pad', 'Juniper 18 Pad', 'Prairie Rose Facility', 'Elk Bench Quarry', 'Cottonwood 5-9 Pad'];
  const TYPES = ['NMP', 'NMP', 'NMP', 'AMB', 'AMB', 'SIG', 'SIG', 'NIA', 'CR', 'CM'];
  const SCOPE = { NMP: 'Noise mitigation plan for drilling and completions', AMB: '72-hour ambient survey, 3 monitors', SIG: 'Signature measurement of the rig', NIA: 'Noise impact assessment for the facility', CR: 'Complaint response monitoring', CM: 'Continuous monitoring during completions' };
  const NOTES = {
    Urban: ['Model run finished, checking receptors', 'Starting the report draft this week', 'Next up after the Harlan job', 'Processing the second week of data'],
    QC: ['Sent to QC on Monday', 'Second review round'],
    Customer: ['Asked for the equipment list on 11/18, no reply yet', 'Customer is reviewing prelim results', 'Landowner call set for Friday'],
    Field: ['Monitors are out, pickup planned for 12/2', 'Crew scheduled for 12/1'],
    Billing: ['Report sent, invoice not out yet', 'Waiting on a PO number'],
    None: ['Closed'],
  };
  USG.wos = [];
  for (let i = 0; i < 38; i++) {
    const type = pick(TYPES), flow = WF[type], c = pick(CUST);
    const si = i < 3 ? flow.length - 1 : i < 8 ? flow.length - 2 : Math.floor(r() * (flow.length - 2));
    const holder = flow[si].holder;
    USG.wos.push({
      id: 3190 - Math.floor(i * 1.7), type, cust: c[0], industry: c[1], site: pick(SITES), si,
      eng: i % 4 === 0 ? USG.me : pick(ENG), qc: pick(QC), days: Math.floor(r() * r() * 27),
      due: new Date(+TODAY + Math.floor(r() * 46 - 9) * DAY), hold: i === 12 || i === 21 || i === 30,
      hours: Math.round(r() * 90) / 2, note: pick(NOTES[holder]), comments: [],
    });
  }
  USG.wos.filter((w) => WF[w.type][w.si].kind !== 'Done').sort((a, b) => a.due - b.due).forEach((w, i) => (w.pri = i + 1));

  const st = (USG.st = (w) => WF[w.type][w.si]);
  USG.who = (w) => { const h = st(w).holder; return h === 'Urban' ? w.eng : h === 'QC' ? w.qc : h === 'Customer' ? w.cust : h === 'Field' ? 'Field crew' : h === 'Billing' ? 'Billing' : ''; };
  USG.yourMove = (w) => st(w).holder === 'Urban' && w.eng === USG.me && !w.hold;
  USG.done = (w) => st(w).kind === 'Done';
  USG.fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  USG.late = (w) => !USG.done(w) && w.due < TODAY;
  USG.byId = (id) => USG.wos.find((w) => w.id === id);
  USG.history = (w) => { let d = +TODAY - w.days * DAY; const out = []; for (let k = w.si; k >= 0 && out.length < 6; k--) { out.push({ ...WF[w.type][k], date: new Date(d) }); d -= (1 + ((w.id * (k + 3)) % 6)) * DAY; } return out; };

  /* ---------- state ---------- */
  const S = (USG.state = { page: 'work', scope: 'mine', role: 'Engineer', q: '', type: '', holder: '', eng: '', group: 'holder', sort: 'pri', dir: 1, sel: null, ttab: 'week', itab: 'bottlenecks' });
  /* A link can open a given view, e.g. a-rail.html#role=Manager&page=insights */
  new URLSearchParams(location.hash.slice(1)).forEach((v, k) => { if (k in S) S[k] = k === 'sel' ? +v : v; });
  USG.nav = () => [['work', 'Work'], ['time', 'Time']].concat(S.role === 'Manager' ? [['insights', 'Insights']] : []);
  USG.scopes = () => [['mine', 'Mine'], ['all', 'Everyone']].concat(S.role === 'Engineer' ? [] : [['bill', 'To bill']]);
  const val = { pri: (w) => w.pri || 999, id: (w) => w.id, type: (w) => w.type, cust: (w) => w.cust, status: (w) => w.si / WF[w.type].length, holder: (w) => st(w).holder, days: (w) => w.days, due: (w) => +w.due, eng: (w) => w.eng };
  USG.list = () => {
    const q = S.q.trim().toLowerCase();
    return USG.wos.filter((w) => {
      const s = st(w);
      if (S.scope === 'mine' ? w.eng !== USG.me : S.scope === 'bill' ? s.holder !== 'Billing' : s.kind === 'Done') return false;
      if (q && !(w.id + ' ' + w.type + ' ' + w.cust + ' ' + w.site + ' ' + s.name + ' ' + w.eng).toLowerCase().includes(q)) return false;
      if (S.scope !== 'all') return true;
      return (!S.type || w.type === S.type) && (!S.holder || s.holder === S.holder) && (!S.eng || w.eng === S.eng);
    }).sort((a, b) => { const x = val[S.sort](a), y = val[S.sort](b); return (x < y ? -1 : x > y ? 1 : a.id - b.id) * S.dir; });
  };

  /* ---------- small building blocks ---------- */
  USG.seg = (items, cur, kind) => '<div class="u-seg">' + items.map(([v, l]) => `<button ${kind === 'scope' ? `data-scope="${v}"` : `data-tab="${kind}:${v}"`} aria-pressed="${v === cur}">${l}</button>`).join('') + '</div>';
  USG.sel = (key, label, opts) => `<select data-set="${key}" aria-label="${label}"><option value="">${label}</option>${opts.map((o) => `<option${S[key] === o ? ' selected' : ''}>${e(o)}</option>`).join('')}</select>`;
  USG.filters = () => USG.sel('type', 'Any type', Object.keys(WF)) + USG.sel('holder', 'Held by anyone', USG.HOLDERS) + USG.sel('eng', 'Any engineer', ENG);
  USG.roleSel = () => `<select class="u-role" data-set="role" aria-label="View the app as">${['Engineer', 'Manager', 'Billing'].map((o) => `<option${S.role === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  USG.th = (key, label, cls) => `<th class="${cls || ''}" aria-sort="${S.sort === key ? (S.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-sort="${key}">${label}<i>${S.sort === key ? (S.dir > 0 ? '▲' : '▼') : ''}</i></button></th>`;
  USG.dot = (h) => `<span class="u-dot" data-h="${h}"></span>`;
  USG.search = (ph) => `<input id="q" class="u-search" data-q type="search" placeholder="${ph || 'Search work orders'}" value="${e(S.q)}" aria-label="Search work orders">`;

  /* ---------- work order detail ---------- */
  USG.woHTML = (w) => {
    const flow = WF[w.type], s = st(w), next = flow[w.si + 1];
    const track = flow.map((x, i) => `<span data-h="${i <= w.si ? x.holder : ''}" class="${i === w.si ? 'now' : ''}" title="${e(x.name)}"></span>`).join('');
    const f = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<article class="u-wo">
      <header><p class="u-wo-id">${w.id} <span>${w.type}</span>${w.hold ? ' <b class="u-hold">On hold</b>' : ''}</p>
        <h2>${e(w.cust)}</h2><p class="u-wo-site">${e(w.site)}</p></header>
      <section class="u-status">
        <p class="u-now">${USG.dot(s.holder)}<strong>${e(s.name)}</strong></p>
        <p class="u-sub">${s.kind === 'Done' ? 'Finished' : `With ${e(USG.who(w))} for ${w.days} ${w.days === 1 ? 'day' : 'days'}`}</p>
        <div class="u-track" aria-hidden="true">${track}</div>
        ${next ? `<div class="u-move"><button class="u-btn primary" data-act="next">Move to ${e(next.name)}</button>
          <select data-act="jump" aria-label="Move to another status"><option value="">Another status</option>${flow.map((x, i) => (i === w.si ? '' : `<option value="${i}">${e(x.name)}</option>`)).join('')}</select></div>` : ''}
      </section>
      <dl class="u-fields">${f('Engineer', e(w.eng))}${f('QC reviewer', e(w.qc))}${f('Client due', `<span class="${USG.late(w) ? 'u-late' : ''}">${USG.fmt(w.due)}</span>`)}${f('Priority', w.pri || 'None')}${f('Industry', w.industry)}${f('Hours logged', w.hours.toFixed(1))}${f('Scope', SCOPE[w.type])}</dl>
      <section><h3>Comments</h3>
        <ul class="u-comments">${w.comments.map((c) => `<li><b>${e(USG.me)}</b><span>Today</span><p>${e(c)}</p></li>`).join('')}<li><b>${e(w.eng)}</b><span>${USG.fmt(new Date(+TODAY - Math.min(w.days, 3) * DAY))}</span><p>${e(w.note)}</p></li></ul>
        <input id="cmt" class="u-input" placeholder="Add a comment and press Enter" aria-label="Add a comment"></section>
      <section><h3>Status history</h3>
        <ol class="u-history">${USG.history(w).map((h) => `<li>${USG.dot(h.holder)}<span>${e(h.name)}</span><time>${USG.fmt(h.date)}</time></li>`).join('')}</ol></section>
    </article>`;
  };

  /* ---------- time ---------- */
  const mine = USG.wos.filter((w) => w.eng === USG.me && !USG.done(w)).slice(0, 3);
  const TASK = { NMP: 'Modeling', NIA: 'Modeling', SIG: 'Report', AMB: 'Project Administrative', CR: 'Report', CM: 'Customer Communication' };
  const HRS = [[4, 5.5, 3, 0, 0], [2, 1, 2.5, 0, 0], [1, 0, 1.5, 0, 0]];
  USG.week = { status: 'Draft', rows: mine.map((w, i) => ({ a: `${w.id} ${w.cust}`, b: TASK[w.type], h: HRS[i] })).concat([{ a: 'General', b: 'Queue Meeting', h: [0.5, 0.5, 0.5, 0, 0] }, { a: 'General', b: 'Training Received', h: [0, 1, 0, 0, 0] }, { a: 'Time off', b: 'Holiday', h: [0, 0, 0, 8, 0] }]) };
  USG.team = [['Dana Whitlow', 38.5, 'Submitted'], ['Marco Ruiz', 41, 'Submitted'], ['Priya Nair', 22, 'Draft'], ['Tom Becker', 0, 'Nothing logged'], ['Lena Ortiz', 36, 'Submitted'], ['Grant Hale', 40, 'Approved']];
  const DAYS = ['Mon 23', 'Tue 24', 'Wed 25', 'Thu 26', 'Fri 27'];
  USG.timeHTML = () => {
    const W = USG.week, tabs = S.role === 'Manager' ? USG.seg([['week', 'My week'], ['approvals', 'Approvals']], S.ttab, 'ttab') : '';
    if (S.role === 'Manager' && S.ttab === 'approvals')
      return `<div class="u-bar">${tabs}<span class="u-sub">Week of Nov 23</span></div><table class="u-table u-approvals"><thead><tr><th>Person</th><th class="num">Hours</th><th>Week</th><th></th></tr></thead><tbody>${USG.team.map((p, i) => `<tr><td>${p[0]}</td><td class="num">${p[1].toFixed(1)}</td><td class="${p[2] === 'Nothing logged' ? 'u-late' : ''}">${p[2]}</td><td class="num">${p[2] === 'Submitted' ? `<button class="u-btn" data-act="approve" data-i="${i}">Approve week</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
    const col = DAYS.map((_, d) => W.rows.reduce((t, x) => t + x.h[d], 0)), total = col.reduce((a, b) => a + b, 0), locked = W.status !== 'Draft';
    return `<div class="u-bar">${tabs}<span class="u-sub">Week of Nov 23</span><span class="u-sub">${total.toFixed(1)} of 40 hours</span><span class="u-spacer"></span><span class="u-sub">${W.status}</span>
      ${locked ? '' : '<button class="u-btn" data-act="addline">Add a line</button><button class="u-btn primary" data-act="submit">Submit week</button>'}</div>
      <table class="u-table u-week"><thead><tr><th>Work</th><th>Task</th>${DAYS.map((d, i) => `<th class="num${i === 2 ? ' today' : ''}">${d}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody>${W.rows.map((x, ri) => `<tr><td>${e(x.a)}</td><td class="mute">${e(x.b)}</td>${x.h.map((v, d) => `<td class="num"><input id="h-${ri}-${d}" data-h="${ri},${d}" value="${v || ''}" inputmode="decimal" ${locked ? 'disabled' : ''} aria-label="${e(x.a)} ${DAYS[d]}"></td>`).join('')}<td class="num">${x.h.reduce((a, b) => a + b, 0).toFixed(1)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Day total</td>${col.map((v) => `<td class="num">${v.toFixed(1)}</td>`).join('')}<td class="num">${total.toFixed(1)}</td></tr></tfoot></table>`;
  };

  /* ---------- insights ---------- */
  const bars = (rows, unit) => { const max = Math.max(...rows.map((x) => x[1]), 1); return '<ul class="u-bars">' + rows.map(([l, v, h]) => `<li><span>${e(l)}</span><i><b data-h="${h || ''}" style="width:${(v / max) * 100}%"></b></i><em>${v}${unit || ''}</em></li>`).join('') + '</ul>'; };
  const block = (title, body) => `<section class="u-block"><h3>${title}</h3>${body}</section>`;
  USG.insightsHTML = () => {
    const open = USG.wos.filter((w) => !USG.done(w)), by = (fn) => open.reduce((m, w) => ((m[fn(w)] = (m[fn(w)] || []).concat(w)), m), {});
    const H = by((w) => st(w).holder), avg = (a) => Math.round(a.reduce((t, w) => t + w.days, 0) / a.length);
    const tabs = [['bottlenecks', 'Bottlenecks'], ['cycle', 'Cycle Time'], ['hours', 'Hours'], ['capacity', 'Capacity'], ['health', 'Data health']];
    const body = {
      bottlenecks: () => block('Open jobs by who holds them', bars(USG.HOLDERS.map((h) => [h, (H[h] || []).length, h]))) + block('Average days in the current status', bars(USG.HOLDERS.map((h) => [h, H[h] ? avg(H[h]) : 0, h]), ' d')) +
        block('Longest waits', `<table class="u-table"><tbody>${open.slice().sort((a, b) => b.days - a.days).slice(0, 6).map((w) => `<tr tabindex="0" data-open="${w.id}"><td>${w.id}</td><td>${e(w.cust)}</td><td>${e(st(w).name)}</td><td class="mute">${e(USG.who(w))}</td><td class="num">${w.days} d</td></tr>`).join('')}</tbody></table>`),
      cycle: () => block('Request received to Delivered, median days', bars([['NIA', 41], ['NMP', 34], ['SIG', 30], ['AMB', 22], ['CM', 12], ['CR', 6]], ' d')) + block('Jobs delivered per month', bars([['Jun', 14], ['Jul', 17], ['Aug', 12], ['Sep', 19], ['Oct', 16], ['Nov', 11]])) + block('On time against the client due date', '<p class="u-fact">78% <span>of 89 jobs delivered since June</span></p>'),
      hours: () => block('Human Time per job, median hours', bars([['NMP', 33], ['NIA', 29], ['SIG', 24], ['AMB', 18], ['CR', 7], ['CM', 5]], ' h')) + block('Hours by task group', bars([['Modeling', 860], ['Report', 510], ['Field Work', 430], ['Project Administrative', 220], ['Customer Communication', 140]], ' h')) + block('Billable share of all hours', '<p class="u-fact">44% <span>this quarter</span></p>'),
      capacity: () => block('Hours this week against 40', bars([['Sam Carter', 21.5]].concat(USG.team.slice(0, 4).map((p) => [p[0], p[1]])), ' h')) + block('Open jobs per engineer', bars(ENG.map((n) => [n, open.filter((w) => w.eng === n).length]))),
      health: () => block('This week', `<table class="u-table"><tbody>${[['Weeks still in draft', 2], ['People with nothing logged', 1], ['Entries with no comment', 37], ['Jobs with no status change in 14 days', open.filter((w) => w.days >= 14).length], ['Backdated status changes', 3], ['General time against a customer with an open WO', 5]].map((x) => `<tr><td>${x[0]}</td><td class="num">${x[1]}</td></tr>`).join('')}</tbody></table>`),
    };
    return `<div class="u-bar">${USG.seg(tabs, S.itab, 'itab')}<span class="u-spacer"></span><span class="u-sub">Made-up numbers</span></div><div class="u-grid">${body[S.itab]()}</div>`;
  };

  /* ---------- events ---------- */
  USG.rerender = () => {
    const a = document.activeElement, id = a && a.id, pos = id && a.selectionStart;
    USG.render();
    const n = id && document.getElementById(id);
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} }
  };
  const move = (w, i) => { w.si = i; w.days = 0; };
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-go],[data-scope],[data-open],[data-sort],[data-close],[data-tab],button[data-act]');
    if (!t) return;
    const d = t.dataset, w = USG.byId(S.sel);
    if (d.go) { S.page = d.go; S.sel = null; }
    else if (d.scope) S.scope = d.scope;
    else if (d.open) S.sel = +d.open;
    else if ('close' in d) S.sel = null;
    else if (d.sort) { if (S.sort === d.sort) S.dir *= -1; else { S.sort = d.sort; S.dir = 1; } }
    else if (d.tab) { const [k, v] = d.tab.split(':'); S[k] = v; }
    else if (d.act === 'next' && w) move(w, w.si + 1);
    else if (d.act === 'submit') USG.week.status = 'Submitted';
    else if (d.act === 'addline') USG.week.rows.push({ a: 'General', b: 'Company Administrative', h: [0, 0, 0, 0, 0] });
    else if (d.act === 'approve') USG.team[+d.i][2] = 'Approved';
    USG.rerender();
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target, d = t.dataset;
    if (d.set) { S[d.set] = t.value; if (d.set === 'role') { if (!USG.nav().some((n) => n[0] === S.page)) S.page = 'work'; if (!USG.scopes().some((n) => n[0] === S.scope)) S.scope = 'mine'; } }
    else if (d.act === 'jump' && t.value !== '') move(USG.byId(S.sel), +t.value);
    else if (d.h) { const [ri, di] = d.h.split(','); USG.week.rows[ri].h[di] = Math.max(0, parseFloat(t.value) || 0); }
    else return;
    USG.rerender();
  });
  document.addEventListener('input', (ev) => { if ('q' in ev.target.dataset) { S.q = ev.target.value; USG.rerender(); } });
  document.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if (ev.key === 'Escape' && S.sel) { S.sel = null; USG.rerender(); }
    else if (ev.key === 'Enter' && t.id === 'cmt' && t.value.trim()) { USG.byId(S.sel).comments.unshift(t.value.trim()); USG.rerender(); }
    else if (ev.key === 'Enter' && t.dataset.open) { S.sel = +t.dataset.open; USG.rerender(); }
  });
})();
