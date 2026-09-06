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
data/condos.json    全部小区数据，唯一需要维护的文件
```

## 更新数据

所有内容都在 `data/condos.json`。每个小区一条记录，字段含义：

| 字段 | 说明 |
|---|---|
| `facilities` / `flags` | 设施清单（展示用）和布尔开关（筛选用）。来源写在 `sources` |
| `transit.walk_min` | 到最近轨道站的步行分钟。`walk_est: true` 表示估算，距离带上画成空心圆 |
| `snapshot` | 抓取当天的在租数量、最低月租、单间和整租行情。`date` 必须跟着改 |
| `links.iproperty_rent` | 该楼盘在 iProperty 的出租列表，卡片主按钮跳这里 |

刷新一次快照的做法：打开每条记录的 `links.iproperty_rent`，抄下“N Houses for Rent”和最低价；单间价格看 iBilik 对应区域页。改完把 `meta.verified_at` 和每条的 `snapshot.date` 改成当天，`git push` 即可。

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

