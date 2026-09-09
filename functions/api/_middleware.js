import { guard } from '../_lib/access.js';
// /api/auth/* 本来就是给还没登录的人用的，不能被守卫拦住；其余接口一律先验身份
export const onRequest = [(ctx) => (new URL(ctx.request.url).pathname.startsWith('/api/auth/') ? ctx.next() : guard(ctx))];
