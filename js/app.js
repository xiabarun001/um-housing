/* UM 周边租房图鉴 — app */
const state = {
  condos: [],
  meta: {},
  region: 'all',
  lrt: false,
  budget: false,
  flags: new Set(),
  sort: 'walk',
  intents: [],
  intentsOk: null,
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-MY');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FLAG_LABEL = { pool: '泳池', gym: '健身房', sauna: '桑拿', steam: '蒸汽房', jacuzzi: '按摩池', badminton: '羽毛球', basketball: '篮球', squash: '壁球', tennis: '网球', bbq: '烧烤区', minimart: '楼下便利店' };
const WALK_MAX = 20; // minutes on the strip

init();

async function init() {
  const res = await fetch('data/condos.json', { cache: 'no-cache' });
  const data = await res.json();
  state.condos = data.condos;
  state.meta = data.meta;
  $('#verified-at').textContent = data.meta.verified_at;
  $('#verified-at-foot').textContent = data.meta.verified_at;
  drawStrip();
  bindFilters();
  renderGrid();
  buildCondoPicks();
  bindForm();
  loadIntents();
}

/* ---------- helpers ---------- */
function roomsMin(c) {
  const s = c.snapshot?.rooms;
  if (!s) return null;
  // 只认 RM 300 以上的数字，避免把“水电 RM 50”这类附加费当成房租
  const nums = [...s.matchAll(/RM\s?([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => n >= 300);
  return nums.length ? Math.min(...nums) : null;
}
function walkText(c) {
  const t = c.transit;
  if (t.walk_min == null) return null;
  return `${t.walk_min} 分钟`;
}
function regionShort(c) { return state.meta.regions[String(c.region)].short; }

/* ---------- strip (signature) ---------- */
function drawStrip() {
  const svg = $('#strip');
  const W = 1040, H = 250;
  const x0 = 70, x1 = 760;               // axis span for 0..20 min
  const binX0 = 810, binX1 = 1020;       // "no rail" bin
  const lanes = { 2: 78, 1: 178 };       // y of each region lane (Bangsar South on top: it's where the LRT is)
  const xOf = (m) => x0 + (Math.min(m, WALK_MAX) / WALK_MAX) * (x1 - x0);
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  svg.innerHTML = '';

  // axis + ticks
  const axisY = 228;
  svg.appendChild(el('line', { x1: x0, y1: axisY, x2: x1, y2: axisY, class: 'axis-line' }));
  for (let m = 0; m <= WALK_MAX; m += 5) {
    const x = xOf(m);
    svg.appendChild(el('line', { x1: x, y1: 40, x2: x, y2: axisY, class: 'tick' }));
    svg.appendChild(el('text', { x, y: axisY + 18, 'text-anchor': 'middle', class: 'axis-label' }, m === WALK_MAX ? `${m}+ 分钟` : `${m}`));
  }
  svg.appendChild(el('text', { x: x0, y: 26, class: 'axis-label' }, '步行分钟 →'));
  // bin
  svg.appendChild(el('line', { x1: binX0 - 20, y1: 30, x2: binX0 - 20, y2: axisY + 4, class: 'bin-line' }));
  svg.appendChild(el('text', { x: binX0, y: 26, class: 'bin-label' }, '无步行可达轨道站'));
  svg.appendChild(el('text', { x: binX0, y: axisY + 18, class: 'axis-label' }, '公交 / Grab'));
  // lane labels
  svg.appendChild(el('text', { x: 4, y: lanes[2] + 5, class: 'lane-label' }, '区域 2'));
  svg.appendChild(el('text', { x: 4, y: lanes[1] + 5, class: 'lane-label' }, '区域 1'));

  // place pins; labels go into the first free row above/below the lane so names never overlap
  for (const region of [2, 1]) {
    const list = state.condos.filter((c) => c.region === region);
    const onAxis = list.filter((c) => c.transit.walk_min != null).sort((a, b) => a.transit.walk_min - b.transit.walk_min);
    const noRail = list.filter((c) => c.transit.walk_min == null);
    const rows = [-16, -33, 26, 43];            // label baseline offsets from the lane
    const rowEnd = rows.map(() => -Infinity);   // right edge of the last label in each row
    let prevMin = null, sameCount = 0;
    onAxis.forEach((c) => {
      const x = xOf(c.transit.walk_min);
      // identical minutes: nudge the second pin down so both circles stay visible
      sameCount = prevMin === c.transit.walk_min ? sameCount + 1 : 0;
      prevMin = c.transit.walk_min;
      const y = lanes[region] + (sameCount ? 14 : 0);
      const label = shortName(c);
      const w = label.length * 7.2 + 8;
      let ri = rows.findIndex((_, i) => rowEnd[i] < x - w / 2 - 6);
      if (ri < 0) ri = 0;
      rowEnd[ri] = x + w / 2;
      addPin(c, x, y, region, rows[ri] + (sameCount ? 14 : 0));
    });
    // bin pins in two compact columns
    noRail.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = binX0 + 8 + col * 104;
      const y = lanes[region] - 28 + row * 28;
      addPin(c, x, y, region, 0, true);
    });
  }

  function addPin(c, x, y, region, dy, inBin = false) {
    const g = el('g', { class: `pin r${region}${c.transit.walk_est ? ' est' : ''}`, tabindex: '0', role: 'link', 'aria-label': `${c.alias}，${walkText(c) ? '步行 ' + walkText(c) : '无步行可达轨道站'}` });
    g.appendChild(el('circle', { cx: x, cy: y, r: 9 }));
    const label = el('text', { x: inBin ? x + 14 : x, y: inBin ? y + 4 : y + dy, 'text-anchor': inBin ? 'start' : 'middle' }, shortName(c));
    g.appendChild(label);
    g.appendChild(el('title', {}, `${c.name} · ${walkText(c) ? '到 ' + c.transit.nearest + ' 步行 ' + walkText(c) : c.transit.nearest}`));
    const go = () => { const card = document.getElementById('card-' + c.id); if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.focus({ preventScroll: true }); } };
    g.addEventListener('click', go);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    svg.appendChild(g);
  }
  function shortName(c) {
    const map = { 'kl-gateway': 'KL Gateway', 'south-view': 'South View', 'southlink': 'Southlink', 'novum': 'Novum', 'pantai-panorama': 'Panorama', 'laurel': 'Laurel', 'saville': 'Saville', 'inwood': 'Inwood', 'secoya': 'Secoya', 'seventeen': 'Seventeen', 'atwater': 'Atwater', 'ryan-miho': 'Ryan & Miho', 'pacific-star': 'Pacific Star', 'pacific-63': 'Pacific 63', 'pj-midtown': 'PJ Midtown', 'centrestage': 'Centrestage', 'pj8': 'PJ8', 'tiara-damansara': 'Tiara', 'dvogue': "D'Vogue" };
    return map[c.id] || c.alias;
  }
}

/* ---------- filters ---------- */
function bindFilters() {
  $$('.seg-btn').forEach((b) => b.addEventListener('click', () => {
    $$('.seg-btn').forEach((x) => x.classList.toggle('is-on', x === b));
    state.region = b.dataset.region;
    renderGrid();
  }));
  $('#f-lrt').addEventListener('change', (e) => { state.lrt = e.target.checked; renderGrid(); });
  $('#f-budget').addEventListener('change', (e) => { state.budget = e.target.checked; renderGrid(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });
  $$('.chip-check input').forEach((i) => i.addEventListener('change', () => {
    if (i.checked) state.flags.add(i.dataset.flag); else state.flags.delete(i.dataset.flag);
    renderGrid();
  }));
  $('#f-reset').addEventListener('click', () => {
    state.region = 'all'; state.lrt = false; state.budget = false; state.flags.clear(); state.sort = 'walk';
    $$('.seg-btn').forEach((x) => x.classList.toggle('is-on', x.dataset.region === 'all'));
    $('#f-lrt').checked = false; $('#f-budget').checked = false; $('#sort').value = 'walk';
    $$('.chip-check input').forEach((i) => { i.checked = false; });
    renderGrid();
  });
}

function filtered() {
  let list = state.condos.slice();
  if (state.region !== 'all') list = list.filter((c) => String(c.region) === state.region);
  if (state.lrt) list = list.filter((c) => c.transit.walk_min != null && c.transit.walk_min <= 10);
  if (state.budget) list = list.filter((c) => { const m = roomsMin(c); return m != null && m <= 1300; });
  for (const f of state.flags) list = list.filter((c) => c.flags[f]);
  const cmp = {
    walk: (a, b) => (a.transit.walk_min ?? 99) - (b.transit.walk_min ?? 99) || a.region - b.region,
    rent: (a, b) => (a.snapshot.rent_from ?? 1e9) - (b.snapshot.rent_from ?? 1e9),
    year: (a, b) => (b.completed ?? 0) - (a.completed ?? 0),
    units: (a, b) => (a.units ?? 1e9) - (b.units ?? 1e9),
  }[state.sort];
  return list.sort(cmp);
}

/* ---------- grid ---------- */
function renderGrid() {
  const list = filtered();
  const grid = $('#grid');
  grid.innerHTML = list.map(cardHTML).join('');
  $('#empty').hidden = list.length > 0;
  $('#result-count').textContent = `显示 ${list.length} / ${state.condos.length} 个小区`;
  $$('[data-detail]', grid).forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.detail)));
  paintIntentCounts();
}

