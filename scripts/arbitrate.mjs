#!/usr/bin/env node
// 两个来源不一致时的人工仲裁：把结论和理由写进 condos.json 的 provenance.<字段>.second（不改字段值本身），并记一条 changelog。
// 用法：node scripts/arbitrate.mjs <id> <字段> --verdict=agree|conflict|second-only --note="理由" --who=名字
//   例：node scripts/arbitrate.mjs kl-gateway units --verdict=agree --note="StarProperty 按单栋计 357 户，两栋合计 714，与 iProperty 一致" --who=Sasha
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONDOS = join(ROOT, 'data', 'condos.json');
const CHANGELOG = join(ROOT, 'data', 'changelog.json');
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const [id, field] = args.filter((a) => !a.startsWith('--'));
const VERDICTS = ['agree', 'conflict', 'second-only'];
if (!id || !field || !VERDICTS.includes(opts.verdict) || !opts.note || !opts.who) {
  console.error('用法：node scripts/arbitrate.mjs <id> <字段> --verdict=agree|conflict|second-only --note="理由" --who=名字');
  process.exit(1);
}
const data = JSON.parse(readFileSync(CONDOS, 'utf8'));
const c = data.condos.find((x) => x.id === id);
if (!c) { console.error(`没有这个小区：${id}`); process.exit(1); }
const prov = c.provenance?.[field];
if (!prov?.second) { console.error(`${id}.${field} 没有第二来源记录，先跑 collect + publish`); process.exit(1); }
const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const from = prov.second.status;
prov.second = { ...prov.second, status: opts.verdict, machine_status: prov.second.machine_status || from, note: opts.note, arbitrated: { who: opts.who, at: today } };
const log = JSON.parse(readFileSync(CHANGELOG, 'utf8'));
log.entries.push({ at: new Date().toISOString(), date_myt: today, who: opts.who, condo: id, field: `${field}.second`, from, to: opts.verdict, source: prov.second.url || null, reason: opts.note, public_note: opts['public-note'] || `复核了${field}的两个来源`.replace('units', '户数').replace('floors', '层数').replace('flags', '设施').replace('completed', '年份').replace('developer', '开发商').replace('tenure', '地契') });
writeFileSync(CONDOS, JSON.stringify(data, null, 2) + '\n');
writeFileSync(CHANGELOG, JSON.stringify(log, null, 2) + '\n');
console.log(`仲裁 ${id}.${field}：${from} → ${opts.verdict}（${opts.note}）`);
