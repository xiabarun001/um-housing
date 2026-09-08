// 意向表：后台查看和删除（替代读者页的口令删除）。
import { json, readBody, supabase, fail } from '../_lib/util.js';

export async function onRequestGet({ env }) {
  try {
    const rows = await supabase(env)('GET', 'intents?select=id,created_at,nickname,budget,room_type,condos,move_in,need_roommate,contact,note&order=created_at.desc&limit=500');
    return json({ rows });
  } catch (e) { return fail(e); }
}

export async function onRequestDelete({ request, env }) {
  try {
    const b = await readBody(request);
    if (!b.id) return json({ error: '需要 id' }, 400);
    const rows = await supabase(env)('DELETE', `intents?id=eq.${encodeURIComponent(b.id)}`, null, 'return=representation');
    return json({ deleted: rows.length });
  } catch (e) { return fail(e); }
}
