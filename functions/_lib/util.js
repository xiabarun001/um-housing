// Function 里用的小工具：Supabase（服务密钥，绕过 RLS，只在服务端）和 GitHub Actions 触发。
import { json } from './access.js';
export { json };

export async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

export function supabase(env) {
  const url = env.SUPABASE_URL || 'https://lhdgoofzgkrqetjbnowg.supabase.co';
  const key = env.SUPABASE_SERVICE_KEY;
  if (!key) throw Object.assign(new Error('缺 SUPABASE_SERVICE_KEY'), { status: 503 });
  return async function rest(method, path, body, prefer) {
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const r = await fetch(`${url}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (!r.ok) throw Object.assign(new Error(`Supabase ${r.status}: ${text.slice(0, 200)}`), { status: 502 });
    return text ? JSON.parse(text) : null;
  };
}

export function github(env) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO || 'xiabarun001/um-housing';
  if (!token) throw Object.assign(new Error('缺 GITHUB_TOKEN'), { status: 503 });
  return async function api(method, path, body) {
    const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'umh-console', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    if (!r.ok) throw Object.assign(new Error(`GitHub ${r.status}: ${text.slice(0, 200)}`), { status: 502 });
    return text ? JSON.parse(text) : null;
  };
}

export const fail = (e) => json({ error: e.message || String(e) }, e.status || 500);
