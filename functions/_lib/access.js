// 校验 Cloudflare Access 签发的 JWT（请求头 Cf-Access-Jwt-Assertion）。
// Access 在边缘先做登录（邮箱一次性验证码、白名单），放行后把 JWT 带给源站；这里再验一次签名、受众和有效期，
// 防止有人绕过 Access 直接打 /api。需要两个环境变量：
//   CF_ACCESS_TEAM_DOMAIN  例如 https://xxx.cloudflareaccess.com
//   CF_ACCESS_AUD          Access 应用的 Audience (AUD) 标签
let certCache = { at: 0, keys: [] };

const b64url = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const decodeJSON = (seg) => JSON.parse(new TextDecoder().decode(b64url(seg)));

async function getKeys(teamDomain) {
  if (Date.now() - certCache.at < 10 * 60 * 1000 && certCache.keys.length) return certCache.keys;
  const r = await fetch(`${teamDomain}/cdn-cgi/access/certs`, { cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Error('certs ' + r.status);
  const j = await r.json();
  certCache = { at: Date.now(), keys: j.keys || [] };
  return certCache.keys;
}

export async function verifyAccess(request, env) {
  const team = String(env.CF_ACCESS_TEAM_DOMAIN || '').replace(/\/$/, '');
  const aud = env.CF_ACCESS_AUD;
  if (!team || !aud) return { ok: false, status: 503, error: '后台还没配置：缺 CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD' };
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || (request.headers.get('Cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  if (!token) return { ok: false, status: 401, error: '未登录' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, status: 401, error: 'token 格式不对' };
  let header, payload;
  try { header = decodeJSON(parts[0]); payload = decodeJSON(parts[1]); } catch { return { ok: false, status: 401, error: 'token 解析失败' }; }
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return { ok: false, status: 401, error: '登录已过期' };
  if (payload.iss !== team) return { ok: false, status: 401, error: '签发者不符' };
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) return { ok: false, status: 401, error: '受众不符' };
  let keys;
  try { keys = await getKeys(team); } catch (e) { return { ok: false, status: 503, error: '取不到 Access 公钥：' + e.message }; }
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return { ok: false, status: 401, error: '找不到对应公钥' };
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!ok) return { ok: false, status: 401, error: '签名无效' };
  } catch (e) { return { ok: false, status: 401, error: '签名校验失败：' + e.message }; }
  return { ok: true, email: payload.email || null, sub: payload.sub || null };
}

export const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...extra } });

// /console/* 和 /api/* 共用：验不过就拦
export async function guard(context) {
  const v = await verifyAccess(context.request, context.env);
  if (!v.ok) {
    const isApi = new URL(context.request.url).pathname.startsWith('/api/');
    if (isApi) return json({ error: v.error }, v.status);
    // 拦下来的时候给一个和网站同一套样式的页面，而不是一段系统字
    const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>维护后台 · UM 租房指南</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css"></head><body>
<header class="top"><a class="brand" href="/">UM 租房指南</a></header>
<main class="login-wrap"><div class="login-card">
<h1 class="login-title">维护后台</h1>
<p class="login-say">还是空的，功能以后再往里加</p>
<p class="login-note">${escapeHtml(v.error)}</p>
<p class="login-acts"><a class="btn" href="/login/">回登录页</a><a class="btn" href="/">回到指南</a></p>
</div></main></body></html>`;
    return new Response(page, { status: v.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  }
  context.data.user = v;
  const res = await context.next();
  const h = new Headers(res.headers);
  h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex');
  return new Response(res.body, { status: res.status, headers: h });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
