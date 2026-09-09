// 后台登录：Supabase 邮箱一次性验证码，没有密码。
// 验证码由 /api/auth/start 发出（先比对白名单，名单外的邮箱一封信都不会发），
// /api/auth/verify 换到 token 之后写进 HttpOnly cookie —— 浏览器脚本读不到，也不落 localStorage。
// /console/* 和 /api/* 每次请求都拿 cookie 找 Supabase 验一次，再比对白名单。
// 需要的环境变量（写在 Cloudflare Pages 里，不进仓库）：
//   ADMIN_EMAILS  允许进后台的邮箱，逗号分隔
//   SUPABASE_URL / SUPABASE_ANON_KEY  可选，不填就用下面那对公开的
const DEFAULT_URL = 'https://lhdgoofzgkrqetjbnowg.supabase.co';
const DEFAULT_KEY = 'sb_publishable_ppZKKkZLKYPp7UayRaOZyQ_P20-Zfyi';
const DAY = 24 * 60 * 60;

export const sbUrl = (env) => String(env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '');
export const sbKey = (env) => env.SUPABASE_ANON_KEY || DEFAULT_KEY;

export const admins = (env) => String(env.ADMIN_EMAILS || '').split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdmin = (env, email) => !!email && admins(env).includes(String(email).trim().toLowerCase());

export const AT = 'umh_at', RT = 'umh_rt';
export const setCookie = (name, value, maxAge) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export const sessionCookies = (s) => [setCookie(AT, s.access_token, 30 * DAY), setCookie(RT, s.refresh_token || '', 30 * DAY)];
export const deadCookies = () => [setCookie(AT, '', 0), setCookie(RT, '', 0)];

function readCookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

// 只读一下过期时间，不当作校验：真假由 Supabase 那边说了算
function expOf(jwt) {
  try {
    let s = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Number(JSON.parse(atob(s)).exp) || 0;
  } catch { return 0; }
}

async function whoami(env, token) {
  const r = await fetch(`${sbUrl(env)}/auth/v1/user`, { headers: { apikey: sbKey(env), Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.email ? u : null;
}

async function refreshSession(env, refreshToken) {
  const r = await fetch(`${sbUrl(env)}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: sbKey(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!r.ok) return null;
  const s = await r.json().catch(() => null);
  return s && s.access_token ? s : null;
}

// { ok:true, email, cookies? } 或 { ok:false, status, error }
export async function verifySession(request, env) {
  if (!admins(env).length) return { ok: false, status: 503, error: '后台还没配置：缺 ADMIN_EMAILS' };
  const c = readCookies(request);
  if (!c[AT] && !c[RT]) return { ok: false, status: 401, error: '还没登录' };
  const now = Math.floor(Date.now() / 1000);
  if (c[AT] && expOf(c[AT]) > now + 10) {
    const u = await whoami(env, c[AT]);
    if (u) {
      if (!isAdmin(env, u.email)) return { ok: false, status: 403, error: '这个邮箱不在维护名单里' };
      return { ok: true, email: u.email, sub: u.id };
    }
  }
  // access token 过期或被否了，就用 refresh token 悄悄换一张，换不到才让人重新登录
  if (c[RT]) {
    const s = await refreshSession(env, c[RT]);
    if (s) {
      const email = s.user && s.user.email;
      if (!isAdmin(env, email)) return { ok: false, status: 403, error: '这个邮箱不在维护名单里' };
      return { ok: true, email, sub: s.user && s.user.id, cookies: sessionCookies(s) };
    }
  }
  return { ok: false, status: 401, error: '登录过期了，重新登录一下' };
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra } });
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// /console/* 和 /api/* 共用：验不过就拦
export async function guard(context) {
  const v = await verifySession(context.request, context.env);
  if (!v.ok) {
    const h = new Headers({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    if (v.status === 401 || v.status === 403) deadCookies().forEach((s) => h.append('Set-Cookie', s));
    if (new URL(context.request.url).pathname.startsWith('/api/')) {
      h.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify({ error: v.error }), { status: v.status, headers: h });
    }
    // 拦下来的时候给一个和网站同一套样式的页面，而不是一段系统字
    h.set('Content-Type', 'text/html; charset=utf-8');
    const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>维护后台 · UM 租房指南</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css"></head><body>
<header class="top"><a class="brand" href="/">UM 租房指南</a></header>
<main class="login-wrap"><div class="login-card">
<h1 class="login-title">维护后台</h1>
<p class="login-say">${escapeHtml(v.error)}</p>
<p class="login-acts"><a class="btn primary" href="/login/">去登录</a><a class="btn" href="/">回到指南</a></p>
</div></main></body></html>`;
    return new Response(page, { status: v.status, headers: h });
  }
  context.data.user = v;
  const res = await context.next();
  const h = new Headers(res.headers);
  h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex');
  (v.cookies || []).forEach((s) => h.append('Set-Cookie', s));
  return new Response(res.body, { status: res.status, headers: h });
}
