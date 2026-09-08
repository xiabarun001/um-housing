// 交叉验证（ADR-002 第 2 步的"评估"）：用第二来源核对档案里的坐标和步行距离，结果写进 staging，供 REVIEW.md 和发布使用。
//   坐标  ：iProperty 坐标  vs  OpenStreetMap（Nominatim 按小区名地理编码）；相差 < 150 m 算一致
//   步行  ：现有 walk_m/walk_min  vs  OpenStreetMap 路网上的步行路线（Valhalla）；到最近两个轨道站和 UM 正门（Universiti 站）
// 用法：node scripts/crosscheck.mjs kl-gateway novum | --all
// 只写 data/staging/<id>.json 的 crosscheck 字段，不碰 condos.json。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONDOS = join(ROOT, 'data', 'condos.json');
const STAGING = join(ROOT, 'data', 'staging');
const UA = 'um-housing-guide/1.0 (https://um-housing.evasuka.com; contact: sasha@funda.ai)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const R = 6371000, toR = (x) => x * Math.PI / 180;
const distM = (a, b) => { const dLat = toR(b[0] - a[0]), dLon = toR(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

// 和其他脚本一样用 curl 请求（Node 自带的 fetch 在部分网络环境下连不上）
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);
async function curlJson(url, body) {
  const args = ['-s', '--max-time', '40', '-A', UA, '-H', 'Accept-Language: en'];
  if (body) args.push('-H', 'Content-Type: application/json', '-d', JSON.stringify(body));
  args.push(url);
  try { const { stdout } = await execFileP('curl', args, { maxBuffer: 5 * 1024 * 1024 }); return JSON.parse(stdout); }
  catch (e) { return { error: String(e.message || e).slice(0, 100) }; }
}
async function geocode(name) {
  const j = await curlJson(`https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=my&q=${encodeURIComponent(name)}`);
  if (!Array.isArray(j)) return { error: j?.error || 'nominatim error' };
  if (!j.length) return { error: 'not found' };
  const best = j[0];
  return { lat: Number(best.lat), lng: Number(best.lon), display: best.display_name, type: best.type, osm: `${best.osm_type}/${best.osm_id}` };
}
async function walkRoute(from, to) {
  const j = await curlJson('https://valhalla1.openstreetmap.de/route', { locations: [{ lat: from[0], lon: from[1] }, { lat: to[0], lon: to[1] }], costing: 'pedestrian', units: 'kilometers' });
  const s = j?.trip?.summary;
  if (!s) return { error: j?.error || 'no route' };
  return { m: Math.round(s.length * 1000), min: Math.round(s.time / 60) };
}

const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const ids = args.filter((a) => !a.startsWith('--'));
const data = JSON.parse(readFileSync(CONDOS, 'utf8'));
const list = opts.all ? data.condos : data.condos.filter((c) => ids.includes(c.id));
if (!list.length) { console.error('用法：node scripts/crosscheck.mjs <id ...> | --all'); process.exit(1); }
mkdirSync(STAGING, { recursive: true });
const stations = [
  ...(data.meta.stations || []).map((s) => ({ ...s, kind: 'LRT' })),
  ...(data.meta.mrt || []).map((s) => ({ ...s, kind: 'MRT' })),
  ...(data.meta.ktm || []).map((s) => ({ ...s, kind: 'KTM' })),
];
const uni = stations.find((s) => s.name === 'Universiti');

for (const c of list) {
  process.stdout.write(`交叉验证 ${c.id} ... `);
  const cc = { at: now(), geo: null, walk: null, notes: [] };
  // 1) 坐标：OpenStreetMap 地理编码
  // 地理编码：先用别名 + 城市，再用全名，取离 iProperty 坐标最近的一个结果
  const city = c.region === 1 ? 'Petaling Jaya' : 'Kuala Lumpur';
  const queries = [...new Set([`${(c.alias || '').replace(/[（(].*?[）)]/g, '').trim()} ${city}`, `${c.name.replace(/[（(].*?[）)]/g, '').trim()}`, `${c.name.replace(/[（(].*?[）)]/g, '').trim()} ${city}`].filter((q) => q.trim().length > 3))];
  let bestG = null, lastErr = null;
  for (const q of queries) {
    const g = await geocode(q);
    await sleep(1100);
    if (g.error) { lastErr = g.error; continue; }
    const d = Math.round(distM([c.lat, c.lng], [g.lat, g.lng]));
    if (!bestG || d < bestG.d) bestG = { ...g, d, q };
    if (d < 150) break;
  }
  if (!bestG) cc.geo = { status: 'single', with: 'OpenStreetMap', note: lastErr || 'not found' };
  else cc.geo = { status: bestG.d < 150 ? 'agree' : bestG.d < 600 ? 'near' : 'conflict', with: 'OpenStreetMap', value: [bestG.lat, bestG.lng], distance_m: bestG.d, display: bestG.display, osm: bestG.osm, query: bestG.q };
  // 2) 步行：到最近两个轨道站 + 到 Universiti 站（UM 正门）
  const near = stations.map((s) => ({ s, straight: distM([c.lat, c.lng], [s.lat, s.lng]) })).sort((a, b) => a.straight - b.straight).slice(0, 2);
  const routes = [];
  for (const n of near) {
    const r = await walkRoute([c.lat, c.lng], [n.s.lat, n.s.lng]);
    routes.push({ station: `${n.s.name} ${n.s.kind}（${n.s.code}）`, straight_m: Math.round(n.straight), ...(r.error ? { error: r.error } : { route_m: r.m, route_min: r.min }) });
    await sleep(600);
  }
  let toUM = null;
  if (uni) { const r = await walkRoute([c.lat, c.lng], [uni.lat, uni.lng]); toUM = r.error ? { error: r.error } : { route_m: r.m, route_min: r.min }; await sleep(600); }
  const best = routes.filter((r) => r.route_m != null).sort((a, b) => a.route_m - b.route_m)[0] || null;
  let status = 'single';
  if (best && c.transit.walk_m) { const ratio = best.route_m / c.transit.walk_m; status = ratio > 0.75 && ratio < 1.35 ? 'agree' : 'conflict'; }
  else if (best && c.transit.walk_min != null) { const ratio = best.route_min / c.transit.walk_min; status = ratio > 0.7 && ratio < 1.5 ? 'agree' : 'conflict'; }
  else if (best && c.transit.walk_min == null) status = best.route_m <= 1200 ? 'conflict' : 'agree'; // 我们写"走不到"，路线却在 1.2 km 内，要复核
  cc.walk = { status, with: 'OpenStreetMap 路网（Valhalla 步行路线）', current: { nearest: c.transit.nearest, walk_m: c.transit.walk_m, walk_min: c.transit.walk_min, est: !!c.transit.walk_est }, routes, to_universiti: toUM, proposed: best ? { nearest: best.station, walk_m: best.route_m, walk_min: best.route_min } : null };
  if (best && /Universiti|Kerinchi/.test(best.station) && c.region === 2) cc.notes.push('KL Gateway 一带有天桥，OSM 路网可能没画进去，路线距离可能偏长');
  // 写进 staging
  const sp = join(STAGING, `${c.id}.json`);
  const s = existsSync(sp) ? JSON.parse(readFileSync(sp, 'utf8')) : { id: c.id, status: 'ok', source: { url: c.links.iproperty_building, site: 'iProperty 项目页' }, fetched_at: null };
  s.crosscheck = cc;
  writeFileSync(sp, JSON.stringify(s, null, 2) + '\n');
  console.log(`坐标 ${cc.geo.status}${cc.geo.distance_m != null ? '（差 ' + cc.geo.distance_m + ' m）' : ''} · 步行 ${status}${best ? '（路线 ' + best.route_m + ' m / ' + best.route_min + ' 分钟到 ' + best.station + '，现有 ' + (c.transit.walk_m ?? '—') + ' m / ' + (c.transit.walk_min ?? '—') + ' 分钟）' : ''}`);
}
console.log('\n完成。结果在 data/staging/<id>.json 的 crosscheck 字段；跑 node scripts/collect.mjs --report-only 重出报告。');
