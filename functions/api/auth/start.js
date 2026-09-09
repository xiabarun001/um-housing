// 发验证码。名单外的邮箱在这里就被挡下，Supabase 那边一封信都不会发。
import { json, sbUrl, sbKey, admins, isAdmin } from '../../_lib/access.js';

export async function onRequestPost({ request, env }) {
  if (!admins(env).length) return json({ error: '后台还没配置：缺 ADMIN_EMAILS' }, 503);
  let body = {};
  try { body = await request.json(); } catch { /* 空 body 当没填 */ }
  const email = String(body.email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: '邮箱填得不对' }, 400);
  if (!isAdmin(env, email)) return json({ error: '这个邮箱不在维护名单里' }, 403);

  const r = await fetch(`${sbUrl(env)}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: sbKey(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true }),
  });
  if (r.ok) return json({ ok: true });
  const text = await r.text();
  if (r.status === 429) return json({ error: '发得太勤了，等一分钟再试' }, 429);
  return json({ error: `验证码没发出去：${text.slice(0, 160)}` }, 502);
}
