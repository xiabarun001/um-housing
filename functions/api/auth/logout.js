// 退出：把两个 cookie 清掉，回登录页。
import { deadCookies } from '../../_lib/access.js';

const bye = (to) => {
  const h = new Headers({ Location: to, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  deadCookies().forEach((s) => h.append('Set-Cookie', s));
  return new Response(null, { status: 302, headers: h });
};

export const onRequestGet = () => bye('/login/');
export const onRequestPost = () => bye('/login/');
