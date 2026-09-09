/* UM 租房指南 — app */
// 刷新时不要把人放回上次滚到的位置
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const IS_RELOAD = (performance.getEntriesByType("navigation")[0] || {}).type === "reload";

window.addEventListener('unhandledrejection', (e) => console.error('init failed:', e.reason && (e.reason.stack || e.reason)));
// fitBounds 时留的边，免得边上的编号点贴着地图边缘被切掉
const FIT_OPTS = { padding: [18, 18] };
// 容器还没有尺寸时 fitBounds 会算出 NaN，Leaflet 就抛 Invalid LatLng；先确认能算再定视野
const canFit = (map, b) => !!(map && b && b.isValid && b.isValid() && map.getContainer().clientWidth > 0 && map.getContainer().clientHeight > 0);
const state = {
  condos: [],
  meta: {},
  filters: new Set(),
  sort: 'no',
  expanded: new Set(),
  startText: null,
  final: null,
  map: null,
  markers: {},
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-MY');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortAlias = (c) => c.alias.replace(/（.*?）/, '');
const ELMU_GATE = [3.11955, 101.65022]; // Jalan Elmu 门：校园边界上离 Jalan Ilmu 最近的点（近似）

init();

async function init() {
  // 两层数据：condos.json 是固定信息（人工核实，改得少），prices.json 是实时价格（每 12 小时自动刷新），按小区 id 对上
  const [data, prices, campus] = await Promise.all([
    fetch('data/condos.json', { cache: 'no-cache' }).then((r) => r.json()),
    fetch('data/prices.json', { cache: 'no-cache' }).then((r) => r.json()).catch(() => ({ condos: {} })),
    fetch('data/um.geojson').then((r) => r.json()).catch(() => null),
  ]);
  const EMPTY = { date: null, for_rent: null, rent_from: null, whole: null, whole_source: null, rooms: null, rooms_source: null, rooms_min: null };
  for (const c of data.condos) c.snapshot = { ...EMPTY, ...(prices.condos?.[c.id] || {}) };
  // 房型按本地叫法：小房 / 中房 / 大房（旧抓取结果里可能还写着主人房、单人间）
  for (const c of data.condos) if (c.snapshot.rooms) c.snapshot.rooms = roomWordsLocal(c.snapshot.rooms);
  state.condos = data.condos;
  state.meta = data.meta;
  state.meta.prices_updated_myt = prices.updated_myt || null;
  $$('.verified-at').forEach((t) => { t.textContent = data.meta.verified_at; });
  $$('.prices-at').forEach((t) => { t.textContent = prices.updated_myt ? prices.updated_myt + '（马来西亚时间）' : '暂无'; });
  renderTierPills();
  bindTierPop();
  bindReport();
  renderChangelog();
  renderCampus(campus);
  drawMap(campus);
  buildPanel();
  bindFilters();
  renderList();
  renderCommon();
  renderBoard();
  bindCalc();
  bindStart();
  bindFinal();
  renderConclusion();
  // 页面都摆好之后再定一次全图视野，避免地图在排版没完成时算错缩放
  if (state.map && state.allBounds) requestAnimationFrame(() => { state.map.invalidateSize(); if (canFit(state.map, state.allBounds)) state.map.fitBounds(state.allBounds, FIT_OPTS); });
  bindChecklists();
  bindNav();
  applyHashOnLoad();
  // 地图气泡里的"看详情"按钮
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-detail]');
    if (b) { e.preventDefault(); openDetail(b.dataset.openDetail); }
  });
}

/* ---------- guide widgets ---------- */
/* ---------- 租房费用：一个月租输入 + 几个可调的滑块，两块都随手算 ----------
   固定的部分：预付首月 = 1 个月；印花税按法定公式算（1 年内租约，年租减 2,400 免税额，
   每 250 令吉 1 令吉、不足 250 按 250 算，再加每份副本 10 令吉）。
   会变的部分做成滑块：押金月数、水电押金月数、门禁卡押金、合同费、水电网、分摊人数。 */
function stampDuty(monthlyRent) {
  const taxable = Math.max(0, monthlyRent * 12 - 2400);
  return Math.ceil(taxable / 250) + 10;
}
function bindCalc() {
  const input = $('#calc-rent');
  if (!input) return;
  const rm = (n) => 'RM ' + fmt(Math.round(n));
  const num = (id) => Number($(id).value) || 0;
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const run = () => {
    const r = Math.max(0, Number(input.value) || 0);
    // 一次性
    const depM = num('#k-dep'), utilM = num('#k-util'), card = num('#k-card'), fee = num('#k-fee');
    const dep = r * depM, adv = r, util = r * utilM, stamp = r ? stampDuty(r) : 0;
    const total = dep + adv + util + card + stamp + fee;
    const back = dep + util + card;
    set('#v-dep', depM + ' 个月'); set('#v-util', utilM + ' 个月'); set('#v-card', rm(card)); set('#v-fee', rm(fee));
    set('#c-dep', rm(dep)); set('#c-adv', rm(adv)); set('#c-util', rm(util));
    set('#c-card', rm(card)); set('#c-stamp', r ? rm(stamp) : '—'); set('#c-fee', rm(fee));
    set('#c-total', rm(total)); set('#c-back', rm(back)); set('#c-spent', rm(total - back));
    // 每月
    const elec = num('#k-elec'), water = num('#k-water'), net = num('#k-net'), people = Math.max(1, num('#k-people'));
    const monthly = r + elec + water + net;
    set('#v-elec', rm(elec)); set('#v-water', rm(water)); set('#v-net', rm(net)); set('#v-people', people + ' 人');
    set('#m-rent', rm(r)); set('#m-elec', rm(elec)); set('#m-water', rm(water)); set('#m-net', rm(net));
    set('#m-park', '房东说了算，多数含在租金里');
    set('#m-mgmt', '整租通常房东付，签约前问一句');
    set('#m-total', rm(monthly)); set('#m-each', rm(monthly / people)); set('#m-year', rm(monthly * 12));
    // 一个人住的话"每人"和"每月合计"是同一个数，不用说两遍
    const eachWrap = $('#m-each-wrap'); if (eachWrap) eachWrap.hidden = people <= 1;
    if (input.dataset.touched === '1') {
      try { localStorage.setItem('um-calc', JSON.stringify({ rent: r, total: Math.round(total), back: Math.round(back), monthly: Math.round(monthly), each: Math.round(monthly / people), people })); } catch { /* ignore */ }
    }
    if (typeof renderConclusion === 'function' && state.condos) renderConclusion();
  };
  input.addEventListener('input', () => { input.dataset.touched = '1'; run(); });
  $$('.ctl input').forEach((el) => el.addEventListener('input', () => { input.dataset.touched = '1'; run(); }));
  run();
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

/* ---------- 路线图：头部一条路，七站；小人随滚动走到当前站 ---------- */
const ROUTE_STOPS = ['s-start', 'campus', 'regions', 's3', 's2', 's5', 's0'];
function bindNav() {
  const route = $('#route');
  if (!route) return;
  const stops = $$('#route-stops li');
  const dots = stops.map((li) => li.querySelector('.stop'));
  const names = stops.map((li) => li.querySelector('a').textContent);
  const track = $('#route-track'), walked = $('#route-walked'), figure = $('#route-figure'), here = $('#route-here');
  let centers = [];
  const measure = () => {
    const top = route.closest('.top');
    if (top) document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
    const r = route.getBoundingClientRect();
    centers = dots.map((d) => { const b = d.getBoundingClientRect(); return b.left - r.left + b.width / 2; });
    track.style.left = centers[0] + 'px'; track.style.width = Math.max(0, centers[6] - centers[0]) + 'px';
    walked.style.left = centers[0] + 'px';
  };
  // 每站对应一个滚动位置：站名滚到视口上方三分之一处就算走到；起点定在页面顶端、终点定在页面底端，
  // 所以从头到尾没有"页面在滚、小人不动"的死区，滚到底一定站在终点，往回滚也马上有反应
  const anchors = () => {
    const vh = window.innerHeight, maxY = Math.max(7, document.documentElement.scrollHeight - vh);
    const a = ROUTE_STOPS.map((id) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + window.scrollY - vh * 0.3 - 120 : 0; });
    a[0] = 0; a[6] = maxY;
    for (let i = 1; i < 6; i++) a[i] = Math.min(maxY - (6 - i), Math.max(a[i - 1] + 1, a[i]));
    return a;
  };
  const progress = () => {
    const a = anchors(), y = window.scrollY;
    if (y <= 0) return 0;
    for (let i = 0; i < 6; i++) if (y < a[i + 1]) return i + (y - a[i]) / (a[i + 1] - a[i]);
    return 6;
  };
  let walkTimer = null, lastY = null;
  const paint = () => {
    if (!centers.length) measure();
    const p = progress();
    const i = Math.min(5, Math.floor(p)), f = p - i;
    const x = p >= 6 ? centers[6] : centers[i] + (centers[i + 1] - centers[i]) * f;
    figure.style.transform = `translateX(${x.toFixed(1)}px)`;
    walked.style.width = Math.max(0, x - centers[0]).toFixed(1) + 'px';
    const cur = Math.round(p);
    stops.forEach((li, k) => { li.classList.toggle('done', k < cur); li.classList.toggle('now', k === cur); });
    if (here) here.textContent = names[cur];
    // 朝向和迈步都看滚动方向，不看小人挪了几个像素：慢慢往回滚也会马上转身
    const y = window.scrollY;
    if (lastY != null && y !== lastY) {
      figure.classList.toggle('back', y < lastY);
      route.classList.add('walking'); clearTimeout(walkTimer); walkTimer = setTimeout(() => route.classList.remove('walking'), 240);
    }
    if (p <= 0) figure.classList.remove('back'); // 回到起点就转回来，面朝前方
    lastY = y;
  };
  window.addEventListener('scroll', paint, { passive: true }); // 滚动事件本身就按帧来，直接画，少一帧延迟
  window.addEventListener('resize', () => { measure(); paint(); });
  if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); paint(); });
  measure(); paint();
  void figure.offsetWidth; // 先让浏览器按没有过渡的样式排好，再显示，小人就不会从左边滑过来
  route.classList.add('ready');
  setTimeout(() => { measure(); paint(); }, 800);
}

/* ---------- 起点：我现在想要的房子 ----------
   "我想要的房子："是框子左边固定的字，不在输入框里，删不掉；用户只写自己那半句。 */
const START_KEY = 'um-start-text';
const START_PREFIX = '我想要的房子：';
function loadStart() {
  let t = '';
  try { t = localStorage.getItem(START_KEY) || ''; } catch { /* ignore */ }
  // 以前这几个字是输入框内容的一部分，老数据里带着，去掉
  return t.startsWith(START_PREFIX) ? t.slice(START_PREFIX.length) : t;
}
function startText() { return String(state.startText ?? loadStart()).trim(); }
function bindStart() {
  const ta = $('#start-text'); if (!ta) return;
  state.startText = loadStart();
  ta.value = state.startText;
  const save = () => { state.startText = ta.value; try { localStorage.setItem(START_KEY, ta.value); } catch { /* ignore */ } renderConclusion(); };
  ta.addEventListener('input', save);
  // 没头绪就点几个常见想法，接到句子后面
  const chips = $('#start-chips');
  if (chips) chips.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const t = b.textContent.trim();
    let v = ta.value.trimEnd();
    if (v.includes(t)) return;
    v += !v || /[：:，,、]$/.test(v) ? t : '，' + t;
    ta.value = v; save(); ta.focus();
  });
}

