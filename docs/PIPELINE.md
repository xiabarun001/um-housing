# 数据抓取整理系统

目标：持续、可核对地产出三层信息（固定信息 / 实时信息 / 观点），每条数据都能回答"从哪来、什么时候、能不能信"。

## 1. 来源一览

| 来源 | 层 | 角色 | 抓什么 | 怎么抓 | 频率 |
|---|---|---|---|---|---|
| iProperty 项目页 | 固定信息 | 主来源 | 年份、户数、楼层、地契、类型、开发商、地址、坐标、设施 | `collect.mjs`，curl（本机）/ curl-impersonate iOS Safari（GitHub） | 每月 1 日 |
| StarProperty 楼盘页 | 固定信息 | 第二来源（独立于 iProperty） | 旧版页：开发商、竣工、地契、栋数、层数、户数、设施；新版页只有地契 | `collect.mjs`，有 `links.starproperty` 的小区（19/25；其中 7 个是新版页） | 每月 1 日 |
| OpenStreetMap 地理编码 | 固定信息 | 交叉验证 | 小区坐标 | `crosscheck.mjs`（Nominatim） | 每月 1 日 |
| OpenStreetMap 路网 | 固定信息 | 交叉验证 / 采纳 | 到轨道站和 UM 正门的步行距离、分钟 | `crosscheck.mjs`（Valhalla 公共服务） | 每月 1 日 |
| OpenStreetMap 地物 | 固定信息 | 主来源 | 校园边界、LRT / MRT / KTM 站坐标 | 手工一次 | 按需 |
| 开发商官网、实地 | 固定信息 | 仲裁 | 两源冲突时的最终判断 | 人工 | 冲突时 |
| iProperty 在租列表 | 实时信息 | 主来源 | 在租总数、各房型最低价、单间帖子 | `refresh.mjs` | 每 12 小时 |
| iBilik | 实时信息 | 第二来源（区域 2 单间） | 单间价格 | `refresh.mjs` | 每 12 小时 |
| Mudah | 实时信息 | 第二来源（全部） | 整套和单间最低价、条数 | `refresh.mjs`，比对后标一致 / 差异 | 每 12 小时 |
| 读者纠错 | 全部 | 反馈 | 小区、哪一类、哪一项、说明、可选联系方式 | 页面「报错」按钮 → Supabase `reports`（匿名只写不读，10 分钟 30 条限速）；`reports.mjs` 处理，改数据走 `publish.mjs` | 随时；`status.mjs` 显示待处理数 |

已确认不能用的：PropertyGuru（和 iProperty 同库，不是独立来源）；EdgeProp、PropWall、NuProp、PropSocial、Speedhome、Carousell、Instahome（拦截）；FazWaz、Dot Property、Ohmyhome（转载 iProperty 的房源，无独立价值）。

## 2. 流程

```
每 12 小时  refresh.yml  →  refresh.mjs（iProperty → Mudah → iBilik → 比对）→ prices.json / price-history.json → status.mjs → 提交 → 自动部署
每月 1 日   collect.yml  →  collect.mjs --all（iProperty + StarProperty，逐字段比对）
                         →  crosscheck.mjs --all（坐标、步行）
                         →  collect.mjs --report-only（合成 REVIEW.md）→ status.mjs → 只提交 staging 和 status
人审        看 data/staging/REVIEW.md → publish.mjs <id> --accept=… → condos.json + provenance + changelog.json → 提交 → 部署
仲裁        两个来源不一致时 arbitrate.mjs <id> <字段> --verdict=… --note=理由 → provenance.<字段>.second 记下结论和理由（不改值）
```

固定信息永远不自动发布。实时信息自动发布，但失败超过 2 个小区就不改时间戳、不提交。

## 3. 命令

