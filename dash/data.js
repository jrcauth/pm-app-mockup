/* Mock data for the dashboard catalog: window.D.
   Everything here is invented: people, customers, sites, work orders, hours, invoice numbers.
   Seeded, so every load gives the same data. "Today" is 2026-11-25.
   Workflow definitions (status | kind | holder | stage, milestones) are copied from ../a-app.js. */
(function () {
  'use strict';
  const DAY = 864e5;
  const TODAY = new Date(2026, 10, 25);
  const ENTRIES_START = new Date(2026, 3, 1);
  const ME = 'Sam Carter';

  /* ---------- seeded random ---------- */
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const r = mulberry(530573);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const chance = (p) => r() < p;
  function wpick(pairs) { let t = 0; for (const p of pairs) t += p[1]; let x = r() * t; for (const p of pairs) { x -= p[1]; if (x < 0) return p[0]; } return pairs[pairs.length - 1][0]; }
  function gauss() { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const logn = (med, s) => med * Math.exp(s * gauss());
  const q4 = (h) => Math.round(h * 4) / 4;

  /* ---------- dates ---------- */
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dn = (d) => Math.floor((+d - d.getTimezoneOffset() * 60000) / DAY);
  const between = (a, b) => (a && b ? dn(b) - dn(a) : null);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
  const weekStart = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const quarterKey = (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (d, year) => (d ? `${MON[d.getMonth()]} ${d.getDate()}${year || (year !== false && d.getFullYear() !== TODAY.getFullYear()) ? ', ' + d.getFullYear() : ''}` : '');
  const atTime = (d, h, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m || 0);
  const nextWorkday = (d, n) => { let x = d, k = 0; while (k < n) { x = addDays(x, 1); if (!isWeekend(x)) k++; } return x; };

  /* ---------- workflows (copied from ../a-app.js) ---------- */
  const LOC = 'Request Received|Queue|Urban|P;Selecting Locations|Work|Urban|P;Waiting for Locations QC|Queue|QC|P;In Locations QC|Review|QC|P;Waiting on Customer Approval|Customer|Customer|P;Waiting on Surface Permission|Customer|Customer|P;Scheduled|Field|Field|F;Deployed|Field|Field|F;';
  const PROC = 'Waiting for Processing|Queue|Urban|F;Processing|Work|Urban|F;Waiting for Processing QC|Queue|QC|F;In Processing QC|Review|QC|F;Processing Edits|Work|Urban|F;';
  const REP = 'Ready for Report|Queue|Urban|R;Writing Report|Work|Urban|R;Waiting for Report QC|Queue|QC|R;In Report QC|Review|QC|R;Report Edits|Work|Urban|R;Delivered|Queue|Billing|D;';
  const MOD = 'Request Received|Queue|Urban|P;Info Review|Work|Urban|P;Waiting on Customer: Info|Customer|Customer|P;Ready for Modeling|Queue|Urban|M;Modeling|Work|Urban|M;Waiting for Model QC|Queue|QC|M;In Model QC|Review|QC|M;Model Edits|Work|Urban|M;Waiting for Prelim QC|Queue|QC|L;In Prelim QC|Review|QC|L;Waiting on Customer: Prelim Approval|Customer|Customer|L;';
  const SIGF = 'Request Received|Queue|Urban|P;Arranging Site & Timing|Customer|Customer|P;Scheduled|Field|Field|F;Waiting for Data Processing|Queue|Urban|F;SWL Processing|Work|Urban|F;Ready for Calibration Model|Queue|Urban|M;Calibration Model|Work|Urban|M;Waiting for Calibration QC|Queue|QC|M;In Calibration QC|Review|QC|M;Calibration Edits|Work|Urban|M;Ready for Generic Model|Queue|Urban|M;Generic Model|Work|Urban|M;Waiting for Generic Model QC|Queue|QC|M;In Generic Model QC|Review|QC|M;Generic Model Edits|Work|Urban|M;';
  const LOCM = ['Request received', 'Propose locations start', 'Locations ready for QC', 'Locations QC start', 'Locations sent to customer', 'Locations approved by customer', 'Locations approved and scheduled', 'Monitors deployed', 'Monitors picked up'];
  const PROCM = ['Data processing started', 'Data processing ready for QC', 'Data processing QC start', 'Data processing checked', 'Data processing edits complete'];
  const REPM = ['Report started', 'Report ready for QC', 'Report QC start', 'Report reviewed', 'Report sent to customer'];
  const MODM = ['Request received', 'Information review start', 'Information request sent', 'Prelim info received', 'Modeling started', 'Model ready for QC', 'Model QC start', 'Model reviewed', 'Preliminary results ready for QC', 'Preliminary results QC start', 'Preliminary results sent to customer', 'Preliminary results approved'];
  const SIGM = ['Request received', 'Site and timing request sent', 'Location approved & scheduled', 'Equipment measured', 'Data processing started', 'SWL processing complete', 'Calibration model started', 'Calibration model ready for QC', 'Calibration QC start', 'Calibration model checked', 'Calibration edits complete', 'Generic model started', 'Generic model ready for QC', 'Generic model QC start', 'Generic model checked', 'Generic model edits complete'];
  const MILE = { AMB: LOCM.concat(PROCM, REPM), NMP: MODM.concat(REPM), NIA: MODM.concat(REPM), SIG: SIGM.concat(REPM), CM: LOCM, CR: LOCM.concat(PROCM, REPM) };
  const LOOP_OF = (n) => (/Locations QC/.test(n) ? 'Locations' : /Processing QC|Processing Edits/.test(n) ? 'Data' : /Prelim QC/.test(n) ? 'Prelim' : /Model QC|Model Edits|Calibration QC|Calibration Edits|Generic Model QC|Generic Model Edits/.test(n) ? 'Model' : /Report QC|Report Edits/.test(n) ? 'Report' : null);
  function wf(s, type) {
    return (s + 'Closed|Done|None|D;Cancelled|Done|None|D').split(';').map((x, i) => {
      const [name, kind, holder, stage] = x.split('|');
      return Object.freeze({ name, kind, holder, stage, milestone: MILE[type][i] || null, loop: LOOP_OF(name) });
    });
  }
  const WF = { AMB: wf(LOC + PROC + REP, 'AMB'), NMP: wf(MOD + REP, 'NMP'), NIA: wf(MOD + REP, 'NIA'), SIG: wf(SIGF + REP, 'SIG'), CM: wf(LOC + 'Picked Up|Queue|Billing|D;', 'CM'), CR: wf(LOC + PROC + REP, 'CR') };
  const TYPES = ['NMP', 'AMB', 'SIG', 'NIA', 'CR', 'CM'];
  const STAGES = [['P', 'Prelim'], ['F', 'Field'], ['M', 'Model'], ['L', 'Prelim results'], ['R', 'Report']];
  const HOLDERS = ['Urban', 'QC', 'Customer', 'Field', 'Billing'];
  const KINDS = ['Queue', 'Work', 'Review', 'Customer', 'Field'];
  const QC_LOOPS = ['Locations', 'Data', 'Model', 'Prelim', 'Report'];
  const HOLD_REASONS = ['Waiting on customer', 'Waiting on another WO (AMB/SIG)', 'Equipment not on site', 'Priority', 'Other'];
  const CANCEL_REASONS = ['Customer cancelled the project', 'Duplicate WO', 'Scope moved to another WO', 'Permit not granted', 'Customer went with another firm'];
  const INDUSTRIES = ['Oil & gas', 'Compressor station', 'Data center', 'Power', 'Mining'];
  const PHASES = ['Drilling', 'Completion', 'Production', 'N/A'];
  const idx = (type, name) => WF[type].findIndex((x) => x.name === name);

  /* Tasks and sub-tasks per WO type (context/02-context-pack/seed/tasks.csv; Field Work added for CR, which deploys monitors). */
  const TASKS = {
    NMP: { 'Customer Communication': ['Communications', 'Information Request', 'Preliminary Results', 'Project Kickoff'], Modeling: ['Base Model', 'Equipment Model', 'Mitigation Specification', 'Post QC Edits', 'Model QC'], 'Project Administrative': ['Job Setup', 'Information Review', 'Internal Job Kickoff'], Report: ['Draft', 'Post QC Edits', 'Revision', 'Report QC'] },
    AMB: { 'Field Work': ['Field Prep', 'Field Time'], 'Customer Communication': ['Communications', 'Project Kickoff'], 'Data Processing': ['Audio File Processing', 'Post QC Edits', 'Data Processing QC'], 'Project Administrative': ['Job Setup', 'Information Review', 'Internal Job Kickoff', 'Monitor Location Selection'], Report: ['Draft', 'Post QC Edits', 'Revision', 'Report QC'] },
    CM: { 'Field Work': ['Field Prep', 'Field Time'], 'Customer Communication': ['Communications', 'Information Request', 'Project Kickoff'], 'Data Processing': ['Audio File Processing', 'Post QC Edits', 'Data Processing QC'], 'Project Administrative': ['Job Setup', 'Information Review', 'Internal Job Kickoff', 'Monitor Location Selection'] },
    SIG: { 'Field Work': ['Field Prep', 'Field Time'], Modeling: ['Calibration Model', 'Generic Model', 'Post QC Edits', 'Model QC'], 'Customer Communication': ['Communications', 'Information Request', 'Project Kickoff'], 'Data Processing': ['PIX4D', 'Fulcrum', 'SWL Derivations'], 'Project Administrative': ['Job Setup', 'Information Review', 'Internal Job Kickoff'], Report: ['Draft', 'Post QC Edits', 'Report QC'] },
  };
  TASKS.NIA = TASKS.NMP;
  TASKS.CR = { 'Field Work': ['Field Prep', 'Field Time'], 'Customer Communication': ['Communications', 'Information Request', 'Project Kickoff'], 'Data Processing': ['Audio File Processing', 'Post QC Edits', 'Data Processing QC'], 'Project Administrative': ['Job Setup', 'Information Review', 'Internal Job Kickoff', 'Monitor Location Selection'], Report: ['Draft', 'Post QC Edits', 'Revision', 'Report QC'] };
  /* General tasks (seed/general_tasks_in_use.csv, trimmed) and classes (seed/general_classes_in_use.csv). */
  const GENERAL = { 'Company Administrative': ['Team Meetings', 'Office Tasks', 'Time Tracker', 'IT'], 'Queue Meeting': [], 'Queue Management': [], 'Existing Customer Support': ['Non-billable Customer Interactions', 'Recurring Customer Meetings'], Quoting: [], 'Product Development': ['Design'], 'Training Received': [], 'Training Administered': [], Sales: ['New Sales Support', 'Lead Scoping'], 'Office Field Support': ['Supporting Field Engineering', 'Monitor Fleet Support', 'Wall Layouts for Ops'], 'Research (Outside of Eng. Job)': ['Automation', 'Regulations'], 'Business Development': ['Industry Events'], 'NPIQ Development': ['Bugs/Troubleshooting', 'Spec Building', 'Administrative'], Billing: ['Invoice Prep', 'Invoice Submittal', 'Invoice Review'], 'Human Resources': ['Onboarding'], Forecasting: [] };
  const GEN_CLASSES = ['Engineering', 'General', 'Permanent', 'NPIQ', 'Continuous Monitoring', "24'", "32'"];
  const TRAINING_CATS = ['Software', 'Field equipment', 'Safety', 'Technical', 'Onboarding'];
  const TIME_OFF_TYPES = ['PTO', 'Sick', 'Holiday', 'Unpaid'];
  const QC_SUBS = ['Model QC', 'Report QC', 'Data Processing QC'];
  /* Stage each Task rolls up to (for hours per stage). */
  const taskStage = (e) => (e.task === 'Field Work' || e.task === 'Data Processing' ? 'F' : e.task === 'Modeling' ? 'M' : e.task === 'Report' ? 'R' : e.task === 'Customer Communication' && e.sub === 'Preliminary Results' ? 'L' : e.task === 'Project Administrative' && e.sub === 'Monitor Location Selection' ? 'P' : e.wo ? 'P' : null);

  /* ---------- people ---------- */
  const P = (name, role, team, start, weeklyHours) => ({ name, role, team, start: new Date(...start.split('-').map((x, i) => (i === 1 ? x - 1 : +x))), weeklyHours });
  const people = [
    P('Sam Carter', 'Engineer', 'Engineering', '2023-02-06', 40), P('Dana Whitlow', 'Engineer', 'Engineering', '2021-08-16', 40),
    P('Marco Ruiz', 'Engineer', 'Engineering', '2022-05-02', 40), P('Priya Nair', 'Engineer', 'Engineering', '2024-01-08', 40),
    P('Tom Becker', 'Engineer', 'Engineering', '2023-09-11', 32), P('Jordan Lee', 'Engineer', 'Engineering', '2026-03-16', 40),
    P('Aisha Bello', 'Engineer', 'Engineering', '2026-07-06', 40), P('Lena Ortiz', 'QC', 'Engineering', '2020-03-02', 40),
    P('Grant Hale', 'QC', 'Engineering', '2021-01-11', 40), P('Rachel Kim', 'Manager', 'Engineering', '2019-06-03', 40),
    P('Nora Fitch', 'Billing', 'Operations', '2022-10-03', 40), P('Owen Price', 'Staff', 'Operations', '2020-09-14', 40),
    P('Ben Alvarez', 'Staff', 'Walls', '2024-04-15', 40), P('Kayla Moss', 'Staff', 'NPIQ', '2025-02-03', 40),
  ];
  const person = (n) => people.find((p) => p.name === n);
  const engineers = people.filter((p) => p.role === 'Engineer').map((p) => p.name);
  const reviewers = people.filter((p) => p.role === 'QC').map((p) => p.name);
  const MANAGER = 'Rachel Kim', BILLER = 'Nora Fitch';
  const approverOf = (n) => (n === MANAGER ? 'Owen Price' : person(n).team === 'Engineering' ? MANAGER : n === 'Owen Price' ? MANAGER : 'Owen Price');
  const ENG_W = { 'Sam Carter': 1.2, 'Dana Whitlow': 1.1, 'Marco Ruiz': 1, 'Priya Nair': 1, 'Tom Becker': 0.7, 'Jordan Lee': 1, 'Aisha Bello': 0.95, 'Lena Ortiz': 0.25, 'Grant Hale': 0.25 };
  const assignableFrom = { 'Jordan Lee': new Date(2026, 3, 20), 'Aisha Bello': new Date(2026, 7, 10) };

  /* ---------- customers and sites ---------- */
  const C = (name, industry, w, slow, oos, from, to, sites) => ({ name, industry, w, slow, oos, from: from ? new Date(from) : null, to: to ? new Date(to) : null, sites });
  const CUST = [
    C('Northfield Energy', 'Oil & gas', 10, 0.7, 0.02, null, null, ['Coyote 12-4 Pad', 'Harlan 7H Pad', 'Sage Draw Pad', 'Juniper 18 Pad']),
    C('Tallgrass Operating', 'Oil & gas', 8, 1.0, 0.03, null, null, ['Miller Ranch 3-22', 'Dry Creek Pad', 'Cottonwood 5-9 Pad']),
    C('Kestrel Resources', 'Oil & gas', 6, 1.7, 0.06, null, null, ['Hawk Ridge 2-14 Pad', 'Kestrel Federal 9 Pad']),
    C('Red Mesa Oil & Gas', 'Oil & gas', 5, 0.8, 0.01, null, null, ['Mesa Top 4 Pad', 'Arroyo 11-2 Pad']),
    C('Bison Midstream', 'Compressor station', 7, 2.7, 0.12, null, null, ['Larkspur Compressor Station', 'Antelope Booster', 'Buffalo Gap Station']),
    C('Ironclad Compression', 'Compressor station', 4, 1.2, 0.03, null, null, ['Ironclad Station 3', 'Wolf Creek Compressor']),
    C('Mesa Verde Midstream', 'Compressor station', 3, 1.0, 0.02, '2025-09-08', null, ['Verde Junction Station']),
    C('Pinyon Power', 'Power', 4, 2.0, 0.05, null, null, ['Windrow Substation', 'Pinyon Peaker Plant']),
    C('Summit Data Partners', 'Data center', 5, 1.3, 0.04, '2026-02-09', null, ['Summit DC Campus North', 'Summit DC Building 2']),
    C('Highline Data Centers', 'Data center', 4, 0.9, 0.02, '2026-06-15', null, ['Highline Quincy Campus']),
    C('Front Range Aggregates', 'Mining', 3, 1.1, 0.02, null, null, ['Elk Bench Quarry', 'Granite Gulch Pit']),
    C('Copper Ridge Mining', 'Mining', 2, 1.4, 0.02, null, '2025-10-20', ['Copper Ridge Mill']),
    C('Lone Pine Petroleum', 'Oil & gas', 3, 1.2, 0.02, null, '2025-07-30', ['Lone Pine 6-31 Pad', 'Prairie Rose Facility']),
  ];
  const custOf = (n) => CUST.find((c) => c.name === n);
  const TYPE_W = [['NMP', 34], ['AMB', 22], ['SIG', 15], ['NIA', 12], ['CR', 10], ['CM', 7]];
  const TYPE_IND = { NMP: ['Oil & gas'], CM: ['Oil & gas', 'Compressor station'], SIG: ['Oil & gas', 'Compressor station', 'Power'], NIA: ['Compressor station', 'Data center', 'Power', 'Mining'], AMB: INDUSTRIES, CR: INDUSTRIES };
  const TYPE_F = { NMP: 1, NIA: 1.15, AMB: 0.9, SIG: 1, CR: 0.55, CM: 1 };
  const LOOP_FAIL = { Locations: 0.15, Data: 0.15, Model: 0.38, Prelim: 0.2, Report: 0.3 };

  /* ---------- status durations (calendar days) ---------- */
  const WORK_DAYS = { 'Selecting Locations': [1, 4], 'Info Review': [1, 3], Modeling: [4, 11], 'Calibration Model': [3, 8], 'Generic Model': [3, 7], 'Writing Report': [2, 7], Processing: [1, 4], 'SWL Processing': [2, 5] };
  const CUST_MED = { 'Waiting on Customer: Info': 6, 'Waiting on Customer Approval': 3.5, 'Waiting on Surface Permission': 7, 'Waiting on Customer: Prelim Approval': 6, 'Arranging Site & Timing': 8 };
  function duration(s, w, ctx) {
    const f = TYPE_F[w.type] * (w.rev ? 0.6 : 1), slow = custOf(w.cust).slow;
    if (s.name === 'Request Received') return ri(0, 3);
    if (s.kind === 'Customer') return Math.max(1, logn(CUST_MED[s.name] * slow * (w.type === 'CR' ? 0.6 : 1), 0.65));
    if (s.kind === 'Review') return ri(1, s.loop === 'Model' ? 4 : 3);
    if (s.kind === 'Queue' && s.holder === 'QC') return Math.max(0, logn(2.2, 0.7) * Math.min(1, f));
    if (s.kind === 'Queue') return Math.max(0, logn(s.name === 'Ready for Modeling' ? 4 : 2.5, 0.65) * f);
    if (s.kind === 'Work' && s.loop) return ctx.fail ? wpick([[1, 20], [2, 30], [3, 25], [ri(4, 8), 25]]) : wpick([[1, 45], [2, 30], [3, 15], [ri(4, 7), 10]]);
    if (s.kind === 'Work') { const [a, b] = WORK_DAYS[s.name] || [1, 4]; return ri(a, b) * f; }
    return 2;
  }

  /* ---------- simulate one job's status history ---------- */
  function simulate(w, startName, start) {
    const flow = WF[w.type], slow = custOf(w.cust).slow, hist = [], passes = {}, cust = {};
    const del = flow.findIndex((x) => x.stage === 'D');
    let i = idx(w.type, startName), d = start, fail = false, guard = 0;
    hist.push({ si: i, date: d });
    const prevWork = (k) => { for (let j = k - 1; j >= 0; j--) if (flow[j].kind === 'Work') return j; return 0; };
    const prevQcQueue = (k) => { for (let j = k - 1; j >= 0; j--) if (flow[j].kind === 'Queue' && flow[j].holder === 'QC') return j; return k; };
    while (i < del && guard++ < 90) {
      const s = flow[i];
      let dur, next = i + 1, skipped = 0;
      if (s.name === 'Scheduled') {
        const lead = ri(3, 14);
        w.planned = addDays(d, lead);
        const delta = wpick([[0, 70], [ri(1, 4), 20], [-ri(1, 2), 10]]);
        dur = lead + delta;
      } else if (s.name === 'Deployed') {
        dur = w.studyLen + ri(0, 2) + (chance(0.18) ? ri(2, 6) : 0);
      } else dur = duration(s, w, { fail });
      if (s.kind === 'Review') {
        passes[s.loop] = (passes[s.loop] || 0) + 1;
        const newbie = w.eng && assignableFrom[w.eng] ? 1.5 : 1;
        fail = chance(LOOP_FAIL[s.loop] * (passes[s.loop] === 1 ? 1 : 0.35) * newbie);
        if (!(flow[i + 1].kind === 'Work' && flow[i + 1].loop === s.loop) && fail) { next = prevWork(i); fail = false; }
      } else if (s.kind === 'Work' && s.loop) {
        if (fail) next = prevQcQueue(i);
        fail = false;
      } else if (s.kind === 'Customer') {
        cust[s.name] = (cust[s.name] || 0) + 1;
        const p = s.name === 'Waiting on Customer: Info' ? 0.22 * Math.min(slow, 2.2) : s.name === 'Waiting on Customer: Prelim Approval' ? 0.18 : s.name === 'Waiting on Customer Approval' ? 0.12 : 0;
        if (cust[s.name] < 3 && chance(p)) next = s.name === 'Waiting on Customer: Info' ? idx(w.type, 'Info Review') : prevWork(i);
      }
      if (next === i + 1 && flow[next] && flow[next].name === 'Waiting on Surface Permission' && chance(0.35)) { next++; skipped = 1; }
      else if (next === i + 1 && flow[next] && flow[next].kind === 'Queue' && flow[next].holder === 'Urban' && flow[next].stage !== 'D' && chance(0.015)) { next++; skipped = 1; }
      d = addDays(d, Math.max(0, Math.round(dur)));
      if (d > TODAY) break;
      hist.push({ si: next, date: d, skipped });
      i = next;
    }
    return hist;
  }

  /* ---------- generate work orders ---------- */
  const wos = [];
  const pickEng = (d) => wpick(Object.keys(ENG_W).filter((n) => (!assignableFrom[n] || d >= assignableFrom[n])).map((n) => [n, ENG_W[n]]));
  const MONTH_F = {};
  function assignDate(created) {
    const mk = monthKey(created); if (!(mk in MONTH_F)) MONTH_F[mk] = 0.4 + r() * 2.2;
    let d = addDays(created, Math.min(10, Math.max(0, Math.round(logn(1.2 * MONTH_F[mk], 0.75)))));
    while (isWeekend(d)) d = addDays(d, 1);
    return d > TODAY ? TODAY : d;
  }
  const pickQc = (eng) => wpick([['Lena Ortiz', 0.45], ['Grant Hale', 0.45], ['Dana Whitlow', 0.1]].filter((x) => x[0] !== eng));
  function makeWO(type, created, cust) {
    const c = cust || wpick(CUST.filter((x) => TYPE_IND[type].includes(x.industry) && (!x.from || created >= x.from) && (!x.to || created <= x.to)).map((x) => [x, x.w]));
    const eng = pickEng(created);
    const w = { id: '', key: '', type, cust: c.name, industry: c.industry, site: pick(c.sites), eng, qc: pickQc(eng), created, assignedAt: assignDate(created), due: null,
      phase: c.industry === 'Oil & gas' ? (type === 'NMP' ? wpick([[['Drilling'], 3], [['Completion'], 3], [['Drilling', 'Completion'], 4]]) : [pick(['Drilling', 'Completion', 'Production'])]) : ['N/A'],
      monitors: null, studyLen: null, planned: null, deploy: null, pickup: null, si: 0, history: [], holds: [], invoices: [], billingComment: '', rev: 0, parent: null, cancelReason: null,
      ambNeeded: null, ambWO: null, infoDate: null, pri: null, comments: [], budget: null };
    if (type === 'AMB') { w.monitors = wpick([[1, 1], [2, 4], [3, 5], [4, 4], [5, 2], [6, 2], [7, 1], [8, 1]]); w.studyLen = wpick([[3, 5], [7, 3], [14, 1]]); }
    if (type === 'CR') { w.monitors = wpick([[1, 3], [2, 4], [3, 2]]); w.studyLen = wpick([[3, 3], [7, 1]]); }
    if (type === 'CM') { w.monitors = ri(2, 6); w.studyLen = ri(30, 100); }
    if (type === 'NMP' || type === 'NIA') w.ambNeeded = chance(0.5);
    return w;
  }
  // intake: Dec 2024 to Nov 2026, growing, with a spring and summer peak
  for (let m = 0; m < 24; m++) {
    const first = new Date(2024, 11 + m, 1), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const base = 5.6 + (9.6 * m) / 23, season = 1 + 0.22 * Math.sin((2 * Math.PI * (first.getMonth() - 2)) / 12);
    let n = Math.max(3, Math.round(base * season + gauss() * 1.3));
    if (m === 23) n = Math.round((n * 25) / 30);
    for (let k = 0; k < n; k++) {
      let created = new Date(first.getFullYear(), first.getMonth(), ri(1, m === 23 ? 25 : dim));
      if (isWeekend(created) && chance(0.85)) created = addDays(created, created.getDay() === 6 ? 2 : 1);
      if (created > TODAY) created = TODAY;
      wos.push(makeWO(wpick(TYPE_W), created));
    }
  }
  // three fresh requests: two from the last two days (no engineer yet) and one sitting at Request Received for a week
  [[TODAY, 'NMP'], [addDays(TODAY, -1), 'AMB'], [addDays(TODAY, -7), 'NIA']].forEach(([d, t], k) => { const w = makeWO(t, d); w._fresh = k < 2 ? 'unassigned' : 'stale'; wos.push(w); });
  wos.sort((a, b) => a.created - b.created);
  // one near-duplicate open WO (same customer, site and type within 30 days) for Data health
  {
    const base = wos.filter((w) => w.type === 'AMB' && between(w.created, TODAY) < 40 && between(w.created, TODAY) > 12)[0];
    if (base) { const dup = makeWO('AMB', addDays(base.created, 6), custOf(base.cust)); dup.site = base.site; wos.push(dup); wos.sort((a, b) => a.created - b.created); }
  }

  for (const w of wos) {
    w.history = w._fresh ? [{ si: 0, date: w.created }] : simulate(w, 'Request Received', w.created);
    w.si = w.history[w.history.length - 1].si;
  }

  /* holds: some jobs had a hold period; later statuses shift by its length */
  for (const w of wos) {
    if (!chance(0.09) || w.history.length < 3) continue;
    const flow = WF[w.type], cands = w.history.map((h, k) => k).filter((k) => k > 0 && flow[w.history[k].si].stage !== 'D' && flow[w.history[k].si].kind !== 'Field');
    if (!cands.length) continue;
    const k = pick(cands), start = addDays(w.history[k].date, ri(0, 2)), len = ri(5, 28), reason = wpick([[HOLD_REASONS[0], 4], [HOLD_REASONS[1], 2], [HOLD_REASONS[2], 1], [HOLD_REASONS[3], 2], [HOLD_REASONS[4], 1]]);
    if (start > TODAY) continue;
    for (let j = k + 1; j < w.history.length; j++) w.history[j].date = addDays(w.history[j].date, len);
    if (w.planned && w.history.slice(k + 1).some((h) => flow[h.si].name === 'Deployed' || flow[h.si].name === 'Waiting for Data Processing')) w.planned = addDays(w.planned, len);
    w.history = w.history.filter((h) => h.date <= TODAY);
    w.si = w.history[w.history.length - 1].si;
    const end = addDays(start, len);
    w.holds.push({ reason, start, end: end > TODAY ? null : end });
  }

  /* cancellations */
  {
    const recent = wos.filter((w) => w.created >= new Date(2026, 4, 1) && w.created <= new Date(2026, 9, 20) && w.history.length >= 4);
    const older = wos.filter((w) => w.created >= new Date(2025, 2, 1) && w.created < new Date(2026, 1, 1) && w.history.length >= 4);
    const chosen = [];
    for (let k = 0; k < 3; k++) chosen.push(recent.splice(Math.floor(r() * recent.length), 1)[0], older.splice(Math.floor(r() * older.length), 1)[0]);
    for (const w of chosen.filter(Boolean)) {
      const flow = WF[w.type], cut = ri(1, Math.min(w.history.length - 1, 7));
      w.history = w.history.slice(0, cut + 1);
      const d = addDays(w.history[cut].date, ri(1, 9));
      w.history.push({ si: idx(w.type, 'Cancelled'), date: d > TODAY ? TODAY : d });
      w.si = idx(w.type, 'Cancelled'); w.cancelReason = pick(CANCEL_REASONS);
      w.holds = w.holds.filter((h) => h.start < d).map((h) => (h.end && h.end <= d ? h : { ...h, end: d > TODAY ? TODAY : d }));
      if (!flow.slice(0, cut + 1).some((x) => x.name === 'Scheduled')) w.planned = null;
    }
  }

  /* revisions: a later record for the same WO#, starting at the rework status */
  const delIdx = (w) => WF[w.type].findIndex((x) => x.stage === 'D');
  const deliveredDate = (w) => { const k = delIdx(w); const h = w.history.find((x) => x.si === k); return h ? h.date : null; };
  {
    const ok = (w) => w.type !== 'CM' && deliveredDate(w) && deliveredDate(w) >= new Date(2025, 5, 1);
    const older = wos.filter((w) => ok(w) && deliveredDate(w) < new Date(2026, 7, 1)), recent = wos.filter((w) => ok(w) && deliveredDate(w) >= new Date(2026, 7, 1) && deliveredDate(w) <= new Date(2026, 10, 10));
    const revs = [];
    for (let k = 0; k < 9; k++) {
      const parents = k < 5 ? older : recent; if (!parents.length) continue;
      const p = parents.splice(Math.floor(r() * parents.length), 1)[0];
      let made = makeRev(p, 2);
      if (made) revs.push(made);
      if (made && k === 0 && deliveredDate(made)) { const r3 = makeRev(made, 3, p); if (r3) revs.push(r3); }
    }
    wos.push(...revs);
  }
  function makeRev(p, n, root) {
    const parentDel = deliveredDate(p), created = addDays(parentDel, Math.max(2, Math.round(logn(root ? 12 : 20, 0.8))));
    if (created > addDays(TODAY, -1)) return null;
    const w = { ...p, rev: n, parent: (root || p).id || null, _parent: root || p, created, assignedAt: created, holds: [], invoices: [], comments: [], billingComment: '', cancelReason: null, history: [], planned: null, deploy: null, pickup: null, pri: null, ambWO: null, ambNeeded: null, infoDate: null };
    w.history = simulate(w, w.type === 'NMP' || w.type === 'NIA' ? 'Modeling' : 'Writing Report', created);
    w.si = w.history[w.history.length - 1].si;
    return w;
  }

  /* IDs: E + yy + seq (one-timers), EO + yy + seq (ongoing CM). Revisions share the parent's number. */
  {
    const seq = {};
    for (const w of wos.filter((x) => !x.rev).sort((a, b) => a.created - b.created)) {
      const yy = String(w.created.getFullYear()).slice(2), pre = w.type === 'CM' ? 'EO' : 'E';
      seq[pre + yy] = (seq[pre + yy] || 0) + 1;
      w.id = pre + yy + String(seq[pre + yy]).padStart(3, '0');
    }
    for (const w of wos.filter((x) => x.rev)) { w.id = w._parent.id; w.parent = w._parent.id; delete w._parent; }
    for (const w of wos) w.key = w.id + (w.rev ? '-R' + w.rev : '');
  }
  wos.sort((a, b) => a.created - b.created || (a.key < b.key ? -1 : 1));

  /* who made each status change, when it was entered (backdating), field dates */
  for (const w of wos) {
    const flow = WF[w.type];
    w.history.forEach((h, k) => {
      const prev = k ? flow[w.history[k - 1].si] : null, s = flow[h.si];
      h.by = !k ? (w.rev ? w.eng : MANAGER) : s.kind === 'Done' ? (s.name === 'Closed' ? BILLER : MANAGER) : prev.holder === 'QC' ? w.qc || MANAGER : w.eng || MANAGER;
      const lag = k ? wpick([[0, 88], [ri(1, 2), 8], [ri(3, 8), 4]]) : 0;
      h.entered = addDays(h.date, lag) > TODAY ? TODAY : addDays(h.date, lag);
      h.back = between(h.date, h.entered) > 0;
      h.skipped = h.skipped || 0;
    });
    const at = (name) => { const h = w.history.find((x) => flow[x.si].name === name); return h ? h.date : null; };
    if (w.type === 'SIG') { w.deploy = at('Waiting for Data Processing'); w.pickup = w.deploy; }
    else if (flow.some((x) => x.name === 'Deployed')) {
      w.deploy = at('Deployed');
      const di = idx(w.type, 'Deployed'), k0 = w.history.findIndex((x) => x.si === di), after = k0 >= 0 ? w.history[k0 + 1] : null;
      w.pickup = w.deploy && after ? after.date : null;
    }
    if (!w.planned && w.deploy) w.planned = w.deploy;
  }

  /* status helpers (used by the generator and exported) */
  const st = (w) => WF[w.type][w.si];
  const done = (w) => st(w).kind === 'Done';
  const holdNow = (w) => w.holds.find((h) => !h.end) || null;
  const active = (w) => !done(w) && st(w).stage !== 'D' && !holdNow(w);
  const first = (w, name) => { const k = idx(w.type, name); const h = k < 0 ? null : w.history.find((x) => x.si === k); return h ? h.date : null; };
  const lastChange = (w) => w.history[w.history.length - 1].date;
  const daysIn = (w) => between(lastChange(w), TODAY);

  /* billing: invoices, close-out, billing comments */
  for (const w of wos) {
    const delD = deliveredDate(w), flow = WF[w.type];
    if (!delD || st(w).name === 'Cancelled') continue;
    if (w.type === 'CM') {
      const endD = w.pickup || TODAY;
      for (let m = new Date(w.deploy.getFullYear(), w.deploy.getMonth(), 1); m <= endD; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
        const invD = nextWorkday(new Date(m.getFullYear(), m.getMonth() + 1, 1), ri(0, 5));
        if (invD <= TODAY && !chance(0.12)) w.invoices.push({ date: invD, no: '' });
      }
    } else {
      const d1 = addDays(delD, Math.min(120, Math.max(0, Math.round(logn(12, 0.85)))));
      if (d1 <= TODAY) { w.invoices.push({ date: d1, no: '' }); if (chance(0.12)) { const d2 = addDays(d1, ri(10, 40)); if (d2 <= TODAY) w.invoices.push({ date: d2, no: '' }); } }
    }
    const last = w.invoices[w.invoices.length - 1];
    if (last && (w.type !== 'CM' || w.pickup)) {
      const cd = addDays(last.date, Math.round(logn(9, 0.9)));
      if (cd <= TODAY) { w.history.push({ si: idx(w.type, 'Closed'), date: cd, by: BILLER, entered: cd, back: false, skipped: 0 }); w.si = idx(w.type, 'Closed'); }
    }
    if (!done(w) && chance(0.3)) w.billingComment = pick(['Waiting on a PO number', 'Customer asked to bill with the next pad', 'Split across two AFEs', 'Send to the new AP contact']);
  }
  {
    let no = 24100;
    wos.flatMap((w) => w.invoices).sort((a, b) => a.date - b.date).forEach((x) => (x.no = String(no++)));
  }
  /* two invoiced jobs reopened from Closed in the last 30 days (a correction after the invoice) */
  {
    const cands = wos.filter((w) => !w.rev && w.type !== 'CM' && st(w).name === 'Closed' && w.invoices.length && w.eng && between(lastChange(w), TODAY) >= 10 && between(lastChange(w), TODAY) <= 80);
    for (const w of cands.slice(-2)) {
      let d = addDays(TODAY, -ri(3, 10)); if (d < addDays(lastChange(w), 3)) d = addDays(lastChange(w), 3);
      while (isWeekend(d)) d = addDays(d, 1);
      if (d > TODAY) continue;
      const si = idx(w.type, 'Report Edits');
      w.history.push({ si, date: d, by: w.eng, entered: d, back: false, skipped: 0 }); w.si = si; w._reopened = d;
      w.comments.push({ by: w.eng, date: d, text: 'Customer asked for a correction after the invoice went out' });
    }
  }
  /* a ready-to-invoice field job or two missing a billing field */
  {
    const ready = wos.filter((w) => !w.rev && !done(w) && deliveredDate(w) && !w.invoices.length && ['AMB', 'CR', 'CM'].includes(w.type));
    if (ready[0]) ready[0].monitors = null;
    if (ready[1]) ready[1].studyLen = null;
    else { const sig = wos.find((w) => !w.rev && !done(w) && deliveredDate(w) && !w.invoices.length && w.type === 'SIG'); if (sig) { sig.deploy = null; sig.pickup = null; } }
  }

  /* due dates: set at intake from the type's typical Cycle Time with spread. Most delivered jobs make it.
     Rush requests (about 10% of WOs, mostly three customers) get less than half the typical Cycle Time. */
  const medArr = (a) => { const x = a.filter((v) => v != null).sort((p, q) => p - q); if (!x.length) return null; const m = x.length >> 1; return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2; };
  const delivDone = wos.filter((w) => !w.rev && deliveredDate(w) && st(w).name !== 'Cancelled');
  const MED_CT = {}; for (const t of TYPES) MED_CT[t] = medArr(delivDone.filter((w) => w.type === t).map((w) => between(w.created, deliveredDate(w)))) || 60;
  const RUSH = { 'Kestrel Resources': 0.24, 'Bison Midstream': 0.26, 'Summit Data Partners': 0.4 };
  const OFFICE_CLOSED = new Set(['2026-01-01', '2026-05-25', '2026-07-03', '2026-09-07', '2026-11-26', '2026-11-27', '2026-12-24', '2026-12-25', '2027-01-01']);
  const weekday = (d, back) => { while (isWeekend(d) || OFFICE_CLOSED.has(iso(d))) d = addDays(d, back ? -1 : 1); return d; };
  for (const w of wos) {
    const delD = deliveredDate(w), m = MED_CT[w.type];
    if (w.rev) { w.due = addDays(w.created, ri(14, 30)); if (delD && chance(0.25)) w.due = addDays(delD, -ri(1, 6)); w.due = weekday(w.due, true); continue; }
    if (w._reopened) { w.due = weekday(addDays(w._reopened, ri(8, 15))); continue; }
    w._rush = chance(RUSH[w.cust] || 0.035);
    const natural = addDays(w.created, Math.round(m * (0.85 + r() * 0.6)));
    if (w._rush) w.due = addDays(w.created, Math.max(7, Math.round(m * (0.25 + r() * 0.2))));
    else if (delD) { if (chance(0.04)) { w.due = null; continue; } w.due = chance(0.86) ? (natural >= delD ? natural : addDays(delD, ri(0, 10))) : (natural < delD ? natural : addDays(delD, -ri(1, 18))); }
    else w.due = natural;
    if (between(w.created, w.due) < 7) w.due = addDays(w.created, 7 + ri(0, 4));
    w.due = weekday(w.due, true);
  }

  /* ambient links, information complete */
  const ambs = wos.filter((w) => w.type === 'AMB' && !w.rev);
  for (const w of wos.filter((x) => x.ambNeeded && !x.rev)) {
    const a = ambs.find((x) => x.cust === w.cust && !x._linked && Math.abs(between(x.created, w.created)) <= 75);
    if (a && chance(0.9)) { w.ambWO = a.id; a._linked = true; } else if (chance(0.75)) w.ambNeeded = false;
  }
  ambs.forEach((a) => delete a._linked);
  for (const w of wos.filter((x) => x.type === 'NMP' || x.type === 'NIA')) w.infoDate = w.rev ? null : first(w, 'Ready for Modeling');

  /* deliberate gaps on active jobs, so the "missing" lists are not empty */
  {
    const act = wos.filter((w) => active(w) && !w.rev);
    act.filter((w) => w._fresh === 'unassigned').forEach((w) => { w.eng = null; w.qc = null; w.assignedAt = null; });
    wos.forEach((w) => delete w._fresh);
    // planned deploy / field dates on field jobs not yet in the field
    act.filter((w) => ['AMB', 'CM', 'CR', 'SIG'].includes(w.type) && !w.deploy).forEach((w) => { const p = addDays(TODAY, ri(2, 24)); w.planned = w.planned && w.planned > TODAY ? w.planned : isWeekend(p) ? addDays(p, 2) : p; });
    // enough of my own jobs where it is my move
    const mineMove = () => act.filter((w) => w.eng === ME && st(w).holder === 'Urban' && w.history.length > 1).length;
    for (const w of act.filter((x) => x.eng && x.eng !== ME && st(x).holder === 'Urban' && x.history.length > 1 && !assignableFrom[x.eng])) { if (mineMove() >= 3) break; w.eng = ME; if (w.qc === ME) w.qc = 'Lena Ortiz'; }
    const nod = act.filter((w) => w.due && w.eng).slice(-14);
    [nod[2], nod[7], nod[11]].filter(Boolean).forEach((w) => (w.due = null));
    const preQc = act.filter((w) => ['Modeling', 'Selecting Locations', 'Writing Report', 'Calibration Model', 'Processing'].includes(st(w).name) && w.eng);
    preQc.slice(0, 3).forEach((w) => (w.qc = null));
    const noAmb = act.filter((w) => w.ambNeeded && w.ambWO);
    noAmb.slice(0, 2).forEach((w) => (w.ambWO = null));
    if (!act.some((w) => w.ambNeeded && !w.ambWO && w.eng === ME)) { const s = act.find((w) => (w.type === 'NMP' || w.type === 'NIA') && w.eng === ME); if (s) { s.ambNeeded = true; s.ambWO = null; } }
    act.filter((w) => w.infoDate && idx(w.type, st(w).name) >= idx(w.type, 'Modeling')).slice(0, 2).forEach((w) => (w.infoDate = null));
    const amb = act.find((w) => w.type === 'AMB' && w.monitors); if (amb) amb.monitors = null;
    // a few active jobs on hold right now
    const free = act.filter((w) => !w.holds.length && st(w).kind !== 'Field');
    for (let k = 0; k < 3 && free.length; k++) {
      const w = free.splice(Math.floor(r() * free.length), 1)[0];
      const start = addDays(TODAY, -ri(3, Math.max(4, Math.min(20, daysIn(w)))));
      w.holds.push({ reason: HOLD_REASONS[k === 0 ? 0 : k === 1 ? 1 : 3], start: start < lastChange(w) ? lastChange(w) : start, end: null });
    }
  }

  /* FLD-7: monitors still out past the planned study length */
  {
    const out = wos.filter((w) => !done(w) && st(w).name === 'Deployed' && w.type !== 'CM' && between(w.deploy, TODAY) >= 5).slice(0, 2);
    out.forEach((w) => { w.studyLen = between(w.deploy, TODAY) > 8 ? 7 : 3; });
    if (!out.length) { const cm = wos.find((w) => !done(w) && st(w).name === 'Deployed' && w.type === 'CM' && between(w.deploy, TODAY) >= 20); if (cm) cm.studyLen = between(cm.deploy, TODAY) - ri(3, 9); }
  }

  /* active jobs: about 6 overdue and about 9 at risk. "At risk" is what MGR-13 computes: the usual days from
     the current status to Delivered (less hold time), minus days already in it, are more than the days left. */
  {
    const hd = (w) => w.holds.reduce((t, x) => t + between(x.start, x.end || TODAY), 0), cache = {};
    const usual = (w, net) => { const k = w.type + '|' + st(w).name + '|' + net; if (!(k in cache)) { const v = delivDone.filter((x) => x.type === w.type).map((x) => { const f = first(x, st(w).name); return f ? between(f, deliveredDate(x)) - (net ? hd(x) : 0) : null; }).filter((v) => v != null); cache[k] = v.length >= 3 ? medArr(v) : null; } return cache[k]; };
    const act = wos.filter((w) => active(w) && w.due);
    const info = (w) => { const u = usual(w, true), e = u == null ? null : Math.max(0, u - daysIn(w)), left = between(TODAY, w.due); return { e, ct: usual(w, false), left, cat: left < 0 ? 'over' : e != null && e > left ? 'risk' : 'ok' }; };
    const okDue = (w) => { const i = info(w); return weekday(addDays(TODAY, Math.max(i.e || 0, i.ct || 0, 5) + ri(2, 16))); };
    const shuffle = (a) => a.map((x) => [r(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
    const of = (c) => act.filter((w) => info(w).cat === c);
    for (const w of of('over').filter((x) => !x._rush && !x._reopened).sort((a, b) => b.created - a.created).slice(0, Math.max(0, of('over').length - 6))) w.due = okDue(w);
    for (const w of shuffle(act.filter((x) => info(x).cat !== 'over' && !x._reopened && between(x.created, TODAY) >= 24)).slice(0, Math.max(0, 6 - of('over').length))) w.due = weekday(addDays(TODAY, -ri(1, Math.min(18, between(w.created, TODAY) - 10))), true);
    for (const w of of('risk').filter((x) => !x._rush && !x._reopened).slice(0, Math.max(0, of('risk').length - 9))) w.due = okDue(w);
    for (const w of shuffle(of('ok').filter((x) => !x._reopened && info(x).e >= 5)).slice(0, Math.max(0, 9 - of('risk').length))) { const i = info(w); let d = addDays(TODAY, ri(1, i.e - 2)); if (between(w.created, d) < 7) continue; d = weekday(d, true); if (d >= TODAY) w.due = d; }
    for (const w of of('ok')) { const i = info(w); if (i.ct != null && i.left < i.ct) w.due = okDue(w); }
  }

  /* priority among open, not-yet-delivered jobs */
  wos.filter((w) => !done(w) && st(w).stage !== 'D').sort((a, b) => (a.due ? +a.due : 9e15) - (b.due ? +b.due : 9e15) || a.created - b.created).forEach((w, k) => (w.pri = k + 1));

  /* comments */
  const NOTES = { Urban: ['Model run finished, checking receptors', 'Starting the report draft this week', 'Next up after the Harlan job', 'Processing the second week of data', 'Locations drafted, sending to QC', 'Barrier height still being sized'], QC: ['Sent to QC on Monday', 'Second review round', 'QC comments back, two receptors to check'], Customer: ['Asked for the equipment list, no reply yet', 'Customer is reviewing prelim results', 'Landowner call set for Friday', 'Waiting on the rig layout'], Field: ['Monitors are out, pickup planned', 'Crew scheduled'], Billing: ['Report sent, invoice not out yet', 'Waiting on a PO number'], None: ['Final invoice sent'] };
  for (const w of wos) {
    const flow = WF[w.type], n = ri(0, 2);
    for (let k = 0; k < n; k++) { const h = pick(w.history), s = flow[h.si]; w.comments.push({ by: s.holder === 'QC' ? w.qc || MANAGER : w.eng || MANAGER, date: addDays(h.date, ri(0, 2)) > TODAY ? TODAY : addDays(h.date, ri(0, 2)), text: pick(NOTES[s.holder]) }); }
    if (!done(w) && chance(0.65)) { const s = st(w); w.comments.push({ by: s.holder === 'QC' ? w.qc || MANAGER : chance(0.2) ? MANAGER : w.eng || MANAGER, date: addDays(TODAY, -ri(0, 4)), text: pick(NOTES[s.holder]) }); }
    w.comments.sort((a, b) => b.date - a.date);
  }

  /* a couple of name variants for Data health (same customer or site typed differently) */
  {
    const old = wos.filter((w) => done(w) && !w.rev);
    const a = old.find((w) => w.cust === 'Tallgrass Operating'); if (a) a.cust = 'TallGrass Operating';
    const b = old.find((w) => w.site === 'Coyote 12-4 Pad'); if (b) b.site = 'Coyote 12-4 pad';
    const c = old.find((w) => w.site === 'Larkspur Compressor Station'); if (c) c.site = 'Larkspur Compressor Stn';
  }

  /* ---------- time off ---------- */
  const HOLIDAYS = ['2026-01-01', '2026-05-25', '2026-07-03', '2026-09-07', '2026-11-26', '2026-11-27', '2026-12-24', '2026-12-25'].map((s) => { const [y, m, d] = s.split('-'); return new Date(y, m - 1, d); });
  const timeOff = [];
  for (const p of people) {
    for (const h of HOLIDAYS) if (h >= p.start) timeOff.push({ person: p.name, date: h, type: 'Holiday' });
    const blocks = ri(2, 3);
    for (let k = 0; k < blocks; k++) {
      let d = addDays(new Date(2026, 3, 6), ri(0, 255)), len = wpick([[1, 3], [2, 2], [3, 2], [5, 2]]);
      if (d < p.start) continue;
      for (let j = 0; j < len; j++, d = addDays(d, 1)) { while (isWeekend(d)) d = addDays(d, 1); if (!timeOff.some((t) => t.person === p.name && +t.date === +d)) timeOff.push({ person: p.name, date: d, type: 'PTO' }); }
    }
    for (let k = ri(0, 3); k > 0; k--) { let d = addDays(ENTRIES_START, ri(0, 230)); while (isWeekend(d)) d = addDays(d, 1); if (d < TODAY && d >= p.start && !timeOff.some((t) => t.person === p.name && +t.date === +d)) timeOff.push({ person: p.name, date: d, type: 'Sick' }); }
  }
  // known upcoming time off (next four weeks), including one that covers an active job's due date
  const addOff = (n, from, len, type) => { let d = from; for (let j = 0; j < len; j++, d = addDays(d, 1)) { while (isWeekend(d)) d = addDays(d, 1); if (!timeOff.some((t) => t.person === n && +t.date === +d)) timeOff.push({ person: n, date: d, type: type || 'PTO' }); } };
  addOff('Marco Ruiz', new Date(2026, 11, 1), 4); addOff('Priya Nair', new Date(2026, 11, 7), 1); addOff(ME, new Date(2026, 11, 21), 3); addOff('Lena Ortiz', new Date(2026, 11, 28), 4); addOff('Owen Price', new Date(2026, 11, 10), 2);
  {
    const used = new Set(['Marco Ruiz']);
    for (const j of wos.filter((w) => active(w) && w.eng && w.due && between(TODAY, w.due) >= 6 && between(TODAY, w.due) <= 26)) { if (used.has(j.eng)) continue; used.add(j.eng); addOff(j.eng, addDays(j.due, -1), 3); if (used.size >= 3) break; }
  }
  addOff('Tom Becker', new Date(2026, 4, 11), 1, 'Unpaid');
  timeOff.sort((a, b) => a.date - b.date || (a.person < b.person ? -1 : 1));
  const offIndex = new Map(timeOff.map((t) => [t.person + '|' + iso(t.date), t]));

  /* exception cases for Data health and the home pages, chosen before time is logged */
  const QUIET_FROM = dn(addDays(TODAY, -14)), WEEK_N = dn(weekStart(TODAY));
  {
    // DH-4: active jobs untouched for 14 days (no status change, no hours, no comment)
    const stuckJobs = wos.filter((w) => active(w) && !w._reopened && daysIn(w) >= 14).sort((a, b) => (st(a).kind === 'Customer' ? 0 : 1) - (st(b).kind === 'Customer' ? 0 : 1));
    for (const w of stuckJobs.slice(0, 3)) { w._quiet = true; w.comments = w.comments.filter((c) => c.date < addDays(TODAY, -14)); }
    // DH-6: a few delivered jobs since April with no hours logged at all
    const small = wos.filter((w) => !w.rev && deliveredDate(w) && w.created >= ENTRIES_START && st(w).name !== 'Cancelled' && !w._reopened).sort((a, b) => (a.type === 'CR' || a.type === 'CM' ? 0 : 1) - (b.type === 'CR' || b.type === 'CM' ? 0 : 1));
    small.slice(0, 3).forEach((w) => (w._noHours = true));
    // ENG-12: one of my Urban-held jobs gets no hours from me this week
    const mine = wos.filter((w) => active(w) && w.eng === ME && st(w).holder === 'Urban').sort((a, b) => (st(a).kind === 'Queue' ? 0 : 1) - (st(b).kind === 'Queue' ? 0 : 1));
    if (mine[0]) mine[0]._skipMeThisWeek = true;
  }

  /* ---------- time entries ---------- */
  const entries = [];
  const visitsOf = (w) => w.history.map((h, k) => ({ si: h.si, s: WF[w.type][h.si], sd: dn(h.date), ed: k + 1 < w.history.length ? dn(w.history[k + 1].date) : Infinity }));
  const VIS = wos.map((w) => ({ w, vs: visitsOf(w), c: dn(w.created), stop: done(w) ? dn(lastChange(w)) : Infinity, holds: w.holds.map((h) => [dn(h.start), h.end ? dn(h.end) : Infinity]) }));
  const TODAY_N = dn(TODAY);
  const WORK_H = { Modeling: 7.5, 'Calibration Model': 7, 'Generic Model': 7, 'Writing Report': 6.5, 'Selecting Locations': 4.25, Processing: 5.5, 'SWL Processing': 5.5, 'Info Review': 3.25 };
  const WORK_TASK = { Modeling: () => ['Modeling', wpick([['Base Model', 5], ['Equipment Model', 3], ['Mitigation Specification', 2]])], 'Calibration Model': () => ['Modeling', 'Calibration Model'], 'Generic Model': () => ['Modeling', 'Generic Model'], 'Writing Report': () => ['Report', 'Draft'], 'Selecting Locations': () => ['Project Administrative', 'Monitor Location Selection'], Processing: () => ['Data Processing', 'Audio File Processing'], 'SWL Processing': () => ['Data Processing', pick(['PIX4D', 'Fulcrum', 'SWL Derivations'])], 'Info Review': () => ['Project Administrative', 'Information Review'] };
  const EDIT_TASK = { Model: 'Modeling', Report: 'Report', Data: 'Data Processing' };
  const QC_TASK = { Model: ['Modeling', 'Model QC'], Prelim: ['Modeling', 'Model QC'], Report: ['Report', 'Report QC'], Data: ['Data Processing', 'Data Processing QC'], Locations: ['Project Administrative', 'Monitor Location Selection'] };
  const NOTE = { Modeling: ['Receptor grid set up', 'Second barrier option', 'Equipment sound power from the vendor sheets', 'Re-ran with the updated layout', ''], Report: ['Draft sections 1 to 3', 'Figures and tables', 'Addressed QC comments', ''], 'Data Processing': ['Processed nights 1 and 2', 'Flagged wind-affected periods', ''], 'Field Work': ['Deployed monitors', 'Picked up monitors', 'Site walk with the operator', 'Battery swap'], 'Customer Communication': ['Call with the operator', 'Sent the information request', 'Walked through prelim results', 'Follow-up email'], 'Project Administrative': ['Job setup', 'Reviewed the information package', 'Kickoff with the team', 'Location selection'] };
  const OOS_NOTE = ['Extra receptor the customer asked for', 'Second layout option requested', 'Additional site visit requested', 'Customer asked for a memo summary'];
  const GEN_NOTE = { 'Company Administrative': ['Team meeting', 'Email and admin', 'Time tracker clean-up', 'Laptop setup'], 'Queue Meeting': ['Weekly queue call'], 'Queue Management': ['Reviewed the queue and assignments', 'Priorities for the week'], 'Existing Customer Support': ['Question on last year\'s report', 'Monthly check-in call', 'Helped with a regulator question'], Quoting: ['Scoped a new pad', 'Proposal support'], 'Product Development': ['Barrier design review', 'Template update'], 'Training Received': ['SoundPLAN session', 'Field safety refresher', 'Shadowed a deployment', 'Report template walkthrough'], 'Training Administered': ['Trained a new hire on modeling', 'Walked through QC checklist', 'Field equipment training'], Sales: ['Lead call', 'Prepared a capability sheet'], 'Office Field Support': ['Monitor fleet calibration', 'Prepped monitors for a deployment', 'Wall layout for ops'], 'Research (Outside of Eng. Job)': ['Automation script', 'Read up on new state rules'], 'Business Development': ['Industry event'], 'NPIQ Development': ['Bug fixes', 'Spec for the next release', 'Sprint planning'], Billing: ['Invoice prep', 'Invoices submitted', 'Reviewed delivered jobs'], 'Human Resources': ['Onboarding paperwork'], Forecasting: ['Workload forecast'] };
  const REJECT = ['Wrong WO', 'Needs a comment', 'Hours look high, check the date', 'Should be General time', 'Split across two jobs'];
  let eid = 10000;
  const addE = (o) => { entries.push({ id: 'T' + eid++, person: o.person, date: o.date, wo: o.wo || null, task: o.task, sub: o.sub || '', hours: o.hours, oos: !!o.oos, general: !o.wo, genClass: o.wo ? null : o.genClass || 'General', training: o.training || null, note: o.note || '', status: 'draft', rejectReason: '', createdAt: null, approver: null, approvedAt: null, submittedAt: null }); };
  const monthsSince = (p, d) => (d - p.start) / (30.4 * DAY);
  const newHires = people.filter((p) => p.start >= new Date(2026, 0, 1));
  const missRate = { 'Tom Becker': 0.05, 'Ben Alvarez': 0.03 };
  const STAFF_MIX = {
    'Nora Fitch': [[['Billing', 'Invoice Prep'], 4], [['Billing', 'Invoice Submittal'], 2], [['Billing', 'Invoice Review'], 1], [['Company Administrative', 'Office Tasks'], 3], [['Existing Customer Support', ''], 1]],
    'Owen Price': [[['Office Field Support', 'Monitor Fleet Support'], 3], [['Office Field Support', 'Supporting Field Engineering'], 2], [['Company Administrative', 'Team Meetings'], 2], [['Sales', 'New Sales Support'], 1.5], [['Quoting', ''], 1.5], [['Business Development', 'Industry Events'], 0.5]],
    'Ben Alvarez': [[['Office Field Support', 'Wall Layouts for Ops'], 5], [['Product Development', 'Design'], 3], [['Company Administrative', ''], 2]],
    'Kayla Moss': [[['NPIQ Development', 'Bugs/Troubleshooting'], 4], [['NPIQ Development', 'Spec Building'], 2], [['NPIQ Development', 'Administrative'], 1], [['Company Administrative', ''], 1.5], [['Research (Outside of Eng. Job)', 'Automation'], 1.5]],
    'Rachel Kim': [[['Queue Management', ''], 3], [['Company Administrative', 'Team Meetings'], 3], [['Quoting', ''], 2], [['Sales', 'Lead Scoping'], 1], [['Existing Customer Support', 'Recurring Customer Meetings'], 1.5], [['Forecasting', ''], 0.7], [['Human Resources', 'Onboarding'], 0.5]],
  };
  const ENG_GEN = [[['Company Administrative', ''], 3], [['Existing Customer Support', 'Non-billable Customer Interactions'], 2], [['Quoting', ''], 1.3], [['Product Development', ''], 1], [['Office Field Support', 'Supporting Field Engineering'], 0.8], [['Research (Outside of Eng. Job)', 'Regulations'], 0.5], [['Training Received', ''], 0.5]];
  const classFor = (p, task) => (p.team === 'NPIQ' ? 'NPIQ' : p.team === 'Walls' ? pick(["24'", "32'", 'Permanent']) : task === 'Office Field Support' ? 'Continuous Monitoring' : p.team === 'Engineering' ? wpick([['Engineering', 7], ['General', 2], ['Permanent', 1]]) : 'General');
  const trainingFor = (task) => (task === 'Training Received' ? { kind: 'Received', category: wpick([['Software', 3], ['Technical', 3], ['Field equipment', 2], ['Safety', 1], ['Onboarding', 2]]) } : task === 'Training Administered' ? { kind: 'Administered', category: wpick([['Software', 3], ['Technical', 3], ['Field equipment', 2], ['Onboarding', 2]]) } : null);
  const thisWeek = weekStart(TODAY);

  for (let d = ENTRIES_START; d <= TODAY; d = addDays(d, 1)) {
    const wkend = isWeekend(d), isToday = +d === +TODAY;
    // which jobs are in which status on this day
    const live = [], dd = dn(d);
    for (const o of VIS) {
      if (o.c > dd || o.stop < dd) continue;
      const vs = o.vs;
      for (let k = vs.length - 1; k >= 0; k--) {
        const v = vs[k];
        if (v.sd <= dd && v.ed > dd) {
          const onHold = o.holds.some((h) => h[0] <= dd && h[1] > dd);
          live.push({ w: o.w, v, prev: k ? vs[k - 1] : null, onHold, ds: dd - v.sd, len: Math.min(v.ed, TODAY_N) - v.sd, toEnd: v.ed - dd });
          break;
        }
      }
    }
    for (const p of people) {
      if (d < p.start) continue;
      if (offIndex.has(p.name + '|' + iso(d))) continue;
      const eng = p.team === 'Engineering' && p.role !== 'Manager';
      const dem = [];
      if (eng) {
        for (const { w, v, prev, onHold, ds, len, toEnd } of live) {
          if (onHold || (w.eng !== p.name && w.qc !== p.name) || w._noHours || (w._quiet && dd >= QUIET_FROM) || (w._skipMeThisWeek && p.name === ME && dd >= WEEK_N)) continue;
          const s = v.s, first = ds === 0;
          if (w.eng === p.name) {
            if (s.name === 'Request Received' && first) { dem.push({ w, task: 'Project Administrative', sub: 'Job Setup', h: 0.75 }); if (chance(0.6)) dem.push({ w, task: 'Project Administrative', sub: 'Internal Job Kickoff', h: 0.5 }); }
            else if (s.kind === 'Work' && s.loop) { if (ds < 5) dem.push({ w, task: EDIT_TASK[s.loop] || 'Modeling', sub: 'Post QC Edits', h: len > 1 ? 3.25 : 2 }); }
            else if (s.kind === 'Work' && WORK_TASK[s.name]) { const [t, sb] = WORK_TASK[s.name](); dem.push({ w, task: t, sub: sb, h: WORK_H[s.name] * (0.7 + r() * 0.6) * (w.rev ? 0.6 : 1) }); }
            else if (s.kind === 'Queue' && s.holder === 'Urban' && s.stage !== 'D' && chance(0.3)) { dem.push({ w, task: 'Project Administrative', sub: 'Information Review', h: 1.5 }); }
            else if (s.kind === 'Customer' && chance(0.4)) dem.push({ w, task: 'Customer Communication', sub: s.name === 'Waiting on Customer: Info' ? 'Information Request' : s.name === 'Waiting on Customer: Prelim Approval' ? 'Preliminary Results' : 'Communications', h: 0.75 });
            else if (s.name === 'Scheduled' && toEnd === 1) dem.push({ w, task: 'Field Work', sub: 'Field Prep', h: 3 });
            else if (s.name === 'Deployed' && first) dem.push({ w, task: 'Field Work', sub: 'Field Time', h: 6 + r() * 3 });
            else if (s.name === 'Deployed' && w.type === 'CM' && ds % 7 === 0) dem.push({ w, task: 'Field Work', sub: 'Field Time', h: 2 });
            else if (prev && prev.s.name === 'Deployed' && first) dem.push({ w, task: 'Field Work', sub: 'Field Time', h: 4 + r() * 2.5 });
            else if (s.name === 'Waiting for Data Processing' && first) dem.push({ w, task: 'Field Work', sub: 'Field Time', h: 7 + r() * 2 });
            else if (s.stage === 'D' && s.kind !== 'Done' && ds >= 1 && ds <= 25 && chance(0.03)) dem.push({ w, task: w.type === 'CM' ? 'Customer Communication' : chance(0.5) ? 'Report' : 'Customer Communication', sub: w.type === 'CM' ? 'Communications' : 'Revision', h: 1 + ri(0, 4) * 0.25, after: true });
          }
          if (w.qc === p.name && s.kind === 'Review') dem.push({ w, task: QC_TASK[s.loop][0], sub: QC_TASK[s.loop][1], h: (s.loop === 'Model' ? 4.25 : 3) * (0.7 + r() * 0.6) });
          if (w.qc === p.name && s.kind === 'Queue' && s.holder === 'QC' && chance(0.2)) dem.push({ w, task: QC_TASK[s.loop][0], sub: QC_TASK[s.loop][1], h: 1 });
        }
      } else if (p.role === 'Manager' && !wkend && chance(0.3)) {
        const c = live.filter((x) => x.v.s.kind === 'Customer' && !x.onHold && !x.w._quiet && !x.w._noHours);
        if (c.length) dem.push({ w: pick(c).w, task: 'Customer Communication', sub: 'Communications', h: 0.5 });
      }
      // weekends: only field days and the odd catch-up
      if (wkend) {
        const field = dem.filter((x) => x.task === 'Field Work');
        const catchup = eng && chance(0.025) ? dem.filter((x) => x.task !== 'Field Work').slice(0, 1).map((x) => ({ ...x, h: 1 + ri(0, 8) * 0.25 })) : [];
        dem.length = 0; dem.push(...field, ...catchup);
        if (!dem.length) continue;
      } else if (chance(missRate[p.name] || 0.012) && !isToday) continue;
      if (+weekStart(d) === +thisWeek && isToday && chance(0.5)) continue;
      // the day's total
      let T = wkend ? 0 : p.weeklyHours / 5 + pick([-0.5, 0, 0, 0, 0, 0.25, 0.5, 1]);
      if (!wkend && d.getDay() === 5 && chance(0.3)) T -= 1.5;
      if (isToday) T = ri(3, 5);
      const woSum = dem.reduce((t, x) => t + x.h, 0);
      if (!wkend && woSum > T - 0.5 && chance(0.45)) T = Math.min(woSum + 0.5, T + 2.5);
      const scale = wkend ? 1 : Math.min(1, Math.max(0, T - 0.5) / (woSum || 1));
      // merge same job + task + sub, round to quarter hours
      const merged = new Map();
      for (const x of dem) { const k = x.w.key + '|' + x.task + '|' + x.sub; const m = merged.get(k); if (m) m.h += x.h * scale; else merged.set(k, { ...x, h: x.h * scale }); }
      let used = 0;
      for (const x of merged.values()) {
        const h = q4(x.h); if (h < 0.25) continue; used += h;
        const c = custOf(x.w.cust) || custOf('Tallgrass Operating');
        const oos = (x.task === 'Customer Communication' || x.sub === 'Post QC Edits' || x.sub === 'Revision' || x.sub === 'Mitigation Specification') && chance(c.oos * 4);
        addE({ person: p.name, date: d, wo: x.w.key, task: x.task, sub: x.sub, hours: h, oos, note: oos ? pick(OOS_NOTE) : chance(0.45) ? pick(NOTE[x.task] || ['']) : '' });
      }
      if (wkend) continue;
      // General time fills the rest of the day
      let rest = q4(T - used);
      const gen = [];
      if (eng && d.getDay() === 1 && rest >= 0.5) { gen.push(['Queue Meeting', '', 0.5]); rest -= 0.5; }
      if (eng && newHires.includes(p) && rest > 0) { const m = monthsSince(p, d), share = m < 1 ? 0.45 : m < 2 ? 0.3 : m < 3 ? 0.18 : m < 5 ? 0.08 : 0.03; const h = q4(Math.min(rest, (p.weeklyHours / 5) * share * (0.6 + r() * 0.8))); if (h >= 0.25) { gen.push(['Training Received', '', h]); rest -= h; } }
      if (eng && ['Lena Ortiz', 'Grant Hale', 'Dana Whitlow'].includes(p.name) && newHires.some((n) => monthsSince(n, d) >= 0 && monthsSince(n, d) < 4) && chance(0.22) && rest >= 1) { const h = q4(1 + r()); gen.push(['Training Administered', '', h]); rest -= h; }
      while (rest >= 0.25) {
        const mix = STAFF_MIX[p.name] || ENG_GEN;
        const [t, sb] = wpick(mix), h = rest <= 2.5 || gen.length >= 2 ? rest : q4(rest * (0.4 + r() * 0.4));
        gen.push([t, sb, h]); rest = q4(rest - h);
        if (gen.length > 4) break;
      }
      const gm = new Map(); for (const g of gen) { const k = g[0] + '|' + g[1]; if (gm.has(k)) gm.get(k)[2] += g[2]; else gm.set(k, g.slice()); }
      for (const [t, sb, h] of gm.values()) {
        if (h < 0.25) continue;
        const custNote = t === 'Existing Customer Support' && chance(0.08) ? pick(live.filter((x) => x.v.s.stage !== 'D')) : null;
        addE({ person: p.name, date: d, task: t, sub: sb, hours: h, genClass: classFor(p, t), training: trainingFor(t), note: custNote ? `Call with ${custNote.w.cust} about ${custNote.w.site}` : chance(0.95) ? pick(GEN_NOTE[t] || ['']) : '' });
      }
    }
  }

  /* DH-5: Report hours logged while the job was still in an earlier stage */
  {
    const cands = wos.filter((w) => !w.rev && w.eng && w.created >= addDays(ENTRIES_START, 20) && !w._noHours && TASKS[w.type].Report);
    let n = 0;
    for (const w of cands) {
      const v = w.history.find((h) => ['M', 'P'].includes(WF[w.type][h.si].stage) && WF[w.type][h.si].kind === 'Work' && h.date >= ENTRIES_START);
      if (!v || n >= 3 || !chance(0.5)) continue;
      const d = weekday(addDays(v.date, 1)), at = w.history.filter((h) => h.date <= d).pop();
      if (d >= TODAY || !at || WF[w.type][at.si].stage === 'R' || WF[w.type][at.si].stage === 'D') continue;
      addE({ person: w.eng, date: d, wo: w.key, task: 'Report', sub: 'Draft', hours: pick([1.5, 2, 2.5]), note: 'Started the report template early' }); n++;
    }
    entries.sort((a, b) => a.date - b.date);
  }

  /* a few very long entries, and two exact duplicates (Data health) */
  {
    const fieldE = entries.filter((e) => e.sub === 'Field Time' && e.hours >= 7);
    fieldE.slice(5, 8).forEach((e, k) => (e.hours = [10.5, 11.25, 12][k]));
    [entries[1200], entries[3300]].forEach((e) => { if (e) { const c = { ...e, id: 'T' + eid++ }; entries.splice(entries.indexOf(e) + 1, 0, c); } });
  }

  /* week status: approved before last week, last week mostly submitted, this week draft */
  {
    const lastWeek = addDays(thisWeek, -7);
    const byPW = new Map();
    for (const e of entries) { const k = e.person + '|' + iso(weekStart(e.date)); if (!byPW.has(k)) byPW.set(k, []); byPW.get(k).push(e); }
    const lateDraft = new Set(['Tom Becker|' + iso(lastWeek), 'Tom Becker|' + iso(addDays(thisWeek, -21)), 'Kayla Moss|' + iso(addDays(thisWeek, -35))]);
    const quick = new Set(['Grant Hale', 'Nora Fitch']);
    for (const [k, list] of byPW) {
      const [name, wk] = k.split('|'), ws = list[0] ? weekStart(list[0].date) : null, p = person(name), appr = approverOf(name);
      const fri = addDays(ws, 4);
      let sub = null, apr = null;
      if (+ws < +thisWeek && !lateDraft.has(k)) {
        const lateness = name === 'Tom Becker' ? wpick([[0, 3], [1, 4], [2, 3]]) : name === 'Ben Alvarez' ? wpick([[0, 4], [1, 4], [2, 2]]) : wpick([[0, 62], [1, 26], [2, 12]]);
        sub = lateness === 0 ? atTime(fri, ri(14, 17), ri(0, 59)) : lateness === 1 ? atTime(addDays(fri, 3), ri(7, 11), ri(0, 59)) : atTime(addDays(fri, ri(3, 4)), ri(13, 17), ri(0, 59));
        if (+ws < +lastWeek || quick.has(name)) {
          const lag = appr === MANAGER ? Math.max(0.15, logn(1, 0.6)) : Math.max(0.3, logn(2.4, 0.5));
          apr = new Date(+sub + lag * DAY); if (isWeekend(apr)) apr = atTime(nextWorkday(apr, 1), 9, 30);
          if (apr > atTime(TODAY, 12)) apr = null;
        }
      }
      for (const e of list) {
        e.submittedAt = sub; e.approver = sub ? appr : null; e.approvedAt = apr;
        e.status = apr ? 'approved' : sub ? 'submitted' : 'draft';
        const lag = wpick([[0, 65], [1, 20], [ri(2, 4), 10], [ri(5, 9), 5]]);
        let c = lag === 0 ? atTime(e.date, ri(15, 18), ri(0, 59)) : atTime(addDays(e.date, lag), ri(8, 17), ri(0, 59));
        if (sub && c > sub) c = new Date(+sub - ri(5, 120) * 60000);
        if (c > atTime(TODAY, 13)) c = atTime(TODAY, ri(8, 12), ri(0, 59));
        if (c < e.date) c = atTime(e.date, 17);
        e.createdAt = c;
      }
    }
    // a handful of rejected entries in recent weeks (one of them mine)
    const recent = entries.filter((e) => e.status !== 'draft' && e.date >= addDays(thisWeek, -42));
    const mine = recent.filter((e) => e.person === ME && e.wo);
    const rej = [mine[Math.floor(mine.length * 0.7)]];
    for (let k = 0; k < 8; k++) rej.push(recent[Math.floor(r() * recent.length)]);
    rej.filter(Boolean).forEach((e) => { e.status = 'rejected'; e.rejectReason = pick(REJECT); e.approvedAt = null; });
  }

  /* hours budgets on non-CM jobs, sized from what similar jobs took */
  const isHT = (e) => e.status === 'submitted' || e.status === 'approved';
  const byWo = new Map();
  for (const e of entries) if (e.wo) { if (!byWo.has(e.wo)) byWo.set(e.wo, []); byWo.get(e.wo).push(e); }
  const humanTime = (w) => (byWo.get(w.key) || []).reduce((t, e) => t + (isHT(e) ? e.hours : 0), 0);
  const median = (a) => { const s = a.filter((x) => x != null && !isNaN(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  {
    const med = {};
    for (const t of TYPES) med[t] = median(wos.filter((w) => w.type === t && !w.rev && w.created >= ENTRIES_START && st(w).stage === 'D' && st(w).name !== 'Cancelled').map(humanTime)) || 20;
    for (const w of wos) if (w.type !== 'CM') w.budget = Math.round(med[w.type] * (w.rev ? 0.35 : 1) * (0.8 + r() * 0.6));
  }

  /* ---------- exported helpers ---------- */
  const open = (w) => !done(w);
  const deliveredAt = (w) => deliveredDate(w);
  const sum = (a) => a.reduce((t, x) => t + (+x || 0), 0);
  const pct = (a, p) => { const s = a.filter((x) => x != null && !isNaN(x)).sort((x, y) => x - y); if (!s.length) return null; const k = ((s.length - 1) * p) / 100, lo = Math.floor(k), hi = Math.ceil(k); return s[lo] + (s[hi] - s[lo]) * (k - lo); };
  const groupBy = (a, fn) => { const o = {}; for (const x of a) { const k = fn(x); (o[k] = o[k] || []).push(x); } return o; };
  const countBy = (a, fn) => { const o = {}; for (const x of a) { const k = fn(x); o[k] = (o[k] || 0) + 1; } return o; };
  const hoursBy = (list, fn) => { const o = {}; for (const e of list) { const k = fn(e); o[k] = (o[k] || 0) + e.hours; } return o; };
  const num = (n, dec) => (n == null || isNaN(n) ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }));
  function visits(w) {
    return w.history.map((h, k) => {
      const s = WF[w.type][h.si], end = k + 1 < w.history.length ? w.history[k + 1].date : null, stop = end || TODAY;
      let hd = 0; for (const x of w.holds) { const a = x.start > h.date ? x.start : h.date, b = (x.end || TODAY) < stop ? x.end || TODAY : stop; if (b > a) hd += between(a, b); }
      return { name: s.name, kind: s.kind, holder: s.holder, stage: s.stage, loop: s.loop, milestone: s.milestone, si: h.si, start: h.date, end, days: between(h.date, stop), holdDays: hd, by: h.by };
    });
  }
  function holderDays(w) { const o = { Urban: 0, QC: 0, Customer: 0, Field: 0, Billing: 0 }; for (const v of visits(w)) if (v.holder in o) o[v.holder] += v.days; return o; }
  function kindDays(w) { const o = { Queue: 0, Work: 0, Review: 0, Customer: 0, Field: 0 }; for (const v of visits(w)) if (v.stage !== 'D' && v.kind in o) o[v.kind] += v.days; return o; }
  const holdDays = (w) => w.holds.reduce((t, h) => t + between(h.start, h.end || TODAY), 0);
  const who = (w) => ({ Urban: w.eng || 'Unassigned', QC: w.qc || 'No reviewer', Customer: w.cust, Field: 'Field crew', Billing: 'Billing', None: '' }[st(w).holder]);
  const yourMove = (w, p) => { p = p || ME; const s = st(w); return active(w) && ((s.holder === 'Urban' && w.eng === p) || (s.holder === 'QC' && w.qc === p)); };
  const milestone = (w, m) => { const k = WF[w.type].findIndex((x) => x.milestone === m); if (k < 0) return null; const h = w.history.find((x) => x.si === k); return h ? h.date : null; };
  const cycleTime = (w) => { const d = deliveredAt(w); return d ? between(w.created, d) : null; };
  const byKey = (k) => wos.find((w) => w.key === k) || null;
  const byId = (id) => wos.find((w) => w.id === id && !w.rev) || null;
  const available = (n, ws) => { const p = person(n); if (!p) return 0; let off = 0; for (let k = 0; k < 5; k++) { const d = addDays(ws, k); if (d < p.start || offIndex.has(n + '|' + iso(d))) off++; } return Math.max(0, p.weeklyHours - 8 * off); };
  const period = (start, end, key, label, long) => ({ key, label, long, start, end });
  const weeks = (n, cur) => { const out = []; const last = cur === false ? addDays(thisWeek, -7) : thisWeek; for (let k = n - 1; k >= 0; k--) { const s = addDays(last, -7 * k); out.push(period(s, addDays(s, 6), iso(s), fmt(s, false), 'Week of ' + fmt(s))); } return out; };
  const months = (n, cur) => { const out = []; const lastM = cur === false ? TODAY.getMonth() - 1 : TODAY.getMonth(); for (let k = n - 1; k >= 0; k--) { const s = new Date(TODAY.getFullYear(), lastM - k, 1), e = new Date(s.getFullYear(), s.getMonth() + 1, 0); out.push(period(s, e, monthKey(s), MON[s.getMonth()] + (s.getMonth() === 0 || k === n - 1 ? ' ' + s.getFullYear() : ''), MON[s.getMonth()] + ' ' + s.getFullYear())); } return out; };
  const quarters = (n, cur) => { const out = []; const q0 = Math.floor(TODAY.getMonth() / 3) - (cur === false ? 1 : 0); for (let k = n - 1; k >= 0; k--) { const s = new Date(TODAY.getFullYear(), (q0 - k) * 3, 1), e = new Date(s.getFullYear(), s.getMonth() + 3, 0); const q = Math.floor(s.getMonth() / 3) + 1; out.push(period(s, e, quarterKey(s), `Q${q} ${s.getFullYear()}`, `Q${q} ${s.getFullYear()}`)); } return out; };
  const inRange = (d, p) => d && d >= p.start && d <= addDays(p.end, 1) - 1;
  /* B7 stage roll-up for the five Schedule cells (copied from ../a-app.js) */
  function stage(w, code) {
    const flow = WF[w.type], s = st(w), cur = s.stage, order = 'PFMLRD';
    if (code === 'F' && w.ambNeeded != null && !flow.some((x) => x.stage === 'F')) {
      if (!w.ambNeeded) return { s: 'na' };
      const a = byId(w.ambWO);
      return a ? { s: done(a) || st(a).stage === 'D' ? 'done' : 'now', h: st(a).holder, t: `Ambient ${a.id}: ${st(a).name}` } : { s: 'warn', t: 'Ambient needed, no ambient WO linked' };
    }
    if (!flow.some((x) => x.stage === code)) return { s: 'na' };
    if (s.name === 'Cancelled') return { s: 'todo' };
    return cur === code ? { s: 'now', h: s.holder, t: s.name } : order.indexOf(cur) > order.indexOf(code) ? { s: 'done' } : { s: 'todo' };
  }

  /* the same questions asked at a past date (end of that day) */
  const histAt = (w, d) => { let h = null; for (const x of w.history) { if (x.date <= d) h = x; else break; } return h; };
  const stAt = (w, d) => { const x = histAt(w, d); return x ? WF[w.type][x.si] : null; };
  const holdAt = (w, d) => w.holds.find((x) => x.start <= d && (!x.end || x.end > d)) || null;
  const activeAt = (w, d) => { const s = stAt(w, d); return !!s && s.stage !== 'D' && s.kind !== 'Done' && !holdAt(w, d); };
  const daysInAt = (w, d) => { const x = histAt(w, d); return x ? between(x.date, d) : null; };

  window.D = {
    today: TODAY, me: ME, entriesStart: ENTRIES_START,
    people, engineers, reviewers, manager: MANAGER, biller: BILLER, approverOf, person,
    customers: CUST.map((c) => ({ name: c.name, industry: c.industry })), sites: CUST.flatMap((c) => c.sites.map((s) => ({ name: s, cust: c.name, industry: c.industry }))),
    types: TYPES.slice(), WF, STAGES, HOLDERS, KINDS, QC_LOOPS, MILE, TASKS, GENERAL, GEN_CLASSES, TRAINING_CATS, TIME_OFF_TYPES, HOLD_REASONS, CANCEL_REASONS, INDUSTRIES, PHASES, QC_SUBS, holidays: HOLIDAYS,
    wos, entries, timeOff,
    st, done, open, active, overdue: (w) => active(w) && !!w.due && w.due < TODAY, daysIn, stuck: (w) => active(w) && daysIn(w) >= 14, holdNow, who, yourMove,
    first, milestone, deliveredAt, cycleTime, visits, holderDays, kindDays, holdDays, humanTime, hasHT: (w) => w.created >= ENTRIES_START, isHT,
    entriesFor: (w) => byWo.get(typeof w === 'string' ? w : w.key) || [], entriesOf: (n) => entries.filter((e) => e.person === n), hoursBy, taskStage, stage,
    available, weekStart, weeks, months, quarters, monthKey, quarterKey, weekKey: (d) => iso(weekStart(d)), inRange,
    between, addDays, iso, median, pct, sum, mean: (a) => (a.length ? sum(a) / a.length : null), groupBy, countBy, fmt, num, label: (w) => w.id + (w.rev ? ' REV ' + w.rev : ''),
    byKey, byId, isWeekend, stAt, holdAt, activeAt, daysInAt,
  };
})();
