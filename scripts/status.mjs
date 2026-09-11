// 数据健康状态：把实时信息、固定信息、交叉验证、第二来源的新鲜度和结论汇总成 data/status.json，并在终端打印。
// 每次刷新和采集后都跑一次；网站"说明"里读它显示一行数据健康，后台首页也读它。
// 用法：node scripts/status.mjs [--quiet]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => (existsSync(join(ROOT, p)) ? JSON.parse(readFileSync(join(ROOT, p), 'utf8')) : null);
const condos = rd('data/condos.json');
const prices = rd('data/prices.json') || { condos: {} };
const rlog = rd('data/refresh-log.json') || {};
const changelog = rd('data/changelog.json') || { entries: [] };
const stagingDir = join(ROOT, 'data', 'staging');
const staging = existsSync(stagingDir) ? readdirSync(stagingDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(stagingDir, f), 'utf8'))) : [];
const now = new Date();
const MYT = (d) => new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const mytToDate = (s) => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], (+m[4] || 0) - 8, +m[5] || 0)) : null; };
const hoursSince = (s) => { const d = mytToDate(s); return d ? Math.round((now - d) / 3600e3) : null; };
const daysSince = (s) => { const d = mytToDate(s); return d ? Math.round((now - d) / 86400e3) : null; };

const st = { generated_at: now.toISOString(), generated_myt: MYT(now), condos: condos.condos.length, regions: Object.keys(condos.meta.regions).length, market: {}, profile: {}, crosscheck: {}, second_source: {}, alerts: [] };

// 实时信息
const mh = hoursSince(prices.updated_myt);
const withPrice = Object.values(prices.condos).filter((v) => v.for_rent != null).length;
const mudah = Object.values(prices.condos).map((v) => v.check?.mudah?.status).filter(Boolean);
st.market = { updated_myt: prices.updated_myt || null, age_hours: mh, condos_with_price: withPrice, last_run_ok: rlog.ok ?? null, last_run_errors: (rlog.errors || []).length, mudah: { agree: mudah.filter((x) => x === 'agree').length, gap: mudah.filter((x) => x === 'gap').length, single: mudah.filter((x) => x === 'single').length, none: condos.condos.length - mudah.length } };
if (mh == null || mh > 36) st.alerts.push({ level: 'warn', text: `实时信息已 ${mh ?? '?'} 小时未更新` });
if (rlog.errors?.length) st.alerts.push({ level: 'info', text: `上次刷新有 ${rlog.errors.length} 个错误：${rlog.errors.slice(0, 3).join('；')}` });
if (withPrice < condos.condos.length) st.alerts.push({ level: 'warn', text: `${condos.condos.length - withPrice} 个小区没有价格` });

// 固定信息
const ages = condos.condos.map((c) => ({ id: c.id, days: daysSince(c.verified_at) ?? 999 }));
const stale = ages.filter((a) => a.days > 45);
const lastCollect = staging.map((s) => s.fetched_at).filter(Boolean).sort().pop() || null;
st.profile = { verified_at_meta: condos.meta.verified_at, oldest_days: Math.max(...ages.map((a) => a.days)), stale_over_45d: stale.map((a) => a.id), last_collect_at: lastCollect, last_collect_days: lastCollect ? Math.round((now - new Date(lastCollect)) / 86400e3) : null, staging_failed: staging.filter((s) => s.status !== 'ok').map((s) => s.id), pending_changes: staging.filter((s) => s.status === 'ok' && !s.is_new && Object.values(s.diff || {}).some((v) => v.status === 'changed')).map((s) => s.id) };
if (stale.length) st.alerts.push({ level: 'warn', text: `${stale.length} 个小区的固定信息超过 45 天没复核：${stale.map((a) => a.id).join('、')}` });
if (st.profile.staging_failed.length) st.alerts.push({ level: 'warn', text: `采集失败：${st.profile.staging_failed.join('、')}` });

// 交叉验证（坐标、步行）
const geo = condos.condos.map((c) => c.provenance?.lat?.check?.status).filter(Boolean);
const walk = condos.condos.map((c) => c.provenance?.transit?.check?.status).filter(Boolean);
st.crosscheck = { geo: { agree: geo.filter((x) => x === 'agree').length, near: geo.filter((x) => x === 'near').length, conflict: geo.filter((x) => x === 'conflict').length, single: geo.filter((x) => x === 'single').length, none: condos.condos.length - geo.length }, walk: { agree: walk.filter((x) => x === 'agree').length, conflict: walk.filter((x) => x === 'conflict').length, single: walk.filter((x) => x === 'single').length, none: condos.condos.length - walk.length, route_adopted: condos.condos.filter((c) => c.provenance?.transit?.method === 'route').length } };
if (st.crosscheck.geo.conflict) st.alerts.push({ level: 'warn', text: `${st.crosscheck.geo.conflict} 个小区坐标和 OpenStreetMap 不一致` });

// 第二来源（StarProperty）
const secondFields = ['completed', 'units', 'tenure', 'developer', 'floors', 'flags'];
let agree = 0, conflict = 0, reviewed = 0, single = 0;
const conflicts = [];
for (const c of condos.condos) for (const f of secondFields) { const sd = c.provenance?.[f]?.second; if (!sd) { single++; continue; } if (sd.status === 'agree') agree++; else if (sd.status === 'conflict') { if (sd.arbitrated) reviewed++; else { conflict++; conflicts.push(`${c.id}.${f}`); } } else single++; }
st.second_source = { with_link: condos.condos.filter((c) => c.links?.starproperty).length, fields_agree: agree, fields_conflict: conflict, fields_reviewed: reviewed, fields_single: single, conflicts };
if (conflict) st.alerts.push({ level: 'info', text: `${conflict} 个字段两个来源不一致，待复核：${conflicts.slice(0, 6).join('、')}${conflicts.length > 6 ? '…' : ''}` });


st.changelog_entries = changelog.entries.length;
st.last_change = changelog.entries.length ? changelog.entries[changelog.entries.length - 1].date_myt : null;
writeFileSync(join(ROOT, 'data', 'status.json'), JSON.stringify(st, null, 2) + '\n');

if (!process.argv.includes('--quiet')) {
  console.log(`数据健康 ${st.generated_myt}（马来西亚时间）· ${st.condos} 个小区 · ${st.regions} 个区域`);
  console.log(`实时信息：${st.market.updated_myt}（${mh} 小时前）· 有价格 ${withPrice}/${st.condos} · Mudah 比对 一致 ${st.market.mudah.agree} / 差异 ${st.market.mudah.gap} / 单源 ${st.market.mudah.single}`);
  console.log(`固定信息：最旧 ${st.profile.oldest_days} 天 · 上次采集 ${lastCollect ? lastCollect.slice(0, 10) : '—'} · 待审核差异 ${st.profile.pending_changes.length} 个`);
  console.log(`交叉验证：坐标 一致 ${st.crosscheck.geo.agree} / 接近 ${st.crosscheck.geo.near} / 冲突 ${st.crosscheck.geo.conflict} / 无 ${st.crosscheck.geo.single + st.crosscheck.geo.none}；步行 路线值 ${st.crosscheck.walk.route_adopted} 个`);
  console.log(`第二来源：${st.second_source.with_link}/${st.condos} 有 StarProperty 页 · 字段一致 ${agree} / 冲突待复核 ${conflict} / 冲突已复核 ${reviewed} / 单源 ${single}`);
    for (const a of st.alerts) console.log(`[${a.level}] ${a.text}`);
}
