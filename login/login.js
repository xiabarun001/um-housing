/* 维护后台的登录：填邮箱 → 收 6 位验证码 → 换 token。
   token 由服务端写进 HttpOnly cookie，这个脚本从头到尾拿不到，也不往本地存东西。 */
(() => {
  const $ = (s) => document.querySelector(s);
  const form = $('#form'), email = $('#email'), code = $('#code'), step2 = $('#step2');
  const go = $('#go'), again = $('#again'), resend = $('#resend'), back = $('#back'), state = $('#state');
  let sent = false, busy = false, timer = null;

  const say = (text, cls) => { state.hidden = !text; state.textContent = text || ''; state.className = 'login-state' + (cls ? ' ' + cls : ''); };
  const lock = (on, label) => { busy = on; go.disabled = on; go.textContent = label || (sent ? '登录' : '发验证码'); };

  async function post(path, body) {
    const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = null;
    try { j = await r.json(); } catch { /* 不是 json */ }
    if (!r.ok) throw new Error((j && j.error) || (r.status === 404 ? '本地预览没有后台接口，得部署上去才能登录' : 'HTTP ' + r.status));
    return j;
  }

  // 已经登录过就别再填一遍，直接进后台
  fetch('/api/me', { credentials: 'same-origin' }).then((r) => { if (r.ok) location.replace('../console/'); }).catch(() => { /* 离线或本地预览 */ });

  function countdown(sec) {
    clearInterval(timer);
    resend.disabled = true;
    const tick = () => {
      resend.textContent = sec > 0 ? `重新发一封（${sec}）` : '重新发一封';
      if (sec <= 0) { clearInterval(timer); resend.disabled = false; }
      sec -= 1;
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  async function send() {
    lock(true, '发送中…');
    try {
      await post('/api/auth/start', { email: email.value.trim() });
      sent = true;
      step2.hidden = false; again.hidden = false;
      email.readOnly = true;
      say('验证码发到 ' + email.value.trim() + ' 了，一两分钟内到，记得看垃圾箱。', 'ok');
      countdown(60);
      code.focus();
    } catch (e) { say(e.message, 'err'); }
    lock(false);
  }

  async function login() {
    lock(true, '登录中…');
    try {
      await post('/api/auth/verify', { email: email.value.trim(), code: code.value.trim() });
      say('进去了，正在跳转…', 'ok');
      location.replace('../console/');
      return;
    } catch (e) { say(e.message, 'err'); }
    lock(false);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    if (!sent) send(); else login();
  });
  resend.addEventListener('click', () => { if (!busy && !resend.disabled) send(); });
  back.addEventListener('click', () => {
    clearInterval(timer);
    sent = false; email.readOnly = false; code.value = '';
    step2.hidden = true; again.hidden = true;
    say('');
    lock(false);
    email.focus();
  });
  email.focus();
})();
