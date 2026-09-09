/* 登录页：先探一下后台开通了没有，没开通就直说，别让人点进去看一个报错 */
(async () => {
  const box = document.getElementById('state');
  if (!box) return;
  let status = 0;
  try {
    const r = await fetch('../api/me', { cache: 'no-store', redirect: 'manual' });
    status = r.status;
  } catch {
    status = -1;
  }
  // 503 = 后台还没配置；401/302 = 配好了，只是还没登录；200 = 已经登录
  if (status === 503) {
    box.textContent = '后台还没开通：Cloudflare Access 的团队域名和应用 ID 还没填，现在点进去只会看到一个提示页。设置步骤写在 docs/CONSOLE-SETUP.md。';
    box.hidden = false;
  } else if (status === 200) {
    box.textContent = '你已经登录了，点上面的按钮直接进后台。';
    box.hidden = false;
  }
})();
