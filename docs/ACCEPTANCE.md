# 验收标准

按 `docs/SPEC.md` 的功能需求编号，用 Given / When / Then 写，做完逐条勾。

## P1 信息分层展示

### FR-1 数据块带层级标记

- [x] Given 任意小区卡片、详情弹窗、地图侧栏条目、排行榜条目，When 页面渲染完成，Then 其中每个数据块（年份户数、设施、交通、行情、判断类评价）旁边都有「档案」「行情」「判断」三者之一的标记，没有裸数字。
- [x] Given 一个「档案」标记，When 查看，Then 显示「档案 · 核实于 YYYY-MM-DD」，日期来自该记录的 `verified_at`。
- [x] Given 一个「行情」标记，When 查看，Then 显示「行情 · 抓取于 YYYY-MM-DD HH:mm」，时间来自 `prices.json` 的 `updated_myt`。
- [x] Given 一个「判断」标记，When 查看，Then 显示「判断」，不带日期。

### FR-2 顶部徽章拆三层

- [x] Given 首屏，When 加载完成，Then 标题下有三个胶囊：档案核实于（绿色实心点）、行情抓取于（琥珀色实心点）、判断（灰色空心点，文字"估算和主观评价"）。
- [x] Given 宽度 375px 的手机，When 查看首屏，Then 三个胶囊可换行，不溢出，不遮挡标题。

### FR-3 说明板块三段

- [x] Given 「说明」板块，When 阅读，Then 有且只有三段：可以直接信的（列出档案字段和来源）、要注意的（列出行情字段和四个误差原因：挂牌价不等于成交价、含单间和错标帖子、平台延迟、抓取失败保留旧值）、我们的判断（列出判断字段和依据）。

### FR-4 行情过期提示

- [ ] （逻辑已实现，尚未在真实过期时观察）Given `prices.json` 的 `updated_myt` 距现在超过 36 小时，When 页面渲染，Then 所有「行情」标记变为「行情 · 已 X 小时未更新」并换成警示色。
- [x] Given 未超过 36 小时，When 页面渲染，Then 显示正常的「抓取于」。

### FR-5 先想清楚里的粗略项

- [x] Given 「先想清楚」的 8 项，When 查看"吃饭购物方便""安静"两项，Then 说明文字末尾带「判断」标记。

### FR-6 标记可追溯

- [x] Given 任一「档案」标记，When 点击，Then 弹出该记录的来源链接列表（来自 `provenance` 或 `sources`）和核实日期。
- [x] Given 任一「行情」标记，When 点击，Then 弹出抓取来源（iProperty、iBilik）和抓取时间，以及"为什么可能有误差"的两句话。

### 数据约定（ADR-001）

- [x] Given `data/condos.json`，When 检查每条记录，Then 有 `judgment` 子对象（含 `daily`、`quiet`），有 `provenance` 对象，有 `verified_at`；顶层不再有 `daily`、`quiet`。
- [x] Given `js/app.js` 和 `js/cards.js`，When 搜索 `c.daily` 或 `c.quiet`，Then 没有直接引用，全部走 `c.judgment`。

## P2 采集与审核、区域 3

（实现前补充）

## P3 读者纠错

（实现前补充）

## P4 UMH Console

（实现前补充）
