// 档案采集（ADR-002 第 1–3 步）：从 iProperty 项目页抓固定信息，和现有 condos.json 比对，写 staging 和 REVIEW.md。
// 只写 data/staging/，不碰 condos.json；发布用 scripts/publish.mjs。
// 用法：node scripts/collect.mjs kl-gateway novum        按 id 采集（用记录里的 iproperty_building 链接）
//       node scripts/collect.mjs --all                    全部现有小区
//       node scripts/collect.mjs https://www.iproperty.com.my/condo/avara-10395 --id=avara   新小区，指定 id
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONDOS = join(ROOT, 'data', 'condos.json');
const STAGING = join(ROOT, 'data', 'staging');
const DELAY = 3000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const CURL_BIN = process.env.CURL_BIN || 'curl';
const STATUS_MARK = '__STATUS__';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // 马来西亚日期

/* ---------- 抓取 ---------- */
async function fetchPage(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const browserHeaders = process.env.CURL_BIN ? [] : ['-A', UA, '-H', 'Accept-Language: en-US,en;q=0.9', '-H', 'Accept: text/html,application/xhtml+xml'];
      const { stdout } = await execFileP(CURL_BIN, ['-sL', '--max-time', '40', '--compressed', ...browserHeaders,
        '-w', STATUS_MARK + '%{http_code}|%{url_effective}', url], { maxBuffer: 20 * 1024 * 1024 });
      const idx = stdout.lastIndexOf(STATUS_MARK);
      const [status, finalUrl] = stdout.slice(idx + STATUS_MARK.length).trim().split('|');
      const body = stdout.slice(0, idx);
      if (Number(status) === 200 && body.length > 1000) return { body, finalUrl };
      if (Number(status) === 404) return { error: '404' };
      console.warn(`  ${status} ${url}`);
    } catch (e) { console.warn(`  curl error ${url}: ${e.message.slice(0, 120)}`); }
    await sleep(3000 * (i + 1));
  }
  return { error: 'fetch failed' };
}

/* ---------- 解析 iProperty 项目页 ---------- */
const FAC_ZH = {
  'swimming pool': '泳池', 'wading pool': '儿童池', 'gym': '健身房', 'gymnasium': '健身房', 'sauna': '桑拿', 'steam bath': '蒸汽房', 'steam room': '蒸汽房',
  'jacuzzi': '按摩池', 'bbq': '烧烤区', 'barbeque area': '烧烤区', 'playground': '儿童游乐场', 'multi-purpose hall': '多功能厅', 'lounge': '休息厅',
  'covered car park': '有顶停车场', 'parking': '停车场', '24-hour security': '24 小时保安', '24 hours security': '24 小时保安', 'perimeter fencing': '围栏',
  'squash court': '壁球场', 'tennis court': '网球场', 'badminton court': '羽毛球场', 'basketball court': '篮球场', 'mini market': '便利店', 'minimart': '便利店',
  'cafeteria': '咖啡座', 'cafe': '咖啡座', 'nursery': '托儿所', 'prayer room': '祈祷室', 'surau': '祈祷室', 'business centre': '商务中心', 'jogging track': '跑道',
  'club house': '会所', 'clubhouse': '会所', 'launderette': '洗衣房', 'salon': '美发', 'meeting room': '会议室', 'library': '图书室', 'function room': '宴会厅',
  'garden': '花园', 'sky lounge': '空中休息厅', 'yoga room': '瑜伽室', 'reading room': '阅览室', 'game room': '游戏室', 'games room': '游戏室', 'karaoke': '卡拉 OK',
  'lift': '电梯', 'lift lobby': '电梯厅', 'drop off point': '落客点', 'reflexology path': '足底按摩步道', 'community hall': '社区厅', 'kindergarten': '幼儿园',
  'pool deck': '泳池平台', 'sun deck': '日光平台', 'wet deck': '浅水平台', 'kids pool': '儿童池', 'children playground': '儿童游乐场', 'security': '保安',
  'convenience store': '便利店', 'retail shops': '商铺', 'retail': '商铺', 'cctv': '监控', 'guarded': '门卫', 'gated & guarded': '门禁与门卫',
};
const FLAG_RULES = {
  pool: /pool/i, gym: /gym/i, sauna: /sauna/i, steam: /steam/i, jacuzzi: /jacuzzi|spa pool/i, badminton: /badminton/i, basketball: /basketball/i,
  squash: /squash/i, tennis: /tennis/i, bbq: /bbq|barbe/i, minimart: /mini ?market|minimart|convenience store|retail/i,
};
const TYPE_ZH = { 'Service Residence': '服务式公寓', 'Serviced Residence': '服务式公寓', 'Condominium': '公寓', 'Apartment': '公寓', 'Flat': '组屋', 'SOHO': 'SOHO 服务式公寓', 'Townhouse': '联排', 'Residential Land': '住宅地' };

