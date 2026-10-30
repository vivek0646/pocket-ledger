(function () {
  var EXP = ['Housing','Groceries','Dining','Transport','Utilities','Health','Shopping','Entertainment','Other'];
  var INC = ['Salary','Freelance','Interest','Other income'];
  var KEY = 'pocket-ledger-v1';
  var state = { txs: [], budgets: {}, currency: 'INR', seeded: false };
  var view = { month: monthKey(new Date()), type: 'expense', editing: null };

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function monthKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function shiftMonth(key, delta) { var p = key.split('-'); var d = new Date(+p[0], +p[1] - 1 + delta, 1); return monthKey(d); }
  function monthName(key, short) { var p = key.split('-'); return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('en-IN', short ? { month: 'short' } : { month: 'long', year: 'numeric' }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) {
    try { return new Intl.NumberFormat(state.currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: state.currency, maximumFractionDigits: 2, minimumFractionDigits: (Math.round(n) === n ? 0 : 2) }).format(n); }
    catch (e) { return String(n); }
  }
  function compact(n) {
    try { return new Intl.NumberFormat(state.currency === 'INR' ? 'en-IN' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n); } catch (e) { return String(n); }
  }
  function catColor(cat) { var i = EXP.indexOf(cat); return 'var(--c' + (i < 0 ? 9 : i + 1) + ')'; }

  /* storage */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && Array.isArray(s.txs)) { state = Object.assign(state, s); return; } }
    } catch (e) {}
    seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function seed() {
    var now = new Date(), txs = [];
    function add(mOff, day, type, amount, cat, note) {
      var d = new Date(now.getFullYear(), now.getMonth() - mOff, day);
      if (mOff === 0 && d > now) return;
      txs.push({ id: uid() + txs.length, type: type, amount: amount, cat: cat, note: note, date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), ex: true });
    }
    for (var m = 0; m < 6; m++) {
      var v = (m * 37) % 7;
      add(m, 1, 'income', 85000, 'Salary', 'Monthly salary');
      if (m % 2 === 0) add(m, 14, 'income', 12000 + v * 800, 'Freelance', 'Design project');
      add(m, 2, 'expense', 22000, 'Housing', 'Rent');
      add(m, 5, 'expense', 3200 + v * 120, 'Utilities', 'Electricity and internet');
      add(m, 6, 'expense', 4200 + v * 260, 'Groceries', 'Weekly groceries');
      add(m, 13, 'expense', 3900 + v * 210, 'Groceries', 'Weekly groceries');
      add(m, 20, 'expense', 4100 + v * 180, 'Groceries', 'Weekly groceries');
      add(m, 8, 'expense', 1800 + v * 150, 'Transport', 'Metro card and fuel');
      add(m, 11, 'expense', 2400 + v * 300, 'Dining', 'Dinner out');
      add(m, 17, 'expense', 1500 + v * 220, 'Entertainment', 'Movies and streaming');
      add(m, 22, 'expense', 2600 + v * 400, 'Shopping', 'Clothes');
      if (m % 3 === 1) add(m, 24, 'expense', 1900, 'Health', 'Pharmacy');
    }
    state.txs = txs;
    state.budgets = { Housing: 22000, Groceries: 14000, Dining: 4000, Transport: 3000, Utilities: 4000, Shopping: 4000, Entertainment: 2500 };
    state.seeded = true;
    save();
  }

  /* calculations */
  function inMonth(key) { return state.txs.filter(function (t) { return t.date.slice(0, 7) === key; }); }
  function totals(key) {
    var inc = 0, exp = 0;
    inMonth(key).forEach(function (t) { if (t.type === 'income') inc += t.amount; else exp += t.amount; });
    return { inc: inc, exp: exp };
  }
  function spendByCat(key) {
    var o = {};
    inMonth(key).forEach(function (t) { if (t.type === 'expense') o[t.cat] = (o[t.cat] || 0) + t.amount; });
    return o;
  }

  /* render */
  function render() {
    $('monthLabel').textContent = monthName(view.month);
    $('currency').value = state.currency;
    renderSummary(); renderTrend(); renderBudgets(); renderBreakdown(); renderList(); renderBanner();
  }

  function renderSummary() {
    var t = totals(view.month), net = t.inc - t.exp;
    $('sInc').textContent = money(t.inc);
    $('sExp').textContent = money(t.exp);
    var n = $('sNet'); n.textContent = (net < 0 ? '-' : '') + money(Math.abs(net)); n.className = 'v ' + (net < 0 ? 'neg' : 'pos');
    $('sRate').textContent = t.inc > 0 ? Math.round((net / t.inc) * 100) + '%' : '–';
  }

  function renderTrend() {
    var keys = []; for (var i = 5; i >= 0; i--) keys.push(shiftMonth(view.month, -i));
    var data = keys.map(function (k) { var t = totals(k); return { k: k, inc: t.inc, exp: t.exp }; });
    var max = Math.max.apply(null, data.map(function (d) { return Math.max(d.inc, d.exp); }).concat([1]));
    var step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    var W = 640, H = 230, L = 46, R = 8, T = 10, B = 28, iw = W - L - R, ih = H - T - B;
    function y(v) { return T + ih - (v / top) * ih; }
    var s = '';
    for (var g = 0; g * step <= top; g++) {
      var gy = y(g * step);
      s += '<line class="grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/>';
      s += '<text x="' + (L - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + compact(g * step) + '</text>';
    }
    var gw = iw / data.length, bw = Math.min(26, gw / 3);
    data.forEach(function (d, i) {
      var cx = L + gw * i + gw / 2;
      var hi = (d.inc / top) * ih, he = (d.exp / top) * ih;
      s += '<rect class="b-inc" x="' + (cx - bw - 2) + '" y="' + (T + ih - hi) + '" width="' + bw + '" height="' + Math.max(hi, 0) + '" rx="2"><title>' + monthName(d.k) + ' income ' + esc(money(d.inc)) + '</title></rect>';
      s += '<rect class="b-exp" x="' + (cx + 2) + '" y="' + (T + ih - he) + '" width="' + bw + '" height="' + Math.max(he, 0) + '" rx="2"><title>' + monthName(d.k) + ' spent ' + esc(money(d.exp)) + '</title></rect>';
      s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle"' + (d.k === view.month ? ' class="sel"' : '') + '>' + monthName(d.k, true) + '</text>';
    });
    $('trend').innerHTML = s;
  }
  function niceStep(raw) {
    if (raw <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  function renderBudgets() {
    var sp = spendByCat(view.month), host = $('budgets'), html = '';
    EXP.forEach(function (c) {
      var lim = state.budgets[c] || 0, spent = sp[c] || 0;
      var pct = lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;
      var cls = lim > 0 && spent > lim ? 'over' : (lim > 0 && spent / lim >= 0.85 ? 'warn' : '');
      var note = lim > 0
        ? (spent > lim ? '<span class="bud-note over">Over by ' + esc(money(spent - lim)) + '</span>' : '<span class="bud-note">' + esc(money(lim - spent)) + ' left</span>')
        : '<span class="bud-note">' + (spent ? esc(money(spent)) + ' spent, no limit set' : 'No limit set') + '</span>';
      html += '<div class="bud-row"><div class="bud-top"><span class="nm">' + esc(c) + '</span>' +
        '<input type="number" min="0" step="100" inputmode="decimal" data-cat="' + esc(c) + '" value="' + (lim || '') + '" placeholder="Limit" aria-label="' + esc(c) + ' monthly limit"></div>' +
        '<div class="track"><div class="fill ' + cls + '" style="width:' + pct + '%"></div></div>' + note + '</div>';
    });
    host.innerHTML = html;
  }

  function renderBreakdown() {
    var sp = spendByCat(view.month), total = 0, items = [];
    Object.keys(sp).forEach(function (c) { total += sp[c]; items.push({ c: c, v: sp[c] }); });
    items.sort(function (a, b) { return b.v - a.v; });
    $('bkTotal').textContent = total ? money(total) : '';
    if (!total) { $('stack').innerHTML = ''; $('bk').innerHTML = '<div class="empty">No spending recorded this month.</div>'; return; }
    $('stack').innerHTML = items.map(function (it) { return '<span style="width:' + (it.v / total * 100) + '%;background:' + catColor(it.c) + '" title="' + esc(it.c) + '"></span>'; }).join('');
    $('bk').innerHTML = items.map(function (it) {
      return '<div class="bk-row"><i class="sw" style="background:' + catColor(it.c) + '"></i><span>' + esc(it.c) + '</span><span class="num">' + esc(money(it.v)) + '</span><span class="pct">' + Math.round(it.v / total * 100) + '%</span></div>';
    }).join('');
  }

  function renderList() {
    var q = $('q').value.trim().toLowerCase(), ft = $('fType').value, fc = $('fCat').value;
    var rows = inMonth(view.month).filter(function (t) {
      if (ft !== 'all' && t.type !== ft) return false;
      if (fc !== 'all' && t.cat !== fc) return false;
      if (q && (t.note + ' ' + t.cat).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    $('txCount').textContent = rows.length + (rows.length === 1 ? ' entry' : ' entries');
    if (!rows.length) { $('list').innerHTML = '<div class="empty">Nothing here yet. Add a transaction with the form.</div>'; return; }
    $('list').innerHTML = rows.map(function (t) {
      var p = t.date.split('-'), inc = t.type === 'income';
      return '<div class="tx"><div class="d"><b>' + p[2] + '</b>' + monthName(p[0] + '-' + p[1], true) + '</div>' +
        '<div class="mid"><div class="cat">' + (inc ? '' : '<i class="sw" style="background:' + catColor(t.cat) + ';margin:0"></i>') + esc(t.cat) + (t.ex ? '<span class="tag">Example</span>' : '') + '</div>' +
        (t.note ? '<div class="note">' + esc(t.note) + '</div>' : '') + '</div>' +
        '<div class="amt ' + (inc ? 'pos' : 'neg') + '">' + (inc ? '+' : '-') + esc(money(t.amount)) + '</div>' +
        '<div class="ops"><button class="btn small" data-edit="' + t.id + '">Edit</button><button class="btn small" data-del="' + t.id + '" aria-label="Delete">Delete</button></div></div>';
    }).join('');
  }

  function renderBanner() {
    var has = state.txs.some(function (t) { return t.ex; });
    $('exBanner').innerHTML = has ? '<div class="examples"><span>Example data is loaded so you can see how it works.</span><button class="btn small" id="clearEx">Clear examples</button></div>' : '';
  }

  /* form */
  function fillCats() {
    var list = view.type === 'income' ? INC : EXP;
    $('cat').innerHTML = list.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    $('tExp').setAttribute('aria-pressed', view.type === 'expense');
    $('tInc').setAttribute('aria-pressed', view.type === 'income');
  }
  function setType(t) { view.type = t; fillCats(); }
  function resetForm() {
    view.editing = null; $('amount').value = ''; $('note').value = ''; $('date').value = todayStr();
    $('formTitle').textContent = 'Add transaction'; $('save').textContent = 'Add'; $('cancel').hidden = true; $('err').textContent = '';
  }
  function startEdit(id) {
    var t = state.txs.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    view.editing = id; setType(t.type);
    $('amount').value = t.amount; $('date').value = t.date; $('cat').value = t.cat; $('note').value = t.note || '';
    $('formTitle').textContent = 'Edit transaction'; $('save').textContent = 'Save changes'; $('cancel').hidden = false; $('err').textContent = '';
    $('amount').focus();
    $('form').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function toast(msg, undoFn) {
    var host = $('toastHost');
    host.innerHTML = '<div class="toast" role="status"><span>' + esc(msg) + '</span>' + (undoFn ? '<button id="undo">Undo</button>' : '') + '</div>';
    var timer = setTimeout(function () { host.innerHTML = ''; }, 5000);
    if (undoFn) $('undo').onclick = function () { clearTimeout(timer); host.innerHTML = ''; undoFn(); };
  }

  /* backup modal */
  function openBackup() {
    var json = JSON.stringify({ txs: state.txs, budgets: state.budgets, currency: state.currency }, null, 1);
    var csv = 'date,type,category,amount,note\n' + state.txs.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (t) {
      return [t.date, t.type, t.cat, t.amount, '"' + String(t.note || '').replace(/"/g, '""') + '"'].join(',');
    }).join('\n');
    $('modalHost').innerHTML = '<div class="overlay" id="ov"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">' +
      '<h3 id="mt">Backup and restore</h3>' +
      '<p>Your data is saved in this browser only. Copy a backup to keep it somewhere safe or move it to another device.</p>' +
      '<div class="field"><label for="bkJson">Backup (JSON)</label><textarea id="bkJson" readonly></textarea></div>' +
      '<div class="actions"><button class="btn primary" id="cpJson">Copy backup</button><button class="btn" id="cpCsv">Copy as CSV</button></div>' +
      '<hr><div class="field"><label for="rsJson">Restore from a backup</label><textarea id="rsJson" placeholder="Paste a backup here"></textarea></div>' +
      '<p class="err" id="rsErr"></p>' +
      '<div class="actions"><button class="btn" id="doRestore">Restore (replaces current data)</button><button class="btn" id="closeM">Close</button></div></div></div>';
    $('bkJson').value = json;
    function copy(text, el, label) {
      function done() { el.textContent = 'Copied'; setTimeout(function () { el.textContent = label; }, 1500); }
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
      function fallback() { var ta = $('bkJson'); ta.value = text; ta.focus(); ta.select(); el.textContent = 'Select and copy'; }
    }
    $('cpJson').onclick = function () { copy(json, $('cpJson'), 'Copy backup'); };
    $('cpCsv').onclick = function () { copy(csv, $('cpCsv'), 'Copy as CSV'); };
    $('closeM').onclick = function () { $('modalHost').innerHTML = ''; };
    $('ov').addEventListener('click', function (e) { if (e.target === $('ov')) $('modalHost').innerHTML = ''; });
    $('doRestore').onclick = function () {
      try {
        var s = JSON.parse($('rsJson').value);
        if (!s || !Array.isArray(s.txs)) throw new Error();
        var clean = s.txs.filter(function (t) { return t && (t.type === 'income' || t.type === 'expense') && isFinite(+t.amount) && /^\d{4}-\d{2}-\d{2}$/.test(t.date); })
          .map(function (t) { return { id: t.id || uid(), type: t.type, amount: +t.amount, cat: String(t.cat || 'Other'), note: String(t.note || ''), date: t.date, ex: !!t.ex }; });
        state.txs = clean; state.budgets = s.budgets || {}; if (s.currency) state.currency = s.currency; state.seeded = true;
        save(); render(); $('modalHost').innerHTML = ''; toast('Restored ' + clean.length + ' transactions');
      } catch (e) { $('rsErr').textContent = 'That text is not a valid backup. Paste the full JSON from "Copy backup".'; }
    };
  }

  /* events */
  function init() {
    load();
    var fcat = '<option value="all">All categories</option>' + EXP.concat(INC).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    $('fCat').innerHTML = fcat;
    fillCats(); resetForm(); render();

    $('prev').onclick = function () { view.month = shiftMonth(view.month, -1); render(); };
    $('next').onclick = function () { view.month = shiftMonth(view.month, 1); render(); };
    $('today').onclick = function () { view.month = monthKey(new Date()); render(); };
    $('currency').onchange = function () { state.currency = $('currency').value; save(); render(); };
    $('tExp').onclick = function () { setType('expense'); };
    $('tInc').onclick = function () { setType('income'); };
    $('q').oninput = renderList; $('fType').onchange = renderList; $('fCat').onchange = renderList;
    $('backupBtn').onclick = openBackup;
    $('cancel').onclick = resetForm;

    $('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var amt = parseFloat($('amount').value), date = $('date').value;
      if (!(amt > 0)) { $('err').textContent = 'Enter an amount greater than zero.'; $('amount').focus(); return; }
      if (!date) { $('err').textContent = 'Pick a date.'; return; }
      var rec = { type: view.type, amount: Math.round(amt * 100) / 100, cat: $('cat').value, note: $('note').value.trim(), date: date };
      if (view.editing) {
        state.txs = state.txs.map(function (t) { return t.id === view.editing ? Object.assign({}, t, rec, { ex: false }) : t; });
        toast('Changes saved');
      } else { rec.id = uid(); state.txs.push(rec); toast('Added ' + (rec.type === 'income' ? 'income' : 'spending') + ' of ' + money(rec.amount)); }
      view.month = date.slice(0, 7);
      save(); resetForm(); render();
    });

    $('list').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (ed) startEdit(ed.getAttribute('data-edit'));
      if (del) {
        var id = del.getAttribute('data-del'), idx = state.txs.findIndex(function (t) { return t.id === id; });
        if (idx < 0) return;
        var removed = state.txs.splice(idx, 1)[0];
        if (view.editing === id) resetForm();
        save(); render();
        toast('Transaction deleted', function () { state.txs.push(removed); save(); render(); });
      }
    });

    $('budgets').addEventListener('change', function (e) {
      var inp = e.target.closest('input[data-cat]'); if (!inp) return;
      var v = parseFloat(inp.value);
      if (v > 0) state.budgets[inp.getAttribute('data-cat')] = v; else delete state.budgets[inp.getAttribute('data-cat')];
      save(); renderBudgets();
    });

    $('exBanner').addEventListener('click', function (e) {
      if (e.target.id === 'clearEx') {
        var prev = state.txs.slice(), prevB = Object.assign({}, state.budgets);
        state.txs = state.txs.filter(function (t) { return !t.ex; });
        state.budgets = {};
        save(); render();
        toast('Examples cleared', function () { state.txs = prev; state.budgets = prevB; save(); render(); });
      }
    });
  }
  init();
})();
