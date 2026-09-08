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
      if (Number(status) === 404) return { error: '404', body, finalUrl };
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

/* ---------- 第二来源：StarProperty 楼盘页（星报集团，和 iProperty 不同库） ---------- */
// 页面是服务器直出的文字块：Property Details Name: … Developer: … Completion Date: Aug 2016 (estimate) Tenure: Leasehold No. of Blocks: 5 No. of Storey …: 33 No. of Units …: 657 … Built-up: 617 - 802 sf Facilities … Analysis
function parseStarProperty(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const i = text.indexOf('Property Details');
  if (i < 0) {
    // 新版楼盘页没有"Property Details"文字块，只有标题行里的地契（"Leasehold L/H"），其余字段拿不到
    const t = text.match(/\b(Leasehold|Freehold)\s+[LF]\/H\b/i);
    if (!t) return null;
    return { layout: 'new', developer: null, completed: null, completion_text: null, tenure_code: t[1][0].toUpperCase(), blocks: null, storeys: null, units: null, builtup: null, facilities_en: [] };
  }
  const block = text.slice(i, i + 3000);
  const grab = (re) => { const m = block.match(re); return m ? m[1].trim() : null; };
  // 字段后面可能直接跟值（"No. of Units: 708"），也可能是分项（"No. of Units Office Suite: 46 Service Suite: 380"）
  const STOP = 'Type:|Tenure:|No\\. of |Land Area|Built-up|Facilities|Maintenance|Launch Price|Subsale|Rental:|Market Trends|Analysis';
  const seg = (label) => grab(new RegExp(label + '\\s*:?\\s*(.+?)\\s+(?:' + STOP + ')'));
  const pairs = (s) => [...String(s || '').matchAll(/([A-Za-z &/()'-]+?):\s*([^:]+?)(?=\s+[A-Za-z &/()'-]+?:|$)/g)].map((m) => ({ k: m[1].trim(), v: m[2].trim() }));
  const isResi = (k) => /apart|resid|condo|suite|soho|home|tower|block/i.test(k) && !/office|shop|retail/i.test(k);
  const developer = grab(/Developer:\s*(.+?)\s+(?:Completion|Type:|Tenure:)/);
  const compSeg = seg('Completion Date');
  let completed = null, completionText = compSeg;
  if (compSeg) { const ps = pairs(compSeg); const pick = ps.find((p) => isResi(p.k)) || ps[0]; const src = pick ? pick.v : compSeg; const ys = [...src.matchAll(/(?:19|20)\d{2}/g)].map((m) => Number(m[0])); completed = ys.length ? Math.max(...ys) : null; }
  const tenureText = grab(/Tenure:\s*(Leasehold|Freehold)/i);
  const blocks = grab(/No\. of Blocks?:\s*(\d+)/);
  const storSeg = seg('No\\. of Storeys?');
  let storeys = null;
  if (storSeg) { const ps = pairs(storSeg); const resi = ps.filter((p) => isResi(p.k)).map((p) => Number((p.v.match(/\d+/) || [])[0])).filter((n) => n >= 3 && n <= 90); const all = [...storSeg.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1])).filter((n) => n >= 3 && n <= 90); storeys = resi.length ? Math.max(...resi) : all.length ? Math.max(...all) : null; }
  const unitSeg = seg('No\\. of Units');
  let units = null;
  if (unitSeg) { const ps = pairs(unitSeg); const resi = ps.filter((p) => isResi(p.k)).map((p) => Number((p.v.match(/[\d,]+/) || ['0'])[0].replace(/,/g, ''))).filter(Boolean); const plain = unitSeg.match(/^([\d,]+)/); units = resi.length ? resi.reduce((a, b) => a + b, 0) : plain ? Number(plain[1].replace(/,/g, '')) : (ps[0] ? Number((ps[0].v.match(/[\d,]+/) || ['0'])[0].replace(/,/g, '')) || null : null); }
  const builtup = grab(/Built-up:?\s*((?:from\s*)?[\d,]+\s*(?:-|–)?\s*[\d,]*\s*sf)/);
  const facM = block.match(/Facilities\s+(.+?)\s+(?:Analysis|Property Details|Market Trends|Latest transaction|Layouts|Nearby|$)/);
  const facilitiesEn = facM ? facM[1].split(/\s{2,}|(?<=[a-z])\s(?=[A-Z0-9])/).map((x) => x.trim()).filter((x) => x && x.length < 40) : [];
  return { layout: 'classic', developer, completed, completion_text: completionText, tenure_code: tenureText ? tenureText[0].toUpperCase() : null, blocks: blocks ? Number(blocks) : null, storeys, units, builtup, facilities_en: facilitiesEn };
}
// 把第二来源和 iProperty 的采集值逐字段比：一致 / 冲突 / 单源
function assessWith(second, p, current) {
  const out = {};
  const put = (k, a, b, same) => { out[k] = { iproperty: a ?? null, starproperty: b ?? null, status: a != null && b != null ? (same ? 'agree' : 'conflict') : b != null ? 'second-only' : a != null ? 'single' : 'none' }; };
  if (!second) return out;
  put('completed', p.completed, second.completed, p.completed === second.completed || (second.completion_text && /estimate/i.test(second.completion_text) && Math.abs((p.completed || 0) - (second.completed || 0)) <= 1));
  put('units', p.units, second.units, p.units && second.units && Math.abs(p.units - second.units) / Math.max(p.units, second.units) <= 0.05);
  put('tenure', p.tenure_code, second.tenure_code, p.tenure_code === second.tenure_code);
  const devNorm = (s) => String(s || '').toLowerCase().replace(/sdn\.? ?bhd\.?|berhad|group|development|\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
  // 括号里常写母公司（"Suez Domain (a member of Suez Capital)"），去括号和不去括号两种形式只要有一种对得上就算一致
  const devFull = (s) => String(s || '').toLowerCase().replace(/sdn\.? ?bhd\.?|berhad|group|development/g, '').replace(/[^a-z0-9]/g, '');
  const devSame = (x, y) => [devNorm, devFull].some((f) => [devNorm, devFull].some((g) => { const p = f(x), q = g(y); if (!p || !q) return false; if (p === q) return true; return p.length >= 4 && q.length >= 4 && (p.includes(q.slice(0, 6)) || q.includes(p.slice(0, 6))); }));
  const DEV_ALIAS = [['amdb', 'amcorp', 'AMDB 是 Amcorp Properties 的旧名（2011 年改名）'], ['amonametro', 'mkh', 'Amona Metro Development 是 MKH Berhad 的子公司']];
  const alias = DEV_ALIAS.find(([a, b]) => { const x = devFull(p.developer), y = devFull(second.developer); return (x.includes(a) && y.includes(b)) || (x.includes(b) && y.includes(a)); });
  put('developer', p.developer, second.developer, devSame(p.developer, second.developer) || !!alias);
  if (alias && out.developer.status === 'agree') out.developer.note = alias[2];
  put('floors', p.floors, second.storeys, p.floors && second.storeys && Math.abs(p.floors - second.storeys) <= 2);
  const poolA = p.flags?.pool, gymA = p.flags?.gym, poolB = second.facilities_en.some((f) => /pool/i.test(f)), gymB = second.facilities_en.some((f) => /gym/i.test(f));
  put('pool_gym', `${poolA ? '泳池' : '无泳池'}/${gymA ? '健身房' : '无健身房'}`, second.facilities_en.length ? `${poolB ? '泳池' : '无泳池'}/${gymB ? '健身房' : '无健身房'}` : null, poolA === poolB && gymA === gymB);
  return out;
}

// 把第二来源的逐字段结论写回 staging.assessment（主循环和 --report-only 都用）
const SECOND_LABEL = { agree: '双源一致（iProperty、StarProperty）', conflict: '冲突（iProperty 与 StarProperty 不同）', single: '单源（iProperty）', 'second-only': '只有 StarProperty 有', none: '两边都无' };
function applySecond(staging, p, current) {
  const sp = staging.second?.starproperty;
  if (!sp || sp.error) { delete staging.second_assessment; return; }
  staging.second_assessment = assessWith(sp, p, current);
  for (const [k, v] of Object.entries(staging.second_assessment)) if (k in staging.assessment) staging.assessment[k] = SECOND_LABEL[v.status] || v.status;
  if (staging.second_assessment.pool_gym) staging.assessment.flags = SECOND_LABEL[staging.second_assessment.pool_gym.status] || staging.assessment.flags;
}

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
    applySecond(s, s.proposed, cur);
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
      // 第二来源：StarProperty 楼盘页（有链接才抓）
      const spUrl = opts.sp || job.current?.links?.starproperty;
      if (spUrl) {
        await sleep(DELAY);
        const r2 = await fetchPage(spUrl);
        // StarProperty 新版楼盘页会以 404 状态返回完整页面（软 404），页面够大就照样解析
        const soft404 = r2.error === '404' && r2.body && r2.body.length > 50000;
        const sp = (r2.error && !soft404) ? null : parseStarProperty(r2.body);
        staging.second = { starproperty: sp ? { ...sp, url: r2.finalUrl || spUrl, fetched_at: now(), ...(soft404 ? { http_status: 404 } : {}) } : { url: spUrl, error: r2.error || 'parse failed' } };
        applySecond(staging, p, job.current);
      }
      const changed = Object.entries(staging.diff).filter(([, v]) => v.status === 'changed' || v.status === 'new').map(([k]) => k);
      console.log(`${p.name} · ${p.completed ?? '?'} 年 · ${p.units ?? '?'} 户 · 设施 ${p.facilities.length} · ${job.current ? (changed.length ? '有差异：' + changed.join(',') : '无差异') : '新小区'}`);
    }
  }
  // 保留上一次的交叉验证结果（crosscheck.mjs 单独写入）
  const outPath = join(STAGING, `${staging.id || slugify(job.url)}.json`);
  if (existsSync(outPath)) { try { const prev = JSON.parse(readFileSync(outPath, 'utf8')); if (prev.crosscheck) staging.crosscheck = prev.crosscheck; } catch { /* ignore */ } }
  writeFileSync(outPath, JSON.stringify(staging, null, 2) + '\n');
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
  if (s.second?.starproperty) {
    const sp = s.second.starproperty;
    if (sp.error) md += `\n第二来源 StarProperty：抓取失败（${sp.error}）\n`;
    else {
      md += `\n第二来源 StarProperty（${sp.url}）：开发商 ${sp.developer ?? '—'} · 竣工 ${sp.completion_text ?? '—'} · 地契 ${sp.tenure_code ?? '—'} · 栋数 ${sp.blocks ?? '—'} · 最高层数 ${sp.storeys ?? '—'} · 户数 ${sp.units ?? '—'} · 面积 ${sp.builtup ?? '—'} · 设施 ${sp.facilities_en.length} 项\n\n`;
      md += `| 字段 | iProperty | StarProperty | 结论 |\n|---|---|---|---|\n`;
      for (const [k, v] of Object.entries(s.second_assessment || {})) md += `| ${k} | ${fmtV(v.iproperty)} | ${fmtV(v.starproperty)} | ${v.status} |\n`;
    }
  }
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