function deepFind(obj, pred, out = [], depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 12) return out;
  if (pred(obj)) out.push(obj);
  for (const v of Object.values(obj)) if (v && typeof v === 'object') deepFind(v, pred, out, depth + 1);
  return out;
}
function parseProject(html, finalUrl) {
  const m = html.match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let j; try { j = JSON.parse(m[1]); } catch { return null; }
  const d = j?.props?.pageProps?.pageData?.data;
  if (!d?.projectData) return null;
  const P = d.projectData;
  const items = (d.projectDetailsData?.items || []).map((x) => ({ text: String(x.value || ''), prefix: x.prefix, url: x.url }));
  const pick = (re) => { const it = items.find((x) => re.test(x.text) || re.test(x.prefix || '')); return it ? it.text : null; };
  const num = (s) => { const mm = String(s || '').match(/([\d,]+)/); return mm ? Number(mm[1].replace(/,/g, '')) : null; };
  const completed = num(pick(/Completed in/i));
  const units = num(pick(/total units/i));
  const floorsN = num(pick(/floors/i));
  const developerItem = items.find((x) => /Developed by/i.test(x.prefix || ''));
  const buildings = (d.buildingDetailsData?.items || []).map((b) => ({ name: b.name, floors: b.totalFloors, units: b.totalUnits }));
  const tenureCode = P.tenure; // L / F
  const facilitiesEn = (d.facilitiesData?.items || []).map((x) => String(x.value || '').trim()).filter(Boolean);
  const facilities = facilitiesEn.map((f) => FAC_ZH[f.toLowerCase()] || f);
  const flags = {}; for (const [k, re] of Object.entries(FLAG_RULES)) flags[k] = facilitiesEn.some((f) => re.test(f));
  const geo = deepFind(d, (o) => typeof o.latitude === 'number' && typeof o.longitude === 'number')[0] || null;
  const about = String(d.aboutProjectData?.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const rentLinks = deepFind(d, (o) => typeof o.url === 'string' && /-for-rent\/at-|property-for-rent\/at-/.test(o.url)).map((o) => o.url);
  const idFromUrl = (finalUrl.match(/-(\d+)\/?$/) || [])[1] || String(P.projectId || '');
  return {
    name: P.projectName, property_type_en: P.propertyType, type: TYPE_ZH[P.propertyType] || P.propertyType, tenure_code: tenureCode,
    tenure: tenureCode === 'F' ? 'Freehold 永久地契' : tenureCode === 'L' ? 'Leasehold 租赁地契' : null,
    district: P.districtName, region_name: P.regionName, project_id: P.projectId || Number(idFromUrl) || null,
    completed, units, floors: floorsN, buildings, developer: developerItem ? developerItem.text : null,
    address: d.projectLocationInfoData?.fullAddress || null,
    lat: geo ? geo.latitude : null, lng: geo ? geo.longitude : null,
    facilities, facilities_en: facilitiesEn, flags, about: about.slice(0, 1200),
    links: { iproperty_building: finalUrl, iproperty_rent: rentLinks.length ? 'https://www.iproperty.com.my' + rentLinks[0].replace(/^https?:\/\/[^/]+/, '') : `https://www.iproperty.com.my/property-for-rent/at-${slugify(P.projectName)}-${P.projectId || idFromUrl}` },
    counts: { rent: d.listingSummaryData?.rent?.count ?? null, sale: d.listingSummaryData?.sale?.count ?? null },
  };
}
const slugify = (s) => String(s).toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ---------- 比对 ---------- */
const distM = (a, b) => { const R = 6371000, toR = (x) => x * Math.PI / 180; const dLat = toR(b[0] - a[0]), dLon = toR(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
function floorsText(p) {
  if (p.buildings.length > 1) { const fl = [...new Set(p.buildings.map((b) => b.floors).filter(Boolean))]; return `${fl.join(' / ')} 层 × ${p.buildings.length} 栋`; }
  return p.floors ? `${p.floors} 层` : null;
}
function compare(current, p) {
  const out = {};
  const cmp = (field, cur, prop, same) => { out[field] = { current: cur ?? null, proposed: prop ?? null, status: cur == null && prop == null ? 'none' : cur == null ? 'new' : prop == null ? 'missing' : same ? 'same' : 'changed' }; };
  cmp('name', current?.name, p.name, current && current.name.replace(/（.*?）/g, '').trim().toLowerCase() === String(p.name).toLowerCase());
  cmp('completed', current?.completed, p.completed, current?.completed === p.completed);
  cmp('units', current?.units, p.units, current?.units === p.units);
  // 楼层：我们的写法可能是“38 层 × 2 栋”，iProperty 只给一个数；层数对得上就算一致
  cmp('floors', current?.floors, floorsText(p), current?.floors && p.floors && String(current.floors).includes(String(p.floors)));
  cmp('tenure', current?.tenure, p.tenure, current?.tenure && p.tenure_code && current.tenure.startsWith(p.tenure_code === 'F' ? 'Freehold' : 'Leasehold'));
  cmp('type', current?.type, p.type, current?.type === p.type || (current?.type || '').includes(p.type || '—'));
  const devNorm = (s) => String(s || '').toLowerCase().replace(/sdn\.? ?bhd\.?|berhad|group|development|\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
  cmp('developer', current?.developer, p.developer, current?.developer && p.developer && (devNorm(current.developer) === devNorm(p.developer) || devNorm(current.developer).includes(devNorm(p.developer).slice(0, 6))));
  // 地址两边格式不同，只供参考，不算差异
  cmp('address', current?.address, p.address, true);
  const geoSame = current?.lat && p.lat ? distM([current.lat, current.lng], [p.lat, p.lng]) < 40 : false;
  out.geo = { current: current ? [current.lat, current.lng] : null, proposed: p.lat ? [p.lat, p.lng] : null, status: !current ? 'new' : !p.lat ? 'missing' : geoSame ? 'same' : 'changed', distance_m: current?.lat && p.lat ? Math.round(distM([current.lat, current.lng], [p.lat, p.lng])) : null };
  const curF = new Set(current?.facilities || []), propF = new Set(p.facilities);
  out.facilities = { current: current?.facilities || null, proposed: p.facilities, added: p.facilities.filter((f) => !curF.has(f)), removed: (current?.facilities || []).filter((f) => !propF.has(f)), status: !current ? 'new' : (p.facilities.filter((f) => !curF.has(f)).length || (current.facilities || []).filter((f) => !propF.has(f)).length) ? 'changed' : 'same' };
  const flagDiff = Object.keys(p.flags).filter((k) => current && !!current.flags?.[k] !== p.flags[k]);
  out.flags = { current: current?.flags || null, proposed: p.flags, changed_keys: flagDiff, status: !current ? 'new' : flagDiff.length ? 'changed' : 'same' };
  return out;
}

/* ---------- main ---------- */
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const targets = args.filter((a) => !a.startsWith('--'));
const data = JSON.parse(readFileSync(CONDOS, 'utf8'));
mkdirSync(STAGING, { recursive: true });

let jobs = [];
if (opts.all) jobs = data.condos.map((c) => ({ id: c.id, url: c.links.iproperty_building, current: c }));
else for (const t of targets) {
  if (/^https?:/.test(t)) jobs.push({ id: opts.id || null, url: t, current: opts.id ? data.condos.find((c) => c.id === opts.id) || null : null });
  else { const c = data.condos.find((x) => x.id === t); if (!c) { console.error(`没有这个 id：${t}`); process.exitCode = 1; continue; } jobs.push({ id: c.id, url: c.links.iproperty_building, current: c }); }
}
if (!jobs.length && !opts['report-only']) { console.error('用法：node scripts/collect.mjs <id ...> | --all | <项目链接> --id=<新id> | --report-only'); process.exit(1); }

// --report-only：不抓取，用已有 staging 重新比对并出报告（比对规则改了之后用）
if (opts['report-only']) {
  for (const f of readdirSync(STAGING).filter((x) => x.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(join(STAGING, f), 'utf8'));
    if (s.status !== 'ok' || !s.proposed) continue;
    const cur = data.condos.find((c) => c.id === s.id) || null;
    s.diff = compare(cur, s.proposed); s.is_new = !cur;
    s.assessment = Object.fromEntries(Object.keys(s.diff).map((k) => [k, '单源（iProperty）']));
    writeFileSync(join(STAGING, f), JSON.stringify(s, null, 2) + '\n');
  }
}

for (const job of jobs) {
  process.stdout.write(`采集 ${job.id || job.url} ... `);
  const r = await fetchPage(job.url);
  const staging = { id: job.id, source: { url: job.url, final_url: r.finalUrl || null, site: 'iProperty 项目页' }, fetched_at: now(), date_myt: today, status: 'ok' };
  if (r.error) { staging.status = 'fetch_failed'; staging.error = r.error; console.log(r.error); }
  else {
    const p = parseProject(r.body, r.finalUrl);
    if (!p) { staging.status = 'parse_failed'; console.log('parse failed'); }
    else {
      if (!staging.id) staging.id = slugify(p.name);
      staging.proposed = p;
      staging.diff = compare(job.current, p);
      staging.assessment = Object.fromEntries(Object.keys(staging.diff).map((k) => [k, '单源（iProperty）']));
      staging.is_new = !job.current;
      const changed = Object.entries(staging.diff).filter(([, v]) => v.status === 'changed' || v.status === 'new').map(([k]) => k);
      console.log(`${p.name} · ${p.completed ?? '?'} 年 · ${p.units ?? '?'} 户 · 设施 ${p.facilities.length} · ${job.current ? (changed.length ? '有差异：' + changed.join(',') : '无差异') : '新小区'}`);
    }
  }
  writeFileSync(join(STAGING, `${staging.id || slugify(job.url)}.json`), JSON.stringify(staging, null, 2) + '\n');
  await sleep(DELAY);
}

/* ---------- REVIEW.md ---------- */
const files = readdirSync(STAGING).filter((f) => f.endsWith('.json')).sort();
const rows = files.map((f) => JSON.parse(readFileSync(join(STAGING, f), 'utf8')));
const fmtV = (v) => v == null ? '—' : Array.isArray(v) ? v.join('、') : typeof v === 'object' ? JSON.stringify(v) : String(v);
let md = `# 档案采集审核报告\n\n生成于 ${now()}（马来西亚日期 ${today}）。只看「有差异」和「新小区」的行；确认后用 \`node scripts/publish.mjs <id> --accept 字段,字段 --who 名字 --reason 理由\` 发布。\n\n`;
for (const s of rows) {
  md += `## ${s.id}${s.is_new ? '（新小区）' : ''}\n\n来源：${s.source.final_url || s.source.url}（${s.fetched_at.slice(0, 16).replace('T', ' ')} UTC）\n\n`;
  if (s.status !== 'ok') { md += `**${s.status}**：${s.error || ''}，现有值不动。\n\n`; continue; }
  md += `| 字段 | 现有 | 采集到 | 评估 | 状态 |\n|---|---|---|---|---|\n`;
  for (const [k, v] of Object.entries(s.diff)) {
    if (k === 'facilities') { md += `| 设施 | ${(v.current || []).length} 项 | ${v.proposed.length} 项 | ${s.assessment[k]} | ${v.status}${v.added.length ? '，新增：' + v.added.join('、') : ''}${v.removed.length ? '，缺少：' + v.removed.join('、') : ''} |\n`; continue; }
    if (k === 'flags') { md += `| 设施开关 | | | ${s.assessment[k]} | ${v.status}${v.changed_keys.length ? '：' + v.changed_keys.join('、') : ''} |\n`; continue; }
    if (k === 'geo') { md += `| 坐标 | ${fmtV(v.current)} | ${fmtV(v.proposed)} | ${s.assessment[k]} | ${v.status}${v.distance_m != null ? '，相差 ' + v.distance_m + ' m' : ''} |\n`; continue; }
    md += `| ${k} | ${fmtV(v.current)} | ${fmtV(v.proposed)} | ${s.assessment[k]} | ${v.status} |\n`;
  }
  const changed = Object.entries(s.diff).filter(([, v]) => v.status === 'changed').map(([k]) => k);
  if (s.crosscheck) {
    const cc = s.crosscheck;
    md += `\n交叉验证（${(cc.at || '').slice(0, 16).replace('T', ' ')} UTC）：\n\n`;
    if (cc.geo) md += `- 坐标 vs OpenStreetMap：**${cc.geo.status}**${cc.geo.distance_m != null ? `，相差 ${cc.geo.distance_m} m` : ''}${cc.geo.note ? `（${cc.geo.note}）` : ''}\n`;
    if (cc.walk) {
      const w = cc.walk;
      md += `- 步行 vs OSM 路网：**${w.status}**；现有 ${w.current.nearest} ${w.current.walk_m ?? '—'} m / ${w.current.walk_min ?? '—'} 分钟${w.current.est ? '（估）' : ''}；路线：${w.routes.map((r) => `${r.station} ${r.route_m ?? '?'} m / ${r.route_min ?? '?'} 分钟`).join('；')}${w.to_universiti && w.to_universiti.route_m ? `；到 Universiti 站 ${w.to_universiti.route_m} m / ${w.to_universiti.route_min} 分钟` : ''}\n`;
    }
    for (const n of cc.notes || []) md += `- 注：${n}\n`;
  }
  md += `\n建议：${s.is_new ? '补 region、no、alias、transit 后发布全部字段' : changed.length ? '核对 ' + changed.join('、') + ' 后决定接受哪些' : '无需动作，发布可只更新核实日期'}${s.crosscheck?.walk?.status === 'conflict' ? '；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核' : ''}。\n\n`;
}
writeFileSync(join(STAGING, 'REVIEW.md'), md);
console.log(`\n报告：data/staging/REVIEW.md（${rows.length} 个小区）`);
