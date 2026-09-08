// 读者反馈：列出、标记处理、删除。全部走服务密钥，浏览器拿不到密钥。
import { json, readBody, supabase, fail } from '../_lib/util.js';

const STATUSES = ['new', 'accepted', 'rejected', 'done'];

export async function onRequestGet({ request, env }) {
  try {
    const u = new URL(request.url);
    const status = u.searchParams.get('status') || 'new';
    const filter = status === 'all' ? '' : `&status=eq.${encodeURIComponent(status)}`;
    const rows = await supabase(env)('GET', `reports?select=*&order=created_at.desc&limit=300${filter}`);
    return json({ rows });
  } catch (e) { return fail(e); }
}

export async function onRequestPatch({ request, env, data }) {
  try {
    const b = await readBody(request);
    if (!b.id || !STATUSES.includes(b.status)) return json({ error: '需要 id 和合法的 status' }, 400);
    const rows = await supabase(env)('PATCH', `reports?id=eq.${encodeURIComponent(b.id)}`, {
      status: b.status,
      handled_at: new Date().toISOString(),
      handled_by: String(data.user?.email || 'console').slice(0, 40),
      handler_note: b.note ? String(b.note).slice(0, 500) : null,
    }, 'return=representation');
    return json({ updated: rows.length, row: rows[0] || null });
  } catch (e) { return fail(e); }
}

export async function onRequestDelete({ request, env }) {
  try {
    const b = await readBody(request);
    if (!b.id) return json({ error: '需要 id' }, 400);
    const rows = await supabase(env)('DELETE', `reports?id=eq.${encodeURIComponent(b.id)}`, null, 'return=representation');
    return json({ deleted: rows.length });
  } catch (e) { return fail(e); }
}