/* ---------- 终点：我最终想要的房子（选项 + 自己写 + 实时拼句子） ---------- */
const FINAL_KEY = 'um-final';
const FINAL_GROUPS = [
  { g: 'mode', title: '怎么住', opts: ['一个人租一间', '和朋友整租平摊', '一个人整租', '和家人同住'] },
  { g: 'layout', title: '户型', opts: ['开间', '1 房 1 卫', '2 房 1 卫', '2 房 2 卫', '3 房 2 卫', '房间放得下书桌'] },
  { g: 'floor', title: '楼层', opts: ['高层视野好', '中层就行', '低层进出方便', '要有电梯直达'] },
  { g: 'cook', title: '做饭', opts: ['天天自己开火', '偶尔做一点', '基本不做饭', '要独立厨房', '要能用明火', '有冰箱洗衣机就行'] },
  { g: 'transit', title: '交通', opts: ['走路到学院', '轨道站附近', '校车或公交能到', '打车也行'] },
  { g: 'facility', title: '设施', opts: ['设施齐全', '有泳池', '有健身房', '有球场', '楼下有便利店', '有车位'] },
  { g: 'feel', title: '环境', opts: ['安静能睡好', '楼下有吃的', '不要太旧', '人少不挤', '带家具', '能养宠物'] },
  { g: 'term', title: '租期', opts: ['签一年', '先短租几个月'] },
];
const BUDGET_MIN = 500, BUDGET_MAX = 4000;
function loadFinal() {
  let o = {};
  try { const raw = JSON.parse(localStorage.getItem(FINAL_KEY) || '{}'); if (raw && typeof raw === 'object' && !Array.isArray(raw)) o = raw; } catch { /* ignore */ }
  // 预算以前是几个档位的按钮（存成数组），现在是一个数字，把老数据换算过来
  if (Array.isArray(o.budget)) {
    const nums = o.budget.map((x) => Number(String(x).replace(/[^\d]/g, ''))).filter((n) => n > 0);
    o.budget = nums.length ? Math.max(...nums) : null;
  }
  if (typeof o.budget !== 'number' || !Number.isFinite(o.budget)) o.budget = null;
  if (typeof o.note !== 'string') o.note = '';
  // 以前叫 wish，拆成了设施和环境两组
  if (Array.isArray(o.wish)) { o.feel = [...new Set([...(o.feel || []), ...o.wish])]; delete o.wish; }
  return o;
}
function saveFinal() { try { localStorage.setItem(FINAL_KEY, JSON.stringify(state.final)); } catch { /* ignore */ } }
function bindFinal() {
  const box = $('#final'); if (!box) return;
  state.final = loadFinal();
  const regions = state.meta.regions || {};
  const chip = (g, v, label, cls) => `<button type="button" class="chip${cls ? ' ' + cls : ''}" data-g="${esc(g)}" data-v="${esc(v)}" aria-pressed="false">${label}</button>`;
  const row = (title, html) => `<div class="pick-group"><h3>${title}</h3><div class="chips">${html}</div></div>`;
  box.innerHTML = row('区域', Object.keys(regions).map((r) => chip('region', r, esc(regions[r].label), 'r' + r)).join(''))
    + row('小区', state.condos.slice().sort((a, b) => a.no - b.no).map((c) => chip('condo', c.id, `<i class="n">${c.no}</i>${esc(shortAlias(c))}`, 'r' + c.region)).join(''))
    + FINAL_GROUPS.map((x) => row(x.title, x.opts.map((v) => chip(x.g, v, esc(v))).join(''))).join('')
    + `<div class="pick-group"><h3>每月预算</h3><div class="budget-row">
        <input type="range" id="f-budget" min="${BUDGET_MIN}" max="${BUDGET_MAX}" step="50" aria-label="每月预算">
        <span class="ri-box">RM <input type="number" id="f-budget-n" min="0" max="20000" step="50" inputmode="numeric" aria-label="每月预算，也可以直接填"></span>
        <button type="button" class="linkish" id="f-budget-off">不限</button>
      </div></div>`;

  const range = $('#f-budget'), num = $('#f-budget-n'), off = $('#f-budget-off');
  const paint = () => {
    $$('.chip', box).forEach((b) => { const on = (state.final[b.dataset.g] || []).includes(b.dataset.v); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const v = state.final.budget;
    range.value = String(v == null ? 1300 : Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, v)));
    if (document.activeElement !== num) num.value = v == null ? '' : String(v);
    box.classList.toggle('no-budget', v == null);
  };
  const setBudget = (v) => { state.final.budget = v; saveFinal(); paint(); renderConclusion(); };
  box.addEventListener('click', (e) => {
    if (e.target === off) { setBudget(null); return; }
    const b = e.target.closest('.chip'); if (!b) return;
    const g = b.dataset.g, v = b.dataset.v;
    const arr = state.final[g] || [];
    state.final[g] = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
    if (!state.final[g].length) delete state.final[g];
    saveFinal(); paint(); renderConclusion();
  });
  range.addEventListener('input', () => setBudget(Number(range.value)));
  num.addEventListener('input', () => { const n = Number(num.value); setBudget(num.value === '' ? null : (Number.isFinite(n) && n > 0 ? n : null)); });

  const ta = $('#final-text');
  if (ta) {
    ta.value = state.final.note || '';
    ta.addEventListener('input', () => { state.final.note = ta.value; saveFinal(); renderConclusion(); });
  }
  paint();
}
function finalSentence() {
  const f = state.final || loadFinal();
  const regions = state.meta.regions || {};
  const parts = [];
  const rs = (f.region || []).slice().sort();
  const cs = (f.condo || []).map((id) => state.condos.find((c) => c.id === id)).filter(Boolean).sort((a, b) => a.no - b.no);
  if (rs.length) parts.push(`在${rs.map((r) => regions[r]?.label || '区域 ' + r).join('或')}`);
  if (cs.length) parts.push(`小区看 ${cs.map(shortAlias).join('、')}`);
  if (f.mode?.length) parts.push(f.mode.join('或'));
  if (f.layout?.length) parts.push(`户型 ${f.layout.join('或')}`);
  if (f.floor?.length) parts.push(f.floor.join('、'));
  if (f.budget) parts.push(`每月预算 RM ${fmt(f.budget)} 以内`);
  if (f.transit?.length) parts.push(f.transit.join('、'));
  if (f.cook?.length) parts.push(f.cook.join('、'));
  if (f.facility?.length) parts.push(f.facility.join('、'));
  if (f.feel?.length) parts.push(f.feel.join('、'));
  if (f.term?.length) parts.push(f.term.join('或'));
  let s = parts.length ? `${START_PREFIX}${parts.join('，')}。` : '';
  const note = String(f.note || '').trim();
  if (note) s += (s ? '' : START_PREFIX) + `还想要：${note.replace(/[。.]$/, '')}。`;
  return s;
}

function renderConclusion() {
  const box = $('#conclusion'); if (!box) return;
  const text = finalSentence();
  const start = startText();
  let calc = null; try { calc = JSON.parse(localStorage.getItem('um-calc') || 'null'); } catch { /* ignore */ }
  const money = calc && calc.rent ? `签约当天要带 RM ${fmt(calc.total)}，其中 RM ${fmt(calc.back)} 是押金，退房时退；住进去以后每月${calc.people > 1 ? `每人` : ''} RM ${fmt(calc.people > 1 ? calc.each : calc.monthly)}。` : '';
  const full = text ? text + money : '';
  const copyText = full + (start ? `\n一开始写的：${START_PREFIX}${start}` : '');
  box.innerHTML = `
    <div class="con-card"><p class="con-text" id="con-text">${full ? esc(full) : '<span class="con-empty">上面还没点也还没写。点几个或自己写一句，这里就会拼成"我想要的房子：……"。</span>'}</p>
      ${full ? '<div class="con-acts"><button type="button" class="btn primary" id="con-copy">复制这段话</button><a class="btn" href="#s5">带着它去找中介</a><span class="muted">改了上面的选项，这段话会跟着变。</span></div>' : ''}</div>
    <div class="con-grid"><div><h3>一开始写的</h3>${start ? `<p class="con-start">${esc(START_PREFIX + start)}</p>` : '<p class="con-empty">起点还没写。回到"我现在想要的房子"写一句，这里就能对照。</p>'}</div></div>`;
  const copyBtn = $('#con-copy');
  if (copyBtn) copyBtn.addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(copyText); e.target.textContent = '已复制'; } catch { window.prompt('复制下面的文字', copyText); }
    setTimeout(() => { e.target.textContent = '复制这段话'; }, 1600);
  });
}

