/* 页面脚本的自检：确认 index.html 用到的元素和 app.js 里调用的函数都还在。
   起因：2026-09-09 改"计算租房费用"时，整段替换连带删掉了同一段里的 bindCopy 和
   bindChecklists，init() 抛错后停在半路，路线图的小人就不见了。语法检查发现不了这种错，
   所以专门加一条：跑 npm run check。 */
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const problems = [];

/* 1. init() 里调用的函数必须都有定义 */
const defined = new Set();
for (const m of app.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) defined.add(m[1]);
for (const m of app.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) defined.add(m[1]);
for (const m of app.matchAll(/^import\s*\{([^}]*)\}/gm)) m[1].split(',').forEach((x) => defined.add(x.trim()));

const a = app.indexOf('async function init()');
if (a < 0) problems.push('找不到 init()');
const init = app.slice(a, app.indexOf('\n}\n', a));
const calls = [...new Set([...init.matchAll(/^\s{2}(?:await\s+)?([A-Za-z_$][\w$]*)\(/gm)].map((m) => m[1]))];
for (const name of calls) if (!defined.has(name)) problems.push(`init() 调用了 ${name}()，但 app.js 里没有定义`);

/* 2. app.js 里用 $('#id') 取的元素，index.html 里要有 */
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const wanted = new Set([...app.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map((m) => m[1]));
// 这些是运行时才插进页面的，不在 index.html 里
const RUNTIME = new Set(['tier-pop', 'con-copy', 'con-text', 'filter-reset', 'filter-done', 'm-each-wrap', 'f-budget', 'f-budget-n', 'f-budget-off']);
for (const id of wanted) if (!ids.has(id) && !RUNTIME.has(id)) problems.push(`app.js 找 #${id}，但 index.html 里没有这个 id`);

/* 3. 七站路线图的每一站都要真的存在 */
const stops = app.match(/const ROUTE_STOPS = \[([^\]]+)\]/);
if (!stops) problems.push('找不到 ROUTE_STOPS');
else for (const s of stops[1].split(',').map((x) => x.trim().replace(/^'|'$/g, ''))) {
  if (!ids.has(s)) problems.push(`路线图有一站叫 ${s}，但页面上没有这个区块`);
}

/* 4. 静态资源的版本号要一致，否则会有人拿到旧缓存 */
const vs = new Set([...html.matchAll(/\?v=(\d{12})/g)].map((m) => m[1]));
if (vs.size > 1) problems.push(`index.html 里有多个版本号：${[...vs].join(', ')}`);

if (problems.length) {
  console.error('自检没过：');
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log(`自检通过：init() 调用 ${calls.length} 个函数、${wanted.size} 个元素 id、7 站路线图，版本号 ${[...vs][0]}`);
