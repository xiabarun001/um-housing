# UM 租房指南

马来亚大学（Universiti Malaya）周边 19 个小区的静态信息站：设施、楼龄、户数、地契、到最近 LRT 的步行时间、在租行情快照，加一张所有同学都能填的租房意向表。

- 线上：`um-housing.evasuka.com`（DNS 生效前可用 `https://xiabarun001.github.io/um-housing/`）
- 无构建步骤，纯静态 HTML / CSS / JS，GitHub Pages 直接托管。

## 目录

```
index.html          页面结构
css/style.css       样式（含深色模式）
js/app.js           渲染、筛选、距离带 SVG、意向表读写
js/config.js        Supabase 地址与 publishable key（公开的，只允许匿名读和写入）
data/condos.json    全部小区数据（设施、坐标等固定信息手工维护；价格快照由脚本自动写）
data/refresh-log.json  最近一次自动刷新的结果（每个小区成功与否、抓到多少条）
scripts/refresh.mjs 自动刷新脚本
.github/workflows/refresh.yml  定时任务：每 12 小时跑一次脚本并提交
```

## 更新数据

所有内容都在 `data/condos.json`。每个小区一条记录，字段含义：

| 字段 | 说明 |
|---|---|
| `facilities` / `flags` | 设施清单（展示用）和布尔开关（筛选用）。来源写在 `sources` |
| `transit.walk_min` | 到最近轨道站的步行分钟。`walk_est: true` 表示估算，距离带上画成空心圆 |
| `snapshot` | 抓取当天的在租数量、最低月租、单间和整租行情。`date` 必须跟着改 |
| `links.iproperty_rent` | 该楼盘在 iProperty 的出租列表，卡片主按钮跳这里 |

### 价格自动刷新

`scripts/refresh.mjs` 每 12 小时由 GitHub Actions 运行一次（马来西亚时间 10:00 和 22:00），做两件事：

1. 逐个打开每条记录的 `links.iproperty_rent`，按价格从低到高最多翻 3 页，读出在租总数、整套最低价、各房型最低价，写进 `snapshot.for_rent` / `rent_from` / `whole`；页面里的单间帖子（Master / Middle / Single Room）单独归到 `snapshot.rooms` / `rooms_min`。
2. 翻 iBilik 的 Bangsar South 单间列表，按小区名匹配，补进区域 2 各小区的单间行情。

跑完把 `meta.prices_updated_myt` 改成当次时间（页面顶部的“最近一次更新”就读这个字段），有变化才提交，提交后 Cloudflare Pages 自动重新部署。抓取用 curl 带浏览器 UA，两次请求间隔 3 秒；某个小区抓失败会记在 `data/refresh-log.json` 的 `errors` 里，并保留旧值不覆盖。

手动跑一次：

```bash
node scripts/refresh.mjs
```

只跑某几个小区（调试用）：`node scripts/refresh.mjs kl-gateway novum`，加 `--ibilik` 连 iBilik 一起跑。

或者到 GitHub 仓库的 Actions 页面点 “refresh prices” → Run workflow。

设施、楼龄、户数、坐标这些固定信息不在自动范围内，改完记得把 `meta.verified_at` 改成当天。

## 意向表（Supabase）

- 表 `public.intents`，RLS 只开放 `select` 和 `insert` 给匿名角色，前端拿不到删改权限。
- 每分钟最多 20 条插入（数据库触发器），防刷。
- 删除或修改某一行：登录 Supabase 控制台 → Table Editor → `intents`。
- 换项目：改 `js/config.js` 里的两个值。

## 本地预览

任何静态服务器都行，例如：

```bash
npx serve .
```

## 免责

非官方整理，数据来自 iProperty、StarProperty、开发商官网和租房平台的公开页面，核实日期见页面。租房请核对中介 REN 编号，付款只走银行转账。

