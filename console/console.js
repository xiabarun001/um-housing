/* UMH Console：静态页 + /api/*（Pages Functions）。登录在 /login/ 用邮箱验证码换 HttpOnly cookie，这里不碰 token。
   读取：仓库里的 data/*.json（和读者页同源）；写入：/api/actions（触发 GitHub 工作流）。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FIELD_ZH = { record: '新增小区', name: '名称', completed: '建成年份', units: '户数', floors: '楼层', tenure: '地契', type: '类型', developer: '开发商', address: '地址', geo: '坐标', facilities: '设施清单', flags: '设施开关', transit: '交通', walk: '步行', verified_at: '核实日期', lat: '纬度', lng: '经度' };
  const TIER_ZH = { profile: '固定信息', market: '实时信息', judgment: '观点', other: '其他' };
  const RSTATUS = { new: ['待处理', 'warn'], accepted: ['已确认待改', 'warn'], rejected: ['不改', 'gray'], done: ['已处理', 'ok'] };
  const DIFF_ZH = { same: ['一致', 'ok'], changed: ['有差异', 'warn'], new: ['新值', 'warn'], missing: ['采不到', 'gray'], none: ['两边都无', 'gray'] };
  const state = { me: null, condos: null, status: null, changelog: null, staging: {}, timer: null };
  const main = $('#main');
  const fmtT = (iso) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '—');
  const fz = (k) => FIELD_ZH[k] || k;
  const val = (v) => (v == null ? '—' : Array.isArray(v) ? v.join('、') : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const pill = (t, cls) => `<span class="pill ${cls || ''}">${esc(t)}</span>`;

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    let j = null; try { j = await r.json(); } catch { /* not json */ }
    // 没登录或者登录过期了，直接回登录页，别让人对着一堆报错发呆
    if (r.status === 401 || r.status === 403) { location.replace('/login/'); throw new Error((j && j.error) || '还没登录'); }
    if (!r.ok) throw new Error((j && j.error) || (r.status === 404 ? '接口不存在（本地预览没有 Functions）' : 'HTTP ' + r.status));
    return j;
  }
  const loadJSON = async (p) => { const r = await fetch(p, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${p} ${r.status}`); return r.json(); };
  async function loadCore(force) {
    if (state.condos && !force) return;
    const [c, s, l] = await Promise.all([loadJSON('/data/condos.json'), loadJSON('/data/status.json').catch(() => null), loadJSON('/data/changelog.json').catch(() => ({ entries: [] }))]);
    state.condos = c; state.status = s; state.changelog = l;
  }
  const condo = (id) => state.condos?.condos.find((x) => x.id === id);
  const condoName = (id) => { const c = condo(id); return c ? `${c.no ? c.no + '. ' : ''}${c.alias || c.name}` : id; };
  const confirmDo = (text) => window.confirm(text);
  const say = (el, t, cls) => { el.textContent = t; el.className = 'msg ' + (cls || ''); };

  /* ---------- 总览 ---------- */
  async function overview() {
    const st = state.status;
    if (!st) { main.innerHTML = '<h1>总览</h1><p class="msg err">读不到 data/status.json，先跑一次 npm run status。</p>'; return; }
    const ageCls = st.market.age_hours > 36 ? 'bad' : st.market.age_hours > 14 ? 'warn' : '';
    const oldCls = st.profile.oldest_days > 45 ? 'bad' : st.profile.oldest_days > 30 ? 'warn' : '';
    const pend = st.profile.pending_changes?.length || 0;
    const conf = st.second_source?.fields_conflict || 0;
    main.innerHTML = `
      <h1>总览</h1>
      <p class="lead">数据健康快照生成于 ${esc(st.generated_myt)}（马来西亚时间）。每次自动刷新、采集和后台动作之后都会重算。</p>
      <div class="stat-grid">
        <div class="stat ${ageCls}"><div class="k">实时信息</div><div class="v">${esc(st.market.age_hours ?? '—')} 小时前</div><div class="s">${esc(st.market.updated_myt)} · 有价格 ${st.market.condos_with_price}/${st.condos} · Mudah 一致 ${st.market.mudah.agree} / 差异 ${st.market.mudah.gap}</div></div>
        <div class="stat ${oldCls}"><div class="k">固定信息最旧</div><div class="v">${esc(st.profile.oldest_days ?? '—')} 天</div><div class="s">上次采集 ${esc(fmtT(st.profile.last_collect_at))} · 45 天复核一次</div></div>
        <div class="stat ${pend ? 'warn' : ''}"><div class="k">待审核差异</div><div class="v">${pend}</div><div class="s"><a href="#review">去采集与审核</a></div></div>
        <div class="stat ${conf ? 'warn' : ''}"><div class="k">两源冲突待复核</div><div class="v">${conf}</div><div class="s">一致 ${st.second_source?.fields_agree ?? 0} · 已复核 ${st.second_source?.fields_reviewed ?? 0}</div></div>
        <div class="stat"><div class="k">交叉验证</div><div class="v">${st.crosscheck.geo.agree + st.crosscheck.geo.near}/${st.condos}</div><div class="s">坐标一致或接近 · 步行路线值 ${st.crosscheck.walk.route_adopted}</div></div>
      </div>
      <h2>告警</h2>
      ${st.alerts?.length
        ? `<ul class="alerts">${st.alerts.map((a) => `<li>${esc(a.text)}</li>`).join('')}</ul>`
        : '<p class="allgood">一切正常，没有要处理的。</p>'}
      <h2>立即执行</h2>
      <div class="acts">
        <div class="act-row"><div class="t"><b>刷新实时信息</b><span>重抓 25 个小区的挂牌数量和价格，约 8 分钟。平时每天早晚 8 点自动跑一次。</span></div><button class="btn" data-act="refresh" data-name="刷新实时信息">执行</button></div>
        <div class="act-row"><div class="t"><b>采集固定信息 + 交叉验证</b><span>重新抓档案并和第二来源比对，约 7 分钟。只写进 staging，要不要采用还是你在「采集与审核」里定。</span></div><button class="btn" data-act="collect" data-name="采集固定信息 + 交叉验证">执行</button></div>
        <div class="act-row"><div class="t"><b>重算健康状态</b><span>只重算上面那几个数字，几秒钟，不动任何数据。</span></div><button class="btn" data-act="status" data-name="重算健康状态">执行</button></div>
      </div>
      <p class="act-foot"><span class="msg" id="act-msg"></span></p>
      <h2>最近的后台动作</h2>
      <div id="runs" class="runs"><p class="empty">加载中…</p></div>
      <p class="cfg-line" id="cfg">检查中…</p>`;
    $$('[data-act]', main).forEach((b) => b.addEventListener('click', async () => {
      const a = b.dataset.act;
      if (!confirmDo(`确定现在执行「${b.dataset.name}」？会在 GitHub Actions 里跑，完成后自动提交。`)) return;
      b.disabled = true; say($('#act-msg'), '已提交，等 GitHub 排队…');
      try { await api('/api/actions', { method: 'POST', body: JSON.stringify({ action: a }) }); say($('#act-msg'), '已触发，下面的列表半分钟内会出现。', 'ok'); setTimeout(loadRuns, 4000); }
      catch (e) { say($('#act-msg'), e.message, 'err'); }
      b.disabled = false;
    }));
    renderCfg();
    loadRuns();
    clearInterval(state.timer); state.timer = setInterval(() => { if (location.hash === '#overview' || !location.hash) loadRuns(); }, 30000);
  }
  function renderCfg() {
    const el = $('#cfg'); if (!el) return;
    if (!state.me) { el.textContent = '还没拿到登录信息（本地预览没有 Functions 时属正常）。'; return; }
    const c = state.me.configured || {};
    el.innerHTML = `登录为 ${esc(state.me.email || '—')} · ${pill(c.github ? 'GitHub token 已配置' : 'GitHub token 未配置', c.github ? 'ok' : 'bad')} ${pill('仓库 ' + (c.repo || '—'), 'gray')}`;
  }
  async function loadRuns() {
    const box = $('#runs'); if (!box) return;
    try {
      const { runs } = await api('/api/actions');
      if (!runs.length) { box.innerHTML = '<p class="empty">还没有后台动作。</p>'; return; }
      const cls = (r) => (r.status !== 'completed' ? 'warn' : r.conclusion === 'success' ? 'ok' : 'bad');
      const zh = (r) => (r.status !== 'completed' ? (r.status === 'queued' ? '排队中' : '运行中') : r.conclusion === 'success' ? '成功' : '失败');
      box.innerHTML = `<div class="tbl-wrap"><table class="tbl"><tr><th>时间</th><th>动作</th><th>状态</th><th></th></tr>${runs.map((r) => `<tr><td>${esc(fmtT(r.created_at))}</td><td>${esc(r.title)}</td><td>${pill(zh(r), cls(r))}</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener">GitHub</a></td></tr>`).join('')}</table></div>`;
    } catch (e) { box.innerHTML = `<p class="msg err">${esc(e.message)}</p>`; }
  }

  /* ---------- 采集与审核 ---------- */
  async function review(args) {
    const list = state.condos.condos;
    const id = args[0] && condo(args[0]) ? args[0] : null;
    main.innerHTML = `
      <h1>采集与审核</h1>
      <p class="lead">看每个小区最近一次自动采集（iProperty）和现有固定信息的差异、StarProperty 第二来源的逐字段结论、OpenStreetMap 的坐标和步行核对。勾选要接受的字段后发布，发布会在云端跑 publish.mjs 并提交，一分钟后读者页更新。</p>
      <div class="tools"><label>小区 <select id="rv-pick"><option value="">选一个…</option>${list.map((c) => `<option value="${esc(c.id)}" ${c.id === id ? 'selected' : ''}>${esc(condoName(c.id))}</option>`).join('')}</select></label>
      <span class="muted">或看 <a href="/data/staging/REVIEW.md" target="_blank" rel="noopener">完整审核报告</a></span></div>
      <div id="rv-body">${id ? '<p class="empty">加载中…</p>' : '<p class="empty">选一个小区。</p>'}</div>`;
    $('#rv-pick').addEventListener('change', (e) => { location.hash = e.target.value ? `#review/${e.target.value}` : '#review'; });
    if (!id) return;
    let s;
    try { s = await loadJSON(`/data/staging/${id}.json`); } catch { $('#rv-body').innerHTML = '<p class="msg err">这个小区还没有 staging，先在总览里采集一次。</p>'; return; }
    const cur = condo(id);
    const diff = s.diff || {};
    const rows = Object.entries(diff).map(([k, d]) => {
      const st = DIFF_ZH[d.status] || [d.status, 'gray'];
      const acceptable = ['changed', 'new'].includes(d.status) && k !== 'address';
      let curV = val(d.current), propV = val(d.proposed);
      if (k === 'facilities') { curV = `${(d.current || []).length} 项`; propV = `${(d.proposed || []).length} 项${d.added?.length ? `；多出：${d.added.join('、')}` : ''}${d.removed?.length ? `；少了：${d.removed.join('、')}` : ''}`; }
      if (k === 'flags') { curV = Object.entries(d.current || {}).filter(([, v]) => v).map(([f]) => f).join('、') || '—'; propV = (d.changed_keys || []).length ? `变化：${d.changed_keys.join('、')}` : '一致'; }
      if (k === 'geo') { propV = `${val(d.proposed)}${d.distance_m != null ? `（相差 ${d.distance_m} m）` : ''}`; }
      return `<tr><td>${acceptable ? `<input type="checkbox" name="accept" value="${esc(k)}">` : ''}</td><td>${esc(fz(k))}</td><td class="diffcell">${esc(curV)}</td><td class="diffcell">${esc(propV)}</td><td>${pill(st[0], st[1])}</td><td class="muted">${esc(s.assessment?.[k] || '')}</td></tr>`;
    }).join('');
    const sa = s.second_assessment || {};
    const spUrl = s.second?.starproperty?.url;
    const second = Object.keys(sa).length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>字段</th><th>iProperty</th><th>StarProperty</th><th>结论</th><th>现有仲裁</th><th></th></tr>${Object.entries(sa).map(([k, v]) => {
      const provField = { pool_gym: 'flags' }[k] || k;
      const arb = cur?.provenance?.[provField]?.second;
      const st = v.status === 'agree' ? ['一致', 'ok'] : v.status === 'conflict' ? ['冲突', 'bad'] : [v.status === 'single' ? '单源' : v.status, 'gray'];
      return `<tr><td>${esc(fz(provField))}</td><td>${esc(val(v.iproperty))}</td><td>${esc(val(v.starproperty))}</td><td>${pill(st[0], st[1])}${v.note ? ` <span class="muted">${esc(v.note)}</span>` : ''}</td><td class="muted">${arb?.arbitrated ? `${esc(arb.status)}：${esc(arb.note || '')}（${esc(arb.arbitrated.who)} ${esc(arb.arbitrated.at)}）` : ''}</td><td>${v.status === 'conflict' ? `<button class="btn small" data-arb="${esc(provField)}">仲裁</button>` : ''}</td></tr>`;
    }).join('')}</table></div>${spUrl ? `<p class="muted">来源：<a href="${esc(spUrl)}" target="_blank" rel="noopener">${esc(spUrl)}</a>${s.second.starproperty.layout === 'new' ? '（新版页，只有地契）' : ''}</p>` : ''}` : `<p class="empty">没有第二来源${s.second?.starproperty?.error ? `（${esc(s.second.starproperty.error)}）` : '，condos.json 里没有 links.starproperty'}。</p>`;
    const cc = s.crosscheck;
    const ccHtml = cc ? `<p>坐标：${pill(cc.geo?.status === 'agree' ? '一致' : cc.geo?.status === 'near' ? '接近' : cc.geo?.status === 'conflict' ? '冲突' : '未核对', cc.geo?.status === 'agree' ? 'ok' : cc.geo?.status === 'conflict' ? 'bad' : 'warn')} ${cc.geo?.distance_m != null ? `相差 ${cc.geo.distance_m} m` : ''} <span class="muted">${esc(cc.geo?.display || '')}</span></p>
      <p>步行：${pill(cc.walk?.status === 'agree' ? '一致' : cc.walk?.status === 'conflict' ? '不符' : '未核对', cc.walk?.status === 'agree' ? 'ok' : cc.walk?.status === 'conflict' ? 'warn' : 'gray')} 现有 ${esc(cc.walk?.current?.nearest || '—')} ${esc(cc.walk?.current?.walk_m ?? '—')} m / ${esc(cc.walk?.current?.walk_min ?? '—')} 分钟${cc.walk?.current?.est ? '（估计）' : ''}；路线值 ${cc.walk?.proposed ? `${esc(cc.walk.proposed.nearest || cc.walk.proposed.station || '')} ${esc(cc.walk.proposed.walk_m ?? cc.walk.proposed.route_m ?? '')} m / ${esc(cc.walk.proposed.walk_min ?? cc.walk.proposed.route_min ?? '')} 分钟` : '—'}
      ${cc.walk?.proposed && cc.walk?.status !== 'agree' ? `<label><input type="checkbox" name="accept" value="walk"> 采纳路线值</label>` : ''}</p>
      <p class="muted">核对时间 ${esc(fmtT(cc.at))}</p>` : '<p class="empty">还没跑过交叉验证。</p>';
    $('#rv-body').innerHTML = `
      <div class="panel"><h3>${esc(condoName(id))} · 采集于 ${esc(fmtT(s.fetched_at))} · ${esc(s.status)}${s.status !== 'ok' ? ` · ${esc(s.error || '')}` : ''}</h3>
        <p class="muted">现有核实日期 ${esc(cur?.verified_at || '—')} · 来源 <a href="${esc(s.source?.final_url || s.source?.url || '#')}" target="_blank" rel="noopener">iProperty 项目页</a></p></div>
      <form id="rv-form">
      <h2>iProperty 采集值 vs 现有值</h2>
      <div class="tbl-wrap"><table class="tbl"><tr><th>接受</th><th>字段</th><th>现有</th><th>采集到</th><th>状态</th><th>评估</th></tr>${rows || '<tr><td colspan="6" class="empty">没有 diff</td></tr>'}</table></div>
      <h2>第二来源 StarProperty</h2>${second}
      <h2>交叉验证 OpenStreetMap</h2>${ccHtml}
      <h2>发布</h2>
      <div class="panel">
        <div class="form-row"><label>理由（后台可见）</label><input name="reason" maxlength="200" placeholder="例如：核对了 iProperty 项目页，设施清单按最新的改"></div>
        <div class="form-row"><label>对外一句话</label><input name="note" maxlength="300" placeholder="记进更新日志，例如：更新了设施清单"></div>
        <div class="tools"><button type="submit" class="btn primary">发布勾选的字段</button><span class="muted">不勾任何字段也可以发布，只更新核实日期。</span><span class="msg" id="rv-msg"></span></div>
      </div>
      </form>
      <div id="arb-box"></div>`;
    $('#rv-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target; const accept = $$('input[name=accept]:checked', f).map((x) => x.value);
      if (!confirmDo(`发布 ${condoName(id)}：${accept.length ? '接受 ' + accept.map(fz).join('、') : '只更新核实日期'}？`)) return;
      say($('#rv-msg'), '提交中…');
      try { await api('/api/actions', { method: 'POST', body: JSON.stringify({ action: 'publish', id, accept: accept.join(','), reason: f.elements.reason.value, note: f.elements.note.value }) }); say($('#rv-msg'), '已触发发布，约一分钟后生效；总览页能看进度。', 'ok'); }
      catch (err) { say($('#rv-msg'), err.message, 'err'); }
    });
    $$('[data-arb]', main).forEach((b) => b.addEventListener('click', () => {
      const field = b.dataset.arb;
      $('#arb-box').innerHTML = `<div class="panel"><h3>仲裁 ${esc(condoName(id))} · ${esc(fz(field))}</h3>
        <form id="arb-form">
        <div class="form-row"><label>结论</label><select name="verdict"><option value="agree">其实一致（比如按栋计数）</option><option value="conflict">确实不一致，以现有值为准</option><option value="second-only">只有第二来源有</option></select></div>
        <div class="form-row"><label>理由</label><input name="note" maxlength="300" required placeholder="读者页会显示这句话"></div>
        <div class="tools"><button type="submit" class="btn primary">记录仲裁</button><span class="msg" id="arb-msg"></span></div>
        </form></div>`;
      $('#arb-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        try { await api('/api/actions', { method: 'POST', body: JSON.stringify({ action: 'arbitrate', id, field, verdict: f.elements.verdict.value, note: f.elements.note.value }) }); say($('#arb-msg'), '已触发，约一分钟后生效。', 'ok'); }
        catch (err) { say($('#arb-msg'), err.message, 'err'); }
      });
      $('#arb-box').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  /* ---------- 小区档案 ---------- */
  async function condos() {
    const list = state.condos.condos;
    const regions = state.condos.meta.regions || {};
    const secondSummary = (c) => { const f = ['completed', 'units', 'tenure', 'developer', 'floors', 'flags']; let a = 0, k = 0, r = 0; for (const x of f) { const sd = c.provenance?.[x]?.second; if (!sd) continue; if (sd.status === 'agree') a++; else if (sd.status === 'conflict') { if (sd.arbitrated) r++; else k++; } } return c.links?.starproperty ? `${a} 一致${k ? ` · ${k} 冲突` : ''}${r ? ` · ${r} 已复核` : ''}` : '无二源'; };
    main.innerHTML = `<h1>小区档案</h1><p class="lead">${list.length} 个小区的固定信息一览。改数据去「采集与审核」。</p>
      <div class="tbl-wrap"><table class="tbl"><tr><th>#</th><th>小区</th><th>区域</th><th>年份</th><th>户数</th><th>核实于</th><th>StarProperty</th><th>坐标核对</th><th>步行</th><th>链接</th><th></th></tr>
      ${list.map((c) => { const g = c.provenance?.lat?.check; const t = c.provenance?.transit; const stale = c.verified_at && (Date.now() - new Date(c.verified_at)) / 86400e3 > 45; return `<tr><td class="num">${c.no ?? ''}</td><td><b>${esc(c.alias || c.name)}</b><br><span class="muted">${esc(c.name)}</span></td><td>${esc(regions[c.region]?.short || c.region)}</td><td class="num">${c.completed ?? '—'}</td><td class="num">${c.units ?? '—'}</td><td>${pill(c.verified_at || '—', stale ? 'warn' : 'ok')}</td><td>${esc(secondSummary(c))}</td><td>${g ? pill(g.status === 'agree' ? '一致' : g.status === 'near' ? '接近' : g.status, g.status === 'agree' ? 'ok' : 'warn') : pill('无', 'gray')}</td><td>${t?.method === 'route' ? pill('路线值', 'ok') : c.transit?.walk_est ? pill('估计', 'warn') : pill('实测', 'ok')}</td><td><a href="${esc(c.links?.iproperty_building || '#')}" target="_blank" rel="noopener">iProperty</a>${c.links?.starproperty ? ` · <a href="${esc(c.links.starproperty)}" target="_blank" rel="noopener">StarProperty</a>` : ''}</td><td><a href="#review/${esc(c.id)}">审核</a></td></tr>`; }).join('')}</table></div>`;
  }



  /* ---------- 日志 ---------- */
  async function log(args) {
    const all = (state.changelog.entries || []).slice().reverse();
    const pick = args[0] || '';
    const rows = pick ? all.filter((e) => e.condo === pick) : all;
    const condosIn = [...new Set(all.map((e) => e.condo))];
    main.innerHTML = `<h1>日志</h1><p class="lead">谁、什么时候、改了什么、为什么。共 ${all.length} 条。</p>
      <div class="tools"><label>小区 <select id="lg-pick"><option value="">全部</option>${condosIn.map((id) => `<option value="${esc(id)}" ${id === pick ? 'selected' : ''}>${esc(condoName(id))}</option>`).join('')}</select></label></div>
      <div class="tbl-wrap"><table class="tbl"><tr><th>时间</th><th>谁</th><th>小区</th><th>字段</th><th>从</th><th>到</th><th>理由</th><th>对外说明</th></tr>${rows.slice(0, 300).map((e) => `<tr><td>${esc(fmtT(e.at))}</td><td>${esc(e.who)}</td><td>${esc(condoName(e.condo))}</td><td>${esc(fz(e.field))}</td><td class="diffcell">${esc(val(e.from))}</td><td class="diffcell">${esc(val(e.to))}</td><td class="diffcell">${esc(e.reason || '')}</td><td class="diffcell">${esc(e.public_note || '')}</td></tr>`).join('')}</table></div>${rows.length > 300 ? '<p class="muted">只显示最近 300 条。</p>' : ''}`;
    $('#lg-pick').addEventListener('change', (e) => { location.hash = e.target.value ? `#log/${e.target.value}` : '#log'; });
  }

  /* ---------- 路由 ---------- */
  const views = { overview, review, condos, log };
  async function route() {
    const parts = (location.hash || '#overview').slice(1).split('/');
    const name = views[parts[0]] ? parts[0] : 'overview';
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + name));
    if (name !== 'overview') clearInterval(state.timer);
    main.innerHTML = '<p class="empty">加载中…</p>';
    try { await loadCore(); await views[name](parts.slice(1).map(decodeURIComponent)); }
    catch (e) { main.innerHTML = `<p class="msg err">${esc(e.message)}</p>`; console.error(e); }
  }
  window.addEventListener('hashchange', route);
  api('/api/me').then((j) => { state.me = j; $('#me').textContent = j.email || '未登录'; renderCfg(); }).catch((e) => { $('#me').textContent = e.message; });
  route();
})();
