// 改仓库数据的动作不在这里直接改文件，而是触发 GitHub Actions 的 console-action.yml，
// 让同一套脚本（publish.mjs / arbitrate.mjs / collect.mjs / refresh.mjs）在云端跑并提交。
// 好处：后台和命令行走同一条路，留痕一致；这里只需要一个能触发工作流的 token。
import { json, readBody, github, fail } from '../_lib/util.js';

const ACTIONS = ['publish', 'arbitrate', 'collect', 'crosscheck', 'refresh', 'status'];
const WORKFLOW = 'console-action.yml';
const clean = (v, n) => (v == null ? '' : String(v)).replace(/[\r\n]+/g, ' ').slice(0, n);

export async function onRequestGet({ env }) {
  try {
    const gh = github(env);
    const r = await gh('GET', `/actions/workflows/${WORKFLOW}/runs?per_page=15`);
    const runs = (r.workflow_runs || []).map((x) => ({ id: x.id, status: x.status, conclusion: x.conclusion, title: x.display_title || x.name, created_at: x.created_at, updated_at: x.updated_at, url: x.html_url }));
    return json({ runs });
  } catch (e) { return fail(e); }
}

export async function onRequestPost({ request, env, data }) {
  try {
    const b = await readBody(request);
    if (!ACTIONS.includes(b.action)) return json({ error: '不认识的动作' }, 400);
    if (['publish', 'arbitrate'].includes(b.action) && !/^[a-z0-9-]{2,40}$/.test(b.id || '')) return json({ error: '需要小区 id' }, 400);
    if (b.action === 'arbitrate' && (!/^[a-z_]{2,20}$/.test(b.field || '') || !['agree', 'conflict', 'second-only'].includes(b.verdict) || !b.note)) return json({ error: '仲裁需要字段、结论和理由' }, 400);
    const who = clean(data.user?.email || 'console', 80);
    const inputs = {
      action: b.action,
      id: clean(b.id, 40),
      accept: clean(b.accept, 200).replace(/[^a-z_,]/g, ''),
      field: clean(b.field, 20),
      verdict: clean(b.verdict, 20),
      reason: clean(b.reason, 200),
      note: clean(b.note, 300),
      who,
    };
    await github(env)('POST', `/actions/workflows/${WORKFLOW}/dispatches`, { ref: 'main', inputs });
    return json({ ok: true, inputs });
  } catch (e) { return fail(e); }
}
