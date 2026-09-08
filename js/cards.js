/* 小红书出图：从 data/condos.json（固定信息）现场画成 1080×1440 的图片。
   三篇帖子：总览地图 1 张；区域 1 概览 1 张 + 小区卡片 10 张；区域 2 概览 1 张 + 小区卡片 9 张。 */
import { NEEDS_LEVELS, NEEDS_MODES, CRITERIA } from './needs-data.js?v=202609081700';
const W = 1080, H = 1440, PAD = 72;
const SITE = 'um-housing.evasuka.com';
const C = { paper: '#FAF9F6', card: '#FFFFFF', ink: '#1B1F24', ink2: '#4B5560', ink3: '#7B8590', line: '#E3E0D8', line2: '#D2CEC4', accent: '#C96A1B', r1: '#C96A1B', r2: '#2F6BCC', r3: '#6B4FBB', lrt: '#D6336C', ktm: '#1F7A8C', campus: '#3E8E5B', ok: '#2E7D4F' };
const RC = (r) => (r === 1 ? C.r1 : r === 2 ? C.r2 : C.r3); // 区域颜色
const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", serif';
const SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const CFG_KEY = 'um-cards';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-MY');
const shortName = (c) => clean(c.alias || c.name).replace(/[（(].*?[）)]/g, '').trim(); // 表格和图例里用短名，去掉括号注释
const clean = (s) => String(s ?? '').replace(/[​-‍﻿]/g, ''); // 去掉零宽字符，画图时不需要

