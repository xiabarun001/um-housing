// 自动刷新实时价格：iProperty 每个小区的在租列表（按价格从低到高翻几页）+ iBilik Bangsar South 单间。
// 数据分两层：data/condos.json 是固定信息（设施、坐标、链接……），这里只读不写；
//             data/prices.json 是实时信息，按小区 id 对应，这里每次整体重写；
//             data/price-history.json 每次成功刷新追加一天，只留最近 90 天。
// 用法：node scripts/refresh.mjs                 全量（GitHub Actions 每 12 小时跑一次，见 .github/workflows/refresh.yml）
//       node scripts/refresh.mjs kl-gateway novum   只跑这几个小区的 iProperty，方便调试（加 --ibilik 也跑 iBilik）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONDOS = join(ROOT, 'data', 'condos.json');        // 只读
const PRICES = join(ROOT, 'data', 'prices.json');        // 写
const HISTORY = join(ROOT, 'data', 'price-history.json'); // 写
const LOG = join(ROOT, 'data', 'refresh-log.json');      // 写
const HISTORY_DAYS = 90;

const ARGS = process.argv.slice(2);
const ONLY = ARGS.filter((a) => !a.startsWith('--'));
const RUN_IBILIK = ONLY.length === 0 ? !ARGS.includes('--no-ibilik') : ARGS.includes('--ibilik');
const DELAY = 3000;      // 两次请求之间等 3 秒，别给对方网站添麻烦
const MAX_PAGES = 3;     // 按价格从低到高最多翻 3 页（每页 20 条），够拿到各房型的最低价
const PAGE_SIZE = 20;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const myt = (d = new Date()) => new Date(d.getTime() + 8 * 3600e3); // 马来西亚时间 UTC+8
const today = myt().toISOString().slice(0, 10);
const fmt = (n) => Number(n).toLocaleString('en-MY');
const STATUS_MARK = '__STATUS__';
// 用哪个 curl：本机 Windows 的 curl 能直接过 iProperty 的防爬；GitHub Actions 的 Linux 上要换成 curl-impersonate（模仿 iOS Safari 的 TLS 指纹），
// 由 workflow 通过环境变量 CURL_BIN 指定。
const CURL_BIN = process.env.CURL_BIN || 'curl';

// 用 curl 而不是 Node 自带的 fetch：iProperty 的防爬会拦 Node 的 TLS 指纹，但放行 curl（带浏览器 UA）
async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      // curl-impersonate 的包装脚本自带一整套浏览器请求头，这时不要再重复加
      const browserHeaders = process.env.CURL_BIN ? [] : ['-A', UA, '-H', 'Accept-Language: en-US,en;q=0.9', '-H', 'Accept: text/html,application/xhtml+xml'];
      const { stdout } = await execFileP(CURL_BIN, ['-sL', '--max-time', '40', '--compressed', ...browserHeaders,
        '-w', STATUS_MARK + '%{http_code}', url], { maxBuffer: 20 * 1024 * 1024 });
      const idx = stdout.lastIndexOf(STATUS_MARK);
      const status = Number(stdout.slice(idx + STATUS_MARK.length).trim());
      const body = stdout.slice(0, idx);
      if (status === 200 && body.length > 1000) return body;
      if (status === 404) return null;
      console.warn(`  ${status} ${url}`);
      if (status === 429) { await sleep(12000 * (i + 1)); continue; } // 被限速：多等一会再试
    } catch (e) {
      console.warn(`  curl error ${url}: ${e.message.slice(0, 120)}`);
    }
    await sleep(3000 * (i + 1));
  }
  return null;
}

