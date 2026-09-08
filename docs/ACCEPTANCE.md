# 验收标准

按 `docs/SPEC.md` 的功能需求编号，用 Given / When / Then 写，做完逐条勾。

## P1 信息分层展示

### FR-1 数据块带层级标记

- [x] Given 任意小区卡片、详情弹窗、地图侧栏条目、排行榜条目，When 页面渲染完成，Then 其中每个数据块（年份户数、设施、交通、行情、判断类评价）旁边都有「固定信息」「实时信息」「观点」三者之一的标记，没有裸数字。
- [x] Given 一个「固定信息」标记，When 查看，Then 显示「固定信息 · 核实于 YYYY-MM-DD」，日期来自该记录的 `verified_at`。
- [x] Given 一个「实时信息」标记，When 查看，Then 显示「实时信息 · 抓取于 YYYY-MM-DD HH:mm」，时间来自 `prices.json` 的 `updated_myt`。
- [x] Given 一个「观点」标记，When 查看，Then 显示「观点」，不带日期。

### FR-2 顶部徽章拆三层

- [x] Given 首屏，When 加载完成，Then 标题下有三个胶囊：档案核实于（绿色实心点）、行情抓取于（琥珀色实心点）、判断（灰色空心点，文字"估算和主观评价"）。
- [x] Given 宽度 375px 的手机，When 查看首屏，Then 三个胶囊可换行，不溢出，不遮挡标题。

### FR-3 说明板块三段

- [x] Given 「说明」板块，When 阅读，Then 有且只有三段：可以直接信的（列出档案字段和来源）、要注意的（列出行情字段和四个误差原因：挂牌价不等于成交价、含单间和错标帖子、平台延迟、抓取失败保留旧值）、我们的判断（列出判断字段和依据）。

### FR-4 行情过期提示

- [ ] （逻辑已实现，尚未在真实过期时观察）Given `prices.json` 的 `updated_myt` 距现在超过 36 小时，When 页面渲染，Then 所有「实时信息」标记变为「实时信息 · 已 X 小时未更新」并换成警示色。
- [x] Given 未超过 36 小时，When 页面渲染，Then 显示正常的「抓取于」。

### FR-5 先想清楚里的粗略项

- [x] Given 「先想清楚」的 8 项，When 查看"吃饭购物方便""安静"两项，Then 说明文字末尾带「观点」标记。

### FR-6 标记可追溯

- [x] Given 任一「固定信息」标记，When 点击，Then 弹出该记录的来源链接列表（来自 `provenance` 或 `sources`）和核实日期。
- [x] Given 任一「实时信息」标记，When 点击，Then 弹出抓取来源（iProperty、iBilik）和抓取时间，以及"为什么可能有误差"的两句话。

### 数据约定（ADR-001）

- [x] Given `data/condos.json`，When 检查每条记录，Then 有 `judgment` 子对象（含 `daily`、`quiet`），有 `provenance` 对象，有 `verified_at`；顶层不再有 `daily`、`quiet`。
- [x] Given `js/app.js` 和 `js/cards.js`，When 搜索 `c.daily` 或 `c.quiet`，Then 没有直接引用，全部走 `c.judgment`。

## P2 采集与审核、区域 3

### FR-7 采集脚本

- [x] Given 一个现有小区 id，When 运行 `node scripts/collect.mjs <id>`，Then 生成 `data/staging/<id>.json`，含来源链接、抓取时间、采集到的字段和与现有记录的逐字段比对。
- [x] Given 一个 iProperty 项目链接和 `--id=`，When 运行采集，Then 生成新小区的 staging，标 `is_new`。
- [x] Given iProperty 返回 403 或页面改版，When 运行采集，Then staging 状态为 `fetch_failed` / `parse_failed`，现有数据不变。

### FR-8 二源比对

- [x] Given 一个小区，When 运行 `node scripts/crosscheck.mjs <id>`，Then 坐标和 OpenStreetMap 地理编码比对（一致 / 接近 / 冲突 / 单源），步行距离和 OSM 路网步行路线比对（一致 / 冲突），结果写进 staging 的 `crosscheck`，`--report-only` 后出现在 REVIEW.md。
- [x] Given 交叉验证有冲突或原值是估算，When 运行 `publish.mjs <id> --accept=walk`，Then 采纳路线值（超过 1.2 km 记为"无步行可达"并在说明里写路线距离），provenance 记 `method: route`，页面档案弹层显示核对结果。
- [x] Given 2026-09-08 对 25 个小区跑完，Then 坐标 22 个一致或接近、3 个 OSM 无记录；步行 12 个采纳路线值，3 个实测值保留，Laurel 因帖子与路网不符保留为估算并注明。
- [ ] （搁置：2026-09-08 核实 PropertyGuru 与 iProperty 同库，不能当二源；PropWall、NuProp、EdgeProp、StarProperty 均被拦，档案的独立二源暂只有开发商官网，需人工）Given 独立第二来源，When 比对年份、户数、地契、开发商、设施，Then 每个字段标「一致」「单源」「冲突」。
- [x] Given 每次行情刷新，When 跑完 iProperty 和 iBilik，Then 再搜 Mudah 的整套和单间，最低价相差 35% 以内标 agree、否则标 gap，写进 `prices.json` 的 `check.mudah`；页面行情弹层显示"另一来源 Mudah"和差异提示。

### FR-9 审核报告

- [x] Given staging 目录，When 采集完成或运行 `--report-only`，Then `data/staging/REVIEW.md` 列出每个小区的现有值、采集值、状态和建议动作。
- [x] Given 19 个现有小区，When 用 iProperty 项目页复核，Then 建成年份、户数、地契、开发商、坐标全部一致（2026-09-08 报告）。

### FR-10 发布与留痕

- [x] Given 审核过的 staging，When 运行 `node scripts/publish.mjs <id> --accept=... --who=...`，Then 只写入接受的字段，更新 `provenance` 和 `verified_at`，并往 `data/changelog.json` 追加带 who / at / field / from / to / source / reason / public_note 的记录。
- [x] Given 新小区，When 发布时给 `--region` `--no` `--alias`，Then 创建完整记录并排到编号位置。

### FR-10b 对外版变更记录

- [x] Given 读者页「说明」板块，When 加载，Then 显示最近的变更（日期、小区、更新了什么），不显示人名。

### FR-11 每月自动采集

- [x] Given `.github/workflows/collect.yml`，When 每月 1 日或手动触发，Then 只提交 staging 和报告，不改 `condos.json`。
- [ ] （待第一次定时运行观察）Given GitHub 机器抓 iProperty，When 用 iOS Safari 指纹，Then 25 个小区全部成功。

### FR-14 到 FR-16 区域 3

- [x] Given 区域 3，When 查看数据，Then 有 6 个小区（编号 20–25）：Avara Seputeh、Tria Seputeh、Vivo、Southbank、Avantas、Millerz Square，档案字段来自 iProperty 项目页并带 provenance。
- [x] Given 区域 3 的小区，When 查看交通，Then 写明最近的 KTM 站和估算分钟数（标「观点」），以及去 UM 靠 Grab 的车程估算。
- [x] Given 地图、侧栏、筛选、排行榜、先想清楚、出图页，When 加载，Then 都包含区域 3，用紫色区分，KTM 站用青色圆点。

## P3 读者纠错

（实现前补充）

## P4 UMH Console

（实现前补充）