/* ---------- helpers ---------- */
function roomWordsLocal(t) { return String(t).split('主人房').join('大房').split('单人间').join('小房').split('单人房').join('小房'); }
function roomsMin(c) {
  if (typeof c.snapshot?.rooms_min === 'number') return c.snapshot.rooms_min;
  const s = c.snapshot?.rooms;
  if (!s) return null;
  // 只认 RM 300 以上的数字，避免把“水电 RM 50”当成房租
  const nums = [...s.matchAll(/RM\s?([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => n >= 300);
  return nums.length ? Math.min(...nums) : null;
}
function stationZh(nearest) {
  // "Universiti LRT（KJ19）" -> "Universiti 站"
  const m = String(nearest || '').match(/^([A-Za-z ]+?)\s*(LRT|MRT|KTM)/);
  return m ? `${m[1].trim()} 站${m[2] === 'KTM' ? '（KTM）' : ''}` : nearest;
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
  // 底图：默认用 OpenFreeMap 的矢量地图（简约样式，免 key），不支持 WebGL 时退回 OpenStreetMap 栅格图
  const VECTOR_STYLES = { positron: 'https://tiles.openfreemap.org/styles/positron', bright: 'https://tiles.openfreemap.org/styles/bright' };
  const canVector = () => typeof maplibregl !== 'undefined' && typeof L.maplibreGL === 'function' && (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch { return false; } })();
  let base = null;
  const setBase = (kind) => {
    if (base) map.removeLayer(base);
    if (kind !== 'osm' && canVector()) {
      base = L.maplibreGL({ style: VECTOR_STYLES[kind] || VECTOR_STYLES.positron, attribution: '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
    } else {
      base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
    }
    base.addTo(map);
  };
  const styleSel = $('#map-style');
  setBase(styleSel?.value || 'positron');
  styleSel?.addEventListener('change', () => setBase(styleSel.value));
  // "详细"开关叠加次要信息
  const detail = L.layerGroup();
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
  // KTM 电动火车站（区域 3 靠这个）：青色圆点常显，站名放进"详细"
  (state.meta.ktm || []).forEach((s) => {
    L.circleMarker([s.lat, s.lng], { radius: 5, color: '#1F7A8C', weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
    detail.addLayer(L.marker([s.lat, s.lng], { icon: L.divIcon({ className: 'station-label', html: s.zh, iconSize: null, iconAnchor: [-6, -8] }), interactive: false }));
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
  Object.keys(state.meta.regions || {}).map(Number).forEach((r) => {
    const pts = state.condos.filter((c) => c.region === r).map((c) => [c.lat, c.lng]);
    if (!pts.length) return;
    regionBounds[r] = L.latLngBounds(pts);
    const cx = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const top = regionBounds[r].getNorth(), bottom = regionBounds[r].getSouth();
    const labelLat = r === 1 ? top + 0.0022 : bottom - 0.0022;
    L.marker([labelLat, cx], { icon: L.divIcon({ className: `area-label r${r}`, html: esc(state.meta.regions[String(r)].label), iconSize: null }), interactive: false }).addTo(map);
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
    gate && { ll: gate, cls: 'gate', label: 'KL 门（正门）<span class="lm-long">· 出 Universiti 站过天桥</span>', base: true },
    { ll: [3.122159, 101.6340447], cls: 'gate', label: 'PJ 门', base: true },
    { ll: [3.1293, 101.6483], cls: 'gate', label: 'Section 16 门', base: true, minor: true },
    { ll: [3.13067, 101.66064], cls: 'gate', label: 'Damansara 门', base: true, minor: true },
    { ll: ELMU_GATE, cls: 'gate', label: 'Jalan Elmu 门', base: true, minor: true },
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
    const m = L.marker(l.ll, { icon: L.divIcon({ className: 'lm-icon' + (l.cls === 'gate' && l.base && /KL/.test(l.label) ? ' lm-up' : ''), html: `<span class="lm ${l.cls}${l.minor ? ' lm-minor' : ''}"><i class="ico"></i>${l.label}</span>`, iconSize: null, iconAnchor: (l.cls === 'gate' && /KL/.test(l.label)) ? [6, 34] : [6, 11] }), interactive: false, zIndexOffset: -200 });
    if (l.base) m.addTo(map); else detail.addLayer(m);
  });
  // "详细"开关
  const detailBtn = $('#map-detail');
  const setDetail = (on) => {
    if (on) { detail.addTo(map); map.getContainer().classList.remove('simple'); }
    else { map.removeLayer(detail); map.getContainer().classList.add('simple'); }
    if (detailBtn) { detailBtn.textContent = on ? '隐藏更多地标' : '显示更多地标'; detailBtn.setAttribute('aria-pressed', String(on)); }
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
  if (canFit(map, state.allBounds)) map.fitBounds(state.allBounds, FIT_OPTS);
  $('#map-reset')?.addEventListener('click', () => { clearSelection(); endTour(); map.fitBounds(state.allBounds, FIT_OPTS); });
  // 容器尺寸变了（页面还在排版、标签页从后台切回来、手机转屏）要告诉 Leaflet；
  // 如果之前是在 0 尺寸下算的视野（会缩成世界地图），顺手重新定位到全图
  let lastSize = map.getSize();
  const refit = () => {
    const prev = lastSize;
    map.invalidateSize();
    lastSize = map.getSize();
    if ((prev.x === 0 || prev.y === 0 || map.getZoom() <= 3) && canFit(map, state.allBounds)) map.fitBounds(state.allBounds, FIT_OPTS);
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(refit).observe($('#map'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refit(); });
  // 点一下地图再允许滚轮缩放，避免页面滚动被劫持
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());

  setupTour({ map, campusLayer: state.campusLayer, regionBounds, uni, gate, lrtLine, walkLayers });
}

/* ---------- guided tour ---------- */
let tour = null;
function setupTour(ctx) {
  const { map, campusLayer, regionBounds, uni, gate, lrtLine, walkLayers } = ctx;
  const pinsOf = (pred) => state.condos.filter(pred).map((c) => c.id);
  const steps = [
    {
      title: '导览 1 / 5 · 校园',
      text: '<b>绿色是 UM 校园</b>，从西边到东边 3 公里，有 5 个门：KL 门是正门，PJ 门通 Section 17，Section 16 门出去是地铁站，Damansara 门和 Jalan Elmu 门在北边。各学院之间靠免费穿梭巴士。',
      view: () => campusLayer ? map.fitBounds(campusLayer.getBounds().pad(0.15)) : map.setView([3.121, 101.654], 15),
      focus: [],
    },
    {
      title: '导览 2 / 5 · 正门和轻轨站',
      text: 'KL 门是正门，在校园东南角。<b>出 Universiti 站过一座天桥就进校</b>，绿色虚线就是这段路。两个红色虚线圈是从车站走 5 分钟和 10 分钟能到的范围，圈里的小区走路到正门，再坐校内穿梭巴士去学院。',
      view: () => map.setView(gate ? [(gate[0] + uni.lat) / 2, (gate[1] + uni.lng) / 2] : [uni.lat, uni.lng], 16),
      focus: pinsOf((c) => c.transit.walk_min != null && c.transit.walk_min <= 10),
    },
    {
      title: '导览 3 / 5 · 区域 2',
      text: '<b>蓝色 11 到 19 在 Bangsar South</b>。11 到 15 在步行圈里，走路上学，中国学生最多，楼下就有超市和商场。16 到 19 在南边山坡上，圈外，每天要坐车。',
      view: () => map.fitBounds(regionBounds[2].pad(0.15)),
      focus: pinsOf((c) => c.region === 2),
    },
    {
      title: '导览 4 / 5 · 区域 1',
      text: '<b>橙色 1 到 10 在 PJ</b>。这边没有走得到的轻轨站，去学校靠免费巴士、骑车或 Grab，10 分钟以内。Jaya One 是这边吃饭购物的地方，研究生宿舍也在这一侧（点"详细"能看到）。',
      view: () => map.fitBounds(regionBounds[1].pad(0.15)),
      focus: pinsOf((c) => c.region === 1),
    },
    {
      title: '导览 5 / 5 · 轻轨线',
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
      map.fitBounds(state.allBounds, FIT_OPTS);
    },
  };
  $('#tour-start')?.addEventListener('click', () => tour.start());
  $('#tour-next')?.addEventListener('click', () => tour.next());
  $('#tour-prev')?.addEventListener('click', () => tour.prev());
  $('#tour-close')?.addEventListener('click', () => tour.end());
}
function endTour() { if (tour && !$('#tour-box').hidden) tour.end(); }

/* ---------- filters ---------- */
// 筛选：一个按钮打开的面板。同一组里多选是"满足其一"，组与组之间是"同时满足"
const FAC_ZH = { pool: '泳池', gym: '健身房', sauna: '桑拿', steam: '蒸汽房', jacuzzi: '按摩池', badminton: '羽毛球', basketball: '篮球', squash: '壁球', tennis: '网球', bbq: '烧烤区', minimart: '楼下便利店' };
const IS_SERVICED = (c) => /服务式/.test(c.type);
function filterGroups() {
  const regions = state.meta.regions || {};
  return [
    { g: 'region', title: '区域', or: true, opts: Object.keys(regions).map((r) => ({ k: r, label: `区域 ${r} · ${regions[r].short || ''}`, f: (c) => String(c.region) === r })) },
    { g: 'go', title: '去学校', opts: [
      { k: 'rail15', label: '走路 15 分钟内到轨道站', f: (c) => c.transit.walk_min != null && c.transit.walk_min <= 15 },
      { k: 'rail10', label: '走路 10 分钟内到轨道站', f: (c) => c.transit.walk_min != null && c.transit.walk_min <= 10 },
      { k: 'bus', label: '有公交线路经过', f: (c) => (c.transit.buses || []).length > 0 },
    ] },
    { g: 'price', title: '价格', opts: [
      { k: 'hasroom', label: '这次有房间在租', f: (c) => roomsMin(c) != null },
      { k: 'r1000', label: '有 RM 1,000 内的房间', f: (c) => (roomsMin(c) ?? Infinity) <= 1000 },
      { k: 'r1300', label: '有 RM 1,300 内的房间', f: (c) => (roomsMin(c) ?? Infinity) <= 1300 },
      { k: 'w2500', label: '整套 RM 2,500 内', f: (c) => (c.snapshot.rent_from ?? Infinity) <= 2500 },
    ] },
    { g: 'kind', title: '类型', or: true, opts: [
      { k: 'serviced', label: '服务式公寓', f: IS_SERVICED },
      { k: 'apartment', label: '普通公寓', f: (c) => !IS_SERVICED(c) },
    ] },
    { g: 'build', title: '楼与规模', opts: [
      { k: 'new', label: '2018 年以后建成', f: (c) => (c.completed || 0) >= 2018 },
      { k: 'small', label: '500 户以下', f: (c) => c.units != null && c.units < 500 },
      { k: 'freehold', label: '永久地契', f: (c) => /Freehold/.test(c.tenure) },
    ] },
    { g: 'fac', title: '设施', opts: Object.keys(FAC_ZH).map((k) => ({ k, label: FAC_ZH[k], f: (c) => !!c.flags[k] })) },
  ];
}
function bindFilters() {
  const panel = $('#filter-panel'), btn = $('#filter-open'), tag = $('#filter-n');
  if (!panel || !btn) return;
  const groups = filterGroups();
  panel.innerHTML = groups.map((gr) => `<div class="fg"><h4>${esc(gr.title)}</h4><div class="fg-opts">`
    + gr.opts.map((o) => `<button type="button" class="fchip" data-f="${esc(gr.g)}:${esc(o.k)}" aria-pressed="false">${esc(o.label)}</button>`).join('')
    + '</div></div>').join('')
    + '<div class="fg-acts"><button type="button" class="linkish" id="filter-reset">清除</button><button type="button" class="btn" id="filter-done">确定</button></div>';
  const paint = () => {
    $$('.fchip', panel).forEach((b) => { const on = state.filters.has(b.dataset.f); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const n = state.filters.size;
    tag.hidden = !n; tag.textContent = String(n);
    btn.classList.toggle('has', !!n);
  };
  const open = (v) => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); };
  btn.addEventListener('click', () => open(panel.hidden));
  panel.addEventListener('click', (e) => {
    const chip = e.target.closest('.fchip');
    if (chip) { if (state.filters.has(chip.dataset.f)) state.filters.delete(chip.dataset.f); else state.filters.add(chip.dataset.f); paint(); renderList(); return; }
    if (e.target.id === 'filter-reset') { state.filters.clear(); paint(); renderList(); }
    if (e.target.id === 'filter-done') open(false);
  });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) open(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
  paint();
}

function filtered() {
  let list = state.condos.slice();
  for (const gr of filterGroups()) {
    const on = gr.opts.filter((o) => state.filters.has(`${gr.g}:${o.k}`));
    if (!on.length) continue;
    if (gr.or) list = list.filter((c) => on.some((o) => o.f(c)));
    else for (const o of on) list = list.filter(o.f);
  }
  const cheapestOf = (c) => Math.min(roomsMin(c) ?? Infinity, c.snapshot.rent_from ?? Infinity);
  const cmp = {
    no: (a, b) => a.no - b.no,
    walk: (a, b) => (a.transit.walk_min ?? 99) - (b.transit.walk_min ?? 99) || a.no - b.no,
    rent: (a, b) => cheapestOf(a) - cheapestOf(b) || a.no - b.no,
    year: (a, b) => (b.completed ?? 0) - (a.completed ?? 0) || a.no - b.no,
    units: (a, b) => (a.units ?? 1e9) - (b.units ?? 1e9) || a.no - b.no,
    fac: (a, b) => b.facilities.length - a.facilities.length || a.no - b.no,
  }[state.sort] || ((a, b) => a.no - b.no);
  return list.sort(cmp);
}

/* ---------- list ---------- */
function renderList() {
  const list = filtered();
  const grid = $('#grid');
  grid.innerHTML = list.map(cardHTML).join('');
  $('#empty').hidden = list.length > 0;
  $('#result-count').textContent = list.length === state.condos.length ? `${state.condos.length} 个小区` : `筛出 ${list.length} 个，共 ${state.condos.length} 个`;
  $$('[data-detail]', grid).forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.detail)));
  $$('[data-locate]', grid).forEach((b) => b.addEventListener('click', () => locate(b.dataset.locate)));
  $$('[data-toggle]', grid).forEach((b) => b.addEventListener('click', () => toggleCard(b.dataset.toggle)));
  sizeCards();
}

/* ---------- 卡片折叠：默认只看名字、去学校、一句价格，点开看全部 ---------- */
// 收起状态下每张卡片一样高：量出最高的那张要多少，写进 --card-h，全部照它来。
// 窗口宽度变了、筛选变了都会重量一次，所以换几列都不会有人被截掉。
function sizeCards() {
  const grid = $('#grid'); if (!grid) return;
  grid.style.setProperty('--card-h', 'auto');
  const cards = $$('.card.collapsed', grid);
  if (!cards.length) return;
  let max = 0;
  for (const el of cards) {
    // 收起时摘要行是绝对定位的，不算在卡片自身高度里，要单独加上
    const brief = el.querySelector('.brief');
    const h = el.getBoundingClientRect().height + (brief ? brief.getBoundingClientRect().height : 0);
    if (h > max) max = h;
  }
  grid.style.setProperty('--card-h', Math.ceil(max + 8) + 'px');
}
let sizeTimer = null;
window.addEventListener('resize', () => { clearTimeout(sizeTimer); sizeTimer = setTimeout(sizeCards, 150); }, { passive: true });
if (document.fonts?.ready) document.fonts.ready.then(sizeCards);
function toggleCard(id, force) {
  // 一张卡片只管自己：不重画别人，也不会把同一行的卡片撑高（.list 用 align-items: start）
  const on = force != null ? force : !state.expanded.has(id);
  if (on) state.expanded.add(id); else state.expanded.delete(id);
  const el = document.getElementById(`card-${id}`); if (!el) return;
  el.classList.toggle('collapsed', !on);
  const b = $('[data-toggle]', el);
  if (b) { b.setAttribute('aria-expanded', String(on)); b.setAttribute('aria-label', on ? '收起这张卡片' : '展开这张卡片'); b.title = on ? '收起' : '展开'; }
}
// 地址栏里可能还留着 #card-xxx（点过排行榜、名单或结论里的小区名）。留着的话每次刷新
// 都会把那张卡片重新展开，而且浏览器在卡片生成之前就处理完锚点了，页面根本不会滚过去，
// 结果就是刷新后有一张卡片自己开着。加载时直接清掉，刷新永远是全部收起。
// 进页面时的位置只有两种情况：
// 刷新 —— 一律回顶部，并把地址栏里残留的 #小节 或 #card-xxx 清掉（点过路线图的站或小区名
//        就会留下这些，不清的话刷新会落在页面中间甚至底部）；
// 第一次带链接进来 —— 跳到链接指的那一节。浏览器处理锚点时卡片、榜单、地图都还没渲染完，
//        算出来的位置是错的，所以等内容摆好之后自己算一次，并避开吸顶的顶栏。
function applyHashOnLoad() {
  if (IS_RELOAD) {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  const id = location.hash.slice(1);
  const el = id ? document.getElementById(id) : null;
  if (!el) return;
  const go = () => {
    const y = el.getBoundingClientRect().top + window.scrollY - 78;
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  };
  requestAnimationFrame(go);
  setTimeout(go, 400);
}
function expandFromHash() {
  const m = location.hash.match(/^#card-([a-z0-9-]+)$/); if (!m) return;
  if (!state.expanded.has(m[1])) toggleCard(m[1], true);
}
window.addEventListener('hashchange', expandFromHash);
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
  const groups = Object.keys(state.meta.regions).map((r) => [Number(r), state.meta.regions[r].label]).filter(([r]) => state.condos.some((c) => c.region === r));
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
    <p>${goSentence(c)} ${c.transit.walk_est ? tierMark('judgment', c) : ''}</p>
    <p>${c.completed ? c.completed + ' 年建成 · ' : ''}${c.units ? fmt(c.units) + ' 户 · ' : ''}${esc(c.type)} ${tierMark('profile', c)}</p>
    ${c.snapshot.rooms ? `<p><b>单间</b> ${esc(c.snapshot.rooms)}</p>` : '<p><b>单间</b> 这次没有找到在租的单间</p>'}
    ${c.snapshot.whole ? `<p><b>整套</b> ${esc(c.snapshot.whole)}</p>` : ''}
    <p class="muted">iProperty 在租 ${fmt(c.snapshot.for_rent)} 套（含单间帖子），整套最低 ${c.snapshot.rent_from ? 'RM ' + fmt(c.snapshot.rent_from) : '—'} ${tierMark('market', c)}</p>
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
  const tenure = c.tenure.includes('Freehold') ? '永久地契' : '租赁地契';
  const flagBits = [];
  if (c.tags.includes('只能整租')) flagBits.push('只有整套出租');
  if (c.tags.includes('整租适合两人')) flagBits.push('<span class="ok">适合两人整租</span>');
  if (c.tags.includes('整租适合三人')) flagBits.push('<span class="ok">适合三人整租</span>');
  if (c.tags.includes('家庭户型')) flagBits.push('家庭大户型');
  const collapsed = !state.expanded.has(c.id);
  const brief = [rmin != null ? `单间 RM ${fmt(rmin)} 起` : '没找到在租单间', c.snapshot.rent_from ? `整套 RM ${fmt(c.snapshot.rent_from)} 起` : null, c.completed ? `${c.completed} 年` : null, c.units ? `${fmt(c.units)} 户` : null].filter(Boolean).join(' · ');
  return `
  <article class="card r${c.region}${collapsed ? ' collapsed' : ''}" id="card-${c.id}">
    <span class="no" aria-label="编号 ${c.no}">${c.no}</span>
    <h3>${esc(shortAlias(c))}<small>${esc(c.name)} · ${esc(c.address)}</small></h3>
    <p class="go${t.walk_min == null ? ' none' : ''}">${goSentence(c)} ${t.walk_est ? tierMark('judgment', c) : ''}</p>
    <p class="brief"><span class="sum">${esc(brief)}</span><button type="button" class="toggle" data-toggle="${c.id}" aria-expanded="${!collapsed}" aria-label="${collapsed ? '展开这张卡片' : '收起这张卡片'}" title="${collapsed ? '展开' : '收起'}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.2 8 10l4-3.8"/></svg></button></p>
    <div class="more">
    <p class="facts">${c.completed ? c.completed + ' 年建成' : '建成年份不详'} · ${c.units ? fmt(c.units) + ' 户' : '户数不详'} · ${tenure} · ${esc(c.type)} ${tierMark('profile', c)}</p>
    <p class="facs">设施（${c.facilities.length} 项）：${esc(c.facilities.join('、'))}</p>
    <div class="price">
      ${c.snapshot.rooms ? `<p><span class="big">单间</span> ${esc(c.snapshot.rooms)} <span class="src">（${esc(c.snapshot.rooms_source || '')}）</span></p>` : '<p><span class="big">单间</span> 这次没有找到在租的单间</p>'}
      ${c.snapshot.whole ? `<p><span class="big">整套</span> ${esc(c.snapshot.whole)} <span class="src">（${esc(c.snapshot.whole_source || '')}）</span></p>` : ''}
      <p class="src">iProperty 上这个小区当下挂着 ${fmt(c.snapshot.for_rent)} 条在租，含单间帖子 ${tierMark('market', c)}</p>
    </div>
    ${flagBits.length ? `<p class="flags">${flagBits.join(' · ')}</p>` : ''}
    <div class="acts">
      <a class="btn primary" href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">iProperty 在租房源</a>
      <a class="linkish" href="${esc(c.links.ibilik)}" target="_blank" rel="noopener">iBilik 找单间</a>
      <button type="button" class="linkish" data-locate="${c.id}">在地图上看</button>
      <a class="linkish" href="${esc(c.links.maps)}" target="_blank" rel="noopener">Google 地图</a>
      <button type="button" class="linkish" data-detail="${c.id}">来源与详情</button>
      <button type="button" class="linkish" data-report="${c.id}">反馈</button>
    </div>
    </div>
  </article>`;
}

/* ---------- detail ---------- */
function openDetail(id) {
  const c = state.condos.find((x) => x.id === id);
  if (!c) return;
  const t = c.transit;
  $('#detail-inner').innerHTML = `
    <button type="button" class="btn detail-close" data-close aria-label="关闭">关闭</button>
    <h2 id="detail-title">${c.no} · ${esc(c.name)}</h2>
    <p class="sub">${esc(c.address)} · ${esc(state.meta.regions[String(c.region)].label)}</p>
    <dl class="kv">
      <dt>去学校</dt><dd>${goSentence(c)} ${tierMark(t.walk_est ? 'judgment' : 'profile', c)}${(t.other || []).length ? '<br>其他车站：' + esc(t.other.join('；')) : ''}${t.note ? '<br>' + esc(t.note) : ''}</dd>
      <dt>公交</dt><dd>${(t.buses || []).length ? esc(t.buses.join('、')) : '—'}</dd>
      ${c.um_km ? `<dt>到 UM</dt><dd>约 ${c.um_km} 公里${c.um_km_note ? '（' + esc(c.um_km_note) + '）' : ''}</dd>` : ''}
      <dt>开发商</dt><dd>${esc(c.developer)}</dd>
      <dt>地契</dt><dd>${esc(c.tenure)}</dd>
      <dt>建成</dt><dd>${c.completed ?? '不详'}</dd>
      <dt>规模</dt><dd>${c.units ? fmt(c.units) + ' 户' : '户数不详'} · ${esc(c.floors)} ${tierMark('profile', c)}</dd>
    </dl>
    <h3>设施（${c.facilities.length} 项）${tierMark('profile', c)}</h3>
    <p>${esc(c.facilities.join('、'))}</p>
    ${c.judgment?.daily || c.judgment?.quiet ? `<h3>吃饭购物 · 安静程度 ${tierMark('judgment', c)}</h3><p>${esc([c.judgment.daily?.note, c.judgment.quiet?.note].filter(Boolean).join('；'))}</p>` : ''}
    <h3>在租快照 ${tierMark('market', c)}</h3>
    <ul>
      <li>iProperty 在租 ${fmt(c.snapshot.for_rent)} 套（含单间帖子），整套最低 ${c.snapshot.rent_from ? 'RM ' + fmt(c.snapshot.rent_from) : '—'}</li>
      ${c.snapshot.rooms ? `<li>单间：${esc(c.snapshot.rooms)}（${esc(c.snapshot.rooms_source || '')}）</li>` : '<li>单间：这次没有找到在租的单间</li>'}
      ${c.snapshot.whole ? `<li>整套：${esc(c.snapshot.whole)}（${esc(c.snapshot.whole_source || '')}）</li>` : ''}
    </ul>
    ${c.notes?.length ? `<h3>要知道的 ${tierMark('judgment', c)}</h3><ul>${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <h3>来源</h3>
    <ul>${c.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
    <div class="detail-acts">
      <a class="btn primary" href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">iProperty 在租房源</a>
      <a class="btn" href="${esc(c.links.iproperty_building)}" target="_blank" rel="noopener">iProperty 项目页</a>
      <a class="btn" href="${esc(c.links.ibilik)}" target="_blank" rel="noopener">iBilik 找单间</a>
      <a class="btn" href="${esc(c.links.maps)}" target="_blank" rel="noopener">Google 地图</a>
      <button type="button" class="btn" data-report="${c.id}">信息不对？反馈</button>
    </div>`;
  const dlg = $('#detail');
  $('[data-close]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }, { once: true });
  dlg.showModal();
}

/* ---------- 认地方：校园示意图 + 周边三片（替代小红书那两张图，数据来自 data/campus.json 和 condos.json） ---------- */
const dm = (a, b) => { const R = 6371000, r = Math.PI / 180; const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r; return Math.sqrt(x * x + y * y) * R; };
// 经纬度 → SVG 坐标：给定范围和宽度，按纬度校正横向比例
function makeProj(pts, W, pad) {
  const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const scale = (W - 2 * pad) / ((maxLng - minLng) * kx);
  const H = Math.round((maxLat - minLat) * scale + 2 * pad);
  return { W, H, xy: (p) => [pad + (p.lng - minLng) * kx * scale, pad + (maxLat - p.lat) * scale] };
}
const svgPath = (ring, xy) => ring.map(([lng, lat], i) => (i ? 'L' : 'M') + xy({ lat, lng }).map((v) => v.toFixed(1)).join(' ')).join('') + 'Z';
async function renderCampus(geo) {
  const mapBox = $('#campus-map'), list = $('#campus-list'), aroundBox = $('#around-map'), groups = $('#around-groups');
  if (!mapBox || !geo) return;
  let data, bus = null;
  try { [data, bus] = await Promise.all([fetch('data/campus.json', { cache: 'no-cache' }).then((r) => r.json()), fetch('data/bus-routes.json', { cache: 'no-cache' }).then((r) => r.json()).catch(() => null)]); } catch { return; }
  const rings = (geo.features ? geo.features[0] : geo).geometry.coordinates.map((p) => p[0]);
  const main = rings.reduce((a, b) => (b.length > a.length ? b : a));
  const uni = (state.meta.stations || []).find((s) => s.name === 'Universiti');
  // KL 门：校园边界上离 Universiti 站最近的点
  const kl = data.gates.find((g) => g.id === 'kl');
  if (uni && kl) { let best = null, bd = Infinity; for (const [lng, lat] of main) { const d = (lat - uni.lat) ** 2 + (lng - uni.lng) ** 2; if (d < bd) { bd = d; best = { lat, lng }; } } Object.assign(kl, best); }
  const gates = data.gates.filter((g) => g.lat != null);
  const regionsMeta = state.meta.regions || {};
  const listBox = $('#campus-list-box');
  if (listBox && window.innerWidth <= 720) listBox.open = false;
  const byLat = (a, b) => b.lat - a.lat;
  const ordered = [...data.places.filter((p) => p.kind !== 'service').sort(byLat), ...data.places.filter((p) => p.kind === 'service').sort(byLat)];
  const places = ordered.map((p, i) => { let g = null, bd = Infinity; for (const x of gates) { const d = dm(p, x); if (d < bd) { bd = d; g = x; } } return { ...p, n: i + 1, gate: g, gate_m: Math.round(bd) }; });
  gates.forEach((g, i) => { g.letter = String.fromCharCode(65 + i); });

  /* 校园图 */
  {
    const ringPts = main.map(([lng, lat]) => ({ lat, lng }));
    const all = [...ringPts, ...places, ...gates, ...(uni ? [uni] : [])];
    const { W, H, xy } = makeProj(all, 640, 34);
    const label = (x, y, text, cls, anchor) => `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor || 'start'}">${esc(text)}</text>`;
    let s = `<svg class="campus-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="马来亚大学校园示意图：各学院、校门和 Universiti 站的位置">`;
    s += rings.map((r) => `<path class="cs-campus${r === main ? '' : ' minor'}" d="${svgPath(r, xy)}"/>`).join('');
    if (uni) { const [x, y] = xy(uni); s += `<circle class="cs-lrt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>` + label(x - 11, y + 20, 'Universiti 站', 'cs-lbl cs-lbl-lrt', 'end'); }
    const GATE_LBL = { kl: ['end', -14, 24], elmu: ['end', -14, 5], s16: ['start', 14, -8], damansara: ['end', -14, -10], pj: ['start', 14, 5] };
    for (const g of gates) { const [x, y] = xy(g); const [anchor, dx, dy] = GATE_LBL[g.id] || ['start', 14, -8]; s += `<g class="cs-gate-mk"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle">${g.letter}</text><title>${esc(g.zh)}</title></g>` + label(x + dx, y + dy, g.zh, 'cs-lbl cs-lbl-gate', anchor); }
    for (const p of places) { const [x, y] = xy(p); s += `<g class="cs-place${p.kind === 'service' ? ' service' : ''}${p.approx ? ' approx' : ''}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"/><text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" text-anchor="middle">${p.n}</text><title>${esc(p.zh)}</title></g>`; }
    s += `<text class="cs-north" x="${W - 30}" y="26" text-anchor="middle">北 ↑</text></svg>`;
    mapBox.innerHTML = s;
    if (list) {
      const item = (p) => `<li class="${p.kind === 'service' ? 'service' : ''}${p.approx ? ' approx' : ''}"><i class="cn">${p.n}</i><span><b>${esc(p.zh)}</b>${p.approx ? ' <em class="approx">位置是估的</em>' : ''}</span></li>`;
      const fac = places.filter((p) => p.kind !== 'service'), other = places.filter((p) => p.kind === 'service');
      list.innerHTML = `<div class="campus-group faculties"><h4>学院 <small>从北到南</small></h4><ol>${fac.map(item).join('')}</ol></div>` +
        `<div class="campus-group others"><h4>其他地点</h4><ol>${other.map(item).join('')}</ol></div>` +
        `<div class="campus-group gates"><h4>校门</h4><ol>${gates.map((g) => `<li class="gate"><i class="cn gate">${g.letter}</i><span><b>${esc(g.zh)}</b>${g.note ? `<small>${esc(g.note)}</small>` : ''}</span></li>`).join('')}</ol></div>`;
    }
  }

  /* 三大租房区域：圆角泡泡 + 推开重叠的编号点 + LRT 线 */
  if (aroundBox) {
    const ringPts = main.map(([lng, lat]) => ({ lat, lng }));
    const condos = state.condos;
    const stations = (state.meta.stations || []).slice().sort((a, b) => Number(a.code.replace(/\D/g, '')) - Number(b.code.replace(/\D/g, '')));
    const ktm = state.meta.ktm || [], mrt = state.meta.mrt || [];
    const all = [...ringPts, ...condos, ...stations, ...ktm, ...mrt];
    const { W, H, xy } = makeProj(all, 640, 64);
    // 编号点：真实位置太近的轻轻推开，避免互相压住（只动画面坐标，不动数据）
    const R_DOT = 10, MIN_D = R_DOT * 2 + 4;
    const pts = condos.map((c) => { const [x, y] = xy(c); return { c, x, y, ox: x, oy: y }; });
    for (let k = 0; k < 80; k++) {
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01;
        if (d < MIN_D) { const push = (MIN_D - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; }
      }
      for (const q of pts) { q.x += (q.ox - q.x) * 0.05; q.y += (q.oy - q.y) * 0.05; }
    }
    // 每片一个圆角凸包，用很粗的圆角描边画成泡泡
    const hull = (arr) => {
      const P = arr.slice().sort((a, b) => a.x - b.x || a.y - b.y);
      if (P.length < 3) return P;
      const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
      const lower = []; for (const q of P) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
      const upper = []; for (const q of P.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
      return lower.slice(0, -1).concat(upper.slice(0, -1));
    };
    let s = `<svg class="campus-svg around" viewBox="0 0 ${W} ${H}" role="img" aria-label="三大租房区域相对校园的位置示意图">`;
    const byRegion = {};
    pts.forEach((q) => { (byRegion[q.c.region] = byRegion[q.c.region] || []).push(q); });
    const labels = [];
    for (const [r, ps] of Object.entries(byRegion)) {
      const hp = hull(ps);
      const d = hp.map((q, i) => (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('') + 'Z';
      s += `<path class="cs-blob-edge r${r}" d="${d}"/><path class="cs-blob r${r}" d="${d}"/>`;
      const xs = ps.map((q) => q.x), ys = ps.map((q) => q.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const ly = r === '1' ? Math.min(...ys) - 38 : Math.max(...ys) + 46;
      labels.push({ r, x: Math.min(Math.max(cx, 80), W - 80), y: Math.min(Math.max(ly, 22), H - 10), text: `区域 ${r} · ${regionsMeta[r]?.short || ''}` });
    }
    s += `<path class="cs-campus" d="${svgPath(main, xy)}"/>`;
    { const [x, y] = xy({ lat: ringPts.reduce((a, q) => a + q.lat, 0) / ringPts.length, lng: ringPts.reduce((a, q) => a + q.lng, 0) / ringPts.length }); s += `<text class="cs-lbl cs-lbl-campus" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">马来亚大学</text>`; }
    // 公交：PJ 免费巴士（PJ01 / PJ02）和 Rapid KL 780，走向来自 OpenStreetMap。
    // 只保留离小区或校园近的一段（离任一小区 100 px 内，或离校园中心 140 px 内），跑远的部分不画，线的两端标去向
    if (bus?.routes?.length) {
      const inView = (x, y) => x >= 0 && x <= W && y >= 0 && y <= H;
      const campC = xy({ lat: ringPts.reduce((a, q) => a + q.lat, 0) / ringPts.length, lng: ringPts.reduce((a, q) => a + q.lng, 0) / ringPts.length });
      const keep = ([x, y]) => inView(x, y) && (pts.some((q) => Math.hypot(q.x - x, q.y - y) <= 100) || Math.hypot(x - campC[0], y - campC[1]) <= 140);
      for (const rt of bus.routes) {
        const kept = [], runs = [];
        for (const seg of rt.segments) {
          const xys = seg.map(([lat, lng]) => xy({ lat, lng }));
          let run = [];
          const flush = () => { if (run.length > 1) runs.push(run); run = []; };
          for (const q of xys) { if (keep(q)) run.push(q); else flush(); }
          flush();
        }
        // 孤立的小碎片（不到 40 px 且没有别的路段接着）不画
        const lenOf = (r) => r.reduce((acc, q, i) => acc + (i ? Math.hypot(q[0] - r[i - 1][0], q[1] - r[i - 1][1]) : 0), 0);
        const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= 4;
        const connected = (r, i) => runs.some((o, j) => j !== i && (near(o[0], r[0]) || near(o[o.length - 1], r[0]) || near(o[0], r[r.length - 1]) || near(o[o.length - 1], r[r.length - 1])));
        // 把首尾相接的路段连成链，整条链不到 60 px 的碎片不画
        const parent = runs.map((_, i) => i); const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
        const ends = runs.map((r) => [r[0], r[r.length - 1]]);
        for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) if (ends[i].some((e) => ends[j].some((f) => near(e, f)))) parent[find(i)] = find(j);
        const compLen = {}; runs.forEach((r, i) => { const c = find(i); compLen[c] = (compLen[c] || 0) + lenOf(r); });
        runs.forEach((r, i) => { if (compLen[find(i)] >= 60) { s += `<polyline class="cs-bus ${rt.kind}" points="${r.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ')}"><title>${esc(rt.name)}</title></polyline>`; r.forEach((q) => kept.push(q)); } });
        if (!kept.length) continue;
        if (rt.ref === 'PJ01') { const q = kept.reduce((a, b) => (b[1] > a[1] ? b : a)); s += `<text class="cs-lbl cs-lbl-bus pj" x="${Math.min(q[0] + 30, W - 6).toFixed(1)}" y="${(q[1] + 15).toFixed(1)}" text-anchor="end">PJ 免费巴士 PJ01 / PJ02</text>`; }
        if (rt.kind === 'rapid') {
          const west = kept.reduce((a, b) => (b[0] < a[0] ? b : a)); s += `<text class="cs-lbl cs-lbl-bus rapid" x="${Math.max(west[0] + 6, 6).toFixed(1)}" y="${(west[1] - 8).toFixed(1)}" text-anchor="start">780 路 ↑ 往 Kota Damansara</text>`;
          const right = kept.reduce((a, b) => (b[0] > a[0] ? b : a)); s += `<text class="cs-lbl cs-lbl-bus rapid" x="${Math.min(right[0] + 6, W - 6).toFixed(1)}" y="${(right[1] - 8).toFixed(1)}" text-anchor="end">780 路 → 往 Pasar Seni</text>`;
        }
      }
    }
    const stnLabel = (x, y, text, cls, anchor) => `<text class="cs-lbl cs-lbl-stn ${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor || 'start'}">${esc(text)}</text>`;
    // KTM：按数据顺序连成线（Mid Valley → Seputeh → Pantai Dalam → Petaling）
    if (ktm.length > 1) {
      const line = ktm.map((st) => xy(st).map((v) => v.toFixed(1)).join(',')).join(' ');
      s += `<polyline class="cs-line-case" points="${line}"/><polyline class="cs-ktm-line" points="${line}"/>`;
      s += ktm.map((st) => { const [x, y] = xy(st); const below = ['Mid Valley', 'Pantai Dalam'].includes(st.name); const lbl = below ? stnLabel(Math.min(x, W - 50), y + 17, st.name + ' KTM', 'ktm', 'middle') : (x > W - 90 ? stnLabel(x - 8, y + 4, st.name + ' KTM', 'ktm', 'end') : stnLabel(x + 8, y + 4, st.name + ' KTM', 'ktm')); return `<circle class="cs-ktm" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"><title>${esc(st.zh)}</title></circle>` + lbl; }).join('');
    }
    // LRT：线 + 车站 + 站名（西边三站标在线下，东边两站标在线上）
    if (stations.length > 1) {
      const line = stations.map((st) => xy(st).map((v) => v.toFixed(1)).join(',')).join(' ');
      s += `<polyline class="cs-line-case" points="${line}"/><polyline class="cs-line" points="${line}"/>`;
      s += stations.map((st) => { const [x, y] = xy(st); const major = st.name === 'Universiti'; return `<circle class="cs-stn${major ? ' major' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${major ? 6.5 : 3.5}"><title>${esc(st.zh)}</title></circle>`; }).join('');
      for (const st of stations) {
        const [x, y] = xy(st);
        if (st.name === 'Universiti') s += stnLabel(x - 11, y + 5, 'Universiti 站', 'lrt', 'end');
        else if (['Kerinchi', 'Abdullah Hukum'].includes(st.name)) s += stnLabel(x + (st.name === 'Abdullah Hukum' ? -8 : 8), y - 9, st.name, 'lrt', st.name === 'Abdullah Hukum' ? 'end' : 'start');
        else s += stnLabel(x, y + 16, st.name, 'lrt', 'middle');
      }
      const w0 = xy(stations[stations.length - 1]); s += stnLabel(w0[0] - 6, w0[1] - 14, 'LRT Kelana Jaya 线', 'lrt');
    }
    // MRT：只有 Phileo Damansara 一站在图内
    for (const st of mrt) { const [x, y] = xy(st); s += `<circle class="cs-mrt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"><title>${esc(st.zh)}</title></circle>` + stnLabel(x + 9, y + 4, st.name + ' MRT', 'mrt'); }
    for (const q of pts) s += `<g class="cs-condo r${q.c.region}"><circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${R_DOT}"/><text x="${q.x.toFixed(1)}" y="${(q.y + 4).toFixed(1)}" text-anchor="middle">${q.c.no}</text><title>${esc(shortAlias(q.c))}</title></g>`;
    for (const l of labels) s += `<text class="cs-region-lbl r${l.r}" x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" text-anchor="middle">${esc(l.text)}</text>`;
    s += `<text class="cs-north" x="${W - 30}" y="26" text-anchor="middle">北 ↑</text></svg>`;
    aroundBox.innerHTML = s;
    if (groups) {
      const transitLine = (cs) => {
        const near = {}; let none = 0; const buses = new Set(); let freeBus = false;
        for (const c of cs) {
          const t = c.transit || {};
          if (t.walk_min == null) none++; else { const k = String(t.nearest || '').replace(/（.*?）/g, ''); (near[k] = near[k] || []).push(t.walk_min); }
          for (const b of t.buses || []) { if (/免费/.test(b)) freeBus = true; if (/^[A-Z]{0,2}\d{2,3}$/.test(String(b))) buses.add(String(b)); }
        }
        const rail = Object.entries(near).sort((a, b) => Math.min(...a[1]) - Math.min(...b[1])).map(([k, mins]) => { const lo = Math.min(...mins), hi = Math.max(...mins); return `${k} 走 ${lo === hi ? lo : lo + '–' + hi} 分钟（${mins.length} 个小区）`; });
        const bits = [];
        if (rail.length) bits.push('轨道：' + rail.join('、'));
        if (none) bits.push(`${none} 个小区没有走得到的轨道站，靠${freeBus ? ' PJ 免费巴士、' : ''}公交或 Grab`);
        if (buses.size) bits.push('公交 ' + [...buses].sort().join(' / '));
        return bits.join('；') + '。';
      };
      groups.innerHTML = Object.keys(regionsMeta).map((r) => `<div class="campus-group region r${r}"><h4>${esc(regionsMeta[r].label)}</h4><p class="group-transit">${esc(transitLine(condos.filter((c) => String(c.region) === r)))}</p><ol>${condos.filter((c) => String(c.region) === r).map((c) => `<li><a href="#card-${c.id}"><i class="cn r${r}">${c.no}</i><span><b>${esc(shortAlias(c))}</b></span></a></li>`).join('')}</ol></div>`).join('');
      const lb = $('#around-list-box'); if (lb && window.innerWidth <= 720) lb.open = false;
    }
  }
}

/* ---------- reader reports（读者纠错）---------- */
function cfg() {
  const c = window.UM_CONFIG || {};
  return c.SUPABASE_URL && c.SUPABASE_KEY ? c : null;
}
// 匿名只能往 Supabase 的 reports 表写，读不到别人写的；管理员用 scripts/reports.mjs 或后台处理
const REPORT_FIELDS = {
  profile: ['建成年份', '户数', '楼层', '地契', '开发商', '地址或坐标', '设施（泳池、健身房等）', '最近轨道站或步行分钟', '其他'],
  market: ['在租数量', '整套最低价', '某房型最低价', '单间行情', '其他'],
  judgment: ['生活便利', '安静程度', '步行估计', '其他'],
  other: ['网页显示问题', '建议', '其他'],
};
function fillReportFields() {
  const f = $('#report-form'); if (!f) return;
  const tier = f.elements.tier.value;
  f.elements.field.innerHTML = (REPORT_FIELDS[tier] || REPORT_FIELDS.other).map((x) => `<option>${esc(x)}</option>`).join('');
}
function openReport(id, tier) {
  const dlg = $('#report'), f = $('#report-form'); if (!dlg || !f) return;
  const c = state.condos.find((x) => x.id === id);
  f.reset();
  f.elements.condo_id.value = c ? c.id : 'site';
  $('#report-condo').textContent = c ? `${c.no ? c.no + '. ' : ''}${shortAlias(c)}` : '整个网站';
  f.elements.tier.value = tier && REPORT_FIELDS[tier] ? tier : (c ? 'profile' : 'other');
  fillReportFields();
  const msg = $('#report-msg'); msg.textContent = ''; msg.className = 'form-msg';
  $('#report-done').hidden = true; f.hidden = false;
  const pop = $('#tier-pop'); if (pop) pop.hidden = true;
  const det = $('#detail'); if (det && det.open) det.close();
  dlg.showModal();
  setTimeout(() => f.elements.message.focus(), 50);
}
function bindReport() {
  const dlg = $('#report'), f = $('#report-form'); if (!dlg || !f) return;
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-report]'); if (b) { e.preventDefault(); openReport(b.dataset.report, b.dataset.reportTier); } });
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  f.elements.tier.addEventListener('change', fillReportFields);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#report-msg'), btn = $('button[type=submit]', f);
    const say = (t, cls) => { msg.textContent = t; msg.className = 'form-msg ' + (cls || ''); };
    if (f.elements.website.value) return; // 机器人才会填的隐藏框
    const text = f.elements.message.value.trim();
    if (text.length < 5) { say('再多写几个字，说清楚哪里不对、正确的是什么。', 'err'); return; }
    let last = 0; try { last = Number(localStorage.getItem('um-report-at') || 0); } catch { /* ignore */ }
    if (Date.now() - last < 30000) { say('刚提交过一条，请等半分钟再提交。', 'err'); return; }
    const c = cfg(); if (!c) { say('现在提交不了，请稍后再试。', 'err'); return; }
    btn.disabled = true; say('提交中…');
    const row = { condo_id: f.elements.condo_id.value || 'site', tier: f.elements.tier.value, field: String(f.elements.field.value || '').slice(0, 40), message: text.slice(0, 500), contact: f.elements.contact.value.trim().slice(0, 60) || null, page: (location.pathname + location.hash).slice(0, 200) };
    try {
      const r = await fetch(`${c.SUPABASE_URL}/rest/v1/reports`, { method: 'POST', headers: { apikey: c.SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      try { localStorage.setItem('um-report-at', String(Date.now())); } catch { /* ignore */ }
      f.hidden = true; $('#report-done').hidden = false;
    } catch (err) { console.warn('report failed', err); say('没发出去，请稍后再试。', 'err'); }
    btn.disabled = false;
  });
}

/* ---------- 大同小异：25 个小区的共同点，数字全部从档案现算 ---------- */
function renderCommon() {
  const box = $('#common'); if (!box) return;
  const C = state.condos;
  const link = (c) => `<a href="#card-${c.id}">${esc(shortAlias(c))}</a>`;
  const names = (arr) => arr.map(link).join('、');
  const n = (arr) => arr.length;
  const has = (k) => C.filter((c) => c.flags[k]);
  const serviced = C.filter(IS_SERVICED), plain = C.filter((c) => !IS_SERVICED(c));
  const byUnits = C.filter((c) => c.units).slice().sort((a, b) => a.units - b.units);
  const noUnits = C.filter((c) => !c.units);
  const big = C.filter((c) => c.units >= 1000), small = C.filter((c) => c.units && c.units < 500);
  const byYear = C.filter((c) => c.completed).slice().sort((a, b) => a.completed - b.completed);
  const noYear = C.filter((c) => !c.completed);
  const since = C.filter((c) => (c.completed || 0) >= 2018);
  const free = C.filter((c) => /Freehold/.test(c.tenure));
  const rail = C.filter((c) => c.transit.walk_min != null).slice().sort((a, b) => a.transit.walk_min - b.transit.walk_min);
  const noRail = C.filter((c) => c.transit.walk_min == null);
  const withRoom = C.filter((c) => roomsMin(c) != null), noRoom = C.filter((c) => roomsMin(c) == null);
  const sqft = [...new Set(C.map((c) => c.snapshot.whole).filter(Boolean).join(' ').match(/\d[\d,]* sqft/g) || [])].map((x) => Number(x.replace(/[^\d]/g, ''))).sort((a, b) => a - b);
  const facN = C.map((c) => c.facilities.length);
  const floors = C.map((c) => (String(c.floors || '').match(/\d+/g) || [])).flat().map(Number).filter((x) => x > 0 && x < 100).sort((a, b) => a - b);
  const extras = ['sauna', 'steam', 'jacuzzi', 'badminton', 'basketball', 'squash', 'tennis', 'bbq', 'minimart'];
  const oldest = byYear[0], newest = byYear[byYear.length - 1];
  const items = [
    ['泳池全都有，健身房差一个',
      `${n(C)} 个全部有泳池、全部写明 24 小时保安，${n(has('gym'))} 个有健身房，清单里没写健身房的只有 ${names(C.filter((c) => !c.flags.gym))}（待核实）。这三样不用比，要比的是加分项：`
      + extras.map((k) => `${FAC_ZH[k]} ${n(has(k))} 个`).join('，')
      + `。设施项数最少的是 ${link(C.slice().sort((a, b) => a.facilities.length - b.facilities.length)[0])}（${Math.min(...facN)} 项），最多的是 ${link(C.slice().sort((a, b) => b.facilities.length - a.facilities.length)[0])}（${Math.max(...facN)} 项）。`],
    ['服务式公寓占多数',
      `${n(serviced)} 个是服务式公寓，${n(plain)} 个是普通公寓（${names(plain)}）。服务式公寓多为商业地契，水电按商业费率计，同样用量比普通公寓贵一到两成，楼下通常有商铺和物业前台。`],
    [`楼龄从 ${oldest.completed} 年到 ${newest.completed} 年`,
      `最老的是 ${link(oldest)}（${oldest.completed} 年），最新的是 ${link(newest)}（${newest.completed} 年），其中 ${n(since)} 个是 2018 年以后建成的。${noYear.length ? `建成年份还没查到的是 ${names(noYear)}。` : ''}`],
    ['规模差得很远',
      `户数从 ${fmt(byUnits[0].units)} 户（${link(byUnits[0])}）到 ${fmt(byUnits[byUnits.length - 1].units)} 户（${link(byUnits[byUnits.length - 1])}）：${n(small)} 个不到 500 户，超过 1,000 户的只有 ${names(big)}，早晚高峰等电梯的差别就在这里。${noUnits.length ? `户数还没查到的是 ${names(noUnits)}。` : ''}楼高从 ${floors[0]} 层到 ${floors[floors.length - 1]} 层。`],
    ['两种地契都有',
      `${n(free)} 个永久地契（${names(free)}），其余 ${n(C) - n(free)} 个是租赁地契。这只影响房东买卖，租房不受影响，看房时不用纠结。`],
    [`${n(rail)} 个走得到轨道站`,
      `走得到的是：` + rail.map((c) => `${link(c)} ${c.transit.walk_min} 分钟${c.transit.walk_est ? '（估算）' : ''}`).join('，')
      + `。另外 ${n(noRail)} 个没有走得到的站（${names(noRail)}），每天靠公交、免费巴士或 Grab。步行分钟用 OpenStreetMap 路网核对过，有天桥的地方实际可能更短。`],
    ['房子都不大，家具都齐',
      `这次抓到的在租房源，面积从 ${fmt(sqft[0])} 平方英尺到 ${fmt(sqft[sqft.length - 1])} 平方英尺。帖子基本都标 fully furnished，也就是床、衣柜、空调、冰箱、洗衣机、热水器齐全，拎包入住；标 partially furnished 的要逐件问清楚缺哪几样。`],
    [`这次 ${n(withRoom)} 个有房间在租`,
      `${n(withRoom)} 个能查到房间（单间）的挂牌价，另外 ${n(noRoom)} 个这次只有整套出租：${names(noRoom)}。挂牌每 12 小时刷新一次，隔天再看会变。`],
    ['租房规矩一模一样',
      '押金 2 个月房租，加 1 个月预付租金，加半个月水电押金，签约当天一次付清；租期以 12 个月为主；中介费由房东付，租客不用给；合同要拿去税务局 LHDN 盖印花才算有效。'],
  ];
  box.innerHTML = items.map(([t, d]) => `<div class="cm"><h4>${t}</h4><p>${d}</p></div>`).join('');
}

/* ---------- 排行榜：一次看一个榜，25 个全列出来，长条表示差距 ----------
   规矩：每个榜只用档案或抓取里真实存在的字段，绝不拿直线距离之类的估算凑数；
   没有这项数据的小区不参与排名，灰着排在最后，并写明为什么没有。 */
// "24–33 层 × 3 栋" 这种写法里取最高的那个数；写"单栋""N/A"的就是没有数据
function topFloors(c) {
  const head = String(c.floors || '').split('层')[0];
  const nums = (head.match(/\d+/g) || []).map(Number);
  return nums.length ? Math.max(...nums) : null;
}
// 这次挂牌里最大的一套有多少平方英尺
function maxSqft(c) {
  const m = (String(c.snapshot.whole || '').match(/(\d[\d,]*) sqft/g) || []).map((x) => Number(x.replace(/[^\d]/g, '')));
  return m.length ? Math.max(...m) : null;
}
function routeMin(c) { const k = c.provenance?.transit?.check; return k && k.route_min != null ? k.route_min : null; }
function boardData() {
  const C = state.condos;
  const chk = C.map((c) => c.provenance?.transit?.check).find((k) => k && k.with);
  const walkSrc = chk ? `${chk.with}，${chk.at} 算的` : 'OpenStreetMap 路网';
  const profileSrc = `iProperty 项目页 + StarProperty 复核，核实于 ${state.meta.verified_at || '未知'}`;
  const marketSrc = `iProperty 和 iBilik 挂牌，抓取于 ${state.meta.prices_updated_myt || '未知'}`;
  return [
    { k: 'walk', tab: '走到轨道站最近', tier: 'profile', low: true, src: walkSrc,
      note: '从小区门口走到最近轨道站的实际路线分钟数。25 个用的是同一个方法、同一天算的，所以能直接比。卡片上写的分钟数来自中介帖子，有的比这个短。',
      rows: () => C.map((c) => { const v = routeMin(c); const st = stationZh(c.transit.nearest) || '最近的站'; return { c, v, ok: v != null, txt: v != null ? `${v} 分钟` : '没算出来', sub: c.transit.walk_min != null ? `到${st}` : `到${st}，太远，平时靠公交或 Grab` }; }) },
    { k: 'room', tab: '房间最便宜', tier: 'market', low: true, src: marketSrc,
      note: '这次抓到的房间（单间）最低挂牌价。只有整套出租的小区没有这项。',
      rows: () => C.map((c) => { const v = roomsMin(c); return { c, v, ok: v != null, txt: v != null ? `RM ${fmt(v)}` : '没有房间在租', sub: v != null ? (c.snapshot.rooms_source || '') : '这次只有整套出租' }; }) },
    { k: 'whole', tab: '整套最便宜', tier: 'market', low: true, src: marketSrc,
      note: '这次抓到的整套出租最低价，不分房型。',
      rows: () => C.map((c) => { const v = c.snapshot.rent_from; return { c, v, ok: v != null, txt: v != null ? `RM ${fmt(v)}` : '没有整套在租', sub: c.snapshot.whole_source || '' }; }) },
    { k: 'stock', tab: '在租房源最多', tier: 'market', low: false, src: marketSrc,
      note: 'iProperty 上这个小区当下挂着的在租条数，含单间帖子。条数多的容易找到房，也容易找室友。',
      rows: () => C.map((c) => { const v = c.snapshot.for_rent; return { c, v, ok: v != null, txt: v != null ? `${fmt(v)} 条` : '没抓到', sub: c.snapshot.date ? `${c.snapshot.date} 的挂牌` : '' }; }) },
    { k: 'size', tab: '户型最大', tier: 'market', low: false, src: marketSrc,
      note: '这次挂牌里最大的一套有多少平方英尺。挂牌变了这个数也会变。',
      rows: () => C.map((c) => { const v = maxSqft(c); return { c, v, ok: v != null, txt: v != null ? `${fmt(v)} 平方英尺` : '没抓到面积', sub: v != null ? String(c.snapshot.whole || '').split(' · ').find((x) => x.includes(fmt(v))) || '' : '这次的帖子没写面积' }; }) },
    { k: 'fac', tab: '设施最多', tier: 'profile', low: false, src: profileSrc,
      note: '档案里列出的设施项数，后面是泳池和健身房之外的加分项。',
      rows: () => C.map((c) => ({ c, v: c.facilities.length, ok: true, txt: `${c.facilities.length} 项`, sub: Object.keys(FAC_ZH).filter((k) => k !== 'pool' && k !== 'gym' && c.flags[k]).map((k) => FAC_ZH[k]).join('、') || '只有泳池和健身房' })) },
    { k: 'year', tab: '楼最新', tier: 'profile', low: false, src: profileSrc,
      note: '建成年份，越新越靠前；后面是户数。',
      rows: () => C.map((c) => ({ c, v: c.completed || null, ok: !!c.completed, txt: c.completed ? `${c.completed} 年` : '年份没查到', sub: c.units ? `${fmt(c.units)} 户` : '户数没查到' })) },
    { k: 'units', tab: '户数最少', tier: 'profile', low: true, src: profileSrc,
      note: '总户数，越少越清静、等电梯越短；后面是楼型。',
      rows: () => C.map((c) => ({ c, v: c.units || null, ok: c.units != null, txt: c.units ? `${fmt(c.units)} 户` : '户数没查到', sub: c.type })) },
    { k: 'floors', tab: '楼最高', tier: 'profile', low: false, src: profileSrc,
      note: '最高的一栋有多少层。档案里写"单栋""N/A"没给层数的排在最后。',
      rows: () => C.map((c) => { const v = topFloors(c); return { c, v, ok: v != null, txt: v != null ? `${v} 层` : '层数没查到', sub: String(c.floors || '') }; }) },
  ];
}
function renderBoard() {
  const box = $('#board'); if (!box) return;
  const boards = boardData();
  // 每次进页面都从第一个榜开始，不记上次看的是哪个
  let cur = 0;
  const paint = () => {
    const b = boards[cur];
    const rows = b.rows();
    const good = rows.filter((r) => r.ok), bad = rows.filter((r) => !r.ok);
    good.sort((x, y) => (b.low ? x.v - y.v : y.v - x.v) || x.c.no - y.c.no);
    const lo = Math.min(...good.map((r) => r.v)), hi = Math.max(...good.map((r) => r.v));
    const span = Math.max(1, hi - lo);
    // 条长只表示这一榜里的相对差距：第一名满格，最后一名留一小截
    const pct = (r) => Math.round(14 + 86 * (b.low ? (hi - r.v) / span : (r.v - lo) / span));
    const list = [...good, ...bad];
    box.innerHTML = `<div class="board-tabs" role="tablist">${boards.map((x, i) => `<button type="button" role="tab" class="btab${i === cur ? ' on' : ''}" aria-selected="${i === cur}" data-b="${i}">${esc(x.tab)}</button>`).join('')}</div>
      <p class="board-note">${esc(b.note)}</p>
      <p class="board-src">数据：${esc(b.src)} · 25 个里 ${good.length} 个有这项 ${tierMark(b.tier)}</p>
      <ol class="board-list" style="--rows:${Math.ceil(list.length / 2)}">${list.map((r) => `<li class="brow${r.ok ? '' : ' dim'}"><i class="bno r${r.c.region}">${r.c.no}</i><a class="bname" href="#card-${r.c.id}">${esc(shortAlias(r.c))}</a><span class="bbar"><i style="width:${r.ok ? pct(r) : 0}%"></i></span><b class="bval">${esc(r.txt)}</b><small class="bsub">${esc(r.sub || '')}</small></li>`).join('')}</ol>`;
    $$('.btab', box).forEach((t) => t.addEventListener('click', () => { cur = Number(t.dataset.b); paint(); }));
  };
  paint();
}

/* ---------- 三层标记：档案 / 行情 / 判断（ADR-001） ---------- */
const TIER_LABEL = { profile: '固定信息', market: '实时信息', judgment: '观点' };
const MARKET_STALE_HOURS = 36;
function mytToDate(s) {
  // "2026-09-08 14:49" 是马来西亚时间（UTC+8）
  const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 8, +m[5])) : null;
}
function marketAgeHours() {
  const d = mytToDate(state.meta.prices_updated_myt);
  return d ? (Date.now() - d.getTime()) / 3600e3 : null;
}
function tierText(kind, c) {
  if (kind === 'profile') return `固定信息 · 核实于 ${(c && c.verified_at) || state.meta.verified_at || '未知'}`;
  if (kind === 'market') {
    const h = marketAgeHours();
    if (h != null && h > MARKET_STALE_HOURS) return `实时信息 · 已 ${Math.round(h)} 小时未更新`;
    return `实时信息 · 抓取于 ${state.meta.prices_updated_myt || '未知'}`;
  }
  return '观点';
}
function tierMark(kind, c) {
  const stale = kind === 'market' && (marketAgeHours() ?? 0) > MARKET_STALE_HOURS;
  return `<button type="button" class="tier tier-${kind}${stale ? ' stale' : ''}" data-tier="${kind}"${c ? ` data-id="${esc(c.id)}"` : ''}><i></i>${esc(tierText(kind, c))}</button>`;
}
function renderTierPills() {
  const box = $('#tiers-top');
  if (!box) return;
  // 页首右下一处说清三类信息：各是什么、更新到什么时候（固定信息精确到日，实时信息精确到时，观点不标时间）。全站只在这里说一次
  const h = marketAgeHours(); const stale = h != null && h > MARKET_STALE_HOURS;
  const m = String(state.meta.prices_updated_myt || '').match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):/);
  const hourText = m ? `${m[1]} ${m[2]}:00` : (state.meta.prices_updated_myt || '未知');
  const row = (k, meaning, when, cls) => `<button type="button" class="tier-row tier-${k}${cls || ''}" data-tier="${k}" title="点一下看来源和说明"><b><i></i>${TIER_LABEL[k]}</b><span class="tm">${meaning}</span><time>${when}</time></button>`;
  box.innerHTML = row('profile', '小区档案类事实，人工核实', `更新 ${esc(state.meta.verified_at || '未知')}`) +
    row('market', '挂牌数量和价格，每天早晚 8 点自动抓', stale ? `已 ${Math.round(h)} 小时未更新` : `更新 ${esc(hourText)}`, stale ? ' stale' : '') +
    row('judgment', '吃饭方便、安静程度这类，我们自己判断的', '不标时间');
}
async function renderChangelog() {
  // 页脚只写一句"最近什么时候改过固定信息"，明细不摊开
  const box = $('#changelog'), when = $('#changelog-date');
  if (!box || !when) return;
  let log;
  try { log = await fetch('data/changelog.json', { cache: 'no-cache' }).then((r) => r.json()); } catch { return; }
  const dates = (log.entries || []).map((e) => e.date_myt).filter(Boolean).sort();
  if (!dates.length) return;
  when.textContent = dates[dates.length - 1];
  box.hidden = false;
}
function tierPopHTML(kind, c) {
  const tiers = state.meta.tiers || {};
  const t = tiers[kind] || {};
  if (kind === 'profile') {
    const src = c ? (c.sources || []).slice(0, 3).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('') : '';
    // 两个来源逐字段比过，这里只报个数，具体哪一项不用摊开说
    const second = ['completed', 'units', 'tenure', 'developer', 'floors', 'flags'].map((f) => c?.provenance?.[f]?.second).filter(Boolean);
    const agree = second.filter((x) => x.status === 'agree').length;
    const reviewed = second.filter((x) => x.status === 'conflict' && x.arbitrated).length;
    const conflict = second.filter((x) => x.status === 'conflict' && !x.arbitrated).length;
    const bits = [];
    if (agree) bits.push(`${agree} 项两个来源一致`);
    if (reviewed) bits.push(`${reviewed} 项已人工复核`);
    if (conflict) bits.push(`${conflict} 项待复核`);
    const tr = c?.provenance?.transit?.check;
    if (tr && tr.route_min != null) bits.push(`步行路线按 OpenStreetMap 算的（${tr.route_min} 分钟）`);
    return `<h4><i class="tier-dot tier-profile"></i>固定信息：可以直接信</h4>`
      + `<p>${esc(t.desc || '')}</p>`
      + `<p>核实于 ${esc((c && c.verified_at) || state.meta.verified_at)}${bits.length ? '，' + esc(bits.join('，')) : ''}。</p>`
      + (src ? `<ul>${src}</ul>` : '');
  }
  if (kind === 'market') {
    const h = marketAgeHours();
    const links = c ? `<ul><li><a href="${esc(c.links.iproperty_rent)}" target="_blank" rel="noopener">iProperty 在租列表</a></li>${c.links.ibilik ? `<li><a href="${esc(c.links.ibilik)}" target="_blank" rel="noopener">iBilik 单间列表</a></li>` : ''}</ul>` : '';
    const mu = c?.snapshot?.check?.mudah;
    const gap = mu && (mu.unit_status === 'gap' || mu.room_status === 'gap');
    const cross = mu ? `<p>另一来源 Mudah ${gap ? '<b>价格差得多，看清楚是不是单间冒充整套</b>' : (mu.unit_n || mu.room_n ? '对得上' : '没搜到这个小区')}。</p>` : '';
    return `<h4><i class="tier-dot tier-market"></i>实时信息：只能当参考</h4>`
      + `<p>${esc(t.desc || '')}</p>`
      + `<p>抓取于 ${esc(state.meta.prices_updated_myt || '未知')}${h != null ? `，距今 ${Math.round(h)} 小时` : ''}${h != null && h > MARKET_STALE_HOURS ? '，<b>可能过期</b>' : ''}。</p>`
      + cross + links;
  }
  const j = c && c.judgment;
  return `<h4><i class="tier-dot tier-judgment"></i>观点：我们的看法</h4>`
    + `<p>${esc(t.desc || '')}</p>`
    + (j ? `<ul>${j.daily ? `<li>吃饭购物：${esc(j.daily.note)}</li>` : ''}${j.quiet ? `<li>安静程度：${esc(j.quiet.note)}</li>` : ''}${j.walk_min_est ? `<li>步行分钟：${esc(j.walk_min_est.note)}</li>` : ''}</ul>` : '');
}

function bindTierPop() {
  let pop = $('#tier-pop');
  if (!pop) { pop = document.createElement('div'); pop.id = 'tier-pop'; pop.className = 'tier-pop'; pop.hidden = true; document.body.appendChild(pop); }
  const hide = () => { pop.hidden = true; if (pop.parentElement !== document.body) document.body.appendChild(pop); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.tier[data-tier], .tier-row[data-tier]');
    if (!b) { if (!e.target.closest('#tier-pop')) hide(); return; }
    const c = b.dataset.id ? state.condos.find((x) => x.id === b.dataset.id) : null;
    pop.innerHTML = tierPopHTML(b.dataset.tier, c);
    if (c) pop.insertAdjacentHTML('beforeend', `<p class="pop-act"><button type="button" class="linkish" data-report="${esc(c.id)}" data-report-tier="${esc(b.dataset.tier)}">这条信息不对？反馈</button></p>`);
    // 弹窗里的标记要把气泡放进弹窗，否则会被遮住
    const host = b.closest('.detail-inner') || document.body;
    if (pop.parentElement !== host) host.appendChild(pop);
    pop.hidden = false;
    const r = b.getBoundingClientRect();
    const hr = host === document.body ? { left: 0, top: 0 } : host.getBoundingClientRect();
    const sx = host === document.body ? window.scrollX : host.scrollLeft, sy = host === document.body ? window.scrollY : host.scrollTop;
    const w = pop.offsetWidth;
    let left = r.left - hr.left + sx;
    const maxLeft = (host === document.body ? document.documentElement.clientWidth : host.clientWidth) - w - 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);
    pop.style.left = `${left}px`;
    pop.style.top = `${r.bottom - hr.top + sy + 6}px`;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}