function cardHTML(c) {
  const t = c.transit;
  const walk = t.walk_min;
  const pct = walk == null ? 100 : Math.max(6, Math.min(100, 100 - (walk / WALK_MAX) * 100));
  const facs = c.facilities.slice(0, 6);
  const more = c.facilities.length - facs.length;
  const rmin = roomsMin(c);
  const tagClass = (tg) => /步行到 LRT|预算内|最便宜|房源最多|设施最全|整租适合/.test(tg) ? 'good' : /无 LRT|超预算|离 UM 远|拥挤|只能整租/.test(tg) ? 'warn' : '';
  return `
  <article class="card r${c.region}" id="card-${c.id}" tabindex="-1">
    <span class="intent-count" data-count-for="${c.id}" hidden></span>
    <div class="card-top">
      <span class="region-tag"><i class="dot r${c.region}"></i>${esc(regionShort(c))}</span>
    </div>
    <h3>${esc(c.alias.replace(/（.*?）/, ''))}<small>${esc(c.name)}</small></h3>
    <p class="meta">${c.completed ? c.completed + ' 年' : '年份不详'} · ${c.units ? fmt(c.units) + ' 户' : '户数不详'} · ${esc(c.tenure.split(' ')[0])} · ${esc(c.type)}</p>
    <p class="transit">
      ${walk == null
        ? `<span class="min none">无步行可达轨道站</span><span>${esc((t.buses || []).length ? '公交 ' + t.buses.slice(0, 3).join(' / ') : '靠 Grab')}</span>`
        : `<span class="min">${walk}<span style="font-size:14px;font-weight:600"> 分钟</span></span><span>到 ${esc(t.nearest)}${t.walk_m ? ' · ' + t.walk_m + ' m' : ''}</span>${t.walk_est ? '<span class="est-mark">估算</span>' : ''}`}
    </p>
    <div class="walkbar${walk == null ? ' none' : ''}" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <ul class="fac-chips" aria-label="设施">${facs.map((f) => `<li>${esc(f)}</li>`).join('')}${more > 0 ? `<li class="more">+${more}</li>` : ''}</ul>
    <div class="snap">
      <div><span class="k">在租（${esc(c.snapshot.date.slice(5))}）</span><span class="v">${fmt(c.snapshot.for_rent)}</span></div>
      <div><span class="k">最低月租</span><span class="v">${c.snapshot.rent_from ? 'RM ' + fmt(c.snapshot.rent_from) : '—'}</span></div>
      <div><span class="k">单间起价</span><span class="v${rmin ? '' : ' small'}">${rmin ? 'RM ' + fmt(rmin) : '无单间帖'}</span></div>
    </div>
    ${c.snapshot.rooms ? `<p class="rooms">${esc(c.snapshot.rooms)} <span class="src">（${esc(c.snapshot.rooms_source || '')}）</span></p>` : ''}
    ${c.snapshot.whole ? `<p class="rooms">整租：${esc(c.snapshot.whole)} <span class="src">（${esc(c.snapshot.whole_source || '')}）</span></p>` : ''}
    <div class="tags">${c.tags.map((tg) => `<span class="tag ${tagClass(tg)}">${esc(tg)}</span>`).join('')}</div>
    <div class="actions">
      <a class="btn primary" href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">看 iProperty 在租</a>
      <a class="btn" href="${esc(c.links.ibilik)}" target="_blank" rel="noopener">iBilik 单间</a>
      <a class="btn" href="${esc(c.links.maps)}" target="_blank" rel="noopener">地图</a>
      <button type="button" class="btn ghost" data-detail="${c.id}">详情与来源 →</button>
    </div>
  </article>`;
}

