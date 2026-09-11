# UM 租房指南

马来亚大学（Universiti Malaya）周边三个区域 25 个小区的静态信息站：设施、楼龄、户数、地契、到最近 LRT 的步行时间、在租行情快照，加一张所有同学都能填的租房意向表。

- 线上：`um-housing.evasuka.com`（DNS 生效前可用 `https://xiabarun001.github.io/um-housing/`）
- 无构建步骤，纯静态 HTML / CSS / JS，GitHub Pages 直接托管。

## 文档

- [docs/PIPELINE.md](docs/PIPELINE.md)：数据抓取整理系统总览（来源、流程、命令、评估规则、健康检查）
- [docs/SPEC.md](docs/SPEC.md)：2.0 的产品需求（三区覆盖、信息分层、采集审核、管理后台）
- [docs/ADR-001-信息分层.md](docs/ADR-001-信息分层.md)：档案 / 行情 / 判断三层的定义和字段约定
- [docs/ADR-002-采集与审核.md](docs/ADR-002-采集与审核.md)：档案信息的流水线
- [docs/ADR-003-管理后台.md](docs/ADR-003-管理后台.md)：UMH Console 的登录与写入方式（提议中）

## 目录

```
index.html          页面结构
css/style.css       样式（含深色模式）
js/app.js           渲染、筛选、距离带 SVG、意向表读写
js/config.js        Supabase 地址与 publishable key（公开的，只允许匿名读和写入）
data/condos.json    固定信息：设施、楼龄、户数、地契、坐标、链接。人工维护，半个月到一个月复核一次
data/campus.json    校园地点（学院、校门）坐标，来自 OpenStreetMap；"熟悉校园"示意图用它画
data/bus-routes.json PJ 免费巴士 PJ01 / PJ02 和 Rapid KL 780 的走向，来自 OpenStreetMap 线路关系；"三大租房区域"示意图用它画
data/prices.json    实时信息：在租数量、整套最低价、各房型价、单间行情。脚本每 12 小时自动写，按小区 id 对应 condos.json
data/price-history.json  每次成功刷新追加一天（在租数量、最低价、单间起价），只留最近 90 天
data/refresh-log.json  最近一次自动刷新的结果（每个小区成功与否、抓到多少条）
data/staging/       档案采集的暂存区和审核报告（REVIEW.md），人审后才发布
data/changelog.json 档案变更记录：谁、何时、改了什么、来源、理由、对外说明
scripts/refresh.mjs 行情自动刷新脚本
scripts/collect.mjs 固定信息采集脚本（iProperty 项目页 + StarProperty 二源 → staging + 报告）
scripts/publish.mjs 固定信息发布脚本（staging → condos.json + provenance + changelog）
scripts/arbitrate.mjs 两源冲突仲裁脚本（结论和理由写进 provenance）
scripts/status.mjs 数据健康检查（data/status.json）
console/            管理后台 UMH Console（邮箱验证码登录，登录页 login/；开通步骤见 docs/CONSOLE-SETUP.md）
functions/          Pages Functions：/api/me、/api/intents、/api/actions、/api/auth/*（校验登录）
.github/workflows/refresh.yml  每 12 小时刷新行情并提交
.github/workflows/collect.yml  每月 1 日全量采集档案，只提交 staging 和报告
docs/               规格、决策记录、验收标准
```

## 更新数据

数据分两层，靠小区 `id` 关联：

- `data/condos.json` 是固定信息，改得少，人工核实。改完把 `meta.verified_at` 改成当天。
- `data/prices.json` 是实时信息，不要手改，脚本每 12 小时整体重写；新增或删除小区时脚本会按 `id` 自动补齐或清掉对应的价格记录。

`condos.json` 每个小区一条记录，字段含义：

| 字段 | 说明 |
|---|---|
| `facilities` / `flags` | 设施清单（展示用）和布尔开关（筛选用）。来源写在 `sources` |
| `transit.walk_min` | 到最近轨道站的步行分钟。`walk_est: true` 表示估算，距离带上画成空心圆 |
| `links.iproperty_rent` | 该楼盘在 iProperty 的出租列表，卡片主按钮跳这里 |
| `daily` / `quiet` | 吃饭购物方便程度、安静程度，1–5 的粗略判断加一句依据，只用于“先想清楚”板块按权重打分 |

### 信息分三层（ADR-001）

- **固定信息**（`condos.json`）：不会变的事实，人审后发布，每条记录带 `verified_at` 和字段级 `provenance`（来源、时间、方式）。
- **实时信息**（`prices.json`）：挂牌数字，机器每 12 小时写。
- **观点**（`condos.json` 里的 `judgment`）：吃饭购物、安静程度、估算的步行分钟，只用于打分排序。

页面上每个数字旁边有对应标记，点开看来源和时间。

### 档案采集与发布（ADR-002）

