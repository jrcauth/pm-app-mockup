/* Option A prototype, built against the Requirements, MVP Fields and Dashboards tabs of spec/PM-App-Spec.xlsx.
   All people, customers, sites, hours and invoice numbers are invented. Nothing saves. */
(function () {
  const TODAY = new Date(2026, 10, 25), DAY = 864e5, ME = 'Sam Carter';
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const iso = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '');
  const parse = (s) => { if (!s) return null; const [y, m, d] = s.split('-'); return new Date(y, m - 1, d); };
  const fmt = (d) => (d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
  const between = (a, b) => Math.round((b - a) / DAY);

  /* ---------- workflows: status | kind | holder | stage (Status Map + workflow tabs; stage roll-up is B7) ---------- */
  const wf = (s) => (s + 'Closed|Done|None|D;Cancelled|Done|None|D').split(';').map((x) => { const [name, kind, holder, stage] = x.split('|'); return { name, kind, holder, stage }; });
  const LOC = 'Request Received|Queue|Urban|P;Selecting Locations|Work|Urban|P;Waiting for Locations QC|Queue|QC|P;In Locations QC|Review|QC|P;Waiting on Customer Approval|Customer|Customer|P;Waiting on Surface Permission|Customer|Customer|P;Scheduled|Field|Field|F;Deployed|Field|Field|F;';
  const PROC = 'Waiting for Processing|Queue|Urban|F;Processing|Work|Urban|F;Waiting for Processing QC|Queue|QC|F;In Processing QC|Review|QC|F;Processing Edits|Work|Urban|F;';
  const REP = 'Ready for Report|Queue|Urban|R;Writing Report|Work|Urban|R;Waiting for Report QC|Queue|QC|R;In Report QC|Review|QC|R;Report Edits|Work|Urban|R;Delivered|Queue|Billing|D;';
  const MOD = 'Request Received|Queue|Urban|P;Info Review|Work|Urban|P;Waiting on Customer: Info|Customer|Customer|P;Ready for Modeling|Queue|Urban|M;Modeling|Work|Urban|M;Waiting for Model QC|Queue|QC|M;In Model QC|Review|QC|M;Model Edits|Work|Urban|M;Waiting for Prelim QC|Queue|QC|L;In Prelim QC|Review|QC|L;Waiting on Customer: Prelim Approval|Customer|Customer|L;';
  const SIG = 'Request Received|Queue|Urban|P;Arranging Site & Timing|Customer|Customer|P;Scheduled|Field|Field|F;Waiting for Data Processing|Queue|Urban|F;SWL Processing|Work|Urban|F;Ready for Calibration Model|Queue|Urban|M;Calibration Model|Work|Urban|M;Waiting for Calibration QC|Queue|QC|M;In Calibration QC|Review|QC|M;Calibration Edits|Work|Urban|M;Ready for Generic Model|Queue|Urban|M;Generic Model|Work|Urban|M;Waiting for Generic Model QC|Queue|QC|M;In Generic Model QC|Review|QC|M;Generic Model Edits|Work|Urban|M;';
  const WF = { AMB: wf(LOC + PROC + REP), NMP: wf(MOD + REP), NIA: wf(MOD + REP), SIG: wf(SIG + REP), CM: wf(LOC + 'Picked Up|Queue|Billing|D;'), CR: wf(LOC + PROC + REP) };
  const LOCM = ['Request received', 'Propose locations start', 'Locations ready for QC', 'Locations QC start', 'Locations sent to customer', 'Locations approved by customer', 'Locations approved and scheduled', 'Monitors deployed', 'Monitors picked up'];
  const PROCM = ['Data processing started', 'Data processing ready for QC', 'Data processing QC start', 'Data processing checked', 'Data processing edits complete'];
  const REPM = ['Report started', 'Report ready for QC', 'Report QC start', 'Report reviewed', 'Report sent to customer'];
  const MODM = ['Request received', 'Information review start', 'Information request sent', 'Prelim info received', 'Modeling started', 'Model ready for QC', 'Model QC start', 'Model reviewed', 'Preliminary results ready for QC', 'Preliminary results QC start', 'Preliminary results sent to customer', 'Preliminary results approved'];
  const SIGM = ['Request received', 'Site and timing request sent', 'Location approved & scheduled', 'Equipment measured', 'Data processing started', 'SWL processing complete', 'Calibration model started', 'Calibration model ready for QC', 'Calibration QC start', 'Calibration model checked', 'Calibration edits complete', 'Generic model started', 'Generic model ready for QC', 'Generic model QC start', 'Generic model checked', 'Generic model edits complete'];
  const MILE = { AMB: LOCM.concat(PROCM, REPM), NMP: MODM.concat(REPM), NIA: MODM.concat(REPM), SIG: SIGM.concat(REPM), CM: LOCM, CR: LOCM.concat(PROCM, REPM) };
  const STAGES = [['P', 'Prelim'], ['F', 'Field'], ['M', 'Model'], ['L', 'Results'], ['R', 'Report']];
  const HOLDERS = ['Urban', 'QC', 'Customer', 'Field', 'Billing'];
  const HOLD_REASONS = ['Waiting on customer', 'Waiting on another WO (AMB/SIG)', 'Equipment not on site', 'Priority', 'Other'];
  const INDUSTRIES = ['Oil & gas', 'Compressor station', 'Data center', 'Power', 'Mining'];
  const PHASES = ['Drilling', 'Completion', 'Production', 'N/A'];
  const TASKS = { 'Project Administrative': ['Job Setup', 'Information Review', 'Internal Job Kickoff'], 'Customer Communication': ['Communications', 'Information Request', 'Preliminary Results'], Modeling: ['Base Model', 'Equipment Model', 'Mitigation Specification', 'Model QC', 'Post QC Edits'], 'Field Work': ['Field Prep', 'Field Time'], Report: ['Draft', 'Report QC', 'Post QC Edits', 'Revision'] };
  const GENERAL = ['Company Administrative', 'Queue Meeting', 'Existing Customer Support', 'Quoting', 'Product Development', 'Training Received', 'Training Administered', 'Sales', 'Office Field Support'];

  /* ---------- mock work orders ---------- */
  function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const r = rng(11), pick = (a) => a[Math.floor(r() * a.length)];
  const ENG = ['Sam Carter', 'Dana Whitlow', 'Marco Ruiz', 'Priya Nair', 'Tom Becker'], QCS = ['Lena Ortiz', 'Grant Hale'];
  const CUST = [['Northfield Energy', 'Oil & gas'], ['Bison Midstream', 'Compressor station'], ['Tallgrass Operating', 'Oil & gas'], ['Kestrel Resources', 'Oil & gas'], ['Red Mesa Oil & Gas', 'Oil & gas'], ['Pinyon Power', 'Power'], ['Front Range Aggregates', 'Mining']];
  const SITES = ['Coyote 12-4 Pad', 'Larkspur Compressor Station', 'Harlan 7H Pad', 'Sage Draw Pad', 'Miller Ranch 3-22', 'Antelope Booster', 'Windrow Substation', 'Dry Creek Pad', 'Juniper 18 Pad', 'Prairie Rose Facility', 'Elk Bench Quarry', 'Cottonwood 5-9 Pad'];
  const TYPES = ['NMP', 'NMP', 'NMP', 'AMB', 'AMB', 'SIG', 'SIG', 'NIA', 'CR', 'CM'];
  const SCOPE = { NMP: 'Noise mitigation plan for drilling and completions', AMB: '72-hour ambient survey', SIG: 'Signature measurement of the rig', NIA: 'Noise impact assessment for the facility', CR: 'Complaint response monitoring', CM: 'Continuous monitoring during completions' };
  const NOTES = { Urban: ['Model run finished, checking receptors', 'Starting the report draft this week', 'Next up after the Harlan job', 'Processing the second week of data'], QC: ['Sent to QC on Monday', 'Second review round'], Customer: ['Asked for the equipment list on 11/18, no reply yet', 'Customer is reviewing prelim results', 'Landowner call set for Friday'], Field: ['Monitors are out, pickup planned for 12/2', 'Crew scheduled for 12/1'], Billing: ['Report sent, invoice not out yet', 'Waiting on a PO number'], None: ['Final invoice sent'] };
  const wos = [];
  let seq = 73, seqO = 14, inv = 24817;
  function build(o) {
    const flow = WF[o.type]; let d = +TODAY - o.daysIn * DAY; o.history = [];
    for (let k = o.si; k >= 0; k--) { o.history.unshift({ si: k, date: new Date(d), by: flow[k].holder === 'QC' ? o.qc : o.eng }); d -= (1 + Math.floor(r() * 6)) * DAY; }
    delete o.daysIn; o.created = o.history[0].date; o.edits = [];
    const at = (n) => { const h = o.history.find((x) => flow[x.si].name === n); return h ? h.date : null; };
    o.deploy = at('Deployed'); const di = flow.findIndex((x) => x.name === 'Deployed'); o.pickup = o.deploy && o.si > di ? o.history.find((x) => x.si === di + 1).date : null;
    o.reportDate = at('Delivered');
    return o;
  }
  for (let i = 0; i < 36; i++) {
    const type = pick(TYPES), flow = WF[type], c = pick(CUST), deliv = flow.length - 3;
    const si = i < 2 ? deliv + 1 : i < 7 ? deliv : Math.floor(r() * deliv), holder = flow[si].holder, eng = i % 4 === 0 ? ME : pick(ENG);
    const w = build({ id: type === 'CM' ? 'EO26' + String(seqO--).padStart(3, '0') : 'E26' + String(seq--).padStart(3, '0'), rev: 0, type, cust: c[0], industry: c[1], site: pick(SITES), si, eng, qc: pick(QCS), daysIn: Math.floor(r() * r() * 27),
      due: new Date(+TODAY + Math.floor(r() * 46 - 9) * DAY), contact: pick(['R. Alvarez', 'J. Whitaker', 'M. Osei', 'C. Lindqvist']), phase: c[1] === 'Oil & gas' ? [pick(PHASES.slice(0, 3))] : ['N/A'], scope: SCOPE[type],
      hours: Math.round(r() * 90) / 2, holds: [], invoices: [], billingComment: '', comments: [] });
    w.comments.push({ by: holder === 'QC' ? w.qc : eng, date: new Date(+TODAY - Math.min(between(w.history[w.history.length - 1].date, TODAY), 3) * DAY), text: pick(NOTES[holder]) });
    if (i === 12 || i === 21 || i === 30) w.holds.push({ reason: HOLD_REASONS[i % 3], start: new Date(+TODAY - 5 * DAY), end: null });
    if ('AMB CM CR'.includes(type)) { w.monitors = 2 + Math.floor(r() * 4); if (type !== 'CM') w.studyLen = pick(['72 hours', '7 days', '14 days']); }
    if ('AMB CM CR SIG'.includes(type)) w.planned = new Date(+w.created + 12 * DAY);
    if (type === 'NMP' || type === 'NIA') { w.ambNeeded = r() < 0.55; w.infoDate = si >= 5 ? w.history[4].date : null; }
    if (holder === 'Billing' && r() < 0.5 || si > deliv) w.invoices.push({ date: new Date(+TODAY - 2 * DAY), no: String(inv++) });
    if (holder === 'Billing' && r() < 0.4) w.billingComment = 'Waiting on a PO number';
    wos.push(w);
  }
  const ambs = wos.filter((w) => w.type === 'AMB');
  wos.filter((w) => w.ambNeeded).forEach((w, i) => { if (i % 3) w.ambWO = ambs[i % ambs.length].id; });
  const closed = wos[3];
  wos.push(build({ ...closed, rev: 2, parent: closed.id, si: 3, eng: ME, daysIn: 2, due: new Date(+TODAY + 9 * DAY), hours: 3.5, holds: [], invoices: [], billingComment: '', comments: [{ by: ME, date: new Date(+TODAY - 2 * DAY), text: 'Customer added a second rig to the pad; remodel requested' }] }));
  wos.forEach((w) => (w.key = w.id + (w.rev ? '-R' + w.rev : '')));

  const st = (w) => WF[w.type][w.si], done = (w) => st(w).kind === 'Done', hold = (w) => w.holds.find((h) => !h.end);
  const daysIn = (w) => between(w.history[w.history.length - 1].date, TODAY);
  const who = (w) => ({ Urban: w.eng, QC: w.qc, Customer: w.cust, Field: 'Field crew', Billing: 'Billing', None: '' }[st(w).holder]);
  const yourMove = (w) => !hold(w) && ((st(w).holder === 'Urban' && w.eng === ME) || (st(w).holder === 'QC' && w.qc === ME));
  const late = (w) => !done(w) && st(w).holder !== 'Billing' && w.due < TODAY;
  const byKey = (k) => wos.find((w) => w.key === k), byId = (id) => wos.find((w) => w.id === id && !w.rev);
  const label = (w) => w.id + (w.rev ? ` REV ${w.rev}` : '');
  const renumber = () => wos.filter((w) => !done(w)).sort((a, b) => (a.pri || 1e3) - (b.pri || 1e3) || a.due - b.due).forEach((w, i) => (w.pri = i + 1));
  renumber();
  /* N4: in-app flags */
  const flags = (w) => { const f = []; if (done(w)) return f;
    if (w.ambNeeded && !w.ambWO) f.push('Ambient needed, no ambient WO linked');
    if (st(w).holder === 'Customer' && daysIn(w) > 14) f.push('With the customer more than 2 weeks');
    if (late(w)) f.push('Past the client due date'); return f; };
  /* B7: five stage columns rolled up from the status */
  function stage(w, code) {
    const flow = WF[w.type], cur = st(w).stage, order = 'PFMLRD';
    if (code === 'F' && w.ambNeeded !== undefined && !flow.some((x) => x.stage === 'F')) {
      if (!w.ambNeeded) return { s: 'na' }; const a = byId(w.ambWO);
      return a ? { s: done(a) || st(a).stage === 'D' ? 'done' : 'now', h: st(a).holder, t: `Ambient ${a.id}: ${st(a).name}` } : { s: 'warn', t: 'Ambient needed, no ambient WO linked' };
    }
    if (!flow.some((x) => x.stage === code)) return { s: 'na' };
    if (st(w).name === 'Cancelled') return { s: 'todo' };
    return cur === code ? { s: 'now', h: st(w).holder, t: st(w).name } : order.indexOf(cur) > order.indexOf(code) ? { s: 'done' } : { s: 'todo' };
  }

  /* ---------- state ---------- */
  const S = { page: 'work', scope: 'mine', role: 'Engineer', q: '', type: '', holder: '', eng: '', sort: 'pri', dir: 1, sel: null, quick: '', ttab: 'week', itab: 'bottlenecks', wtab: 'details', sheet: 'one', lstat: '', fresh: null, nw: { type: 'NMP', cust: '', site: '', eng: 'Sam Carter', due: '' }, atype: 'NMP', moveDate: iso(TODAY), pending: null, err: '',
    week: 0, miss: [], te: { kind: 'wo', date: '2026-11-25', wo: '', task: '', sub: '', h: 1, oos: false, note: '', off: '' } };
  new URLSearchParams(location.hash.slice(1)).forEach((v, k) => { if (k in S) S[k] = v; });
  if (S.page === 'log') { S.sort = 'id'; S.dir = -1; }
  const ROLES = ['Engineer', 'Manager', 'Billing', 'Leadership', 'Super user'];
  const nav = () => [['work', 'Work'], ['log', 'WO Log'], ['time', 'Time']].concat(S.role === 'Manager' || S.role === 'Leadership' ? [['insights', 'Insights']] : [], S.role === 'Super user' ? [['admin', 'Admin']] : []);
  const scopes = () => [['mine', 'Assigned to me'], ['all', 'Everyone']].concat(S.role === 'Engineer' ? [] : [['bill', 'To bill']]);
  const canBill = () => S.role === 'Billing' || S.role === 'Super user';
  const val = { pri: (w) => w.pri || 999, id: (w) => w.key, type: (w) => w.type, cust: (w) => w.cust, status: (w) => w.si / WF[w.type].length, days: (w) => daysIn(w), due: (w) => +w.due, eng: (w) => w.eng, created: (w) => +w.created };
  const plainOrder = () => S.scope === 'all' && S.sort === 'pri' && S.dir === 1 && !S.q && !S.quick && !S.type && !S.holder && !S.eng;
  const soon = (w) => !done(w) && st(w).holder !== 'Billing' && between(TODAY, w.due) >= 0 && between(TODAY, w.due) <= 7;
  const QUICK = [['move', 'Your move', (w) => yourMove(w), 'g'], ['due', 'Due in 7 days', soon, 'a'], ['late', 'Past due', (w) => late(w), 'r'], ['qc', 'With QC', (w) => st(w).holder === 'QC', 'q'], ['cust', 'With the customer', (w) => st(w).holder === 'Customer', 'c'], ['hold', 'On hold', (w) => !!hold(w), 'n']];
  const list = () => { const k = QUICK.find((x) => x[0] === S.quick); return k ? base().filter(k[2]) : base(); };
  function base() {
    const q = S.q.trim().toLowerCase();
    return wos.filter((w) => {
      const s = st(w);
      if (S.scope === 'mine' ? w.eng !== ME && w.qc !== ME : S.scope === 'bill' ? s.holder !== 'Billing' : s.kind === 'Done') return false;
      if (q && !(label(w) + ' ' + w.type + ' ' + w.cust + ' ' + w.site + ' ' + s.name + ' ' + w.eng).toLowerCase().includes(q)) return false;
      return S.scope !== 'all' || ((!S.type || w.type === S.type) && (!S.holder || s.holder === S.holder) && (!S.eng || w.eng === S.eng));
    }).sort((a, b) => { const x = val[S.sort](a), y = val[S.sort](b); return (x < y ? -1 : x > y ? 1 : 0) * S.dir; });
  }

  /* ---------- building blocks ---------- */
  const seg = (items, cur, kind) => '<div class="u-seg">' + items.map(([v, l]) => `<button ${kind === 'scope' ? `data-scope="${v}"` : `data-tab="${kind}:${v}"`} aria-pressed="${v === cur}">${l}</button>`).join('') + '</div>';
  const opts = (list, cur, first) => (first ? `<option value="">${first}</option>` : '') + list.map((o) => `<option${cur === o ? ' selected' : ''}>${e(o)}</option>`).join('');
  const sel = (key, first, list) => `<select data-set="${key}" aria-label="${first}">${opts(list, S[key], first)}</select>`;
  const th = (key, text, cls) => `<th class="${cls || ''}" aria-sort="${S.sort === key ? (S.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-sort="${key}">${text}<i>${S.sort === key ? (S.dir > 0 ? '▲' : '▼') : ''}</i></button></th>`;
  const dot = (h) => `<span class="u-dot" data-h="${h}"></span>`;
  const badge = (w) => (w.rev ? `<b class="u-hold">REV ${w.rev}</b>` : '') + (hold(w) ? '<b class="u-hold">On hold</b>' : '');

  /* ---------- Work: schedule (B7, B8, N12), my work (B9), billing queue ---------- */
  const WORD = { done: 'Done', todo: 'Not started', na: 'Not part of this job', warn: 'Ambient needed, no ambient WO linked' };
  const stageCell = (w, c) => { const g = stage(w, c); return `<td class="stg"><span class="sc ${g.s}" data-h="${g.h || ''}" title="${e(g.t || WORD[g.s] || '')}">${g.s === 'done' ? '✓' : g.s === 'now' ? g.h : g.s === 'warn' ? 'No ambient' : ''}</span></td>`; };
  const dueCell = (w) => { const n = between(TODAY, w.due); return fmt(w.due) + (done(w) || st(w).holder === 'Billing' ? '' : n < 0 ? `<b class="chip red">${-n} d late</b>` : n <= 7 ? `<b class="chip amber">${n ? `in ${n} d` : 'today'}</b>` : ''); };
  const daysCell = (w) => { const n = daysIn(w); return done(w) ? '' : n >= 7 ? `<b class="chip ${n >= 14 ? 'red' : 'amber'}">${n} d</b>` : `${n} d`; };
  function row(w, drag) {
    const s = st(w), f = flags(w).filter((x) => !x.startsWith('Past')), note = w.comments[0];
    return `<tr tabindex="0" data-open="${w.key}" ${drag ? `draggable="true" data-drag="${w.key}"` : ''} class="${yourMove(w) ? 'move' : ''}">
      <td class="num mute">${drag ? '<span class="grip" aria-hidden="true">⠿</span>' : ''}${w.pri || ''}</td><td class="wo">${w.id}${w.rev ? `<b class="u-hold">REV ${w.rev}</b>` : ''}</td>
      <td class="cust"><b>${e(w.cust)}</b><span>${e(w.site)}</span></td>
      <td><span class="pill" data-h="${s.holder}">${e(s.name)}</span>${hold(w) ? '<b class="u-hold">On hold</b>' : ''}</td>
      <td class="num">${daysCell(w)}</td>
      <td><span class="tag">${w.type}</span></td><td>${e(w.eng)}</td><td>${dueCell(w)}</td>
      <td class="note">${f.length ? `<b class="flag">${e(f[0])}.</b> ` : ''}${note ? e(note.text) : ''}</td></tr>`;
  }
  function work() {
    const rows = list(), drag = plainOrder(), cols = 9;
    const head = `<tr>${th('pri', '#', 'num')}${th('id', 'WO')}${th('cust', 'Customer and site')}${th('status', 'Status')}${th('days', 'In status', 'num')}${th('type', 'Type')}${th('eng', 'Engineer')}${th('due', 'Due')}<th>Latest note</th></tr>`;
    let body;
    if (S.scope === 'bill') {
      body = `<table class="u-table work"><thead><tr>${th('id', 'WO')}${th('cust', 'Customer and site')}${th('type', 'Type')}${th('status', 'Status')}${th('days', 'Days since', 'num')}<th>Deployed</th><th>Picked up</th><th class="num">Days out</th><th>Study length</th><th>Invoices</th><th>Billing comment</th></tr></thead><tbody>
        ${rows.map((w) => `<tr tabindex="0" data-open="${w.key}"><td class="wo">${w.id}${badge(w)}</td><td class="cust"><b>${e(w.cust)}</b><span>${e(w.site)}</span></td><td>${w.type}</td><td>${e(st(w).name)}</td><td class="num ${daysIn(w) >= 14 ? 'u-late' : ''}">${daysIn(w)}</td><td>${fmt(w.deploy)}</td><td>${fmt(w.pickup)}</td><td class="num">${w.deploy && w.pickup ? between(w.deploy, w.pickup) : ''}</td><td>${e(w.studyLen || '')}</td><td>${w.invoices.map((x) => x.no).join(', ') || '<span class="mute">None yet</span>'}</td><td class="note">${e(w.billingComment)}</td></tr>`).join('')}</tbody></table>`;
    } else if (S.scope === 'mine') {
      const g = (t, l) => (l.length ? `<tr class="grp${t === 'Your move' ? ' act' : ''}"><td colspan="${cols}">${t} <span>${l.length}</span></td></tr>` + l.map((w) => row(w)).join('') : '');
      body = `<table class="u-table work"><thead>${head}</thead><tbody>${g('Your move', rows.filter(yourMove))}${g('Waiting on someone else', rows.filter((w) => !yourMove(w) && !done(w)))}${g('Done', rows.filter(done))}</tbody></table>`;
    } else body = `<table class="u-table work"><thead>${head}</thead><tbody>${rows.map((w) => row(w, drag)).join('')}</tbody></table>`;
    return `<div class="top"><h1>Work</h1>${seg(scopes(), S.scope, 'scope')}${S.scope === 'all' ? sel('type', 'Any type', Object.keys(WF)) + sel('holder', 'Held by anyone', HOLDERS) + sel('eng', 'Any engineer', ENG) : ''}
      <span class="u-spacer"></span><span class="u-sub">${rows.length} work orders${drag ? ', drag a row to change priority' : ''}</span>
      <input id="q" class="u-search" data-q type="search" placeholder="Search work orders" value="${e(S.q)}" aria-label="Search work orders">
      <button class="u-btn" data-act="export">Export</button></div>
      <div class="sheet u-scroll">${body}${rows.length ? '' : '<p class="empty">No work orders match. Clear the search or filters.</p>'}</div>`;
  }

  /* ---------- WO Log: the register. One row per WO#, in the WO Log's column order; where a WO gets its number and date (A1) ---------- */
  const ini = (n) => n.split(' ').map((x) => x[0]).join('');
  const toInvoice = (w) => st(w).holder === 'Billing' && !w.invoices.length;
  function logRows() {
    const q = S.q.trim().toLowerCase();
    return wos.filter((w) => (S.sheet === 'ong') === (w.type === 'CM') && (!S.lstat || { 'To invoice': toInvoice(w), Open: !done(w), Invoiced: w.invoices.length > 0, 'Closed or cancelled': done(w) }[S.lstat])
      && (!q || (label(w) + ' ' + w.type + ' ' + w.cust + ' ' + w.site + ' ' + w.eng + ' ' + w.invoices.map((x) => x.no).join(' ')).toLowerCase().includes(q)))
      .sort((a, b) => { const x = val[S.sort](a), y = val[S.sort](b); return (x < y ? -1 : x > y ? 1 : 0) * S.dir; });
  }
  function wolog() {
    const rows = logRows(), n = S.nw, ong = S.sheet === 'ong';
    return `<div class="top"><h1>WO Log</h1>${seg([['one', 'One-timers'], ['ong', 'Ongoing']], S.sheet, 'sheet')}${sel('lstat', 'All work orders', ['To invoice', 'Open', 'Invoiced', 'Closed or cancelled'])}
      <span class="u-spacer"></span><span class="u-sub">${rows.length} work orders, ${rows.filter(toInvoice).length} to invoice</span><input id="q" class="u-search" data-q type="search" placeholder="Search WO, customer, site, invoice" value="${e(S.q)}" aria-label="Search the WO Log"><button class="u-btn" data-act="export">Export</button></div>
      <div class="sheet pad newwo"><strong>New work order</strong>
        ${ong ? '' : fld('Type', `<select data-nw="type">${opts(Object.keys(WF).filter((t) => t !== 'CM'), n.type)}</select>`)}
        ${fld('Customer', `<input data-nw="cust" list="custs" value="${e(n.cust)}">`, 'grow')}${fld('Site', `<input data-nw="site" list="sites" value="${e(n.site)}">`, 'grow')}
        ${fld('Assigned engineer', `<select data-nw="eng">${opts(ENG, n.eng)}</select>`)}${fld('Client due date', `<input data-nw="due" type="date" value="${e(n.due)}">`)}
        <button class="u-btn primary" data-act="create">Create work order</button>
        <span class="u-sub hint">${S.err ? `<span class="u-late">${e(S.err)}</span>` : `It gets the next ${ong ? 'EO' : 'E'} number and today's date as the date assigned.`}</span></div>
      <div class="sheet u-scroll"><p class="key"><span class="sw pink"></span>Delivered, not invoiced<span class="sw green"></span>Invoiced<span class="sw red"></span>Cancelled</p><table class="u-table log"><thead><tr>${th('id', 'WO')}${th('created', 'Assigned')}${th('cust', 'Customer')}<th>Site</th>${th('type', 'Type')}${th('eng', 'Eng')}<th>QC</th><th>Phase</th><th>Description</th>${th('due', 'Due')}<th class="num">Mon.</th><th>Deployed</th><th>Picked up</th><th>Report</th>${th('status', 'Status')}<th>Inv. sent</th><th>Invoice</th><th class="num">Hours</th></tr></thead><tbody>
        ${rows.map((w) => { const s = st(w), last = w.invoices[w.invoices.length - 1];
          const pk = toInvoice(w) ? ' class="pink"' : '';
          return `<tr tabindex="0" data-open="${w.key}" class="${s.name === 'Cancelled' ? 'cx' : w.invoices.length ? 'inv' : ''}${S.fresh === w.key ? ' fresh' : ''}"><td class="wo">${w.id}${w.rev ? `<b class="u-hold">REV ${w.rev}</b>` : ''}</td><td>${fmt(w.created)}</td><td><b>${e(w.cust)}</b></td><td>${e(w.site)}</td><td>${w.type}</td><td>${ini(w.eng)}</td><td>${ini(w.qc)}</td><td>${w.phase.map((p) => (p === 'N/A' ? p : p[0])).join('/')}</td><td class="desc">${e(w.scope)}</td>
            <td class="${late(w) ? 'u-late' : ''}">${fmt(w.due)}</td><td class="num">${w.monitors || ''}</td><td>${fmt(w.deploy)}</td><td>${fmt(w.pickup)}</td><td${pk}>${fmt(w.reportDate)}</td>
            <td${pk}><span class="who">${dot(s.holder)}${e(s.name)}</span>${hold(w) ? '<b class="u-hold">On hold</b>' : ''}</td><td${pk}>${last ? fmt(last.date) : ''}</td><td${pk}>${toInvoice(w) ? 'Not invoiced' : w.invoices.map((x) => e(x.no)).join(', ')}</td><td class="num">${w.hours ? w.hours.toFixed(1) : ''}</td></tr>`; }).join('')}</tbody></table>
        ${rows.length ? '' : '<p class="empty">No work orders match. Clear the search or the filter.</p>'}</div>
      <datalist id="custs">${CUST.map((c) => `<option value="${e(c[0])}">`).join('')}</datalist><datalist id="sites">${SITES.map((x) => `<option value="${e(x)}">`).join('')}</datalist>`;
  }

  /* ---------- Work order page: record header plus sections down the left (A2, MVP Fields, B2 to B6, A6, A10, N24, E4) ---------- */
  const fld = (k, v, cls) => `<label class="f ${cls || ''}"><span>${k}</span>${v}</label>`;
  const inp = (w, key, type, extra) => `<input data-f="${key}" type="${type || 'text'}" value="${e(type === 'date' ? iso(w[key]) : w[key])}" ${extra || ''}>`;
  const ro = (v) => `<output>${v || '<span class="mute">Not yet</span>'}</output>`;
  const FLABEL = { cust: 'Customer', site: 'Site', industry: 'Industry', contact: 'Customer contact', scope: 'Scope description', due: 'Client due date', eng: 'Assigned engineer', qc: 'QC reviewer', monitors: 'Monitors required', planned: 'Planned deploy date', studyLen: 'Study length', deploy: 'Actual deploy date', pickup: 'Actual pickup date', infoDate: 'Information complete', ambNeeded: 'Ambient needed?', ambWO: 'Ambient WO', billingComment: 'Billing comment', phase: 'Phase of operation' };
  const show = (v) => (v instanceof Date ? fmt(v) : v === true ? 'Yes' : v === false ? 'No' : Array.isArray(v) ? v.join(', ') : v == null || v === '' ? '' : String(v));
  const edit = (w, what, from, to) => w.edits.push({ date: TODAY, by: ME, what, from: show(from), to: show(to) });
  function changelog(w) {
    const flow = WF[w.type];
    return w.history.map((x, i) => (i ? { date: x.entered || x.date, by: x.by, what: 'Status', from: flow[w.history[i - 1].si].name, to: flow[x.si].name + (x.back ? `, dated ${fmt(x.date)}` : '') + (x.skipped ? `, skipped ${x.skipped}` : '') } : { date: x.date, by: x.by, what: 'Work order created', from: '', to: label(w) }))
      .concat(w.edits).map((x, i) => ({ ...x, i })).sort((p, q) => q.date - p.date || q.i - p.i);
  }
  function project(w) {
    const flow = WF[w.type], s = st(w), next = flow[w.si + 1], h = hold(w), kids = wos.filter((x) => x.parent === w.id), isField = 'AMB CM CR SIG'.includes(w.type);
    const first = (i) => w.history.find((x) => x.si === i), visits = (i) => w.history.filter((x) => x.si === i).length;
    const canNext = !done(w) && next && next.name !== 'Cancelled' && (next.name !== 'Closed' || canBill());
    const pend = S.pending != null ? flow[S.pending] : null, log = changelog(w);
    const tabs = [['details', 'Details'], ['milestones', 'Milestones'], ['changelog', 'Change log', log.length]];
    const panel = {
      details: () => `<h2>Details</h2><div class="fs">
          ${fld('Customer', inp(w, 'cust', 'text', 'list="custs"'))}${fld('Site', inp(w, 'site', 'text', 'list="sites"'))}${fld('Industry', `<select data-f="industry">${opts(INDUSTRIES, w.industry)}</select>`)}${fld('Customer contact', inp(w, 'contact'))}
          ${fld('Assigned engineer', `<select data-f="eng">${opts(ENG, w.eng)}</select>`)}${fld('QC reviewer', `<select data-f="qc">${opts(QCS, w.qc)}</select>`)}${fld('Client due date', inp(w, 'due', 'date'))}${fld('Priority', ro(w.pri ? `${w.pri} of ${wos.filter((x) => !done(x)).length}` : 'None'))}
          <fieldset class="f wide"><legend>Phase of operation</legend>${PHASES.map((p) => `<label><input type="checkbox" data-phase="${p}" ${w.phase.includes(p) ? 'checked' : ''}> ${p}</label>`).join('')}</fieldset>
          ${fld('Scope description', `<textarea data-f="scope" rows="2">${e(w.scope)}</textarea>`, 'wide')}
          ${fld('Date assigned', ro(fmt(w.created)))}${w.type === 'CM' ? '' : fld('Report provided', ro(fmt(w.reportDate)))}${fld('Hours logged', ro(w.hours.toFixed(2)))}</div>
        ${w.ambNeeded !== undefined ? `<h2>Information and ambient</h2><div class="fs">
          ${fld('Information complete', `<span class="tick"><input type="checkbox" data-act="info" ${w.infoDate ? 'checked' : ''} aria-label="Information complete"><input type="date" data-f="infoDate" value="${iso(w.infoDate)}" ${w.infoDate ? '' : 'disabled'}></span>`)}
          ${fld('Ambient needed?', `<select data-f="ambNeeded">${['Yes', 'No'].map((o) => `<option${(o === 'Yes') === w.ambNeeded ? ' selected' : ''}>${o}</option>`).join('')}</select>`)}
          ${w.ambNeeded ? fld('Ambient WO', `<select data-f="ambWO"><option value="">Not linked</option>${opts(ambs.map((a) => a.id), w.ambWO)}</select>`) + (w.ambWO ? `<p class="f"><span>Ambient status</span><button class="link" data-open="${w.ambWO}">${e(st(byId(w.ambWO)).name)}</button></p>` : '<p class="f flag">Ambient needed, no ambient WO linked</p>') : ''}</div>` : ''}
        ${isField ? `<h2>Field work</h2><div class="fs">
          ${w.monitors !== undefined ? fld('Monitors required', inp(w, 'monitors', 'number', 'min="0"')) : ''}${fld(w.type === 'SIG' ? 'Planned field date' : 'Planned deploy date', inp(w, 'planned', 'date'))}${w.studyLen !== undefined ? fld('Study length', inp(w, 'studyLen')) : ''}
          ${fld('Actual deploy date', inp(w, 'deploy', 'date'))}${fld('Actual pickup date', inp(w, 'pickup', 'date'))}${fld('Days deployed', ro(w.deploy ? between(w.deploy, w.pickup || TODAY) + (w.pickup ? '' : ' so far') : ''))}</div>` : ''}
        ${kids.length || (s.stage === 'D' && !w.rev && s.name !== 'Cancelled') ? `<h2>Revisions</h2><ul class="kids">${kids.map((k) => `<li><button class="link" data-open="${k.key}">REV ${k.rev}</button><span class="who">${dot(st(k).holder)}${e(st(k).name)}</span></li>`).join('')}</ul>${s.stage === 'D' && !w.rev && s.name !== 'Cancelled' ? '<button class="u-btn" data-act="rev">Add revision</button>' : ''}` : ''}`,
      workflow: () => `
        ${done(w) ? '<div class="mv"><button class="u-btn" data-act="reopen">Reopen work order</button></div>' : `<div class="mv"><label class="f"><span>Date of the change</span><input type="date" data-set="moveDate" value="${S.moveDate}" max="${iso(TODAY)}"></label>
          <select data-act="jump" aria-label="Change status to"><option value="">Change status to</option>${flow.map((x, i) => (i === w.si || x.kind === 'Done' ? '' : `<option value="${i}">${e(x.name)}</option>`)).join('')}</select>
          <span class="u-spacer"></span>${h ? '' : `<select data-act="hold" aria-label="Put on hold"><option value="">Put on hold</option>${opts(HOLD_REASONS)}</select>`}<button class="u-btn" data-act="cancel">Cancel work order</button></div>`}
        ${pend ? `<p class="banner warn">Moving to ${e(pend.name)} skips ${S.pending - w.si - 1} ${S.pending - w.si - 1 === 1 ? 'status' : 'statuses'}. Skipped statuses get no date. <button class="u-btn primary" data-act="confirm">Move anyway</button><button class="u-btn" data-act="keep">Stay on ${e(s.name)}</button></p>` : ''}`,
      milestones: () => { const rows = flow.map((x, i) => ({ name: MILE[w.type][i], from: x.name, h: x.holder, d: first(i) && first(i).date, now: i === w.si, n: visits(i) })).filter((m) => m.name);
        if (w.ambNeeded !== undefined) rows.splice(4, 0, { name: 'Information complete', from: 'Tick on the Details tab', d: w.infoDate });
        return `<h2>Milestones</h2>${panel.workflow()}<p class="mute lead">Each status stamps a milestone the first time the job enters it.</p><div class="u-scroll"><table class="u-table"><thead><tr><th>Milestone</th><th>Date</th><th class="num">Days from request</th><th>Status</th><th>With</th></tr></thead><tbody>${rows.map((m) => `<tr class="${m.now ? 'now' : m.d ? '' : 'shut'}"><td>${e(m.name)}</td><td>${m.d ? fmt(m.d) : 'Not yet'}</td><td class="num">${m.d ? between(w.created, m.d) : ''}</td><td>${e(m.from)}${m.n > 1 ? ` <span class="mute">${m.n} visits</span>` : ''}</td><td>${m.h ? `<span class="who">${dot(m.h)}${m.h}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`; },
      comments: () => `<h2>Comments</h2><input id="cmt" class="u-input" placeholder="Add a comment and press Enter" aria-label="Add a comment"><ul class="feed">${w.comments.map((c) => `<li><b>${e(c.by)}</b><time>${fmt(c.date)}</time><p>${e(c.text)}</p></li>`).join('')}</ul>`,
      hours: () => `<h2>Hours</h2><p class="big"><strong>${w.hours.toFixed(2)}</strong> <span class="mute">hours logged</span></p><ul class="u-bars">${[['Modeling', 0.45], ['Report', 0.3], ['Project Administrative', 0.15], ['Customer Communication', 0.1]].map(([t, p]) => `<li><span>${t}</span><i><b style="width:${(p / 0.45) * 100}%"></b></i><em>${(w.hours * p).toFixed(1)}</em></li>`).join('')}</ul>`,
      billing: () => `<h2>Billing</h2>
        <table class="u-table inv"><thead><tr><th>Invoice sent</th><th>Invoice number</th></tr></thead><tbody>${w.invoices.map((x) => `<tr><td>${fmt(x.date)}</td><td>${e(x.no)}</td></tr>`).join('') || '<tr><td colspan="2" class="mute">No invoices yet</td></tr>'}</tbody></table>
        ${canBill() ? `<div class="addinv"><input id="invd" type="date" value="${iso(TODAY)}" aria-label="Invoice sent date"><input id="invn" placeholder="Invoice number" aria-label="Invoice number"><button class="u-btn" data-act="inv">Add invoice</button></div>` : ''}
        <div class="fs">${fld('Billing comment', canBill() ? `<textarea data-f="billingComment" rows="2">${e(w.billingComment)}</textarea>` : ro(e(w.billingComment) || '<span class="mute">None</span>'), 'wide')}</div>
        ${canBill() && s.holder === 'Billing' ? '<button class="u-btn primary" data-act="close">Close work order</button>' : canBill() ? '' : '<p class="mute lead">Billing adds invoices and closes the work order.</p>'}`,
      changelog: () => `<h2>Change log</h2><div class="u-scroll"><table class="u-table"><thead><tr><th>When</th><th>Who</th><th>What changed</th><th>From</th><th>To</th></tr></thead><tbody>${log.map((x) => `<tr><td>${fmt(x.date)}</td><td>${e(x.by)}</td><td>${e(x.what)}</td><td class="mute">${e(x.from)}</td><td>${e(x.to)}</td></tr>`).join('')}</tbody></table></div>`,
    };
    const back = { work: 'Work', log: 'WO Log', time: 'Time', insights: 'Insights', admin: 'Admin' }[S.page];
    return `<p class="crumb"><button data-close>${back}</button><span>${label(w)}</span></p>
    <header class="sheet rec"><div class="who-what"><p class="phid">${label(w)} <span>${w.type}</span>${w.parent ? ` <button class="link" data-open="${w.parent}">Revision of ${w.parent}</button>` : ''}</p><h1>${e(w.cust) || 'New work order'}</h1><p class="mute">${e(w.site)}</p></div>
      <div><p class="big">${dot(s.holder)}<strong>${e(s.name)}</strong></p><p class="mute">${done(w) ? `Since ${fmt(w.history[w.history.length - 1].date)}` : `With ${e(who(w))} for ${daysIn(w)} ${daysIn(w) === 1 ? 'day' : 'days'}`}</p></div>
      ${done(w) ? '' : `<label class="f stpick"><span>Change status</span><select data-act="setstatus" aria-label="Change status">${flow.map((x, i) => (x.kind === 'Done' ? '' : `<option value="${i}"${i === w.si ? ' selected' : ''}>${e(x.name)}</option>`)).join('')}</select></label>`}
      ${h ? `<p class="banner">On hold since ${fmt(h.start)}: ${e(h.reason)} <button class="u-btn" data-act="unhold">Take off hold</button></p>` : ''}</header>
    <div class="rec-body"><nav class="vtabs" aria-label="Work order sections">${tabs.map(([k, l, c]) => `<button data-tab="wtab:${k}" aria-current="${S.wtab === k ? 'page' : 'false'}">${l}${c ? `<span>${c}</span>` : ''}</button>`).join('')}</nav>
      <section class="sheet pad panel">${S.wtab === 'milestones' ? panel.milestones() : S.wtab === 'changelog' ? panel.changelog() : `<div class="dcols"><div>${panel.details()}${panel.billing()}${panel.hours()}</div><aside>${panel.comments()}</aside></div>`}</section></div>
    <datalist id="custs">${CUST.map((c) => `<option value="${e(c[0])}">`).join('')}</datalist><datalist id="sites">${SITES.map((x) => `<option value="${e(x)}">`).join('')}</datalist>`;
  }
  function move(w, i) {
    const d = parse(S.moveDate) || TODAY, flow = WF[w.type], prev = w.si, from = flow[prev].name;
    w.history.push({ si: i, date: d, by: ME, entered: TODAY, back: iso(d) !== iso(TODAY), skipped: Math.max(0, i - w.si - 1) });
    w.si = i; S.pending = null; S.moveDate = iso(TODAY);
    if (flow[i].name === 'Deployed') w.deploy = d; if (from === 'Deployed' && i > prev) w.pickup = w.pickup || d; if (flow[i].name === 'Delivered') w.reportDate = d;
    if (done(w)) w.pri = 0; renumber();
  }

  /* ---------- Time (C1 to C8, N5, N21): pick the kind of time first; each kind has its own required fields; any week can be opened ---------- */
  const mineOpen = wos.filter((w) => w.eng === ME && !done(w));
  const OFF_TYPES = ['PTO', 'Holiday', 'Sick', 'Remote'];
  const KINDS = [['wo', 'Work order'], ['gen', 'General'], ['off', 'Time off']];
  const weekStart = (off) => new Date(2026, 10, 23 + 7 * off);
  const dayName = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const T = { entries: [], status: {} };
  (function seed() {
    const tr = rng(77), wk = [['Modeling', 'Base Model'], ['Modeling', 'Equipment Model'], ['Report', 'Draft'], ['Report', 'Post QC Edits'], ['Project Administrative', 'Information Review'], ['Customer Communication', 'Information Request']];
    for (let off = -5; off <= 0; off++) {
      T.status[off] = off === 0 ? 'Draft' : off === -1 ? 'Submitted' : 'Approved';
      for (let d = 0; d < 5; d++) {
        const date = new Date(+weekStart(off) + d * DAY);
        if (off === 0 && d === 3) { T.entries.push({ date, kind: 'off', off: 'Holiday', h: 0, note: 'Thanksgiving' }); continue; }
        if (off === 0 && d > 2) continue;
        if (off === -3 && d === 4) { T.entries.push({ date, kind: 'off', off: 'PTO', h: 0, note: '' }); continue; }
        const a = mineOpen[Math.floor(tr() * 3)], b = mineOpen[Math.floor(tr() * 3)], p = wk[Math.floor(tr() * wk.length)], q = wk[Math.floor(tr() * wk.length)];
        T.entries.push({ date, kind: 'wo', wo: a.key, task: p[0], sub: p[1], h: 3 + Math.round(tr() * 8) / 4, oos: false, note: '' });
        if (!(off === 0 && d === 2)) T.entries.push({ date, kind: 'wo', wo: b.key, task: q[0], sub: q[1], h: 1.5 + Math.round(tr() * 6) / 4, oos: tr() < 0.1, note: '' });
        if (d === 0) T.entries.push({ date, kind: 'gen', task: 'Queue Meeting', h: 0.5, note: 'Weekly queue call' });
        if (tr() < 0.25) T.entries.push({ date, kind: 'gen', task: 'Training Received', h: 1, note: 'SoundPLAN session' });
      }
    }
  })();
  const team = [{ n: 'Dana Whitlow', h: 38.5, s: 'Submitted' }, { n: 'Marco Ruiz', h: 41, s: 'Submitted' }, { n: 'Priya Nair', h: 22, s: 'Draft' }, { n: 'Tom Becker', h: 0, s: 'Nothing logged' }, { n: 'Lena Ortiz', h: 36, s: 'Submitted' }, { n: 'Grant Hale', h: 40, s: 'Approved' }];
  /* what each kind of time needs before it can be added */
  const NEED = { wo: [['wo', 'work order'], ['task', 'task'], ['sub', 'sub-task'], ['h', 'hours']], gen: [['task', 'task'], ['h', 'hours'], ['note', 'comment']], off: [['off', 'type of time off']] };
  function time() {
    const mgr = S.role === 'Manager', tabs = mgr ? seg([['week', 'My week'], ['approvals', 'Approvals']], S.ttab, 'ttab') : '';
    if (mgr && S.ttab === 'approvals') return `<div class="top"><h1>Time</h1>${tabs}<span class="u-sub">Week of Nov 23</span></div><div class="sheet pad u-scroll"><table class="u-table"><thead><tr><th>Person</th><th class="num">Hours</th><th>Week</th><th></th></tr></thead><tbody>
      ${team.map((p, i) => `<tr><td>${p.n}</td><td class="num">${p.h.toFixed(2)}</td><td class="${p.s === 'Nothing logged' ? 'u-late' : ''}">${p.s}${p.why ? `: ${e(p.why)}` : ''}</td><td class="num">${p.s === 'Submitted' ? `<button class="u-btn" data-act="reject" data-i="${i}">Reject</button> <button class="u-btn primary" data-act="approve" data-i="${i}">Approve week</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    const off = +S.week || 0, ws = weekStart(off), dates = [0, 1, 2, 3, 4].map((d) => new Date(+ws + d * DAY)), f = S.te, w = byKey(f.wo);
    const inWeek = T.entries.filter((x) => x.date >= ws && x.date < new Date(+ws + 7 * DAY));
    const total = inWeek.reduce((t, x) => t + (x.h || 0), 0), avail = 40 - 8 * inWeek.filter((x) => x.kind === 'off' && x.off !== 'Remote').length;
    const status = T.status[off] || 'Draft', locked = status !== 'Draft';
    if (!dates.some((d) => iso(d) === f.date)) f.date = iso(dates.find((d) => iso(d) === iso(TODAY)) || dates[0]);
    const tasks = f.kind === 'wo' ? Object.keys(TASKS) : GENERAL, subs = TASKS[f.task] || [];
    const req = (key, label2) => `${label2} <i class="req">required</i>`, bad = (key) => (S.miss.includes(key) ? ' miss' : '');
    const days = dates.map((date) => { const l = inWeek.filter((x) => iso(x.date) === iso(date)), sum = l.reduce((t, x) => t + (x.h || 0), 0);
      return `<section class="day"><h3>${dayName(date)}${iso(date) === iso(TODAY) ? ' <span class="mute">today</span>' : ''}<em>${l.length && l.every((x) => x.kind === 'off') ? '' : sum.toFixed(2)}</em></h3>${l.length ? `<table class="u-table"><tbody>${l.map((x) => { const j = byKey(x.wo);
        return x.kind === 'off' ? `<tr class="offrow"><td><span class="tag">Time off</span></td><td colspan="3">${e(x.off)}, all day${x.note ? `<span class="mute">, ${e(x.note)}</span>` : ''}</td><td class="num mute">no hours</td></tr>`
          : `<tr><td class="wo">${j ? `<button class="link" data-open="${j.key}">${label(j)}</button>` : '<span class="tag">General</span>'}</td><td>${j ? e(j.cust) : ''}</td><td>${e(x.task)}${x.sub ? `<span class="mute">, ${e(x.sub)}</span>` : ''}${x.oos ? '<b class="u-hold">Out of scope</b>' : ''}</td><td class="mute">${e(x.note)}</td><td class="num">${x.h.toFixed(2)}</td></tr>`; }).join('')}</tbody></table>` : '<p class="mute none">Nothing logged</p>'}</section>`; }).join('');
    return `<div class="top"><h1>Time</h1>${tabs}
        <span class="wknav"><button class="u-btn" data-act="week" data-n="-1" ${off <= -5 ? 'disabled' : ''}>Previous week</button><strong>Week of ${fmt(ws)}</strong><button class="u-btn" data-act="week" data-n="1" ${off >= 1 ? 'disabled' : ''}>Next week</button>${off ? '<button class="link" data-act="week" data-n="0">Back to this week</button>' : ''}</span>
        <span class="pace" title="${total} of ${avail} hours"><b style="width:${Math.min(100, (total / Math.max(avail, 1)) * 100)}%"></b></span><span>${total.toFixed(2)} of ${avail} hours</span>
        <span class="u-spacer"></span><span class="u-sub">${status}</span>${locked ? '' : '<button class="u-btn primary" data-act="submit">Submit week</button>'}</div>
      ${locked ? `<p class="banner">This week is ${status.toLowerCase()}, so its entries are locked.</p>` : `<div class="sheet pad entry">
        <div class="u-seg kind">${KINDS.map(([k, l]) => `<button data-act="kind" data-k="${k}" aria-pressed="${f.kind === k}">${l}</button>`).join('')}</div>
        ${fld(req('date', 'Date'), `<select data-te="date">${dates.map((d) => `<option value="${iso(d)}"${f.date === iso(d) ? ' selected' : ''}>${dayName(d)}</option>`).join('')}</select>`)}
        ${f.kind === 'wo' ? fld(req('wo', 'Work order'), `<select data-te="wo"><option value="">Pick a work order</option>${wos.filter((x) => !done(x)).map((x) => `<option value="${x.key}"${f.wo === x.key ? ' selected' : ''}>${label(x)} ${e(x.cust)}, ${e(x.site)}</option>`).join('')}</select>`, 'grow' + bad('wo')) : ''}
        ${f.kind !== 'off' ? fld(req('task', 'Task'), `<select data-te="task">${opts(tasks, f.task, 'Pick a task')}</select>`, bad('task')) : fld(req('off', 'Type of time off'), `<select data-te="off">${opts(OFF_TYPES, f.off, 'Pick a type')}</select>`, bad('off'))}
        ${f.kind === 'wo' ? fld(req('sub', 'Sub-task'), `<select data-te="sub">${opts(subs, f.sub, f.task ? 'Pick a sub-task' : 'Pick a task first')}</select>`, bad('sub')) : ''}
        ${f.kind !== 'off' ? fld(req('h', 'Hours'), `<span class="hrs"><input data-te="h" type="number" min="0.25" step="0.25" value="${f.h}">${[0.5, 1, 2, 4].map((n) => `<button class="u-btn" data-act="quick" data-n="${n}">${n}</button>`).join('')}</span>`, bad('h')) : '<p class="f"><span>Hours</span><output>All day, no hours</output></p>'}
        ${fld(f.kind === 'gen' ? req('note', 'Comment') : 'Comment', `<input data-te="note" value="${e(f.note)}">`, 'grow' + bad('note'))}
        ${f.kind === 'wo' ? `<label class="chk"><input type="checkbox" data-te="oos" ${f.oos ? 'checked' : ''}> Out of scope</label>` : ''}
        <span class="btns">${f.kind === 'off' ? '' : '<button class="u-btn" data-act="copy">Copy last entry</button>'}<button class="u-btn primary" data-act="addentry">Add ${f.kind === 'off' ? 'time off' : 'entry'}</button></span>
        ${S.err ? `<p class="u-late err">${e(S.err)}</p>` : ''}</div>`}
      <div class="sheet pad">${days}</div>`;
  }

  /* ---------- Insights (Dashboards tab 6 to 10) ---------- */
  const bars = (rows, unit) => { const max = Math.max(...rows.map((x) => x[1]), 1); return '<ul class="u-bars">' + rows.map(([l, v, h]) => `<li><span>${e(l)}</span><i><b data-h="${h || ''}" style="width:${(v / max) * 100}%"></b></i><em>${v}${unit || ''}</em></li>`).join('') + '</ul>'; };
  const block = (t, b) => `<section class="u-block"><h3>${t}</h3>${b}</section>`;
  function insights() {
    const open = wos.filter((w) => !done(w)), H = {}; open.forEach((w) => (H[st(w).holder] = (H[st(w).holder] || []).concat(w)));
    const avg = (a) => Math.round(a.reduce((t, w) => t + daysIn(w), 0) / a.length);
    const body = {
      bottlenecks: () => block('Open jobs by who holds them', bars(HOLDERS.map((h) => [h, (H[h] || []).length, h]))) + block('Average days in the current status', bars(HOLDERS.map((h) => [h, H[h] ? avg(H[h]) : 0, h]), ' d')) +
        block('Longest waits', `<table class="u-table"><tbody>${open.slice().sort((a, b) => daysIn(b) - daysIn(a)).slice(0, 6).map((w) => `<tr tabindex="0" data-open="${w.key}"><td class="wo">${label(w)}</td><td>${e(w.cust)}</td><td>${e(st(w).name)}</td><td class="mute">${e(who(w))}</td><td class="num">${daysIn(w)} d</td></tr>`).join('')}</tbody></table>`),
      cycle: () => block('Request received to Delivered, median days', bars([['NIA', 41], ['NMP', 34], ['SIG', 30], ['AMB', 22], ['CM', 12], ['CR', 6]], ' d')) + block('Jobs delivered per month', bars([['Jun', 14], ['Jul', 17], ['Aug', 12], ['Sep', 19], ['Oct', 16], ['Nov', 11]])) + block('On time against the client due date', '<p class="u-fact">78% <span>of 89 jobs delivered since June</span></p>'),
      hours: () => block('Human Time per job, median hours', bars([['NMP', 33], ['NIA', 29], ['SIG', 24], ['AMB', 18], ['CR', 7], ['CM', 5]], ' h')) + block('Hours by task group', bars([['Modeling', 860], ['Report', 510], ['Field Work', 430], ['Project Administrative', 220], ['Customer Communication', 140]], ' h')) + block('Billable share of all hours', '<p class="u-fact">44% <span>this quarter</span></p>'),
      capacity: () => block('Hours this week against 40', bars([[ME, 16.75]].concat(team.slice(0, 4).map((p) => [p.n, p.h])), ' h')) + block('Open jobs per engineer', bars(ENG.map((n) => [n, open.filter((w) => w.eng === n).length]))),
      health: () => block('This week', `<table class="u-table"><tbody>${[['Weeks still in draft', 2], ['People with nothing logged', 1], ['Entries with no comment', 37], ['Jobs with no status change in 14 days', open.filter((w) => daysIn(w) >= 14).length], ['Backdated status changes', wos.reduce((t, w) => t + w.history.filter((x) => x.back).length, 3)], ['Skipped statuses', wos.reduce((t, w) => t + w.history.reduce((a, x) => a + (x.skipped || 0), 0), 4)], ['General time against a customer with an open WO', 5]].map((x) => `<tr><td>${x[0]}</td><td class="num">${x[1]}</td></tr>`).join('')}</tbody></table>`),
    };
    return `<div class="top"><h1>Insights</h1>${seg([['bottlenecks', 'Bottlenecks'], ['cycle', 'Cycle Time'], ['hours', 'Hours'], ['capacity', 'Capacity'], ['health', 'Data health']], S.itab, 'itab')}<span class="u-spacer"></span><span class="u-sub">Made-up numbers</span><button class="u-btn">Export</button></div><div class="sheet pad"><div class="u-grid">${body[S.itab]()}</div></div>`;
  }
  /* ---------- Admin (B1, E2) ---------- */
  const admin = () => `<div class="top"><h1>Admin</h1>${seg(Object.keys(WF).map((t) => [t, t]), S.atype, 'atype')}<span class="u-spacer"></span><span class="u-sub">Status list for ${S.atype}. Users, task lists, fields per type, list values and the audit log are also admin screens.</span></div>
    <div class="sheet u-scroll"><table class="u-table"><thead><tr><th class="num">Order</th><th>Status</th><th>Kind</th><th>Holder</th><th>Stage column</th></tr></thead><tbody>${WF[S.atype].map((x, i) => `<tr><td class="num mute">${i + 1}</td><td>${e(x.name)}</td><td>${x.kind}</td><td><span class="who">${dot(x.holder)}${x.holder}</span></td><td class="mute">${(STAGES.find((g) => g[0] === x.stage) || ['', 'Finish'])[1]}</td></tr>`).join('')}</tbody></table></div>`;

  /* ---------- shell: one bar across the top, so the work order page can use the left edge for its sections ---------- */
  function render() {
    const w = byKey(S.sel), a = document.activeElement, id = a && a.id, pos = id && a.selectionStart, y = window.scrollY;
    document.getElementById('app').innerHTML = `<header class="bar"><strong>Urban Engineering</strong>
      <nav aria-label="Main">${nav().map(([p, l]) => `<button data-go="${p}" aria-current="${S.page === p ? 'page' : 'false'}">${l}</button>`).join('')}</nav>
      <span class="u-spacer"></span><span class="who-am">${ME}</span><select class="u-role" data-set="role" aria-label="View the app as">${opts(ROLES, S.role)}</select></header>
      <main>${w ? project(w) : { work, log: wolog, time, insights, admin }[S.page]()}</main>`;
    const n = id && document.getElementById(id);
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} }
    window.scrollTo(0, render.last === S.sel + S.page ? y : 0); render.last = S.sel + S.page;
  }
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-go],[data-scope],[data-open],[data-sort],[data-close],[data-tab],button[data-act]');
    if (!t) return;
    const d = t.dataset, w = byKey(S.sel);
    if (d.go) { S.page = d.go; S.sel = null; S.q = ''; S.err = ''; Object.assign(S, d.go === 'log' ? { sort: 'id', dir: -1 } : { sort: 'pri', dir: 1 }); }
    else if (d.scope) S.scope = d.scope;
    else if (d.open) { S.sel = byKey(d.open) ? d.open : S.sel; S.wtab = 'details'; S.pending = null; S.moveDate = iso(TODAY); ev.stopPropagation(); }
    else if ('close' in d) S.sel = null;
    else if (d.sort) { if (S.sort === d.sort) S.dir *= -1; else { S.sort = d.sort; S.dir = 1; } }
    else if (d.tab) { const [k, v] = d.tab.split(':'); S[k] = k === 'quick' && S[k] === v ? '' : v; }
    else if (d.act === 'rownext') { const x = byKey(d.k); move(x, x.si + 1); }
    else if (d.act === 'next') move(w, w.si + 1);
    else if (d.act === 'confirm') move(w, S.pending);
    else if (d.act === 'keep') S.pending = null;
    else if (d.act === 'close') move(w, WF[w.type].length - 2);
    else if (d.act === 'cancel') { move(w, WF[w.type].length - 1); w.history[w.history.length - 1].skipped = 0; }
    else if (d.act === 'reopen') { const prev = w.history[w.history.length - 2]; move(w, prev ? prev.si : 0); w.history[w.history.length - 1].skipped = 0; }
    else if (d.act === 'unhold') { edit(w, 'On hold', hold(w).reason, 'Off hold'); hold(w).end = TODAY; }
    else if (d.act === 'rev') { const n = wos.filter((x) => x.parent === w.id).length + 2; const k = { ...w, rev: n, parent: w.id, key: `${w.id}-R${n}`, si: 0, history: [{ si: 0, date: TODAY, by: ME }], created: TODAY, hours: 0, holds: [], invoices: [], edits: [], billingComment: '', comments: [], reportDate: null, pri: 0 }; wos.push(k); if (st(w).name === 'Closed') move(w, WF[w.type].length - 3); renumber(); S.sel = k.key; }
    else if (d.act === 'inv') { const n = document.getElementById('invn').value.trim(); if (n) { w.invoices.push({ date: parse(document.getElementById('invd').value) || TODAY, no: n }); edit(w, 'Invoice added', '', n); } }
    else if (d.act === 'create') { const n = S.nw, cm = S.sheet === 'ong', type = cm ? 'CM' : n.type;
      S.err = n.cust.trim() && n.site.trim() ? '' : 'Enter the customer and the site.';
      if (!S.err) { const id = (cm ? 'EO26' : 'E26') + String(Math.max(...wos.filter((x) => (x.type === 'CM') === cm).map((x) => +x.id.slice(cm ? 4 : 3))) + 1).padStart(3, '0');
        const k = { id, key: id, rev: 0, type, cust: n.cust.trim(), industry: (CUST.find((c) => c[0] === n.cust.trim()) || [0, INDUSTRIES[0]])[1], site: n.site.trim(), si: 0, eng: n.eng, qc: QCS[0], due: parse(n.due) || new Date(+TODAY + 30 * DAY), contact: '', phase: [], scope: '', hours: 0, holds: [], invoices: [], edits: [], billingComment: '', comments: [], history: [{ si: 0, date: TODAY, by: ME }], created: TODAY };
        if (type === 'NMP' || type === 'NIA') { k.ambNeeded = false; k.infoDate = null; } if ('AMB CM CR'.includes(type)) k.monitors = 0; if (type === 'AMB' || type === 'CR') k.studyLen = '';
        wos.push(k); renumber(); S.fresh = id; S.nw = { ...n, cust: '', site: '', due: '' }; Object.assign(S, { sort: 'id', dir: -1, lstat: '', q: '' }); } }
    else if (d.act === 'export') { const csv = ['WO,Type,Customer,Site,Status,Holder,Days in status,Due,Engineer'].concat((S.page === 'log' ? logRows() : list()).map((x) => [label(x), x.type, x.cust, x.site, st(x).name, st(x).holder, daysIn(x), iso(x.due), x.eng].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))).join('\n'); const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); l.download = 'work-orders.csv'; l.click(); }
    else if (d.act === 'submit') T.status[+S.week || 0] = 'Submitted';
    else if (d.act === 'approve') team[+d.i].s = 'Approved';
    else if (d.act === 'reject') { const why = prompt('Reason for rejecting this week'); if (why) { team[+d.i].s = 'Rejected'; team[+d.i].why = why; } }
    else if (d.act === 'week') { S.week = +d.n === 0 ? 0 : Math.max(-5, Math.min(1, (+S.week || 0) + +d.n)); S.err = ''; S.miss = []; }
    else if (d.act === 'kind') { Object.assign(S.te, { kind: d.k, wo: '', task: '', sub: '', off: '', oos: false }); S.err = ''; S.miss = []; }
    else if (d.act === 'quick') S.te.h = +d.n;
    else if (d.act === 'copy') { const l = T.entries.filter((x) => x.kind === S.te.kind).pop(); if (l) Object.assign(S.te, { wo: l.wo || '', task: l.task, sub: l.sub || '', h: l.h, oos: !!l.oos, note: l.note || '' }); }
    else if (d.act === 'addentry') { const f = S.te, need = NEED[f.kind].filter(([k]) => (k === 'h' ? !(f.h > 0) : !String(f[k] || '').trim()));
      S.miss = need.map((x) => x[0]); S.err = need.length ? 'Still needed: ' + need.map((x) => x[1]).join(', ') + '.' : '';
      if (!need.length) { T.entries.push(f.kind === 'off' ? { date: parse(f.date), kind: 'off', off: f.off, h: 0, note: f.note } : { date: parse(f.date), kind: f.kind, wo: f.kind === 'wo' ? f.wo : '', task: f.task, sub: f.kind === 'wo' ? f.sub : '', h: Math.round(f.h * 4) / 4, oos: f.kind === 'wo' && f.oos, note: f.note });
        S.te = { ...f, task: '', sub: '', note: '', oos: false, off: '', h: 1 }; } }
    render();
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target, d = t.dataset, w = byKey(S.sel);
    if (d.set) { S[d.set] = t.value; if (d.set === 'role') { if (!nav().some((n) => n[0] === S.page)) S.page = 'work'; if (!scopes().some((n) => n[0] === S.scope)) S.scope = 'mine'; if (S.role === 'Billing') S.scope = 'bill'; } }
    else if (d.act === 'setstatus') move(w, +t.value);
    else if (d.act === 'jump' && t.value !== '') { const i = +t.value; if (i > w.si + 1) S.pending = i; else move(w, i); }
    else if (d.act === 'hold' && t.value) { w.holds.push({ reason: t.value, start: TODAY, end: null }); edit(w, 'On hold', '', t.value); }
    else if (d.act === 'info') { edit(w, FLABEL.infoDate, w.infoDate, t.checked ? TODAY : null); w.infoDate = t.checked ? TODAY : null; }
    else if (d.phase) { const was = w.phase; w.phase = t.checked ? w.phase.concat(d.phase) : w.phase.filter((p) => p !== d.phase); edit(w, FLABEL.phase, was, w.phase); }
    else if (d.f) { const v = t.type === 'date' ? parse(t.value) : t.type === 'number' ? +t.value : d.f === 'ambNeeded' ? t.value === 'Yes' : t.value; edit(w, FLABEL[d.f] || d.f, w[d.f], v); w[d.f] = v; }
    else if (d.nw) S.nw[d.nw] = t.value;
    else if (d.te) { S.te[d.te] = t.type === 'checkbox' ? t.checked : d.te === 'h' ? +t.value : t.value; if (d.te === 'task') S.te.sub = ''; S.miss = S.miss.filter((k) => k !== d.te); if (!S.miss.length) S.err = ''; }
    else return;
    if (/^(INPUT|TEXTAREA)$/.test(t.tagName) && t.type !== 'checkbox') return;
    render();
  });
  document.addEventListener('input', (ev) => { if ('q' in ev.target.dataset) { S.q = ev.target.value; render(); } });
  document.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if (ev.key === 'Enter' && t.id === 'cmt' && t.value.trim()) { byKey(S.sel).comments.unshift({ by: ME, date: TODAY, text: t.value.trim() }); render(); }
    else if (ev.key === 'Enter' && t.dataset.open && t.tagName === 'TR') { S.sel = t.dataset.open; render(); }
  });
  /* B8: drag a row to set priority */
  let dragKey = null;
  document.addEventListener('dragstart', (ev) => { const t = ev.target.closest && ev.target.closest('[data-drag]'); if (t) { dragKey = t.dataset.drag; ev.dataTransfer.effectAllowed = 'move'; } });
  document.addEventListener('dragover', (ev) => { if (dragKey && ev.target.closest('[data-drag]')) ev.preventDefault(); });
  document.addEventListener('drop', (ev) => { const t = ev.target.closest('[data-drag]'); if (!dragKey || !t) return; ev.preventDefault();
    const a = byKey(dragKey), b = byKey(t.dataset.drag); dragKey = null; if (a === b) return; a.pri = b.pri - 0.5; renumber(); render(); });
  window.APP = { wos, S, list, st, flags, render };
  if (typeof document.getElementById === 'function') render();
})();
