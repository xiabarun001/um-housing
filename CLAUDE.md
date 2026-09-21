# UM 租房指南

站点说明、目录结构与本地运行方式见 `README.md`。

## 与主仓的关系

本仓是 evasuka.com 家族站点之一：**UM 租房指南**（`um-housing.evasuka.com`）。域名、托管、部署方式、同族站点一览以主仓 `../evasuka/DOMAINS.md` 为准，那边是唯一真源；本仓只管站点本身的代码与内容。上线 / 下线 / 改域名时，先改主仓的 `DOMAINS.md` + `projects.json`，再在主仓 `CHANGELOG.md` 记一行，然后跑主仓 `scripts/check.ps1` 确认全绿。
