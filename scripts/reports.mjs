#!/usr/bin/env node
// 读者纠错的管理端命令（后台做好之前用）。需要 Supabase 的服务密钥，放环境变量 SUPABASE_SERVICE_KEY，绝不写进仓库。
// 用法：
//   node scripts/reports.mjs list [--all]                 列出待处理（--all 含已处理）
//   node scripts/reports.mjs show <id>
//   node scripts/reports.mjs done <id> --who=名字 --note="怎么处理的"      标记已处理（改数据请另走 publish.mjs 留痕）
//   node scripts/reports.mjs reject <id> --who=名字 --note="为什么不改"
//   node scripts/reports.mjs accept <id> --who=名字                       标记已确认、待改
//   node scripts/reports.mjs delete <id>                                   删除（刷屏或垃圾）
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const execFileP = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = readFileSync(join(ROOT, 'js', 'config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL:\s*'([^']+)'/) || [])[1];
const KEY = process.env.SUPABASE_SERVICE_KEY;
const CURL = process.env.CURL_BIN || 'curl';
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const [cmd, id] = args.filter((a) => !a.startsWith('--'));
if (!URL_ || !KEY) { console.error('需要 js/config.js 里的 SUPABASE_URL 和环境变量 SUPABASE_SERVICE_KEY（Supabase 控制台 → Project Settings → API → service_role）'); process.exit(1); }

async function rest(method, path, body, prefer) {
  const a = ['-s', '-X', method, `${URL_}/rest/v1/${path}`, '-H', `apikey: ${KEY}`, '-H', `Authorization: Bearer ${KEY}`, '-H', 'Content-Type: application/json', '-w', '\n%{http_code}'];
  if (prefer) a.push('-H', `Prefer: ${prefer}`);
  if (body) a.push('-d', JSON.stringify(body));
  const { stdout } = await execFileP(CURL, a, { maxBuffer: 8 * 1024 * 1024 });
  const i = stdout.lastIndexOf('\n');
  const status = Number(stdout.slice(i + 1));
  const text = stdout.slice(0, i);
  if (status >= 300) throw new Error(`${status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
const fmtT = (s) => new Date(new Date(s).getTime() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const TIER = { profile: '固定信息', market: '实时信息', judgment: '观点', other: '其他' };

if (cmd === 'list') {
  const rows = await rest('GET', `reports?select=*&order=created_at.desc${opts.all ? '' : '&status=eq.new'}&limit=200`);
  if (!rows.length) { console.log(opts.all ? '没有反馈记录' : '没有待处理的反馈'); process.exit(0); }
  for (const r of rows) console.log(`${r.id.slice(0, 8)}  ${fmtT(r.created_at)}  [${r.status}]  ${r.condo_id} · ${TIER[r.tier] || r.tier}${r.field ? ' · ' + r.field : ''}\n          ${r.message.replace(/\s+/g, ' ').slice(0, 140)}${r.contact ? `\n          联系：${r.contact}` : ''}`);
  console.log(`\n共 ${rows.length} 条。处理：node scripts/reports.mjs done <id前8位> --who=名字 --note="…"`);
} else if (cmd === 'show' && id) {
  const rows = await rest('GET', `reports?select=*&id=like.${id}*`);
  console.log(JSON.stringify(rows, null, 2));
} else if (['done', 'reject', 'accept'].includes(cmd) && id) {
  if (!opts.who) { console.error('需要 --who=名字'); process.exit(1); }
  const status = { done: 'done', reject: 'rejected', accept: 'accepted' }[cmd];
  const rows = await rest('PATCH', `reports?id=like.${id}*`, { status, handled_at: new Date().toISOString(), handled_by: String(opts.who), handler_note: opts.note ? String(opts.note) : null }, 'return=representation');
  console.log(rows.length ? `已标记 ${rows.length} 条为 ${status}` : '没有匹配的 id');
} else if (cmd === 'delete' && id) {
  const rows = await rest('DELETE', `reports?id=like.${id}*`, null, 'return=representation');
  console.log(rows.length ? `已删除 ${rows.length} 条` : '没有匹配的 id');
} else {
  console.error('用法：node scripts/reports.mjs list [--all] | show <id> | done|reject|accept <id> --who=名字 [--note=…] | delete <id>');
  process.exit(1);
}
