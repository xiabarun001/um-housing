// 验证码换 token。换到之后写进 HttpOnly cookie，浏览器脚本碰不到。
import { sbUrl, sbKey, admins, isAdmin, sessionCookies, deadCookies } from '../../_lib/access.js';

const reply = (data, status, cookies) => {
  const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  (cookies || []).forEach((s) => h.append('Set-Cookie', s));
  return new Response(JSON.stringify(data), { status, headers: h });
};

// 同一封信里的码，GoTrue 那边可能记成 email / signup / magiclink，挨个试一遍
const TYPES = ['email', 'signup', 'magiclink'];

export async function onRequestPost({ request, env }) {
  if (!admins(env).length) return reply({ error: '后台还没配置：缺 ADMIN_EMAILS' }, 503);
  let body = {};
  try { body = await request.json(); } catch { /* 空 body 当没填 */ }
  const email = String(body.email || '').trim();
  const code = String(body.code || '').trim();
  if (!isAdmin(env, email)) return reply({ error: '这个邮箱不在维护名单里' }, 403);
  if (!/^\d{6,10}$/.test(code)) return reply({ error: '验证码是一串数字，照邮件里抄' }, 400);

  let last = '验证码不对或者过期了';
  for (const type of TYPES) {
    const r = await fetch(`${sbUrl(env)}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: sbKey(env), 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, email, token: code }),
    });
    const text = await r.text();
    if (!r.ok) { last = text.slice(0, 160) || last; continue; }
    const s = JSON.parse(text);
    // 换回来的身份再核一次，别只信前端传上来的邮箱
    if (!s.access_token || !isAdmin(env, s.user && s.user.email)) return reply({ error: '这个邮箱不在维护名单里' }, 403, deadCookies());
    return reply({ ok: true, email: s.user.email }, 200, sessionCookies(s));
  }
  return reply({ error: last.includes('expired') || last.includes('invalid') ? '验证码不对或者过期了' : last }, 401);
}
