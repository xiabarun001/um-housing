/* UM 周边租房图鉴 — app */
const state = {
  condos: [],
  meta: {},
  region: 'all',
  lrt: false,
  budget: false,
  flags: new Set(),
  sort: 'no',
  intents: [],
  intentsOk: null,
  map: null,
  markers: {},
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-MY');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortAlias = (c) => c.alias.replace(/（.*?）/, '');

init();

async function init() {
  const [data, campus] = await Promise.all([
    fetch('data/condos.json', { cache: 'no-cache' }).then((r) => r.json()),
    fetch('data/um.geojson').then((r) => r.json()).catch(() => null),
  ]);
  state.condos = data.condos;
  state.meta = data.meta;
  $$('.verified-at').forEach((t) => { t.textContent = data.meta.verified_at; });
  drawMap(campus);
  bindFilters();
  renderList();
  buildCondoPicks();
  bindForm();
  loadIntents();
  bindCalc();
  bindCopy();
  bindChecklists();
  bindNav();
  // 地图气泡里的"看详情"按钮
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-detail]');
    if (b) { e.preventDefault(); openDetail(b.dataset.openDetail); }
  });
}

/* ---------- guide widgets ---------- */
function bindCalc() {
  const input = $('#calc-rent');
  if (!input) return;
  const rm = (n) => 'RM ' + fmt(Math.round(n));
  const run = () => {
    const r = Number(input.value) || 0;
    const stamp = Math.max(0, Math.round((r * 12 - 2400) / 250)) + 10;
    $('#c-dep').textContent = rm(r * 2);
    $('#c-adv').textContent = rm(r);
    $('#c-util').textContent = rm(r * 0.5);
    $('#c-stamp').textContent = r ? `约 ${rm(stamp)}` : '—';
    const base = r * 3.5 + stamp;
    $('#c-total').textContent = r ? `${rm(base + 100 + 150)} 到 ${rm(base + 200 + 300)}` : '—';
  };
  input.addEventListener('input', run);
  run();
}
function bindCopy() {
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const text = $('#' + b.dataset.copy)?.textContent || '';
    try { await navigator.clipboard.writeText(text); b.textContent = '已复制'; }
    catch { b.textContent = '请手动选中复制'; }
    setTimeout(() => { b.textContent = '复制'; }, 1800);
  }));
}
function bindChecklists() {
  $$('[data-checklist]').forEach((list) => {
    const key = 'um-check:' + list.dataset.checklist;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { saved = {}; }
    $$('input[type=checkbox]', list).forEach((cb, i) => {
      cb.checked = !!saved[i];
      cb.addEventListener('change', () => {
        saved[i] = cb.checked;
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* 隐私模式下忽略 */ }
      });
    });
  });
}
function bindNav() {
  const links = $$('#stepnav a');
  if (!links.length || !('IntersectionObserver' in window)) return;
  const byId = Object.fromEntries(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((a) => a.classList.remove('is-active'));
        byId[en.target.id]?.classList.add('is-active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  Object.keys(byId).forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
}

/* ---------- helpers ---------- */
function roomsMin(c) {
  const s = c.snapshot?.rooms;
  if (!s) return null;
  // 只认 RM 300 以上的数字，避免把“水电 RM 50”当成房租
  const nums = [...s.matchAll(/RM\s?([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => n >= 300);
  return nums.length ? Math.min(...nums) : null;
}
function stationZh(nearest) {
  // "Universiti LRT（KJ19）" -> "Universiti 站"
  const m = String(nearest || '').match(/^([A-Za-z ]+?)\s*(LRT|MRT)/);
  return m ? `${m[1].trim()} 站` : nearest;
}
function goSentence(c) {
  const t = c.transit;
  if (t.walk_min == null) {
    const bus = (t.buses || []).filter((b) => /^[A-Z]?\d/.test(b)).slice(0, 3);
    return `<b>没有走得到的轻轨站。</b>${bus.length ? '公交 ' + bus.join(' / ') + '，或者 Grab' : '靠免费巴士或 Grab'}${c.id === 'pacific-star' ? '，楼盘有穿梭巴士到 Asia Jaya 站' : ''}。`;
  }
  return `走 <b>${t.walk_min} 分钟</b>到${stationZh(t.nearest)}${t.walk_m ? `（${t.walk_m} 米）` : ''}${t.walk_est ? '，分钟数是估算' : ''}。`;
}

/* ---------- map ---------- */
function drawMap(campus) {
  if (typeof L === 'undefined') { $('#map').innerHTML = '<p style="padding:16px">地图组件没有加载出来，刷新试试。</p>'; return; }
  const map = L.map('map', { scrollWheelZoom: false, zoomSnap: 0.5 });
  map.setView([3.115, 101.65], 14); // 先给一个视角，矢量图层才能正常绘制，最后再 fitBounds
  state.map = map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const bounds = L.latLngBounds([]);

  // UM 校园
  if (campus) {
    const layer = L.geoJSON(campus, { style: { color: '#3E8E5B', weight: 1.5, fillColor: '#3E8E5B', fillOpacity: 0.22 } }).addTo(map);
    const c = layer.getBounds().getCenter();
    L.marker(c, { icon: L.divIcon({ className: 'campus-label', html: '马来亚大学 UM', iconSize: null }), interactive: false }).addTo(map);
    bounds.extend(layer.getBounds());
  }

  // 轻轨线 + 车站
  const st = state.meta.stations || [];
  L.polyline(st.map((s) => [s.lat, s.lng]), { color: '#D6336C', weight: 5, opacity: 0.85, lineJoin: 'round' }).addTo(map);
  st.forEach((s) => {
    const major = /Universiti|Kerinchi|Asia Jaya|Taman Jaya/.test(s.name);
    L.circleMarker([s.lat, s.lng], { radius: major ? 6 : 5, color: '#D6336C', weight: 3, fillColor: '#fff', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip(s.zh, { permanent: true, direction: s.name === 'Universiti' ? 'right' : 'bottom', offset: s.name === 'Universiti' ? [8, 0] : [0, 6], className: 'station-label' + (major ? ' major' : '') });
  });
  (state.meta.mrt || []).forEach((s) => {
    L.circleMarker([s.lat, s.lng], { radius: 5, color: '#2E8B57', weight: 3, fillColor: '#fff', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip(s.zh, { permanent: true, direction: 'right', offset: [8, 0], className: 'station-label' });
  });

  // 区域标签
  L.marker([3.1235, 101.6285], { icon: L.divIcon({ className: 'area-label r1', html: '区域 1 · PJ 这一侧', iconSize: null }), interactive: false }).addTo(map);
  L.marker([3.1065, 101.6700], { icon: L.divIcon({ className: 'area-label r2', html: '区域 2 · Bangsar South', iconSize: null }), interactive: false }).addTo(map);

  // 小区
  state.condos.forEach((c) => {
    const icon = L.divIcon({ className: '', html: `<div class="condo-pin r${c.region}">${c.no}</div>`, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
    const m = L.marker([c.lat, c.lng], { icon, title: c.name, alt: c.name }).addTo(map);
    const rmin = roomsMin(c);
    m.bindPopup(`
      <h4>${c.no} · ${esc(shortAlias(c))}</h4>
      <p>${goSentence(c)}</p>
      <p>${rmin ? `单间 RM ${fmt(rmin)} 起 · ` : ''}iProperty 在租 ${fmt(c.snapshot.for_rent)} 套，最低 RM ${fmt(c.snapshot.rent_from)}</p>
      <p><button type="button" class="linkish" data-open-detail="${c.id}">看设施、价格和来源</button> · <a href="#card-${c.id}">跳到卡片</a></p>`);
    state.markers[c.id] = m;
    bounds.extend([c.lat, c.lng]);
  });

  state.allBounds = bounds.pad(0.08);
  map.fitBounds(state.allBounds);
  $('#map-reset')?.addEventListener('click', () => { map.closePopup(); map.fitBounds(state.allBounds); });
  // 点一下地图再允许滚轮缩放，避免页面滚动被劫持
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
}

/* ---------- filters ---------- */
function bindFilters() {
  $$('.tab').forEach((b) => b.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('is-on', x === b));
    state.region = b.dataset.region;
    renderList();
  }));
  $('#f-lrt').addEventListener('change', (e) => { state.lrt = e.target.checked; renderList(); });
  $('#f-budget').addEventListener('change', (e) => { state.budget = e.target.checked; renderList(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
  $$('.tool-flags input').forEach((i) => i.addEventListener('change', () => {
    if (i.checked) state.flags.add(i.dataset.flag); else state.flags.delete(i.dataset.flag);
    const n = state.flags.size;
    $('.tool-more summary').textContent = n ? `设施（已选 ${n}）` : '设施';
    renderList();
  }));
  $('#f-reset').addEventListener('click', () => {
    state.region = 'all'; state.lrt = false; state.budget = false; state.flags.clear(); state.sort = 'no';
    $$('.tab').forEach((x) => x.classList.toggle('is-on', x.dataset.region === 'all'));
    $('#f-lrt').checked = false; $('#f-budget').checked = false; $('#sort').value = 'no';
    $$('.tool-flags input').forEach((i) => { i.checked = false; });
    $('.tool-more summary').textContent = '设施';
    renderList();
  });
  document.addEventListener('click', (e) => {
    const d = $('.tool-more');
    if (d && d.open && !d.contains(e.target)) d.open = false;
  });
}

function filtered() {
  let list = state.condos.slice();
  if (state.region !== 'all') list = list.filter((c) => String(c.region) === state.region);
  if (state.lrt) list = list.filter((c) => c.transit.walk_min != null && c.transit.walk_min <= 10);
  if (state.budget) list = list.filter((c) => { const m = roomsMin(c); return m != null && m <= 1300; });
  for (const f of state.flags) list = list.filter((c) => c.flags[f]);
  const cmp = {
    no: (a, b) => a.no - b.no,
    walk: (a, b) => (a.transit.walk_min ?? 99) - (b.transit.walk_min ?? 99) || a.no - b.no,
    rent: (a, b) => (a.snapshot.rent_from ?? 1e9) - (b.snapshot.rent_from ?? 1e9),
    year: (a, b) => (b.completed ?? 0) - (a.completed ?? 0),
  }[state.sort];
  return list.sort(cmp);
}

/* ---------- list ---------- */
function renderList() {
  const list = filtered();
  const grid = $('#grid');
  grid.innerHTML = list.map(cardHTML).join('');
  $('#empty').hidden = list.length > 0;
  $('#result-count').textContent = `显示 ${list.length} 个，共 ${state.condos.length} 个`;
  $$('[data-detail]', grid).forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.detail)));
  $$('[data-locate]', grid).forEach((b) => b.addEventListener('click', () => locate(b.dataset.locate)));
  paintIntentCounts();
}

function locate(id) {
  const c = state.condos.find((x) => x.id === id);
  if (!c || !state.map) return;
  $('#map-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  state.map.setView([c.lat, c.lng], 16, { animate: true });
  setTimeout(() => state.markers[id]?.openPopup(), 400);
}

function cardHTML(c) {
  const t = c.transit;
  const rmin = roomsMin(c);
  const facs = c.facilities.slice(0, 5).join('、');
  const more = c.facilities.length - 5;
  const tenure = c.tenure.includes('Freehold') ? '永久地契' : '租赁地契';
  const flagBits = [];
  if (t.walk_min != null && t.walk_min <= 10) flagBits.push('<span class="ok">走路能到轻轨</span>');
  if (t.walk_min == null) flagBits.push('<span class="no-lrt">没有轻轨</span>');
  if (rmin != null && rmin <= 1300) flagBits.push('<span class="ok">有 RM 1,300 内单间</span>');
  if (c.tags.includes('只能整租')) flagBits.push('只有整套出租');
  if (c.tags.includes('整租适合两人')) flagBits.push('<span class="ok">适合两人整租</span>');
  if (c.tags.includes('整租适合三人')) flagBits.push('<span class="ok">适合三人整租</span>');
  if (c.tags.includes('最新楼盘')) flagBits.push('新楼');
  if (c.tags.includes('家庭户型')) flagBits.push('家庭大户型');
  return `
  <article class="card r${c.region}" id="card-${c.id}">
    <span class="no" aria-label="编号 ${c.no}">${c.no}</span>
    <h3>${esc(shortAlias(c))}<small>${esc(c.name)} · ${esc(c.address)}</small></h3>
    <p class="go${t.walk_min == null ? ' none' : ''}">${goSentence(c)}</p>
    <p class="facts">${c.completed ? c.completed + ' 年建成' : '建成年份不详'} · ${c.units ? fmt(c.units) + ' 户' : '户数不详'} · ${tenure} · ${esc(c.type)}</p>
    <p class="facs">设施：${esc(facs)}${more > 0 ? ` 等 ${c.facilities.length} 项` : ''}</p>
    <div class="price">
      ${c.snapshot.rooms ? `<p><span class="big">单间</span> ${esc(c.snapshot.rooms)} <span class="src">（${esc(c.snapshot.rooms_source || '')}）</span></p>` : '<p><span class="big">单间</span> 这次没有找到在租的单间</p>'}
      ${c.snapshot.whole ? `<p><span class="big">整套</span> ${esc(c.snapshot.whole)} <span class="src">（${esc(c.snapshot.whole_source || '')}）</span></p>` : ''}
      <p class="src">iProperty 在租 ${fmt(c.snapshot.for_rent)} 套，最低 RM ${fmt(c.snapshot.rent_from)}，${esc(c.snapshot.date)} 查</p>
    </div>
    ${flagBits.length ? `<p class="flags">${flagBits.join(' · ')}</p>` : ''}
    <div class="acts">
      <a class="btn primary" href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">iProperty 在租房源</a>
      <a class="linkish" href="${esc(c.links.ibilik)}" target="_blank" rel="noopener">iBilik 找单间</a>
      <button type="button" class="linkish" data-locate="${c.id}">在地图上看</button>
      <a class="linkish" href="${esc(c.links.maps)}" target="_blank" rel="noopener">Google 地图</a>
      <button type="button" class="linkish" data-detail="${c.id}">来源与详情</button>
    </div>
    <span class="who" data-count-for="${c.id}" hidden></span>
  </article>`;
}

/* ---------- detail ---------- */
function openDetail(id) {
  const c = state.condos.find((x) => x.id === id);
  if (!c) return;
  const t = c.transit;
  const mine = state.intents.filter((i) => (i.condos || []).includes(c.id));
  $('#detail-inner').innerHTML = `
    <button type="button" class="btn detail-close" data-close aria-label="关闭">关闭</button>
    <h2 id="detail-title">${c.no} · ${esc(c.name)}</h2>
    <p class="sub">${esc(c.address)} · ${esc(state.meta.regions[String(c.region)].label)}</p>
    <dl class="kv">
      <dt>去学校</dt><dd>${goSentence(c)}${(t.other || []).length ? '<br>其他车站：' + esc(t.other.join('；')) : ''}${t.note ? '<br>' + esc(t.note) : ''}</dd>
      <dt>公交</dt><dd>${(t.buses || []).length ? esc(t.buses.join('、')) : '—'}</dd>
      ${c.um_km ? `<dt>到 UM</dt><dd>约 ${c.um_km} 公里${c.um_km_note ? '（' + esc(c.um_km_note) + '）' : ''}</dd>` : ''}
      <dt>开发商</dt><dd>${esc(c.developer)}</dd>
      <dt>地契</dt><dd>${esc(c.tenure)}</dd>
      <dt>建成</dt><dd>${c.completed ?? '不详'}</dd>
      <dt>规模</dt><dd>${c.units ? fmt(c.units) + ' 户' : '户数不详'} · ${esc(c.floors)}</dd>
    </dl>
    <h3>设施（${c.facilities.length} 项）</h3>
    <p>${esc(c.facilities.join('、'))}</p>
    <h3>在租快照 · ${esc(c.snapshot.date)}</h3>
    <ul>
      <li>iProperty 在租 ${fmt(c.snapshot.for_rent)} 套，最低月租 ${c.snapshot.rent_from ? 'RM ' + fmt(c.snapshot.rent_from) : '—'}</li>
      ${c.snapshot.rooms ? `<li>单间：${esc(c.snapshot.rooms)}（${esc(c.snapshot.rooms_source || '')}）</li>` : '<li>单间：这次没有找到在租的单间</li>'}
      ${c.snapshot.whole ? `<li>整套：${esc(c.snapshot.whole)}（${esc(c.snapshot.whole_source || '')}）</li>` : ''}
    </ul>
    ${c.notes?.length ? `<h3>要知道的</h3><ul>${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <h3>同学意向（${mine.length}）</h3>
    ${mine.length ? `<ul>${mine.map((i) => `<li>${esc(i.nickname)} · RM ${fmt(i.budget)} · ${esc(i.room_type || '不限')}${i.need_roommate ? ' · 想找室友' : ''}</li>`).join('')}</ul>` : '<p class="sub">还没有同学选这里。</p>'}
    <h3>来源</h3>
    <ul>${c.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
    <div class="detail-acts">
      <a class="btn primary" href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">iProperty 在租房源</a>
      <a class="btn" href="${esc(c.links.iproperty_building)}" target="_blank" rel="noopener">iProperty 项目页</a>
      <a class="btn" href="${esc(c.links.ibilik)}" target="_blank" rel="noopener">iBilik 找单间</a>
      <a class="btn" href="${esc(c.links.maps)}" target="_blank" rel="noopener">Google 地图</a>
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
  box.innerHTML = state.condos.map((c) => `<label><input type="checkbox" name="condos" value="${c.id}"> ${c.no} ${esc(shortAlias(c))}</label>`).join('');
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
  const byId = Object.fromEntries(state.condos.map((c) => [c.id, shortAlias(c)]));
  tbody.innerHTML = state.intents.map((i) => `
    <tr>
      <td>${esc(new Date(i.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }))}</td>
      <td>${esc(i.nickname)}</td>
      <td>${i.budget ? 'RM ' + fmt(i.budget) : '—'}</td>
      <td>${esc(i.room_type || '不限')}</td>
      <td>${(i.condos || []).map((id) => `<span class="pick-chip">${esc(byId[id] || id)}</span>`).join('') || '—'}</td>
      <td>${esc(i.move_in || '—')}</td>
      <td>${i.need_roommate ? '想找' : '—'}</td>
      <td>${esc(i.contact || '—')}</td>
      <td>${esc(i.note || '')}</td>
    </tr>`).join('');
  const sum = $('#intent-summary');
  if (state.intentsOk && state.intents.length) {
    const counts = {};
    state.intents.forEach((i) => (i.condos || []).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${byId[id] || id} ${n} 人`).join('、');
    const budgets = state.intents.map((i) => i.budget).filter(Boolean).sort((a, b) => a - b);
    const med = budgets.length ? budgets[Math.floor(budgets.length / 2)] : null;
    const rm = state.intents.filter((i) => i.need_roommate).length;
    sum.innerHTML = `<span><b>${state.intents.length}</b>人已填</span>${med ? `<span><b>RM ${fmt(med)}</b>预算中位数</span>` : ''}<span><b>${rm}</b>人想找室友</span>${top ? `<span>选得最多：${esc(top)}</span>` : ''}`;
  } else sum.innerHTML = '';
  paintIntentCounts();
}
function paintIntentCounts() {
  const counts = {};
  state.intents.forEach((i) => (i.condos || []).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
  $$('[data-count-for]').forEach((el) => {
    const n = counts[el.dataset.countFor] || 0;
    el.hidden = n === 0;
    el.textContent = `${n} 位同学想住这里`;
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
