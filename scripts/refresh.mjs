// 自动刷新价格快照：iProperty 每个小区的在租列表（按价格从低到高翻几页）+ iBilik Bangsar South 单间。
// 只改 snapshot 里的价格类字段和 meta.prices_updated_*；设施、年份、坐标等固定信息不动。
// 用法：node scripts/refresh.mjs                 全量（GitHub Actions 每 12 小时跑一次，见 .github/workflows/refresh.yml）
//       node scripts/refresh.mjs kl-gateway novum   只跑这几个小区的 iProperty，方便调试（加 --ibilik 也跑 iBilik）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'condos.json');
const LOG = join(ROOT, 'data', 'refresh-log.json');

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

// 用 curl 而不是 Node 自带的 fetch：iProperty 的防爬会拦 Node 的 TLS 指纹，但放行 curl（带浏览器 UA）
async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const { stdout } = await execFileP('curl', ['-sL', '--max-time', '40', '--compressed', '-A', UA,
        '-H', 'Accept-Language: en-US,en;q=0.9', '-H', 'Accept: text/html,application/xhtml+xml',
        '-w', STATUS_MARK + '%{http_code}', url], { maxBuffer: 20 * 1024 * 1024 });
      const idx = stdout.lastIndexOf(STATUS_MARK);
      const status = Number(stdout.slice(idx + STATUS_MARK.length).trim());
      const body = stdout.slice(0, idx);
      if (status === 200 && body.length > 1000) return body;
      if (status === 404) return null;
      console.warn(`  ${status} ${url}`);
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
const data = JSON.parse(readFileSync(DATA, 'utf8'));
const log = { started_at: new Date().toISOString(), date_myt: today, only: ONLY, iproperty: {}, ibilik: { ran: RUN_IBILIK, pages: 0, products: 0, matched: {} }, errors: [] };
const rooms = {};            // id -> [{ type, price, src }]
const refreshed = new Set(); // 这次 iProperty 成功的小区，只有这些才会改单间字段

// 1) iProperty：每个小区
for (const c of data.condos) {
  if (ONLY.length && !ONLY.includes(c.id)) continue;
  if (!c.links?.iproperty_rent) continue;
  process.stdout.write(`iProperty ${c.id} ... `);
  const r = await fetchCondoListings(c);
  if (r.error) { log.iproperty[c.id] = r.error; log.errors.push(`iproperty ${c.id}: ${r.error}`); console.log(r.error); await sleep(DELAY); continue; }
  // 标成“1 房”但面积不到 250 sqft 的，基本是把单间当整套发的帖子，按单间算
  const isRoom = (l) => !!l.room || (l.beds >= 1 && l.area && l.area < 250);
  const wholes = r.listings.filter((l) => !isRoom(l));
  const roomPosts = r.listings.filter(isRoom).map((l) => ({ type: roomTypeCN(l.room || 'room'), price: l.price, src: 'iProperty' })).filter((x) => x.type);
  c.snapshot.for_rent = r.count;
  c.snapshot.rent_from = wholes.length ? Math.min(...wholes.map((l) => l.price)) : null;
  const whole = wholeSummary(wholes);
  c.snapshot.whole = whole || null;
  c.snapshot.whole_source = whole ? `iProperty，${today}` : null;
  c.snapshot.date = today;
  if (roomPosts.length) rooms[c.id] = roomPosts;
  refreshed.add(c.id);
  log.iproperty[c.id] = `ok ${r.count} listings (${r.listings.length} read), whole from RM ${c.snapshot.rent_from ?? '-'}, rooms ${roomPosts.length}`;
  console.log(`${r.count} 套，整套最低 RM ${c.snapshot.rent_from ?? '—'}，单间帖子 ${roomPosts.length}`);
  await sleep(DELAY);
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
for (const c of data.condos) {
  if (!refreshed.has(c.id)) continue; // 这次 iProperty 没成功的，单间字段也不动
  // 低于 RM 500 的“单间”基本是写错价或按周计价的帖子，不采信
  const list = (rooms[c.id] || []).filter((r) => r.price >= 500);
  if (!list.length) {
    c.snapshot.rooms = null; c.snapshot.rooms_source = null; c.snapshot.rooms_min = null;
    continue;
  }
  const byType = {};
  for (const r of list) if (!byType[r.type] || r.price < byType[r.type]) byType[r.type] = r.price;
  const parts = ROOM_ORDER.filter((t) => byType[t]).map((t) => `${t} RM ${fmt(byType[t])} 起`);
  const srcs = [...new Set(list.map((r) => r.src))].join(' + ');
  c.snapshot.rooms = `${parts.join(' · ')}（${list.length} 条帖子）`;
  c.snapshot.rooms_source = `${srcs}，${today}`;
  c.snapshot.rooms_min = Math.min(...list.map((r) => r.price));
}

for (const c of data.condos) delete c.snapshot.newest_listed; // 早期版本留下的字段，页面不用
data.meta.prices_updated_at = new Date().toISOString();
data.meta.prices_updated_myt = myt().toISOString().slice(0, 16).replace('T', ' ');
log.finished_at = new Date().toISOString();
log.ok = log.errors.length === 0;
writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
const okN = Object.values(log.iproperty).filter((v) => v.startsWith('ok')).length;
console.log(`\n完成：iProperty ${okN}/${Object.keys(log.iproperty).length} 成功，iBilik ${log.ibilik.products} 条帖子，有单间行情的小区 ${Object.keys(rooms).length} 个，错误 ${log.errors.length} 个`);