/* ---------- 文字排版 ---------- */
function tokens(str) {
  return String(str).match(/[A-Za-z0-9][A-Za-z0-9.,%/+'’:-]*|\s+|[^\sA-Za-z0-9]/g) || [];
}
function wrap(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const t of tokens(text)) {
    if (t.includes('\n')) { lines.push(line.trimEnd()); line = ''; continue; }
    const test = line + t;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line.trimEnd()); line = t.trimStart(); }
    else line = test;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
// 画一段文字，返回下一行的 y。超过 maxLines 时截断并加省略号。
function para(ctx, text, x, y, maxW, lh, o = {}) {
  ctx.font = o.font || `400 30px ${SANS}`;
  ctx.fillStyle = o.color || C.ink2;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'top';
  let lines = wrap(ctx, clean(text), maxW);
  if (o.maxLines && lines.length > o.maxLines) { lines = lines.slice(0, o.maxLines); lines[o.maxLines - 1] = lines[o.maxLines - 1].replace(/.{1,2}$/, '') + '…'; }
  for (const l of lines) { ctx.fillText(l, x, y); y += lh; }
  return y;
}
function label(ctx, text, x, y, color = C.accent) {
  ctx.font = `600 26px ${SERIF}`; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  return y + 40;
}
function hr(ctx, y, color = C.line) { ctx.fillStyle = color; ctx.fillRect(PAD, y, W - PAD * 2, 2); return y + 2; }
function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function pin(ctx, x, y, r, color, num) {
  circle(ctx, x, y, r, color, '#fff');
  ctx.font = `700 ${Math.round(r * 1.05)}px ${SANS}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(num), x, y + 1);
  ctx.textBaseline = 'top';
}

/* ---------- 每张图共有的底和脚 ---------- */
function base(ctx) {
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  // 左上角小标记：半橙半蓝的圆点 + 站名
  circle(ctx, PAD + 14, PAD + 14, 14, C.r1);
  ctx.save(); ctx.beginPath(); ctx.rect(PAD + 14, PAD, 14, 28); ctx.clip(); circle(ctx, PAD + 14, PAD + 14, 14, C.r2); ctx.restore();
  ctx.font = `700 28px ${SERIF}`; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('UM 租房指南', PAD + 40, PAD - 2);
}
function footer(ctx, cfg, hint) {
  const top = H - PAD - 98;
  hr(ctx, top, C.line2);
  ctx.textBaseline = 'top';
  ctx.font = `400 24px ${SANS}`; ctx.fillStyle = C.ink2; ctx.textAlign = 'left';
  const who = [cfg.name ? `小红书 @${cfg.name}` : '', cfg.id ? `号 ${cfg.id}` : ''].filter(Boolean).join(' · ');
  ctx.fillText(who || '小红书 @UM 租房指南', PAD, top + 18);
  ctx.font = `700 24px ${SANS}`; ctx.fillStyle = C.ink;
  ctx.fillText(hint || `最新价格、地图、自评打分：${SITE}`, PAD, top + 56);
  ctx.font = `400 22px ${SANS}`; ctx.fillStyle = C.ink3; ctx.textAlign = 'right';
  ctx.fillText(`固定信息核实于 ${cfg.date} · CC BY-NC-SA 4.0`, W - PAD, top + 18);
  ctx.fillText(SITE, W - PAD, top + 58);
  ctx.textAlign = 'left';
}
const FOOTER_TOP = H - PAD - 98;

/* ---------- 文案 ---------- */
function stationZh(nearest) {
  const m = String(nearest || '').match(/^([A-Za-z ]+?)\s*(LRT|MRT|KTM)/);
  return m ? `${m[1].trim()} 站${m[2] === 'KTM' ? '（KTM）' : ''}` : String(nearest || '');
}
function goText(c) {
  const t = c.transit;
  if (t.walk_min == null) {
    const bus = (t.buses || []).filter((b) => /^[A-Z]?\d/.test(b)).slice(0, 3);
    return `没有走得到的轻轨站。${bus.length ? '公交 ' + bus.join(' / ') + '，或者 Grab' : '靠免费巴士或 Grab'}${c.id === 'pacific-star' ? '，楼盘有穿梭巴士到 Asia Jaya 站' : ''}。`;
  }
  return `走 ${t.walk_min} 分钟到 ${stationZh(t.nearest)}${t.walk_m ? `（${t.walk_m} 米）` : ''}${t.walk_est ? '，分钟数是估算' : ''}。`;
}
function tenureShort(s) { return /Freehold/.test(s) ? '永久地契' : /Leasehold/.test(s) ? '租赁地契' : clean(s); }
function priceLine(c, prices) {
  const p = prices?.condos?.[c.id]; if (!p) return null;
  const m = String(p.date || prices.updated_myt || '').slice(0, 7);
  const bits = [];
  if (p.rooms_min) bits.push(`单间 RM ${fmt(p.rooms_min)} 起`);
  if (p.rent_from) bits.push(`整套 RM ${fmt(p.rent_from)} 起`);
  if (!bits.length) return null;
  return `${bits.join(' · ')}（${m} 行情，最新看 ${SITE}）`;
}

/* ---------- 小区卡片 ---------- */
function drawCondo(ctx, c, data, prices, cfg) {
  base(ctx);
  const rc = RC(c.region);
  const reg = data.meta.regions[String(c.region)];
  let y = PAD + 70;
  ctx.font = `600 26px ${SERIF}`; ctx.fillStyle = rc; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`${reg.label}`, PAD, y);
  pin(ctx, W - PAD - 26, y + 14, 26, rc, c.no);
  y += 52;
  y = para(ctx, clean(c.name), PAD, y, W - PAD * 2 - 70, 70, { font: `700 58px ${SERIF}`, color: C.ink, maxLines: 2 });
  y = para(ctx, clean(c.address), PAD, y + 4, W - PAD * 2, 34, { font: `400 24px ${SANS}`, color: C.ink3, maxLines: 1 });
  y += 10;
  const facts = [c.completed ? `${c.completed} 年建成` : '建成年份不详', c.units ? `${fmt(c.units)} 户` : null, c.floors ? clean(c.floors) : null, tenureShort(c.tenure), clean(c.type)].filter(Boolean).join(' · ');
  y = para(ctx, facts, PAD, y, W - PAD * 2, 40, { font: `500 28px ${SANS}`, color: C.ink, maxLines: 2 });
  y = hr(ctx, y + 18) + 26;

  y = label(ctx, '怎么去学校', PAD, y);
  y = para(ctx, goText(c), PAD, y, W - PAD * 2, 44, { font: `500 30px ${SANS}`, color: C.ink, maxLines: 2 });
  if (c.transit.note) y = para(ctx, c.transit.note, PAD, y + 2, W - PAD * 2, 40, { font: `400 27px ${SANS}`, color: C.ink2, maxLines: 3 });
  y += 22;

  y = label(ctx, `设施 ${c.facilities.length} 项`, PAD, y);
  y = para(ctx, c.facilities.map(clean).join('、'), PAD, y, W - PAD * 2, 40, { font: `400 27px ${SANS}`, color: C.ink2, maxLines: 3 });
  y += 22;

  y = label(ctx, '吃饭购物 · 安静程度', PAD, y);
  y = para(ctx, `${clean(c.judgment?.daily?.note || '')}；${clean(c.judgment?.quiet?.note || '')}`.replace(/^；|；$/g, ''), PAD, y, W - PAD * 2, 40, { font: `400 27px ${SANS}`, color: C.ink2, maxLines: 2 });
  y += 22;

  const notes = (c.notes || []).slice(0, 3);
  if (notes.length) {
    y = label(ctx, '要知道的', PAD, y);
    for (const n of notes) {
      if (y > FOOTER_TOP - 110) break;
      ctx.fillStyle = C.accent; circle(ctx, PAD + 8, y + 16, 5, C.accent);
      y = para(ctx, n, PAD + 28, y, W - PAD * 2 - 28, 38, { font: `400 26px ${SANS}`, color: C.ink2, maxLines: 2 }) + 6;
    }
  }
  const pl = cfg.price ? priceLine(c, prices) : null;
  if (pl && y < FOOTER_TOP - 100) {
    y = Math.max(y + 10, FOOTER_TOP - 96);
    para(ctx, pl, PAD, y, W - PAD * 2, 36, { font: `500 25px ${SANS}`, color: C.ok, maxLines: 2 });
  }
  footer(ctx, cfg);
}

/* ---------- 区域概览 ---------- */
function drawRegion(ctx, region, data, cfg) {
  base(ctx);
  const rc = RC(region);
  const reg = data.meta.regions[String(region)];
  const list = data.condos.filter((c) => c.region === region);
  let y = PAD + 70;
  ctx.font = `600 26px ${SERIF}`; ctx.fillStyle = rc; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`${list.length} 个小区，一图看完`, PAD, y);
  y += 46;
  y = para(ctx, clean(reg.label), PAD, y, W - PAD * 2, 64, { font: `700 ${reg.label.length > 18 ? 46 : 58}px ${SERIF}`, color: C.ink, maxLines: 2 });
  y = para(ctx, clean(reg.desc), PAD, y + 8, W - PAD * 2, 38, { font: `400 26px ${SANS}`, color: C.ink2, maxLines: 4 });
  y += 22;
  // 表格
  const cols = [{ t: '#', x: PAD, w: 50 }, { t: '小区', x: PAD + 56, w: 380 }, { t: '建成', x: PAD + 446, w: 90 }, { t: '户数', x: PAD + 546, w: 100 }, { t: '到轨道站', x: PAD + 656, w: 190 }, { t: '设施', x: PAD + 856, w: 80 }];
  ctx.fillStyle = '#F1EFE9'; ctx.fillRect(PAD, y, W - PAD * 2, 46);
  ctx.font = `600 22px ${SANS}`; ctx.fillStyle = C.ink2;
  for (const col of cols) ctx.fillText(col.t, col.x + 8, y + 12);
  y += 46;
  const rowH = Math.min(62, Math.floor((FOOTER_TOP - 30 - y) / list.length));
  for (const c of list) {
    ctx.fillStyle = C.line; ctx.fillRect(PAD, y + rowH - 1, W - PAD * 2, 1);
    pin(ctx, cols[0].x + 22, y + rowH / 2, 17, rc, c.no);
    ctx.font = `600 26px ${SANS}`; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let nm = shortName(c); while (ctx.measureText(nm).width > cols[1].w && nm.length > 3) nm = nm.slice(0, -2) + '…';
    ctx.fillText(nm, cols[1].x + 8, y + rowH / 2);
    ctx.font = `400 24px ${SANS}`; ctx.fillStyle = C.ink2;
    ctx.fillText(c.completed ? String(c.completed) : '不详', cols[2].x + 8, y + rowH / 2);
    ctx.fillText(c.units ? fmt(c.units) : '不详', cols[3].x + 8, y + rowH / 2);
    const t = c.transit;
    ctx.fillStyle = t.walk_min == null ? C.r1 : C.ink2;
    ctx.fillText(t.walk_min == null ? '公交或 Grab' : `走 ${t.walk_min} 分钟${t.walk_est ? '（估）' : ''}`, cols[4].x + 8, y + rowH / 2);
    ctx.fillStyle = C.ink2;
    ctx.fillText(`${c.facilities.length} 项`, cols[5].x + 8, y + rowH / 2);
    ctx.textBaseline = 'top';
    y += rowH;
  }
  y += 18;
  const both = data.condos.filter((c) => c.flags?.pool && c.flags?.gym).length;
  if (y < FOOTER_TOP - 40) para(ctx, `${data.condos.length} 个小区里 ${both} 个有泳池和健身房，所以“设施”一栏比的是这两样之外还有多少。走不到轨道站的，日常靠公交或 Grab。`, PAD, y, W - PAD * 2, 34, { font: `400 23px ${SANS}`, color: C.ink3, maxLines: 2 });
  footer(ctx, cfg);
}

/* ---------- 总览地图 ---------- */
function drawMap(ctx, data, campus, cfg) {
  base(ctx);
  let y = PAD + 70;
  ctx.font = `600 26px ${SERIF}`; ctx.fillStyle = C.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('校园在哪，轻轨在哪，两片小区在哪', PAD, y);
  y += 46;
  y = para(ctx, `马来亚大学周边 ${data.condos.length} 个小区`, PAD, y, W - PAD * 2, 70, { font: `700 58px ${SERIF}`, color: C.ink, maxLines: 1 });
  y = para(ctx, `橙色是区域 1（PJ 一侧），蓝色是区域 2（Bangsar South 一侧）${data.condos.some((c) => c.region === 3) ? '，紫色是区域 3（Seputeh / Old Klang Road 一侧）' : ''}；粉线是轻轨 Kelana Jaya 线，Universiti 站出来过天桥就是 UM 正门${data.meta.ktm ? '；青色圆点是 KTM 电动火车站' : ''}。`, PAD, y + 6, W - PAD * 2, 38, { font: `400 26px ${SANS}`, color: C.ink2, maxLines: 3 });
  y += 16;
  // 地图框
  const box = { x: PAD, y, w: W - PAD * 2, h: 510 };
  ctx.fillStyle = C.card; ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeStyle = C.line2; ctx.lineWidth = 2; ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip(); // 框外的东西一律不画
  // 投影：把所有点的经纬度范围铺进框里
  const pts = [];
  data.condos.forEach((c) => pts.push([c.lat, c.lng]));
  [...(data.meta.stations || []), ...(data.meta.mrt || []), ...(data.meta.ktm || [])].forEach((s) => pts.push([s.lat, s.lng]));
  const rings = [];
  if (campus?.geometry) {
    const g = campus.geometry;
    const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
    for (const p of polys) { const ring = p[0].map(([lng, lat]) => [lat, lng]); rings.push(ring); ring.forEach((q) => pts.push(q)); }
  }
  const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const cos = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  const inner = { x: box.x + 40, y: box.y + 40, w: box.w - 80, h: box.h - 80 };
  const k = Math.min(inner.w / ((maxLng - minLng) * cos), inner.h / (maxLat - minLat));
  const ox = inner.x + (inner.w - (maxLng - minLng) * cos * k) / 2;
  const oy = inner.y + (inner.h - (maxLat - minLat) * k) / 2;
  const P = ([lat, lng]) => [ox + (lng - minLng) * cos * k, oy + (maxLat - lat) * k];
  // 校园
  for (const ring of rings) {
    ctx.beginPath(); ring.forEach((q, i) => { const [x, yy] = P(q); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }); ctx.closePath();
    ctx.fillStyle = 'rgba(62,142,91,.22)'; ctx.fill(); ctx.strokeStyle = C.campus; ctx.lineWidth = 2; ctx.stroke();
  }
  // 轻轨线
  const st = (data.meta.stations || []).slice().sort((a, b) => (b.code > a.code ? 1 : -1));
  ctx.beginPath(); st.forEach((s, i) => { const [x, yy] = P([s.lat, s.lng]); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
  ctx.strokeStyle = C.lrt; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
  const allSt = [...st.map((s) => ({ ...s, k: 'lrt' })), ...(data.meta.mrt || []).map((s) => ({ ...s, k: 'lrt' })), ...(data.meta.ktm || []).map((s) => ({ ...s, k: 'ktm' }))];
  allSt.forEach((s) => { const [x, yy] = P([s.lat, s.lng]); circle(ctx, x, yy, 9, '#fff', s.k === 'ktm' ? C.ktm : C.lrt); });
  // 站名最后画（在小区圆点之上），带白边，免得被盖住或叠在一起看不清
  const drawStationLabels = () => allSt.forEach((s) => {
    const [x, yy] = P([s.lat, s.lng]);
    const col = s.k === 'ktm' ? C.ktm : C.lrt;
    ctx.font = `600 20px ${SANS}`; ctx.textBaseline = 'top';
    const tw = ctx.measureText(s.name).width;
    const right = x + 13 + tw > box.x + box.w - 8;
    ctx.textAlign = right ? 'right' : 'left';
    const lx = right ? x - 13 : x + 13, ly = s.k === 'ktm' ? yy + 6 : yy - 26; // KTM 站名写在点下方，轻轨站名写在上方
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineJoin = 'round'; ctx.strokeText(s.name, lx, ly);
    ctx.fillStyle = col; ctx.fillText(s.name, lx, ly);
    ctx.textAlign = 'left';
  });
  // 校园名
  if (rings.length) {
    const big = rings.reduce((a, b) => (b.length > a.length ? b : a));
    const cx = big.reduce((a, q) => a + q[0], 0) / big.length, cy = big.reduce((a, q) => a + q[1], 0) / big.length;
    const [x, yy] = P([cx, cy]);
    ctx.font = `700 26px ${SERIF}`; ctx.fillStyle = C.campus; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('马来亚大学 UM', x, yy);
  }
  // 小区：挨得太近的圆点互相推开一点，免得叠在一起看不清编号
  const R = 19;
  const pos = data.condos.map((c) => { const [x, yy] = P([c.lat, c.lng]); return { c, x, y: yy }; });
  for (let it = 0; it < 12; it++) {
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const a = pos[i], b = pos[j];
      const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01; const min = R * 2 + 4;
      if (d < min) { const push = (min - d) / 2; const ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; }
    }
  }
  pos.forEach(({ c, x, y: yy }) => pin(ctx, x, yy, R, RC(c.region), c.no));
  drawStationLabels();
  // 区域名：区域 1、2 写在各自那群点的上方，区域 3 写在下方；带白边，不出框
  Object.keys(data.meta.regions).map(Number).forEach((r) => {
    const list = pos.filter((p) => p.c.region === r);
    if (!list.length) return;
    let x = list.reduce((a, p) => a + p.x, 0) / list.length;
    const top = Math.min(...list.map((p) => p.y)), bottom = Math.max(...list.map((p) => p.y));
    const text = data.meta.regions[String(r)].label;
    ctx.font = `700 24px ${SERIF}`; ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width;
    x = Math.max(box.x + tw / 2 + 10, Math.min(box.x + box.w - tw / 2 - 10, x));
    const below = r === 3;
    ctx.textBaseline = below ? 'top' : 'bottom';
    const ly = below ? Math.min(bottom + R + 10, box.y + box.h - 34) : Math.max(top - R - 10, box.y + 34);
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineJoin = 'round'; ctx.strokeText(text, x, ly);
    ctx.fillStyle = RC(r); ctx.fillText(text, x, ly);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  });
  ctx.restore();
  // 图例：两列
  y = box.y + box.h + 24;
  const half = Math.ceil(data.condos.length / 2);
  data.condos.forEach((c, i) => {
    const col = i < half ? 0 : 1;
    const row = i < half ? i : i - half;
    const x = PAD + col * (W - PAD * 2) / 2;
    const yy = y + row * 26;
    if (yy > FOOTER_TOP - 26) return;
    pin(ctx, x + 12, yy + 12, 11, RC(c.region), c.no);
    ctx.font = `400 21px ${SANS}`; ctx.fillStyle = C.ink2; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(shortName(c), x + 32, yy + 1);
  });
  footer(ctx, cfg);
}

/* ---------- 方法篇：文字直接从 index.html 里取，网站改了这里跟着变 ---------- */
async function loadGuide() {
  const html = await fetch('index.html', { cache: 'no-cache' }).then((r) => r.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const txt = (el) => clean(el?.textContent || '').replace(/\s+/g, ' ').trim();
  const list = (sel) => [...doc.querySelectorAll(sel)].map(txt).filter(Boolean);
  return {
    priceHead: [...doc.querySelectorAll('#s2 .price-table thead th')].map(txt),
    priceRows: [...doc.querySelectorAll('#s2 .price-table tbody tr')].map((tr) => [...tr.children].map(txt)),
    monthly: list('#s2 .monthly ul li'),
    commission: txt(doc.querySelector('#s2 .monthly p')),
    where: list('#s5 .three-col > div:nth-child(1) ul li'),
    tpl: (doc.querySelector('#tpl-1')?.textContent || '').trim(),
    tplNote: txt(doc.querySelector('#s5 .three-col > div:nth-child(2) p.muted')),
    check3: list('#s5 .three-col > div:nth-child(3) ul.plain:not(.compact) li'),
    mustAsk: list('#s5 ul.plain.compact li'),
    viewing: list('#s6 [data-checklist="viewing"] li'),
    contract: list('#s6 [data-checklist="contract"] li'),
    movein: list('#s6 [data-checklist="movein"] li'),
    timeline: [...doc.querySelectorAll('#s7 .timeline li')].map((li) => ({ h: txt(li.querySelector('h3')), p: txt(li.querySelector('p')) })),
  };
}
function head(ctx, eyebrow, title, lede) {
  base(ctx);
  let y = PAD + 70;
  ctx.font = `600 26px ${SERIF}`; ctx.fillStyle = C.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(eyebrow, PAD, y);
  y += 46;
  y = para(ctx, title, PAD, y, W - PAD * 2, 66, { font: `700 54px ${SERIF}`, color: C.ink, maxLines: 2 });
  if (lede) y = para(ctx, lede, PAD, y + 8, W - PAD * 2, 38, { font: `400 26px ${SANS}`, color: C.ink2, maxLines: 3 });
  return y + 22;
}
function bullet(ctx, text, y, o = {}) {
  circle(ctx, PAD + 8, y + 15, 5, C.accent);
  return para(ctx, text, PAD + 28, y, W - PAD * 2 - 28, o.lh || 36, { font: o.font || `400 25px ${SANS}`, color: o.color || C.ink2, maxLines: o.maxLines || 3 }) + (o.gap ?? 8);
}
function roundBox(ctx, x, y, w, h, r, fill) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

function drawNeedsCard(ctx, cfg) {
  let y = head(ctx, '开始之前', '租房前先想清楚这 8 件事', `每件事按“${NEEDS_LEVELS.join(' / ')}”打个分。网站上打完分，会按你的权重给所有小区排序，还会整理出看房要问的问题。`);
  CRITERIA.forEach((m, i) => {
    if (y > FOOTER_TOP - 130) return;
    pin(ctx, PAD + 20, y + 20, 20, C.accent, i + 1);
    ctx.font = `700 30px ${SANS}`; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(m.label, PAD + 58, y + 2);
    y = para(ctx, m.hint, PAD + 58, y + 42, W - PAD * 2 - 58, 32, { font: `400 24px ${SANS}`, color: C.ink3, maxLines: 1 }) + 14;
    ctx.fillStyle = C.line; ctx.fillRect(PAD, y - 6, W - PAD * 2, 1);
  });
  y += 10;
  para(ctx, `先定住法：${Object.values(NEEDS_MODES).join(' / ')}，再定每人每月房租上限。`, PAD, y, W - PAD * 2, 34, { font: `500 24px ${SANS}`, color: C.ink2, maxLines: 2 });
  footer(ctx, cfg, `在网站上打分、自动排序：${SITE}`);
}

function drawBudgetCard(ctx, g, cfg) {
  let y = head(ctx, '第 2 步 · 定预算', '先选房型，再算入住前要带多少钱', `行情区间是人工整理的（${cfg.date}），看数量级就好；每个小区当前的在租数和价格，网站上每 12 小时自动更新。`);
  const cols = [{ x: PAD, w: 128 }, { x: PAD + 136, w: 250 }, { x: PAD + 394, w: 306 }, { x: PAD + 708, w: 228 }];
  ctx.fillStyle = '#F1EFE9'; ctx.fillRect(PAD, y, W - PAD * 2, 44);
  ctx.font = `600 21px ${SANS}`; ctx.fillStyle = C.ink2; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  g.priceHead.forEach((h, i) => ctx.fillText(h.replace(/区域 \d · /, ''), cols[i].x + 8, y + 11));
  y += 44;
  for (const row of g.priceRows) {
    ctx.font = `400 22px ${SANS}`;
    const n = Math.max(...row.map((cell, i) => wrap(ctx, cell, cols[i].w - 14).length));
    row.forEach((cell, i) => para(ctx, cell, cols[i].x + 8, y + 9, cols[i].w - 14, 30, { font: i === 0 ? `700 22px ${SANS}` : `400 22px ${SANS}`, color: i === 0 ? C.ink : C.ink2 }));
    y += n * 30 + 18;
    ctx.fillStyle = C.line; ctx.fillRect(PAD, y - 1, W - PAD * 2, 1);
  }
  y += 26;
  y = label(ctx, '入住前要付多少', PAD, y);
  const r = 1200, stamp = Math.max(0, Math.round((r * 12 - 2400) / 250)) + 10, base0 = r * 3.5 + stamp;
  y = para(ctx, `惯例是 2 个月押金 + 1 个月预付 + 半个月水电押金，押金退房时退。按月租 RM ${fmt(r)} 算：押金 RM ${fmt(r * 2)}、首月 RM ${fmt(r)}、水电押金 RM ${fmt(r / 2)}、门禁卡押金 RM 100 到 200、印花税约 RM ${fmt(stamp)}、合同费 RM 150 到 300，合计带够 RM ${fmt(base0 + 250)} 到 ${fmt(base0 + 500)}。合租单间常见简化版：押金 1 到 2.5 个月加首月。`, PAD, y, W - PAD * 2, 37, { font: `400 25px ${SANS}`, color: C.ink2, maxLines: 6 });
  footer(ctx, cfg, `填你的月租自动算：${SITE} 第 2 步`);
}
function drawMonthlyCard(ctx, g, cfg) {
  let y = head(ctx, '第 2 步 · 定预算', '每月除了房租还有什么，中介费谁付', '');
  y = label(ctx, '每月开销', PAD, y);
  for (const m of g.monthly) { if (y > FOOTER_TOP - 200) break; y = bullet(ctx, m, y, { font: `400 26px ${SANS}`, lh: 38, maxLines: 3, gap: 12 }); }
  y += 16;
  y = label(ctx, '中介费谁付', PAD, y);
  para(ctx, g.commission, PAD, y, W - PAD * 2, 38, { font: `400 26px ${SANS}`, color: C.ink2, maxLines: 5 });
  footer(ctx, cfg);
}
function drawAgentCard(ctx, g, cfg) {
  let y = head(ctx, '第 5 步 · 找房源', '去哪找房，联系之前先查什么', '');
  y = label(ctx, '去哪找', PAD, y);
  for (const t of g.where) { if (y > FOOTER_TOP - 300) break; y = bullet(ctx, t, y, { maxLines: 3 }); }
  y += 16;
  y = label(ctx, '发消息之前查这三样', PAD, y);
  for (const t of g.check3) { if (y > FOOTER_TOP - 60) break; y = bullet(ctx, t, y, { maxLines: 3 }); }
  footer(ctx, cfg);
}
function drawTemplateCard(ctx, g, cfg) {
  let y = head(ctx, '第 5 步 · 第一条消息', '给中介的第一条 WhatsApp 这样发', g.tplNote);
  ctx.font = `400 24px ${SANS}`;
  const lines = g.tpl.split('\n').flatMap((l) => { const w = wrap(ctx, l, W - PAD * 2 - 48); return w.length ? w : ['']; });
  const boxH = lines.length * 34 + 40;
  roundBox(ctx, PAD, y, W - PAD * 2, boxH, 10, '#F1EFE9');
  ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = `400 24px ${SANS}`;
  lines.forEach((l, i) => ctx.fillText(l, PAD + 24, y + 20 + i * 34));
  y += boxH + 28;
  y = label(ctx, '一定要问清的', PAD, y);
  for (const t of g.mustAsk) { if (y > FOOTER_TOP - 50) break; y = bullet(ctx, t, y, { maxLines: 2, gap: 6 }); }
  footer(ctx, cfg, `模板一键复制：${SITE} 第 5 步`);
}
function drawChecklistCard(ctx, g, cfg) {
  let y = head(ctx, '第 6 步 · 看房和签约', '照这三张清单过一遍', '');
  const groups = [['看房时检查', g.viewing], ['合同里要有', g.contract], ['付款和入住当天', g.movein]];
  for (const [t, items] of groups) {
    if (y > FOOTER_TOP - 90) break;
    y = label(ctx, t, PAD, y);
    for (const it of items) {
      if (y > FOOTER_TOP - 48) break;
      ctx.strokeStyle = C.line2; ctx.lineWidth = 2; ctx.strokeRect(PAD + 2, y + 5, 20, 20);
      y = para(ctx, it, PAD + 36, y, W - PAD * 2 - 36, 31, { font: `400 22px ${SANS}`, color: C.ink2, maxLines: 2 }) + 6;
    }
    y += 10;
  }
  footer(ctx, cfg, `清单可以在网站上勾选：${SITE} 第 6 步`);
}
function drawTimelineCard(ctx, g, cfg) {
  let y = head(ctx, '第 7 步 · 时间表', '出发前 6 周到入住第一周', '');
  const x0 = PAD + 14;
  const dots = [];
  for (const e of g.timeline) {
    if (y > FOOTER_TOP - 110) break;
    dots.push(y + 16);
    ctx.font = `700 29px ${SERIF}`; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(e.h, x0 + 34, y);
    y = para(ctx, e.p, x0 + 34, y + 42, W - PAD * 2 - 48, 34, { font: `400 24px ${SANS}`, color: C.ink2, maxLines: 4 }) + 28;
  }
  if (dots.length) { ctx.fillStyle = C.line2; ctx.fillRect(x0 - 1, dots[0], 2, dots[dots.length - 1] - dots[0]); }
  dots.forEach((dy) => circle(ctx, x0, dy, 9, C.card, C.accent));
  footer(ctx, cfg);
}

/* ---------- 每篇帖子的标题、正文、标签 ---------- */
function captions(data, cfg) {
  const tags = '#马来亚大学 #UM #马大 #马来西亚留学 #吉隆坡租房 #留学生租房 #马来西亚租房 #UM租房';
  const line = (c) => { const t = c.transit; const walk = t.walk_min == null ? '没有走得到的轻轨站' : `走 ${t.walk_min} 分钟到 ${stationZh(t.nearest)}`; return `${c.no} ${shortName(c)}：${c.completed ? c.completed + ' 年' : '年份不详'}，${c.units ? fmt(c.units) + ' 户' : '户数不详'}，${walk}`; };
  const region = (r) => data.condos.filter((c) => c.region === r).map(line).join('\n');
  const tail = `\n\n固定信息核实于 ${cfg.date}。在租数量和价格每 12 小时自动更新，加上地图、按你在意的事给小区打分排序、同学租房意向表，都在网站（网址在图的角落）。非商业整理，转载请注明来源。`;
  return [
    { title: `马大周边${data.condos.length}个小区，一张图看清位置`, body: `要来马来亚大学（UM）读书、准备在校外租房的同学看这里。学校附近的租房集中在三片：西边 PJ 一侧（图上橙色，${data.condos.filter((c) => c.region === 1).length} 个小区），东边 Bangsar South 一侧（蓝色，${data.condos.filter((c) => c.region === 2).length} 个），南边 Seputeh / Old Klang Road 一侧（紫色，${data.condos.filter((c) => c.region === 3).length} 个）。粉线是轻轨 Kelana Jaya 线，Universiti 站出来过天桥就是 UM 正门；青色圆点是 KTM 电动火车站。\n\n${data.condos.length} 个小区的设施、楼龄、户数、到轨道站的步行时间我们逐个核实过。接下来几篇按区域逐个看。${tail}`, tags: `${tags} #BangsarSouth #PetalingJaya #Seputeh` },
    { title: 'UM租房｜PJ一侧10个小区逐个看', body: `${clean(data.meta.regions['1'].desc)}\n\n一张概览表加 10 张小区卡片：\n${region(1)}${tail}`, tags: `${tags} #PetalingJaya #PJ租房` },
    { title: 'UM租房｜Bangsar South 9个小区', body: `${clean(data.meta.regions['2'].desc)}\n\n一张概览表加 9 张小区卡片：\n${region(2)}${tail}`, tags: `${tags} #BangsarSouth` },
    { title: 'UM租房｜Seputeh 旧巴生路6个小区', body: `${clean(data.meta.regions['3']?.desc || '')}\n\n一张概览表加 6 张小区卡片：\n${region(3)}${tail}`, tags: `${tags} #Seputeh #OldKlangRoad` },
    { title: 'UM租房｜从想清楚到签合同，7张图', body: `租房不是刷房源，先想清楚自己要什么。这 7 张图按顺序：\n1 先想清楚这 8 件事\n2 房型行情和入住前要带多少钱\n3 每月除了房租还有什么、中介费谁付\n4 去哪找房、联系前查什么\n5 给中介的第一条 WhatsApp 模板\n6 看房、合同、付款三张清单\n7 出发前 6 周到入住第一周的时间表${tail}`, tags },
  ];
}