```bash
node scripts/collect.mjs kl-gateway novum     # 采集指定小区，和现有数据比对
node scripts/collect.mjs --all                 # 全部小区
node scripts/collect.mjs <iProperty 项目链接> --id=<新id>   # 新小区
node scripts/collect.mjs --report-only         # 不抓取，用已有 staging 重出报告
```

交叉验证（坐标对 OpenStreetMap，步行距离对 OSM 路网步行路线；免费、无密钥）：

```bash
node scripts/crosscheck.mjs --all            # 或指定 id
node scripts/collect.mjs --report-only       # 把结果并进审核报告
```

看 `data/staging/REVIEW.md`，确认后发布（`--accept=walk` 可直接采纳路线算出的步行距离）：

```bash
node scripts/publish.mjs <id> --accept=facilities,flags --who=名字 --reason="核对理由" --note="对外一句话"
node scripts/publish.mjs <id> --accept=all --region=3 --no=26 --alias="别名" --who=名字   # 新小区
```

发布会更新 `verified_at`、`provenance`，并往 `data/changelog.json` 追加记录；读者页只显示日期、小区和对外说明。档案不会自动发布：每月的 collect workflow 只提交 staging 和报告。

### 常用命令（package.json）

`npm run refresh` / `collect` / `crosscheck` / `review` / `publish -- <id> …` / `arbitrate -- <id> <字段> …` / `status` / `monthly`，含义见 [docs/PIPELINE.md](docs/PIPELINE.md)。两个来源不一致的字段用 arbitrate 写结论和理由，页面会显示。

### 价格自动刷新

`scripts/refresh.mjs` 每 12 小时由 GitHub Actions 运行一次（马来西亚时间 08:00 和 20:00），做两件事：

1. 逐个打开每条记录的 `links.iproperty_rent`，按价格从低到高最多翻 3 页，读出在租总数、整套最低价、各房型最低价，写进 `prices.json` 该小区的 `for_rent` / `rent_from` / `whole`；页面里的单间帖子（Master / Middle / Single Room）单独归到 `rooms` / `rooms_min`。
2. 翻 iBilik 的 Bangsar South 单间列表，按小区名匹配，补进区域 2 各小区的单间行情。
3. Mudah 二源：按小区名搜整套（按 buildingName 精确匹配，低于 RM 900 的不算）和单间（按标题匹配），取最低价和条数，和 iProperty 的最低价比对，相差 35% 以内算一致，否则标 gap。结果在 `prices.json` 每个小区的 `check.mudah`，页面行情弹层里显示。加 `--no-mudah` 可跳过。
   注意：PropertyGuru 马来西亚站和 iProperty 是同一集团同一数据库，不能当二源。

跑完把 `prices.json` 的 `updated_myt` 改成当次时间（页面顶部的“最近一次更新”就读这个字段），并往 `price-history.json` 追加当天一行，有变化才提交，提交后 Cloudflare Pages 自动重新部署。抓取用 curl 带浏览器 UA，两次请求间隔 3 秒。iProperty 按 TLS 指纹拦爬虫：本机 Windows 的 curl 能过，GitHub Actions 的 Linux curl 会被 403（模仿 Chrome 的也不行，模仿 iOS Safari 的能过），所以 workflow 先装 curl-impersonate，把 `curl_safari184_ios` 通过环境变量 `CURL_BIN` 交给脚本。哪些网站给不给抓，可以手动跑一下 `probe sources` 这个 workflow 看状态码。某个小区抓失败会记在 `data/refresh-log.json` 的 `errors` 里并保留旧值；失败超过 2 个小区，脚本以非零退出、不改“最近一次更新”时间，workflow 也不会提交。

手动跑一次：

```bash
node scripts/refresh.mjs
```

只跑某几个小区（调试用）：`node scripts/refresh.mjs kl-gateway novum`，加 `--ibilik` 连 iBilik 一起跑。

或者到 GitHub 仓库的 Actions 页面点 “refresh prices” → Run workflow。

如果哪天 GitHub 的机器又被 iProperty 拦了，备用办法是在自己电脑上定时跑 `scripts/refresh-local.ps1`（拉取、刷新、提交、推送一条龙，日志在 `%LOCALAPPDATA%\um-housing\refresh.log`），用 Windows 任务计划程序每天 08:00 和 20:00 各跑一次即可。

设施、楼龄、户数、坐标这些固定信息不在自动范围内，改 `condos.json` 后记得把 `meta.verified_at` 改成当天。

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

## 授权

全部内容（文字、`data/` 数据、样式、代码）以 CC BY-NC-SA 4.0 授权，见 [LICENSE.md](LICENSE.md)：转载须注明来源 um-housing.evasuka.com，禁止商业使用，改编后须以相同方式共享。页脚、`<link rel="license">` 和 meta 标签里都有声明。

## 免责

非官方整理，数据来自 iProperty、StarProperty、开发商官网和租房平台的公开页面，核实日期见页面。租房请核对中介 REN 编号，付款只走银行转账。

