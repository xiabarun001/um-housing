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
    return new Response(`<!doctype html><meta charset="utf-8"><title>UMH Console</title><body style="font:15px/1.6 system-ui;padding:40px;max-width:560px"><h2>UMH Console</h2><p>${v.error}。</p><p>这个后台只对白名单里的管理员开放，登录由 Cloudflare Access 负责；如果你是管理员，请从 <a href="/console/">/console/</a> 重新进入并用邮箱验证码登录。</p></body>`, { status: v.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  context.data.user = v;
  const res = await context.next();
  const h = new Headers(res.headers);
  h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex');
  return new Response(res.body, { status: res.status, headers: h });
}