/* ---------- 页面 ---------- */
async function main() {
  const status = $('#status');
  status.textContent = '正在读数据和字体…';
  const [data, prices, campus, guide] = await Promise.all([
    fetch('data/condos.json', { cache: 'no-cache' }).then((r) => r.json()),
    fetch('data/prices.json', { cache: 'no-cache' }).then((r) => r.json()).catch(() => null),
    fetch('data/um.geojson').then((r) => r.json()).catch(() => null),
    loadGuide(),
  ]);
  // 字体：把会画到的字都告诉浏览器，让对应的子集先下载好
  const sample = JSON.stringify(data) + '小红书号版本核实固定信息最新价格地图自评打分校园在哪轻轨两片一图看完怎么去学校设施吃饭购物安静程度要知道的走不到公交估马来亚大学周边区域橙色蓝色粉线出来过天桥正门户数建成年份不详项' + SITE;
  const fonts = [`700 58px ${SERIF}`, `600 26px ${SERIF}`, `700 28px ${SERIF}`, `400 27px ${SANS}`, `500 28px ${SANS}`, `700 24px ${SANS}`, `600 26px ${SANS}`];
  try { await Promise.all(fonts.map((f) => document.fonts.load(f, sample))); } catch { /* 字体加载失败就用后备字体 */ }

  let cfg = { name: '', id: '', date: data.meta.verified_at || '', price: false };
  try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') }; } catch { /* ignore */ }
  $('#cfg-name').value = cfg.name; $('#cfg-id').value = cfg.id; $('#cfg-date').value = cfg.date; $('#cfg-price').checked = !!cfg.price;
  const save = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ } };

  const posts = [
    { title: '帖子 1：总览地图', note: '1 张。发的时候正文写两片区域各是什么、网站能看最新价格。', items: [{ file: '00-总览地图', draw: (ctx) => drawMap(ctx, data, campus, cfg) }] },
    { title: '帖子 2：区域 1 · PJ 一侧', note: '1 张概览 + 10 张小区卡片，正好一篇。', items: [{ file: '10-区域1-概览', draw: (ctx) => drawRegion(ctx, 1, data, cfg) }, ...data.condos.filter((c) => c.region === 1).map((c) => ({ file: `1${String(c.no).padStart(2, '0')}-${shortName(c)}`, draw: (ctx) => drawCondo(ctx, c, data, prices, cfg) }))] },
    { title: '帖子 3：区域 2 · Bangsar South 一侧', note: '1 张概览 + 9 张小区卡片。', items: [{ file: '20-区域2-概览', draw: (ctx) => drawRegion(ctx, 2, data, cfg) }, ...data.condos.filter((c) => c.region === 2).map((c) => ({ file: `2${String(c.no).padStart(2, '0')}-${shortName(c)}`, draw: (ctx) => drawCondo(ctx, c, data, prices, cfg) }))] },
    ...(data.condos.some((c) => c.region === 3) ? [{ title: '帖子 4：区域 3 · Seputeh / Old Klang Road 一侧', note: '1 张概览 + 6 张小区卡片。', items: [{ file: '30-区域3-概览', draw: (ctx) => drawRegion(ctx, 3, data, cfg) }, ...data.condos.filter((c) => c.region === 3).map((c) => ({ file: `3${String(c.no).padStart(2, '0')}-${shortName(c)}`, draw: (ctx) => drawCondo(ctx, c, data, prices, cfg) }))] }] : []),
    { title: '帖子 5：方法篇', note: '7 张：先想清楚、预算两张、找房源、消息模板、三张清单、时间表。文字直接取自网站对应的步骤。', items: [
      { file: '30-先想清楚', draw: (ctx) => drawNeedsCard(ctx, cfg) },
      { file: '31-预算-行情和入住前要付多少', draw: (ctx) => drawBudgetCard(ctx, guide, cfg) },
      { file: '32-预算-每月开销和中介费', draw: (ctx) => drawMonthlyCard(ctx, guide, cfg) },
      { file: '33-找房源和查中介', draw: (ctx) => drawAgentCard(ctx, guide, cfg) },
      { file: '34-第一条消息模板', draw: (ctx) => drawTemplateCard(ctx, guide, cfg) },
      { file: '35-看房签约清单', draw: (ctx) => drawChecklistCard(ctx, guide, cfg) },
      { file: '36-时间表', draw: (ctx) => drawTimelineCard(ctx, guide, cfg) },
    ] },
  ];
  const box = $('#posts');
  const canvases = [];
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const render = () => {
    box.innerHTML = '';
    canvases.length = 0;
    const caps = captions(data, cfg);
    posts.forEach((p, pi) => {
      const sec = document.createElement('div'); sec.className = 'post';
      const cap = caps[pi];
      sec.innerHTML = `<h3>${p.title}</h3><p class="muted">${p.note}</p><div class="card-grid"></div>
        <div class="cap"><h4>标题（${cap.title.length} 字）</h4><p class="cap-t">${esc(cap.title)}</p><h4>正文</h4><pre class="cap-b">${esc(cap.body)}</pre><h4>标签</h4><p class="cap-g">${esc(cap.tags)}</p>
        <div class="needs-acts"><button type="button" class="btn" data-cap="title">复制标题</button><button type="button" class="btn" data-cap="body">复制正文</button><button type="button" class="btn" data-cap="tags">复制标签</button></div></div>`;
      $$('.cap button', sec).forEach((b) => b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(cap[b.dataset.cap]); const t = b.textContent; b.textContent = '已复制'; setTimeout(() => { b.textContent = t; }, 1200); } catch { window.prompt('复制下面的文字', cap[b.dataset.cap]); }
      }));
      const grid = $('.card-grid', sec);
      for (const it of p.items) {
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        it.draw(cv.getContext('2d'));
        const wrapEl = document.createElement('div'); wrapEl.className = 'card-item';
        wrapEl.appendChild(cv);
        const row = document.createElement('div'); row.className = 'row';
        row.innerHTML = `<b>${it.file}</b>`;
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.textContent = '下载';
        btn.addEventListener('click', () => download(cv, it.file));
        row.appendChild(btn); wrapEl.appendChild(row); grid.appendChild(wrapEl);
        canvases.push({ cv, file: it.file });
      }
      box.appendChild(sec);
    });
    status.textContent = `已生成 ${canvases.length} 张，1080 × 1440`;
  };
  const download = (cv, name) => new Promise((res) => cv.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${name}.png`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); res(); }, 300);
  }, 'image/png'));

  const onChange = () => { cfg = { name: $('#cfg-name').value.trim(), id: $('#cfg-id').value.trim(), date: $('#cfg-date').value || data.meta.verified_at, price: $('#cfg-price').checked }; save(); render(); };
  ['#cfg-name', '#cfg-id', '#cfg-date'].forEach((s) => $(s).addEventListener('change', onChange));
  $('#cfg-price').addEventListener('change', onChange);
  $('#redraw').addEventListener('click', onChange);
  $('#dl-all').addEventListener('click', async () => {
    for (const { cv, file } of canvases) { await download(cv, file); await new Promise((r) => setTimeout(r, 250)); }
    status.textContent = `已下载 ${canvases.length} 张，看浏览器的下载文件夹`;
  });
  render();
}
main().catch((e) => { $('#status').textContent = '出错了：' + e.message; console.error(e); });
