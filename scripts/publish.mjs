// 档案发布（ADR-002 第 4 步）：把 data/staging/<id>.json 里审核通过的字段写进 condos.json，记 provenance、verified_at 和 changelog。
// 用法：node scripts/publish.mjs <id> --accept=completed,units,facilities --who=Sasha --reason="iProperty 项目页核对" --note="更新了设施清单"
//       node scripts/publish.mjs <id> --accept=all                         接受所有有差异的字段
//       node scripts/publish.mjs <id> --verify-only --who=Sasha             无差异，只更新核实日期
//       新小区：node scripts/publish.mjs <id> --accept=all --region=3 --no=20 --alias="Avara" --who=Sasha
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONDOS = join(ROOT, 'data', 'condos.json');
const STAGING = join(ROOT, 'data', 'staging');
const CHANGELOG = join(ROOT, 'data', 'changelog.json');
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const id = args.find((a) => !a.startsWith('--'));
if (!id || !opts.who) { console.error('用法：node scripts/publish.mjs <id> --accept=字段,字段|all --who=名字 [--reason=..] [--note=对外说明]'); process.exit(1); }
const sp = join(STAGING, `${id}.json`);
if (!existsSync(sp)) { console.error(`没有 staging：${sp}，先跑 collect`); process.exit(1); }
const s = JSON.parse(readFileSync(sp, 'utf8'));
if (s.status !== 'ok') { console.error(`staging 状态是 ${s.status}，不能发布`); process.exit(1); }
const data = JSON.parse(readFileSync(CONDOS, 'utf8'));
const log = existsSync(CHANGELOG) ? JSON.parse(readFileSync(CHANGELOG, 'utf8')) : { entries: [] };
const p = s.proposed;
let c = data.condos.find((x) => x.id === id);
const entries = [];
const record = (field, from, to) => entries.push({ at: new Date().toISOString(), date_myt: today, who: opts.who, condo: id, field, from, to, source: s.source.final_url || s.source.url, reason: opts.reason || 'iProperty 项目页采集', public_note: opts.note || null });
const prov = (field) => ({ source: s.source.final_url || s.source.url, at: today, method: 'auto' });

// 新小区：先建骨架
if (!c) {
  if (!opts.region || !opts.no) { console.error('新小区要给 --region= 和 --no='); process.exit(1); }
  c = {
    id, name: p.name, alias: opts.alias || p.name, region: Number(opts.region), address: p.address || '', developer: p.developer || '', tenure: p.tenure || '', type: p.type || '',
    completed: p.completed, units: p.units, floors: null, facilities: [], flags: {}, transit: { nearest: '无步行可达轨道站', walk_min: null, walk_m: null, walk_est: false, other: [], buses: [], note: '' },
    um_km: null, um_km_note: null, notes: [], tags: [], links: { iproperty_rent: p.links.iproperty_rent, iproperty_building: p.links.iproperty_building, ibilik: null, maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + (p.address || ''))}` },
    sources: [{ label: 'iProperty 项目页', url: p.links.iproperty_building }], lat: p.lat, lng: p.lng, no: Number(opts.no), judgment: {}, provenance: {}, verified_at: today,
  };
  data.condos.push(c);
  data.condos.sort((a, b) => a.no - b.no);
  record('record', null, '新增小区');
  opts.accept = 'all';
}

const changed = Object.entries(s.diff).filter(([, v]) => v.status === 'changed' || v.status === 'new').map(([k]) => k);
const accept = opts.accept === 'all' ? changed : opts.accept ? String(opts.accept).split(',').map((x) => x.trim()).filter(Boolean) : [];
const bad = accept.filter((k) => !(k in s.diff));
if (bad.length) { console.error(`staging 里没有这些字段：${bad.join(',')}`); process.exit(1); }

for (const k of accept) {
  const d = s.diff[k];
  if (k === 'facilities') { record('facilities', c.facilities, p.facilities); c.facilities = p.facilities; c.provenance.facilities = prov('facilities'); continue; }
  if (k === 'flags') { record('flags', c.flags, p.flags); c.flags = { ...c.flags, ...p.flags }; c.provenance.flags = prov('flags'); continue; }
  if (k === 'geo') { record('geo', [c.lat, c.lng], [p.lat, p.lng]); c.lat = p.lat; c.lng = p.lng; c.provenance.lat = prov('lat'); c.provenance.lng = prov('lng'); continue; }
  if (k === 'floors') { record('floors', c.floors, d.proposed); c.floors = d.proposed; c.provenance.floors = prov('floors'); continue; }
  if (k === 'name' && !s.is_new) { record('name', c.name, d.proposed); c.name = d.proposed; c.provenance.name = prov('name'); continue; }
  if (['completed', 'units', 'tenure', 'type', 'developer', 'address'].includes(k)) { record(k, c[k], d.proposed); c[k] = d.proposed; c.provenance[k] = prov(k); continue; }
}
// 没接受的字段也算核实过（看过报告、决定不改）
for (const k of Object.keys(s.diff)) if (!accept.includes(k) && s.diff[k].status === 'same') {
  const keys = k === 'geo' ? ['lat', 'lng'] : [k];
  for (const kk of keys) c.provenance[kk] = { ...(c.provenance[kk] || {}), source: s.source.final_url || s.source.url, at: today, method: c.provenance[kk]?.method === 'field' ? 'field' : 'auto' };
}
c.verified_at = today;
if (!c.sources.some((x) => x.url === (s.source.final_url || s.source.url))) c.sources.unshift({ label: 'iProperty 项目页', url: s.source.final_url || s.source.url });
data.meta.verified_at = today;
if (!entries.length) record('verified_at', null, today);
log.entries.push(...entries);
writeFileSync(CONDOS, JSON.stringify(data, null, 2) + '\n');
writeFileSync(CHANGELOG, JSON.stringify(log, null, 2) + '\n');
console.log(`已发布 ${id}：${accept.length ? '接受 ' + accept.join('、') : '只更新核实日期'}；changelog +${entries.length}`);