/* ---------- iProperty ---------- */
// 页面把数据放在 __NEXT_DATA__ 里：pageData.resultCount 是总数，listingsData[].listingData 是每条房源。
// 单间帖子在 listingFeatures 里带 listing-card-v2-room-type（Master Room / Middle Room / Single Room）。
function parseIProperty(html) {
  const m = html.match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let j;
  try { j = JSON.parse(m[1]); } catch { return null; }
  const pd = j?.props?.pageProps?.pageData;
  if (!pd) return null;
  const rc = Number(pd.resultCount);
  const count = Number.isFinite(rc) ? rc : null;
  const arr = pd.data?.listingsData || [];
  const listings = arr.map((x) => x.listingData).filter(Boolean).map((ld) => {
    const feats = (ld.listingFeatures || []).flat();
    const roomFeat = feats.find((f) => f && f.dataAutomationId === 'listing-card-v2-room-type');
    const beds = typeof ld.bedrooms === 'number' ? ld.bedrooms : parseInt(ld.bedrooms, 10); // -1 = 开间，0 = 单间帖子
    return {
      price: ld.price?.value ?? null,
      beds: Number.isFinite(beds) ? beds : null,
      area: typeof ld.floorArea === 'number' ? ld.floorArea : (parseInt(ld.floorArea, 10) || null),
      room: roomFeat ? String(roomFeat.text || '') : null,
      url: ld.url ? 'https://www.iproperty.com.my' + ld.url : null,
    };
  }).filter((l) => l.price);
  return { count, listings };
}