/* ---------- detail ---------- */
function openDetail(id) {
  const c = state.condos.find((x) => x.id === id);
  if (!c) return;
  const t = c.transit;
  const mine = state.intents.filter((i) => (i.condos || []).includes(c.id));
  $('#detail-inner').innerHTML = `
    <button type="button" class="btn ghost detail-close" data-close aria-label="关闭">关闭 ✕</button>
    <p class="eyebrow"><i class="dot r${c.region}"></i> ${esc(state.meta.regions[String(c.region)].label)}</p>
    <h2 id="detail-title">${esc(c.name)}</h2>
    <p class="sub">${esc(c.address)}</p>
    <dl class="kv">
      <dt>开发商</dt><dd>${esc(c.developer)}</dd>
      <dt>地契</dt><dd>${esc(c.tenure)}</dd>
      <dt>建成</dt><dd>${c.completed ?? '不详'}</dd>
      <dt>规模</dt><dd>${c.units ? fmt(c.units) + ' 户' : '户数不详'} · ${esc(c.floors)}</dd>
      <dt>最近轨道站</dt><dd>${esc(t.nearest)}${t.walk_min != null ? ` · 步行约 ${t.walk_min} 分钟${t.walk_m ? '（' + t.walk_m + ' m）' : ''}${t.walk_est ? '，估算' : ''}` : ''}${(t.other || []).length ? '<br>其他：' + esc(t.other.join('；')) : ''}</dd>
      <dt>公交</dt><dd>${(t.buses || []).length ? esc(t.buses.join('、')) : '—'}</dd>
      ${c.um_km ? `<dt>到 UM</dt><dd>约 ${c.um_km} km${c.um_km_note ? '（' + esc(c.um_km_note) + '）' : ''}</dd>` : ''}
    </dl>
    ${t.note ? `<p>${esc(t.note)}</p>` : ''}
    <h3>设施（${c.facilities.length} 项）</h3>
    <ul class="fac-chips">${c.facilities.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <h3>在租快照 · ${esc(c.snapshot.date)}</h3>
    <ul>
      <li>iProperty 在租 ${fmt(c.snapshot.for_rent)} 套，最低月租 ${c.snapshot.rent_from ? 'RM ' + fmt(c.snapshot.rent_from) : '—'}</li>
      ${c.snapshot.rooms ? `<li>单间：${esc(c.snapshot.rooms)}（${esc(c.snapshot.rooms_source || '')}）</li>` : '<li>单间：本次没有找到在租单间</li>'}
      ${c.snapshot.whole ? `<li>整租：${esc(c.snapshot.whole)}（${esc(c.snapshot.whole_source || '')}）</li>` : ''}
    </ul>
    ${c.notes?.length ? `<h3>要知道的</h3><ul>${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <h3>同学意向（${mine.length}）</h3>
    ${mine.length ? `<ul>${mine.map((i) => `<li>${esc(i.nickname)} · RM ${fmt(i.budget)} · ${esc(i.room_type || '不限')}${i.need_roommate ? ' · 想找室友' : ''}</li>`).join('')}</ul>` : '<p class="sub">还没有同学选这里。</p>'}
    <h3>来源</h3>
    <ul class="src-list">${c.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
    <div class="detail-actions">
      <a class="btn primary" href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">看 iProperty 在租</a>
      <a class="btn" href="${esc(c.links.iproperty_building)}" target="_blank" rel="noopener">iProperty 项目页</a>
      <a class="btn" href="${esc(c.links.ibilik)}" target="_blank" rel="noopener">iBilik 单间</a>
      <a class="btn" href="${esc(c.links.maps)}" target="_blank" rel="noopener">地图</a>
    </div>`;
  const dlg = $('#detail');
  $('[data-close]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }, { once: true });
  dlg.showModal();
}

/* ---------- intents (shared sheet) ---------- */
function cfg() {
  const c = window.UM_CONFIG || {};
  return c.SUPABASE_URL && c.SUPABASE_KEY ? c : null;
}
function buildCondoPicks() {
  const box = $('#condo-picks');
  box.innerHTML = state.condos.map((c) => `<label class="chip-check"><input type="checkbox" name="condos" value="${c.id}"> ${esc(c.alias.replace(/（.*?）/, ''))}</label>`).join('');
  box.addEventListener('change', () => {
    const on = $$('input[name="condos"]:checked', box);
    $$('input[name="condos"]', box).forEach((i) => { i.disabled = !i.checked && on.length >= 3; });
  });
}
async function loadIntents() {
  const c = cfg();
  if (!c) { state.intentsOk = false; renderIntents(); return; }
  try {
    const r = await fetch(`${c.SUPABASE_URL}/rest/v1/intents?select=*&order=created_at.desc&limit=300`, { headers: { apikey: c.SUPABASE_KEY, Accept: 'application/json' } });
    if (!r.ok) throw new Error(r.status);
    state.intents = await r.json();
    state.intentsOk = true;
  } catch (e) {
    console.warn('intents load failed', e);
    state.intentsOk = false;
  }
  renderIntents();
}
function renderIntents() {
  const tbody = $('#intent-table tbody');
  const wrap = $('.table-wrap');
  $('#intent-offline').hidden = state.intentsOk !== false;
  $('#intent-empty').hidden = !(state.intentsOk && state.intents.length === 0);
  wrap.hidden = !(state.intentsOk && state.intents.length > 0);
  const byId = Object.fromEntries(state.condos.map((c) => [c.id, c.alias.replace(/（.*?）/, '')]));
  tbody.innerHTML = state.intents.map((i) => `
    <tr>
      <td>${esc(new Date(i.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }))}</td>
      <td>${esc(i.nickname)}</td>
      <td class="num">${i.budget ? 'RM ' + fmt(i.budget) : '—'}</td>
      <td>${esc(i.room_type || '不限')}</td>
      <td>${(i.condos || []).map((id) => `<span class="pick">${esc(byId[id] || id)}</span>`).join('') || '—'}</td>
      <td>${esc(i.move_in || '—')}</td>
      <td>${i.need_roommate ? '想找' : '—'}</td>
      <td>${esc(i.contact || '—')}</td>
      <td>${esc(i.note || '')}</td>
    </tr>`).join('');
  // summary
  const sum = $('#intent-summary');
  if (state.intentsOk && state.intents.length) {
    const counts = {};
    state.intents.forEach((i) => (i.condos || []).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${byId[id] || id} ${n}`).join(' · ');
    const budgets = state.intents.map((i) => i.budget).filter(Boolean).sort((a, b) => a - b);
    const med = budgets.length ? budgets[Math.floor(budgets.length / 2)] : null;
    const rm = state.intents.filter((i) => i.need_roommate).length;
    sum.innerHTML = `<span><b>${state.intents.length}</b>人已填</span>${med ? `<span><b>RM ${fmt(med)}</b>预算中位数</span>` : ''}<span><b>${rm}</b>人想找室友</span>${top ? `<span>最多人选：${esc(top)}</span>` : ''}`;
  } else sum.innerHTML = '';
  paintIntentCounts();
}
function paintIntentCounts() {
  const counts = {};
  state.intents.forEach((i) => (i.condos || []).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
  $$('[data-count-for]').forEach((el) => {
    const n = counts[el.dataset.countFor] || 0;
    el.hidden = n === 0;
    el.textContent = `${n} 位同学意向`;
  });
}
function bindForm() {
  const form = $('#intent-form');
  const msg = $('#form-msg');
  const btn = $('#i-submit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const c = cfg();
    msg.className = 'form-msg';
    if (!c) { msg.textContent = '共享表还没接上数据库。'; msg.classList.add('err'); return; }
    const fd = new FormData(form);
    const nickname = String(fd.get('nickname') || '').trim();
    const budget = Number(fd.get('budget'));
    if (!nickname) { msg.textContent = '昵称要填。'; msg.classList.add('err'); $('#i-nick').focus(); return; }
    if (!(budget >= 300 && budget <= 20000)) { msg.textContent = '预算填 300 到 20,000 之间的数字。'; msg.classList.add('err'); $('#i-budget').focus(); return; }
    const body = {
      nickname, budget,
      room_type: fd.get('room_type') || '不限',
      condos: fd.getAll('condos').slice(0, 3),
      move_in: String(fd.get('move_in') || '').trim() || null,
      need_roommate: fd.get('need_roommate') === 'on',
      contact: String(fd.get('contact') || '').trim() || null,
      note: String(fd.get('note') || '').trim() || null,
    };
    btn.disabled = true; msg.textContent = '提交中…';
    try {
      const r = await fetch(`${c.SUPABASE_URL}/rest/v1/intents`, {
        method: 'POST',
        headers: { apikey: c.SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const t = await r.text(); throw new Error(t.slice(0, 200)); }
      const [row] = await r.json();
      state.intents.unshift(row);
      state.intentsOk = true;
      renderIntents();
      form.reset();
      $$('input[name="condos"]').forEach((i) => { i.disabled = false; });
      msg.textContent = '已提交，表里能看到了。'; msg.classList.add('ok');
    } catch (err) {
      console.warn(err);
      msg.textContent = /too many/.test(String(err)) ? '这一分钟提交的人太多了，等一会儿再试。' : '提交失败，刷新后再试一次。';
      msg.classList.add('err');
    } finally {
      btn.disabled = false;
    }
  });
}