```bash
npm run refresh                 # 实时信息刷新（约 7–9 分钟）
npm run collect                 # 固定信息采集，iProperty + StarProperty（约 4 分钟）
npm run crosscheck              # 坐标、步行交叉验证（约 2.5 分钟）
npm run review                  # 用已有 staging 重出 REVIEW.md
npm run publish -- <id> --accept=units,facilities --who=名字 --reason="…" --note="对外一句话"
npm run status                  # 数据健康汇总，写 data/status.json（含读者报错待处理数）
SUPABASE_SERVICE_KEY=… node scripts/reports.mjs list        # 读者报错：list / show / done / reject / accept / delete
node scripts/arbitrate.mjs <id> <字段> --verdict=agree|conflict|second-only --note="理由" --who=名字   # 两源不一致的人工仲裁
npm run monthly                 # 采集 + 交叉验证 + 报告 + 状态，一条龙
```

新增小区：`node scripts/collect.mjs <iProperty 项目链接> --id=<新id>`，然后 `publish.mjs <id> --accept=all --region=… --no=… --alias=… --who=…`，再补 `links.starproperty`、`links.ibilik`、`judgment`、`transit` 说明。

## 4. 评估规则

| 比对 | 一致的标准 |
|---|---|
| 年份 | 相等；StarProperty 写"estimate"的允许差 1 年 |
| 户数 | 相差 5% 以内 |
| 地契 | L / F 相同 |
| 开发商 | 去掉 Sdn Bhd 等后缀后相等或包含（括号里的母公司也算）；已知的旧名 / 子公司关系写在 `collect.mjs` 的 `DEV_ALIAS`（AMDB = Amcorp 旧名、Amona Metro = MKH 子公司） |
| 层数 | 相差 2 层以内 |
| 泳池 / 健身房 | 两边有无一致 |
| 坐标 | 相差 150 m 内一致，600 m 内接近，再远冲突 |
| 步行 | 路线距离和现有值相差 25% 内一致；超过 1.2 km 记为"走不到" |
| 实时价格（Mudah） | 最低价相差 35% 以内一致，否则标差异 |

结论写在哪：固定信息在 `condos.json` 每条记录的 `provenance.<字段>`（`second` 是第二来源，`check` 是交叉验证）；实时信息在 `prices.json` 的 `check.mudah`。页面上点标记就能看到。

两源不一致的处理：机器只标 `conflict`，不改值。人看过后用 `arbitrate.mjs` 写结论（`agree` = 其实一致，比如按栋计数；`conflict` = 确实不一致，写明以哪边为准和原因），页面弹层会把理由显示出来，`status.mjs` 不再为已仲裁的字段告警。下次月度采集如果机器结论和来源值都没变，仲裁保留；变了就回到机器结论，重新等人看。

已知的来源坑：StarProperty 新版楼盘页用 HTTP 404 返回完整页面（软 404），`collect.mjs` 页面够大就照样解析；PJ8 的 StarProperty 页把层数 38 误填进户数栏。

## 5. 健康检查与告警

`status.mjs` 输出 `data/status.json`，包含：实时信息距上次更新的小时数、有价格的小区数、Mudah 比对计数；固定信息最旧多少天、上次采集日期、待审核差异；交叉验证计数；第二来源一致 / 冲突待复核 / 冲突已复核计数；`alerts` 列表。告警条件：实时信息超过 36 小时未更新；固定信息超过 45 天未复核；采集失败；坐标冲突；第二来源冲突。

GitHub Actions 失败会给仓库所有者发邮件。看到告警的处理顺序：先跑 `npm run status` 看具体项，再按第 2 节的人审流程处理。

## 6. 加一个新来源要做什么

1. 在 `probe.yml` 或本机 curl 确认能抓、页面有结构化数据。
2. 在 `collect.mjs`（固定信息）或 `refresh.mjs`（实时信息）加解析函数和比对规则，结论写进 `provenance` 或 `check`。
3. 在 `docs/ADR-002` 和本文第 1 节登记来源和角色。
4. 页面标记弹层里加一行显示。