async function fetchCondoListings(c) {
  const base = c.links.iproperty_rent.replace(/[?#].*$/, '').replace(/\/+$/, '');
  let count = null;
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${base}${page > 1 ? '/' + page : ''}?sort=price&order=asc`;
    const html = await fetchText(url);
    if (!html) return page === 1 ? { error: 'fetch failed' } : { count, listings: all };
    const r = parseIProperty(html);
    if (!r) return page === 1 ? { error: 'parse failed' } : { count, listings: all };
    if (count == null) count = r.count;
    all.push(...r.listings);
    if (!r.listings.length || (count != null && page * PAGE_SIZE >= count)) break;
    await sleep(DELAY);
  }
  return { count: count ?? all.length, listings: all };
}

function bedsLabel(b) {
  if (b === -1) return '开间';
  if (b >= 1 && b <= 4) return `${b} 房`;
  return null;
}
function wholeSummary(listings) {
  // 每种房型取最低价那条，写成“开间 300 sqft RM 1,350 起 · 2 房 581 sqft RM 1,950 起”
  const best = {};
  for (const l of listings) {
    const label = bedsLabel(l.beds);
    if (!label) continue;
    if (!best[label] || l.price < best[label].price) best[label] = l;
  }
  const order = ['开间', '1 房', '2 房', '3 房', '4 房'];
  return order.filter((k) => best[k]).map((k) => {
    const l = best[k];
    const area = l.area && l.area >= 150 ? ' ' + fmt(l.area) + ' sqft' : ''; // 小于 150 sqft 的面积是填错的，不显示
    return `${k}${area} RM ${fmt(l.price)} 起`;
  }).join(' · ');
}

/* ---------- 单间：iProperty 的 room 帖子 + iBilik ---------- */
function roomTypeCN(text) {
  const s = String(text || '').toLowerCase();
  if (/master/.test(s)) return '主人房';
  if (/middle|medium/.test(s)) return '中房';
  if (/single/.test(s)) return '单人间';
  if (/small/.test(s)) return '小房';
  if (/studio|whole unit|entire|整套|fully furnished unit/.test(s)) return null; // 不是单间
  return '房间';
}
const ROOM_ORDER = ['小房', '单人间', '中房', '主人房', '房间'];

function parseIbilik(html) {
  const out = [];
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b[1]); } catch { continue; }
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o['@type'] === 'Product' && o.offers) {
        const price = Number(o.offers.price ?? o.offers.lowPrice);
        if (price) out.push({ name: String(o.name || ''), desc: String(o.description || ''), url: String(o.offers.url || o.url || ''), price });
      }
      Object.values(o).forEach(walk);
    })(j);
  }
  return out;
}
const IBILIK_KEYS = {
  'kl-gateway': /kl\s*gateway/i,
  'south-view': /south\s*view/i,
  'southlink': /south\s*link/i,
  'novum': /\bnovum\b/i,
  'pantai-panorama': /pantai\s*panorama/i,
  'laurel': /\blaurel\b/i,
  'saville': /\bsaville\b/i,
  'inwood': /\binwood\b/i,
  'secoya': /\bsecoya\b/i,
};

/* ---------- main ---------- */
const condos = JSON.parse(readFileSync(CONDOS, 'utf8')).condos;
const EMPTY = { date: null, for_rent: null, rent_from: null, whole: null, whole_source: null, rooms: null, rooms_source: null, rooms_min: null };
const prices = existsSync(PRICES) ? JSON.parse(readFileSync(PRICES, 'utf8')) : { updated_at: null, updated_myt: null, condos: {} };
prices.condos ||= {};
// 两个文件用 id 对齐：condos.json 里有的小区都要有一条价格记录；condos.json 里没有的 id 说明小区被删了，价格也一起删
const ids = new Set(condos.map((c) => c.id));
for (const id of Object.keys(prices.condos)) if (!ids.has(id)) { console.warn(`prices.json 里的 ${id} 在 condos.json 找不到，删掉`); delete prices.condos[id]; }
for (const c of condos) prices.condos[c.id] = { ...EMPTY, ...(prices.condos[c.id] || {}) };

const log = { started_at: new Date().toISOString(), date_myt: today, only: ONLY, iproperty: {}, ibilik: { ran: RUN_IBILIK, pages: 0, products: 0, matched: {} }, errors: [] };
const rooms = {};            // id -> [{ type, price, src }]
const refreshed = new Set(); // 这次 iProperty 成功的小区，只有这些才会改单间字段

// 1) iProperty：每个小区
for (const c of condos) {
  if (ONLY.length && !ONLY.includes(c.id)) continue;
  if (!c.links?.iproperty_rent) continue;
  const s = prices.condos[c.id];
  process.stdout.write(`iProperty ${c.id} ... `);
  const r = await fetchCondoListings(c);
  if (r.error) { log.iproperty[c.id] = r.error; log.errors.push(`iproperty ${c.id}: ${r.error}`); console.log(r.error); await sleep(DELAY); continue; }
  // 标成“1 房”但面积不到 250 sqft 的，基本是把单间当整套发的帖子，按单间算
  const isRoom = (l) => !!l.room || (l.beds >= 1 && l.area && l.area < 250);
  const wholes = r.listings.filter((l) => !isRoom(l));
  const roomPosts = r.listings.filter(isRoom).map((l) => ({ type: roomTypeCN(l.room || 'room'), price: l.price, src: 'iProperty' })).filter((x) => x.type);
  s.for_rent = r.count;
  s.rent_from = wholes.length ? Math.min(...wholes.map((l) => l.price)) : null;
  const whole = wholeSummary(wholes);
  s.whole = whole || null;
  s.whole_source = whole ? `iProperty，${today}` : null;
  s.date = today;
  if (roomPosts.length) rooms[c.id] = roomPosts;
  refreshed.add(c.id);
  log.iproperty[c.id] = `ok ${r.count} listings (${r.listings.length} read), whole from RM ${s.rent_from ?? '-'}, rooms ${roomPosts.length}`;
  console.log(`${r.count} 套，整套最低 RM ${s.rent_from ?? '—'}，单间帖子 ${roomPosts.length}`);
  await sleep(DELAY);
}

// 1b) Mudah 二源：按小区名搜整套和单间，和 iProperty 的最低价比对（只记录，不改 iProperty 的数）
const RUN_MUDAH = !ARGS.includes('--no-mudah');
function mudahAds(html) {
  const m = html.match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return (JSON.parse(m[1])?.props?.pageProps?.initialStore?.ads || []).filter((x) => x.type === 'ads').map((x) => x.attributes || {}); } catch { return null; }
}
const GENERIC = new Set(['residence', 'residences', 'residensi', 'the', 'park', 'condominium', 'condo', 'suites', 'suite', 'residential', 'serviced', 'service', 'apartment', 'apartments', 'mall', '@', '&', 'and']);
function keyTokens(c) {
  const base = String(c.alias || c.name).replace(/[（(].*?[）)]/g, '').toLowerCase();
  const toks = base.split(/[^a-z0-9']+/).filter((t) => t && !GENERIC.has(t));
  return toks.length ? toks : base.split(/\s+/).slice(0, 1);
}
const priceOf = (a) => { const n = Number(String(a.monthlyRent ?? a.priceLabel ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
if (RUN_MUDAH) {
  for (const c of condos) {
    if (ONLY.length && !ONLY.includes(c.id)) continue;
    if (!refreshed.has(c.id)) continue;
    const s = prices.condos[c.id];
    const toks = keyTokens(c);
    const hit = (txt) => { const t = String(txt || '').toLowerCase(); return toks.every((k) => t.includes(k)); };
    const area = c.region === 1 ? 'selangor' : 'kuala-lumpur';
    const q = encodeURIComponent(toks.join(' '));
    process.stdout.write(`Mudah ${c.id} ... `);
    const out = { at: today, unit_min: null, unit_n: 0, room_min: null, room_n: 0, status: 'single' };
    const uHtml = await fetchText(`https://www.mudah.my/${area}/apartment-condominium-for-rent?q=${q}`);
    // 整套低于 RM 900 的基本是把单间发到整套分类里，不算
    const units = uHtml ? (mudahAds(uHtml) || []).filter((a) => hit(a.buildingName) || hit(a.subject)).map(priceOf).filter((p) => p && p >= 900) : [];
    await sleep(4500); // Mudah 限速比较严，请求间隔放长
    const rHtml = await fetchText(`https://www.mudah.my/${area}/rooms-for-rent?q=${q}`);
    const rooms = rHtml ? (mudahAds(rHtml) || []).filter((a) => hit(a.subject) || hit(a.buildingName)).map(priceOf).filter((p) => p && p >= 300 && p <= 3000) : [];
    await sleep(4500);
    if (units.length) { out.unit_min = Math.min(...units); out.unit_n = units.length; }
    if (rooms.length) { out.room_min = Math.min(...rooms); out.room_n = rooms.length; }
    s.check = { mudah: out }; // 结论在第 3 步单间汇总之后再算
    console.log(`整套 ${out.unit_n} 条最低 RM ${out.unit_min ?? '—'} · 单间 ${out.room_n} 条最低 RM ${out.room_min ?? '—'}`);
  }
}
// 两边都有数时比最低价，差 35% 以内算一致；单间价在第 3 步汇总后才定，所以放在函数里最后调用
function finishMudahChecks() {
  const cmp = (a, b) => (a && b) ? (Math.abs(Math.log(a / b)) <= 0.35 ? 'agree' : 'gap') : null;
  for (const c of condos) {
    const s = prices.condos[c.id]; const out = s?.check?.mudah;
    if (!out || out.at !== today) continue;
    const u = cmp(s.rent_from, out.unit_min), r = cmp(s.rooms_min, out.room_min);
    out.unit_status = u; out.room_status = r;
    out.status = [u, r].includes('gap') ? 'gap' : [u, r].includes('agree') ? 'agree' : 'single';
    log.mudah = log.mudah || {}; log.mudah[c.id] = `units ${out.unit_n} min ${out.unit_min ?? '-'} (${u ?? '-'}), rooms ${out.room_n} min ${out.room_min ?? '-'} (${r ?? '-'})`;
  }
}

// 2) iBilik Bangsar South（区域 2 的单间，补充 iProperty 上没有的）
if (RUN_IBILIK) {
  let page = 1, total = null;
  while (page <= 8) {
    const url = 'https://www.ibilik.com/locations/malaysia/kuala-lumpur/pantai/bangsar-south' + (page > 1 ? `/page/${page}` : '');
    process.stdout.write(`iBilik page ${page} ... `);
    const html = await fetchText(url);
    if (!html) { log.errors.push(`ibilik page ${page}`); console.log('failed'); break; }
    if (total == null) { const t = html.match(/([0-9]+)\s+Rooms for Rent in Bangsar South/i); total = t ? Number(t[1]) : null; }
    const items = parseIbilik(html);
    console.log(`${items.length} 条`);
    log.ibilik.pages = page; log.ibilik.products += items.length;
    if (!items.length) break;
    for (const it of items) {
      const text = it.name + ' ' + it.desc;
      for (const [id, re] of Object.entries(IBILIK_KEYS)) {
        if (!re.test(text)) continue;
        if (ONLY.length && !ONLY.includes(id)) break;
        const type = roomTypeCN(it.name + ' ' + it.url);
        if (!type) break;
        (rooms[id] ||= []).push({ type, price: it.price, src: 'iBilik' });
        log.ibilik.matched[id] = (log.ibilik.matched[id] || 0) + 1;
        break;
      }
    }
    if (total && page * 15 >= total) break;
    page++;
    await sleep(1500);
  }
}

// 3) 汇总单间：iProperty 和 iBilik 各房型取最低价
for (const c of condos) {
  if (!refreshed.has(c.id)) continue; // 这次 iProperty 没成功的，单间字段也不动
  const s = prices.condos[c.id];
  // 低于 RM 500 的“单间”基本是写错价或按周计价的帖子，不采信
  const list = (rooms[c.id] || []).filter((r) => r.price >= 500);
  if (!list.length) { s.rooms = null; s.rooms_source = null; s.rooms_min = null; continue; }
  const byType = {};
  for (const r of list) if (!byType[r.type] || r.price < byType[r.type]) byType[r.type] = r.price;
  const parts = ROOM_ORDER.filter((t) => byType[t]).map((t) => `${t} RM ${fmt(byType[t])} 起`);
  const srcs = [...new Set(list.map((r) => r.src))].join(' + ');
  s.rooms = `${parts.join(' · ')}（${list.length} 条帖子）`;
  s.rooms_source = `${srcs}，${today}`;
  s.rooms_min = Math.min(...list.map((r) => r.price));
}

// 3b) Mudah 二源的结论
if (RUN_MUDAH) finishMudahChecks();

// 4) 写文件
const okN = Object.values(log.iproperty).filter((v) => v.startsWith('ok')).length;
const tried = Object.keys(log.iproperty).length;
// iProperty 失败超过 2 个小区就算这次没更新成：不改“最近一次更新”时间，并以非零退出让 workflow 不提交
const usable = tried > 0 && tried - okN <= 2;
if (usable) {
  prices.updated_at = new Date().toISOString();
  prices.updated_myt = myt().toISOString().slice(0, 16).replace('T', ' ');
  // 历史：同一天多次刷新只留最后一次；只保留最近 HISTORY_DAYS 天
  const hist = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, 'utf8')) : { days: [] };
  hist.days = (hist.days || []).filter((d) => d.date !== today);
  const day = { date: today, condos: {} };
  for (const c of condos) { const s = prices.condos[c.id]; day.condos[c.id] = { for_rent: s.for_rent, rent_from: s.rent_from, rooms_min: s.rooms_min }; }
  hist.days.push(day);
  hist.days.sort((a, b) => a.date.localeCompare(b.date));
  hist.days = hist.days.slice(-HISTORY_DAYS);
  writeFileSync(HISTORY, JSON.stringify(hist, null, 2) + '\n');
}
log.finished_at = new Date().toISOString();
log.ok = usable && log.errors.length === 0;
writeFileSync(PRICES, JSON.stringify(prices, null, 2) + '\n');
writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
console.log(`\n完成：iProperty ${okN}/${tried} 成功，iBilik ${log.ibilik.products} 条帖子，有单间行情的小区 ${Object.keys(rooms).length} 个，错误 ${log.errors.length} 个`);
if (!usable) { console.error('iProperty 失败太多，这次不算更新成功'); process.exitCode = 1; }
