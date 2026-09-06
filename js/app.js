/* UM 租房指南 — app */
window.addEventListener('unhandledrejection', (e) => console.error('init failed:', e.reason && (e.reason.stack || e.reason)));
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
  buildPanel();
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
  // 简洁模式：底图去色淡化，只有我们标的东西是彩色的；"详细"开关再叠加次要信息
  const detail = L.layerGroup();
  map.getContainer().classList.add('simple');
  state.detailGroup = detail;

  const bounds = L.latLngBounds([]);

  // UM 校园
  if (campus) {
    const layer = L.geoJSON(campus, { style: { color: '#3E8E5B', weight: 1.5, fillColor: '#3E8E5B', fillOpacity: 0.22 }, interactive: false }).addTo(map);
    state.campusLayer = layer;
    const c = layer.getBounds().getCenter();
    L.marker(c, { icon: L.divIcon({ className: 'campus-label', html: '马来亚大学 UM', iconSize: null }), interactive: false }).addTo(map);
    bounds.extend(layer.getBounds());
  }

  // 轻轨线（白色描边 + 红线）+ 车站
  const st = state.meta.stations || [];
  const lineLatLngs = st.map((s) => [s.lat, s.lng]);
  L.polyline(lineLatLngs, { color: '#fff', weight: 10, opacity: 0.9, lineJoin: 'round', interactive: false }).addTo(map);
  const lrtLine = L.polyline(lineLatLngs, { color: '#D6336C', weight: 5, opacity: 0.9, lineJoin: 'round', interactive: false }).addTo(map);
  st.forEach((s) => {
    const major = /Universiti|Kerinchi|Asia Jaya|Taman Jaya/.test(s.name);
    const m = L.circleMarker([s.lat, s.lng], { radius: major ? 7 : 5, color: '#D6336C', weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
    // 简洁模式只给 4 个主要站写名字，其余站名放进"详细"
    const tip = { permanent: true, direction: s.name === 'Universiti' ? 'right' : 'bottom', offset: s.name === 'Universiti' ? [9, 0] : [0, 7], className: 'station-label' + (major ? ' major' : '') };
    if (major) m.bindTooltip(s.zh, tip);
    else detail.addLayer(L.marker([s.lat, s.lng], { icon: L.divIcon({ className: 'station-label', html: s.zh, iconSize: null, iconAnchor: [-6, -8] }), interactive: false }));
  });
  (state.meta.mrt || []).forEach((s) => {
    detail.addLayer(L.circleMarker([s.lat, s.lng], { radius: 5, color: '#2E8B57', weight: 3, fillColor: '#fff', fillOpacity: 1 })
      .bindTooltip(s.zh, { permanent: true, direction: 'right', offset: [8, 0], className: 'station-label' }));
  });

  // 步行范围圈：从 Universiti 站走 5 分钟（400 m）和 10 分钟（800 m）；Kerinchi 站的圈放进"详细"
  const uni = st.find((s) => s.name === 'Universiti');
  const ker = st.find((s) => s.name === 'Kerinchi');
  const walkLayers = [];
  if (uni) {
    walkLayers.push(L.circle([uni.lat, uni.lng], { radius: 800, color: '#D6336C', weight: 1.2, dashArray: '5 5', fillColor: '#D6336C', fillOpacity: 0.04, interactive: false }).addTo(map));
    walkLayers.push(L.circle([uni.lat, uni.lng], { radius: 400, color: '#D6336C', weight: 1.6, dashArray: '5 5', fillColor: '#D6336C', fillOpacity: 0.06, interactive: false }).addTo(map));
    L.marker([uni.lat + 400 / 111320, uni.lng - 0.0025], { icon: L.divIcon({ className: 'walk-label', html: '步行 5 分钟', iconSize: null }), interactive: false }).addTo(map);
    L.marker([uni.lat + 800 / 111320, uni.lng - 0.0028], { icon: L.divIcon({ className: 'walk-label', html: '步行 10 分钟', iconSize: null }), interactive: false }).addTo(map);
  }
  if (ker) {
    detail.addLayer(L.circle([ker.lat, ker.lng], { radius: 800, color: '#D6336C', weight: 1, dashArray: '5 5', fillColor: '#D6336C', fillOpacity: 0.03, interactive: false }));
    detail.addLayer(L.circle([ker.lat, ker.lng], { radius: 400, color: '#D6336C', weight: 1.4, dashArray: '5 5', fillColor: '#D6336C', fillOpacity: 0.05, interactive: false }));
  }

  // 区域标签（不再画范围框，编号颜色已经能区分）
  const regionBounds = {};
  [1, 2].forEach((r) => {
    const pts = state.condos.filter((c) => c.region === r).map((c) => [c.lat, c.lng]);
    regionBounds[r] = L.latLngBounds(pts);
    const cx = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const top = regionBounds[r].getNorth(), bottom = regionBounds[r].getSouth();
    const labelLat = r === 1 ? top + 0.0022 : bottom - 0.0022;
    L.marker([labelLat, cx], { icon: L.divIcon({ className: `area-label r${r}`, html: r === 1 ? '区域 1 · PJ 这一侧' : '区域 2 · Bangsar South', iconSize: null }), interactive: false }).addTo(map);
  });
  // 缩得比较远时隐藏地标文字，避免和编号点挤在一起
  const zoomClass = () => map.getContainer().classList.toggle('z-low', map.getZoom() < 15);
  map.on('zoomend', zoomClass);
  setTimeout(zoomClass, 0);

  // 地标：正门、校园中心、医院、宿舍、商场
  let gate = null;
  if (campus && uni) {
    let best = null, bd = Infinity;
    const walk = (arr) => {
      if (typeof arr[0] === 'number') { const d = (arr[1] - uni.lat) ** 2 + (arr[0] - uni.lng) ** 2; if (d < bd) { bd = d; best = [arr[1], arr[0]]; } return; }
      arr.forEach(walk);
    };
    walk(campus.geometry.coordinates);
    gate = best;
    L.polyline([[uni.lat, uni.lng], gate], { color: '#2b6b44', weight: 3, dashArray: '2 6', interactive: false }).addTo(map);
  }
  // 简洁模式只标：正门、两边各一个商场；其余（校园中心、医院、宿舍、Nexus、Mid Valley）放进"详细"
  const landmarks = [
    gate && { ll: gate, cls: 'gate', label: 'UM 正门 · 出 Universiti 站过天桥', base: true },
    { ll: [3.1136176, 101.6632626], cls: 'mall', label: 'KL Gateway Mall · 超市', base: true },
    { ll: [3.1171354, 101.6350289], cls: 'mall', label: 'Jaya One · PJ 侧吃饭购物', base: true },
    { ll: [3.1214914, 101.6565469], cls: 'edu', label: '大礼堂 DTC · 校园中心' },
    { ll: [3.1126872, 101.6541474], cls: 'hosp', label: 'UM 医院 UMMC' },
    { ll: [3.1204209, 101.6403159], cls: 'edu', label: '研究生宿舍 KK13' },
    { ll: [3.1195043, 101.6373563], cls: 'edu', label: 'International House 宿舍' },
    { ll: [3.109937, 101.6650767], cls: 'mall', label: 'Nexus 商场 · 吃饭' },
    { ll: [3.1176552, 101.6773741], cls: 'mall', label: 'Mid Valley 大商场' },
  ].filter(Boolean);
  landmarks.forEach((l) => {
    const m = L.marker(l.ll, { icon: L.divIcon({ className: 'lm-icon', html: `<span class="lm ${l.cls}"><i class="ico"></i>${l.label}</span>`, iconSize: null, iconAnchor: [6, 11] }), interactive: false, zIndexOffset: -200 });
    if (l.base) m.addTo(map); else detail.addLayer(m);
  });
  // "详细"开关
  const detailBtn = $('#map-detail');
  const setDetail = (on) => {
    if (on) { detail.addTo(map); map.getContainer().classList.remove('simple'); }
    else { map.removeLayer(detail); map.getContainer().classList.add('simple'); }
    if (detailBtn) { detailBtn.textContent = on ? '简洁' : '详细'; detailBtn.setAttribute('aria-pressed', String(on)); }
  };
  detailBtn?.addEventListener('click', () => setDetail(!map.hasLayer(detail)));
  setDetail(false);

  // 小区
  state.condos.forEach((c) => {
    const icon = L.divIcon({ className: '', html: `<div class="condo-pin r${c.region}">${c.no}</div>`, iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
    const m = L.marker([c.lat, c.lng], { icon, title: c.name, alt: c.name, riseOnHover: true }).addTo(map);
    m.bindTooltip(`${c.no} · ${shortAlias(c)}`, { direction: 'top', offset: [0, -12] });
    m.on('click', () => selectCondo(c.id));
    state.markers[c.id] = m;
    bounds.extend([c.lat, c.lng]);
  });

  state.allBounds = bounds.pad(0.03);
  map.fitBounds(state.allBounds);
  $('#map-reset')?.addEventListener('click', () => { clearSelection(); endTour(); map.fitBounds(state.allBounds); });
  // 点一下地图再允许滚轮缩放，避免页面滚动被劫持
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());

  setupTour({ map, campusLayer: state.campusLayer, regionBounds, uni, gate, lrtLine, walkLayers });
}

function convexHull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (const p of pts.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

/* ---------- guided tour ---------- */
let tour = null;
function setupTour(ctx) {
  const { map, campusLayer, regionBounds, uni, gate, lrtLine, walkLayers } = ctx;
  const pinsOf = (pred) => state.condos.filter(pred).map((c) => c.id);
  const steps = [
    {
      title: '第 1 步 · 校园',
      text: '<b>绿色是 UM 校园</b>，从西边到东边 3 公里。你的学院在校园哪一侧，决定你该住哪一片。点右上角"详细"能看到校园中心的大礼堂和医院的位置。',
      view: () => campusLayer ? map.fitBounds(campusLayer.getBounds().pad(0.15)) : map.setView([3.121, 101.654], 15),
      focus: [],
    },
    {
      title: '第 2 步 · 正门和轻轨站',
      text: '正门在校园东南角。<b>出 Universiti 站过一座天桥就进校</b>，绿色虚线就是这段路。两个红色虚线圈是从车站走 5 分钟和 10 分钟能到的范围，圈里的小区都能走路上学。',
      view: () => map.setView(gate ? [(gate[0] + uni.lat) / 2, (gate[1] + uni.lng) / 2] : [uni.lat, uni.lng], 16),
      focus: pinsOf((c) => c.transit.walk_min != null && c.transit.walk_min <= 10),
    },
    {
      title: '第 3 步 · 区域 2',
      text: '<b>蓝色 11 到 19 在 Bangsar South</b>。11 到 15 在步行圈里，走路上学，中国学生最多，楼下就有超市和商场。16 到 19 在南边山坡上，圈外，每天要坐车。',
      view: () => map.fitBounds(regionBounds[2].pad(0.15)),
      focus: pinsOf((c) => c.region === 2),
    },
    {
      title: '第 4 步 · 区域 1',
      text: '<b>橙色 1 到 10 在 PJ</b>。这边没有走得到的轻轨站，去学校靠免费巴士、骑车或 Grab，10 分钟以内。Jaya One 是这边吃饭购物的地方，研究生宿舍也在这一侧（点"详细"能看到）。',
      view: () => map.fitBounds(regionBounds[1].pad(0.15)),
      focus: pinsOf((c) => c.region === 1),
    },
    {
      title: '第 5 步 · 轻轨线',
      text: '<b>红线是 Kelana Jaya 线</b>，圆圈是车站。从 Universiti 站往东两站到 Mid Valley 大商场，往西是 PJ 方向。刷 Touch \'n Go 卡，一站一两块马币。看完了，点"结束"回到全图。',
      view: () => map.fitBounds(lrtLine.getBounds().pad(0.12)),
      focus: [],
    },
  ];
  let i = 0;
  const box = $('#tour-box');
  const show = () => {
    const s = steps[i];
    box.hidden = false;
    $('#tour-step').textContent = `${s.title}（${i + 1} / ${steps.length}）`;
    $('#tour-text').innerHTML = s.text;
    $('#tour-prev').disabled = i === 0;
    $('#tour-next').textContent = i === steps.length - 1 ? '结束' : '下一步';
    s.view();
    const focus = new Set(s.focus);
    Object.entries(state.markers).forEach(([id, m]) => {
      const el = m.getElement()?.querySelector('.condo-pin');
      if (!el) return;
      el.classList.toggle('pulse', focus.has(id));
      el.classList.toggle('dim', focus.size > 0 && !focus.has(id));
    });
    if (campusLayer) campusLayer.setStyle({ weight: i === 0 ? 3 : 1.5, fillOpacity: i === 0 ? 0.35 : 0.22 });
    walkLayers.forEach((l) => l.setStyle({ weight: i === 1 ? 2.5 : 1.4, fillOpacity: i === 1 ? 0.1 : 0.05 }));
    lrtLine.setStyle({ weight: i === 4 ? 8 : 5 });
  };
  tour = {
    start() { i = 0; clearSelection(); show(); },
    next() { if (i < steps.length - 1) { i++; show(); } else endTour(); },
    prev() { if (i > 0) { i--; show(); } },
    end() {
      box.hidden = true;
      Object.values(state.markers).forEach((m) => { const el = m.getElement()?.querySelector('.condo-pin'); el?.classList.remove('pulse', 'dim'); });
      if (campusLayer) campusLayer.setStyle({ weight: 1.5, fillOpacity: 0.22 });
      walkLayers.forEach((l) => l.setStyle({ weight: 1.4, fillOpacity: 0.05 }));
      lrtLine.setStyle({ weight: 5 });
      map.fitBounds(state.allBounds);
    },
  };
  $('#tour-start')?.addEventListener('click', () => tour.start());
  $('#tour-next')?.addEventListener('click', () => tour.next());
  $('#tour-prev')?.addEventListener('click', () => tour.prev());
  $('#tour-close')?.addEventListener('click', () => tour.end());
}
function endTour() { if (tour && !$('#tour-box').hidden) tour.end(); }

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
  if (!state.map) return;
  $('#s1').scrollIntoView({ behavior: 'smooth', block: 'start' });
  selectCondo(id, { pan: true });
}

/* ---------- map side panel ---------- */
function priceLine(c) {
  const rmin = roomsMin(c);
  if (rmin) return `单间 RM ${fmt(rmin)} 起`;
  if (c.snapshot.rent_from) return `整套 RM ${fmt(c.snapshot.rent_from)} 起`;
  return '';
}
function buildPanel() {
  const list = $('#panel-list');
  if (!list) return;
  const groups = [[1, state.meta.regions['1'].label], [2, state.meta.regions['2'].label]];
  list.innerHTML = groups.map(([r, label]) => `<h4 class="panel-group">${esc(label)}</h4>` +
    state.condos.filter((c) => c.region === r).map((c) => {
      const t = c.transit;
      const walk = t.walk_min == null
        ? '<span class="mwalk none">没有轻轨</span>'
        : `<span class="mwalk"><b>${t.walk_min}</b> 分钟到 ${esc(stationZh(t.nearest).replace(/ 站$/, ''))} 站</span>`;
      const sub = [priceLine(c), c.completed ? c.completed + ' 年' : null, c.units ? fmt(c.units) + ' 户' : null].filter(Boolean).join(' · ');
      return `<button type="button" class="mrow r${c.region}" data-select="${c.id}"><span class="mno">${c.no}</span><span class="mname">${esc(shortAlias(c))}</span>${walk}<span class="msub">${esc(sub)}</span></button>`;
    }).join('')).join('');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-select]');
    if (b) selectCondo(b.dataset.select, { pan: true });
  });
  $('#panel-detail').addEventListener('click', (e) => {
    if (e.target.closest('[data-pd-close]')) clearSelection();
    const d = e.target.closest('[data-detail]');
    if (d) openDetail(d.dataset.detail);
  });
}
function selectCondo(id, { pan = false } = {}) {
  const c = state.condos.find((x) => x.id === id);
  if (!c) return;
  state.selected = id;
  $$('.mrow').forEach((b) => b.classList.toggle('is-on', b.dataset.select === id));
  Object.entries(state.markers).forEach(([k, m]) => m.getElement()?.querySelector('.condo-pin')?.classList.toggle('is-on', k === id));
  $(`.mrow[data-select="${id}"]`)?.scrollIntoView({ block: 'nearest' });
  const pd = $('#panel-detail');
  pd.hidden = false;
  pd.innerHTML = `
    <button type="button" class="btn pd-close" data-pd-close aria-label="关闭">关闭</button>
    <h3>${c.no} · ${esc(shortAlias(c))}</h3>
    <p>${goSentence(c)}</p>
    <p>${c.completed ? c.completed + ' 年建成 · ' : ''}${c.units ? fmt(c.units) + ' 户 · ' : ''}${esc(c.type)}</p>
    ${c.snapshot.rooms ? `<p><b>单间</b> ${esc(c.snapshot.rooms)}</p>` : '<p><b>单间</b> 这次没有找到在租的单间</p>'}
    ${c.snapshot.whole ? `<p><b>整套</b> ${esc(c.snapshot.whole)}</p>` : ''}
    <p class="muted">iProperty 在租 ${fmt(c.snapshot.for_rent)} 套，最低 RM ${fmt(c.snapshot.rent_from)}，${esc(c.snapshot.date)} 查</p>
    <div class="pd-acts">
      <a class="btn primary" href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">iProperty 在租房源</a>
      <button type="button" class="linkish" data-detail="${c.id}">设施与来源</button>
      <a class="linkish" href="#card-${c.id}">跳到卡片</a>
    </div>`;
  if (pan && state.map) state.map.setView([c.lat, c.lng], Math.max(state.map.getZoom(), 15), { animate: true });
}
function clearSelection() {
  state.selected = null;
  $$('.mrow').forEach((b) => b.classList.remove('is-on'));
  Object.values(state.markers).forEach((m) => m.getElement()?.querySelector('.condo-pin')?.classList.remove('is-on'));
  const pd = $('#panel-detail');
  if (pd) { pd.hidden = true; pd.innerHTML = ''; }
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
/* 删除权限：填写者在自己的浏览器里保存了一把随机口令；管理员口令存在 sessionStorage */
const TOKENS_KEY = 'um-intent-tokens';
function ownTokens() { try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}'); } catch { return {}; } }
function saveOwnToken(id, token) { const t = ownTokens(); t[id] = token; try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); } catch { /* ignore */ } }
function adminToken() { try { return sessionStorage.getItem('um-admin') || ''; } catch { return ''; } }
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function rpc(name, body) {
  const c = cfg();
  const r = await fetch(`${c.SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: c.SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function deleteIntent(id) {
  const token = ownTokens()[id] || adminToken();
  if (!token) return;
  if (!confirm('删除这一条？删了就没有了。')) return;
  try {
    const ok = await rpc('delete_intent', { p_id: id, p_token: token });
    if (!ok) { alert('没有删除权限：只能删自己填的那条，或者输入管理口令。'); return; }
    state.intents = state.intents.filter((i) => i.id !== id);
    const t = ownTokens(); delete t[id]; try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); } catch { /* ignore */ }
    renderIntents();
  } catch (e) { console.warn(e); alert('删除失败，刷新后再试。'); }
}
async function toggleAdmin() {
  if (adminToken()) { sessionStorage.removeItem('um-admin'); renderIntents(); return; }
  const t = prompt('输入管理口令（只有整理这页的人有）：');
  if (!t) return;
  try {
    const ok = await rpc('check_admin', { p_token: t.trim() });
    if (!ok) { alert('口令不对。'); return; }
    sessionStorage.setItem('um-admin', t.trim());
    renderIntents();
  } catch (e) { console.warn(e); alert('校验失败，稍后再试。'); }
}
function renderIntents() {
  const tbody = $('#intent-table tbody');
  const wrap = $('.table-wrap');
  $('#intent-offline').hidden = state.intentsOk !== false;
  $('#intent-empty').hidden = !(state.intentsOk && state.intents.length === 0);
  wrap.hidden = !(state.intentsOk && state.intents.length > 0);
  const byId = Object.fromEntries(state.condos.map((c) => [c.id, shortAlias(c)]));
  const mine = ownTokens();
  const isAdmin = !!adminToken();
  const adminBtn = $('#admin-toggle');
  if (adminBtn) adminBtn.textContent = isAdmin ? '退出管理模式' : '管理口令';
  tbody.innerHTML = state.intents.map((i) => `
    <tr>
      <td>${esc(new Date(i.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }))}</td>
      <td>${esc(i.nickname)}${mine[i.id] ? ' <span class="mine">我</span>' : ''}</td>
      <td>${i.budget ? 'RM ' + fmt(i.budget) : '—'}</td>
      <td>${esc(i.room_type || '不限')}</td>
      <td>${(i.condos || []).map((id) => `<span class="pick-chip">${esc(byId[id] || id)}</span>`).join('') || '—'}</td>
      <td>${esc(i.move_in || '—')}</td>
      <td>${i.need_roommate ? '想找' : '—'}</td>
      <td>${esc(i.contact || '—')}</td>
      <td>${esc(i.note || '')}</td>
      <td>${(mine[i.id] || isAdmin) ? `<button type="button" class="linkish del" data-del="${i.id}">删除</button>` : ''}</td>
    </tr>`).join('');
  $$('[data-del]', tbody).forEach((b) => b.addEventListener('click', () => deleteIntent(b.dataset.del)));
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
  $('#admin-toggle')?.addEventListener('click', toggleAdmin);
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
      // 给这一条生成一把只有本浏览器知道的口令，以后凭它删除
      const token = crypto.randomUUID();
      body.token_hash = await sha256(token);
      const r = await fetch(`${c.SUPABASE_URL}/rest/v1/intents`, {
        method: 'POST',
        headers: { apikey: c.SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const t = await r.text(); throw new Error(t.slice(0, 200)); }
      const [row] = await r.json();
      saveOwnToken(row.id, token);
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
