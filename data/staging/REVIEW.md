# 档案采集审核报告

生成于 2026-09-08T11:53:07.678Z（马来西亚日期 2026-09-08）。只看「有差异」和「新小区」的行；确认后用 `node scripts/publish.mjs <id> --accept 字段,字段 --who 名字 --reason 理由` 发布。

## atwater

来源：https://www.iproperty.com.my/condo/atwater-service-residences-9936（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Atwater Service Residences | Atwater : Service Residences | 单源（iProperty） | changed |
| completed | 2024 | 2024 | 单源（iProperty） | same |
| units | 493 | 493 | 单源（iProperty） | same |
| floors | 26 层 | 26 层 × 2 栋 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Paramount Property | Paramount Property. | 单源（iProperty） | same |
| address | Jalan Professor Diraja Ungku Aziz, Seksyen 13, 46200 Petaling Jaya | Jalan Professor Diraja Ungku Aziz, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.117946、101.632404 | 3.117946、101.632404 | 单源（iProperty） | same，相差 0 m |
| 设施 | 16 项 | 5 项 | 单源（iProperty） | changed，新增：有顶停车场、Covered Linkways、Landscaped Garden、停车场，缺少：泳道池、无边池 / 家庭池、儿童池、按摩池、健身房、户外健身区、羽毛球场、篮球场、蒸汽房、烧烤台、儿童游乐场、足底按摩步道、瑜伽亭、迷宫花园、有顶连廊 |
| 设施开关 | | | 单源（iProperty） | changed：pool、gym、steam、jacuzzi、badminton、basketball、bbq |

交叉验证（2026-09-08 11:50 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 31 m
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Asia Jaya LRT（KJ21） 2580 m / 34 分钟；Phileo Damansara MRT（KG12） 2505 m / 32 分钟；到 Universiti 站 4328 m / 56 分钟

建议：核对 name、facilities、flags 后决定接受哪些。

## avantas

来源：https://www.iproperty.com.my/condo/avantas-residences-6254（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Avantas Residences | Avantas Residences | 单源（iProperty） | same |
| completed | 2016 | 2016 | 单源（iProperty） | same |
| units | 198 | 198 | 单源（iProperty） | same |
| floors | 28 层 | 28 层 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | CPI Development | CPI Development | 单源（iProperty） | same |
| address | Old Klang Road, 58100, Kuala Lumpur | Old Klang Road, 58100, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.100352、101.67686 | 3.100352、101.67686 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 12 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:48 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 33 m
- 步行 vs OSM 路网：**conflict**；现有 Pantai Dalam KTM（KD03） 921 m / 12 分钟（估）；路线：Pantai Dalam KTM（KD03） 1442 m / 18 分钟；Seputeh KTM（KB02） 2075 m / 26 分钟；到 Universiti 站 3673 m / 47 分钟

建议：无需动作，发布可只更新核实日期；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## avara

来源：https://www.iproperty.com.my/condo/avara-10395（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Avara Seputeh | Avara | 单源（iProperty） | changed |
| completed | 2020 | 2020 | 单源（iProperty） | same |
| units | 183 | 183 | 单源（iProperty） | same |
| floors | 35 层 × 2 栋 | 35 层 × 2 栋 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Unity Realty Sdn. Bhd. | Unity Realty Sdn. Bhd. | 单源（iProperty） | same |
| address | Jalan Seputeh, 58000, Kuala Lumpur | Jalan Seputeh, 58000, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.11349、101.679127 | 3.11349、101.679127 | 单源（iProperty） | same，相差 0 m |
| 设施 | 15 项 | 15 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:48 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 51 m
- 步行 vs OSM 路网：**conflict**；现有 Seputeh KTM（KB02） 256 m / 3 分钟（估）；路线：Seputeh KTM（KB02） 422 m / 5 分钟；Mid Valley KTM（KB01） 726 m / 9 分钟；到 Universiti 站 2124 m / 31 分钟

建议：核对 name 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## centrestage

来源：https://www.iproperty.com.my/condo/centrestage-designer-suite-5546（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Centrestage Designer Suite | Centrestage Designer Suite | 单源（iProperty） | same |
| completed | 2014 | 2014 | 单源（iProperty） | same |
| units | 352 | — | 单源（iProperty） | missing |
| floors | 14 层（C 座） | N/A 层 × 2 栋 | 单源（iProperty） | changed |
| tenure | Leasehold 租赁地契（商业分层地契） | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式套房（SOHO） | 服务式公寓 | 单源（iProperty） | changed |
| developer | Cherish Springs | Cherish Springs Sdn Bhd | 单源（iProperty） | same |
| address | Jalan 13/1, Seksyen 13, 46200 Petaling Jaya | Jalan 13/1, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.111933、101.638931 | 3.111933、101.638931 | 单源（iProperty） | same，相差 0 m |
| 设施 | 13 项 | 4 项 | 单源（iProperty） | changed，缺少：壁球场、网球场、慢跑道、桑拿、烧烤区、儿童游乐场、会所、便利店、四层门禁 |
| 设施开关 | | | 单源（iProperty） | changed：sauna、squash、tennis、bbq、minimart |

交叉验证（2026-09-08 11:50 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 14 m
- 步行 vs OSM 路网：**agree**；现有 Asia Jaya LRT（KJ21） 1050 m / 13 分钟；路线：Asia Jaya LRT（KJ21） 1261 m / 17 分钟；Taman Jaya LRT（KJ20） 2110 m / 26 分钟；到 Universiti 站 3607 m / 47 分钟

建议：核对 floors、type、facilities、flags 后决定接受哪些。

## dvogue

来源：https://www.iproperty.com.my/condo/avenue-d-vogue-5543（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Avenue D'Vogue | Avenue D'Vogue | 单源（iProperty） | same |
| completed | 2016 | 2016 | 单源（iProperty） | same |
| units | 360 | 360 | 单源（iProperty） | same |
| floors | 单栋 | 10 层 | 单源（iProperty） | changed |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Inspiration Group Malaysia | Inspiration Group Malaysia | 单源（iProperty） | same |
| address | Jalan 13/2（Jalan Kemajuan 旁），Seksyen 13, 46200 Petaling Jaya | Jalan 13/2, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.114112、101.6395 | 3.114112、101.6395 | 单源（iProperty） | same，相差 0 m |
| 设施 | 10 项 | 9 项 | 单源（iProperty） | changed，新增：会所，缺少：会所（Best Western 管理）、三层门禁 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:51 UTC）：

- 坐标 vs OpenStreetMap：**single**（not found）
- 步行 vs OSM 路网：**agree**；现有 Asia Jaya LRT（KJ21） — m / 16 分钟（估）；路线：Asia Jaya LRT（KJ21） 1567 m / 20 分钟；Taman Jaya LRT（KJ20） 2244 m / 28 分钟；到 Universiti 站 3835 m / 49 分钟

建议：核对 floors、facilities 后决定接受哪些。

## inwood

来源：https://www.iproperty.com.my/condo/inwood-residences-6806（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Inwood Residences @ Pantai Sentral Park | Inwood Residences | 单源（iProperty） | changed |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 211 | 211 | 单源（iProperty） | same |
| floors | 38 层 | 38 层 × 2 栋 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | IJM Land | IJM Land Berhad | 单源（iProperty） | same |
| address | Pantai Sentral Park, off Jalan Pantai Murni, 59200 KL | Pantai Sentral Park Off Jalan Pantai Murni , 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.101582、101.663706 | 3.101582、101.663706 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 12 项 | 单源（iProperty） | changed，新增：Landscaped Garden、泳池，缺少：无边泳池、园林 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 28 m
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Pantai Dalam KTM（KD03） 1771 m / 24 分钟；Universiti LRT（KJ19） 2712 m / 37 分钟；到 Universiti 站 2712 m / 37 分钟

建议：核对 name、facilities 后决定接受哪些。

## kl-gateway

来源：https://www.iproperty.com.my/condo/kl-gateway-residences-8093（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | KL Gateway Residences | KL Gateway Residences | 单源（iProperty） | same |
| completed | 2017 | 2017 | 单源（iProperty） | same |
| units | 714 | 714 | 单源（iProperty） | same |
| floors | 38 层 × 2 栋 | 38 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Suez Capital | Suez Capital Sdn Bhd | 单源（iProperty） | same |
| address | Jalan Kerinchi Kiri, Bangsar South, 59200 KL | Jalan Kerinchi Kiri, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.1136467、101.66288 | 3.113646、101.66288 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 12 项 | 单源（iProperty） | changed，新增：围栏、泳池，缺少：无边泳池、泳道池 |
| 设施开关 | | | 单源（iProperty） | changed：minimart |

交叉验证（2026-09-08 11:46 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 48 m
- 步行 vs OSM 路网：**agree**；现有 Universiti LRT（KJ19） 240 m / 2 分钟；路线：Universiti LRT（KJ19） 280 m / 3 分钟；Kerinchi LRT（KJ18） 1049 m / 13 分钟；到 Universiti 站 280 m / 3 分钟
- 注：KL Gateway 一带有天桥，OSM 路网可能没画进去，路线距离可能偏长

建议：核对 facilities、flags 后决定接受哪些。

## laurel

来源：https://www.iproperty.com.my/condo/laurel-residence-17871（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Laurel Residence | Laurel Residence | 单源（iProperty） | same |
| completed | 2025 | 2025 | 单源（iProperty） | same |
| units | — | — | 单源（iProperty） | none |
| floors | 42 层 | 42 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | UOA Development | UOA Development Berhad | 单源（iProperty） | same |
| address | Jalan Pantai Permai, Bangsar South, 59200 KL | Jalan Pantai Permai, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.108608、101.666382 | 3.108608、101.666382 | 单源（iProperty） | same，相差 0 m |
| 设施 | 11 项 | 11 项 | 单源（iProperty） | changed，新增：Community Garden、停车场，缺少：健身房、社区花园 |
| 设施开关 | | | 单源（iProperty） | changed：gym |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 103 m
- 步行 vs OSM 路网：**conflict**；现有 Universiti LRT（KJ19） — m / 8 分钟（估）；路线：Kerinchi LRT（KJ18） 1381 m / 17 分钟；Universiti LRT（KJ19） 1582 m / 20 分钟；到 Universiti 站 1582 m / 20 分钟
- 注：KL Gateway 一带有天桥，OSM 路网可能没画进去，路线距离可能偏长

建议：核对 facilities、flags 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## millerz

来源：https://www.iproperty.com.my/condo/millerz-square-serviced-residence-9658（2026-09-08 11:24 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Millerz Square | Millerz Square Serviced Residence | 单源（iProperty） | changed |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 339 | 339 | 单源（iProperty） | same |
| floors | 43 / 44 层 × 4 栋 | 43 / 44 层 × 4 栋 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | EXSIM Development Sdn Bhd | EXSIM Development Sdn Bhd | 单源（iProperty） | same |
| address | Jalan Klang Lama, 58000, Kuala Lumpur | Jalan Klang Lama, 58000, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.087312、101.673231 | 3.087312、101.673231 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 12 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:51 UTC）：

- 坐标 vs OpenStreetMap：**near**，相差 292 m
- 步行 vs OSM 路网：**conflict**；现有 Pantai Dalam KTM（KD03） 990 m / 13 分钟（估）；路线：Pantai Dalam KTM（KD03） 2148 m / 26 分钟；Petaling KTM（KD04） 1968 m / 24 分钟；到 Universiti 站 4849 m / 61 分钟

建议：核对 name 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## novum

来源：https://www.iproperty.com.my/condo/novum-7847（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Novum @ Bangsar South | NOVUM | 单源（iProperty） | changed |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 729 | — | 单源（iProperty） | missing |
| floors | 32–41 层 × 3 栋 | 41 / 32 / 38 层 × 3 栋 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Eupe Corporation | Eupe Corporation Berhad | 单源（iProperty） | same |
| address | Jalan Kerinchi, Bangsar South, 59200 KL | Jalan Kerinchi, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.113971、101.666418 | 3.113971、101.666418 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 11 项 | 单源（iProperty） | changed，新增：健身房、围栏、泳池，缺少：50 米泳道池、健身房（悬浮式）、户外健身区、商务中心 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 27 m
- 步行 vs OSM 路网：**conflict**；现有 Kerinchi LRT（KJ18） — m / 4 分钟（估）；路线：Kerinchi LRT（KJ18） 687 m / 9 分钟；Universiti LRT（KJ19） 848 m / 11 分钟；到 Universiti 站 848 m / 11 分钟
- 注：KL Gateway 一带有天桥，OSM 路网可能没画进去，路线距离可能偏长

建议：核对 name、facilities 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## pacific-63

来源：https://www.iproperty.com.my/condo/pacific-63-8858（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Pacific 63 | Pacific 63 | 单源（iProperty） | same |
| completed | 2014 | 2014 | 单源（iProperty） | same |
| units | 260 | 260 | 单源（iProperty） | same |
| floors | 21 层单栋 | 21 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | SOHO 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Island Circle Development | Island Circle Development (M) Sdn. Bhd. | 单源（iProperty） | same |
| address | Jalan 13/6, Seksyen 13, 46200 Petaling Jaya | Jalan 13/6, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.116098、101.634939 | 3.116098、101.634939 | 单源（iProperty） | same，相差 0 m |
| 设施 | 9 项 | 5 项 | 单源（iProperty） | changed，缺少：儿童池、按摩池、蒸汽房、门禁与对讲 |
| 设施开关 | | | 单源（iProperty） | changed：steam、jacuzzi |

交叉验证（2026-09-08 11:50 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 25 m
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Asia Jaya LRT（KJ21） 2139 m / 28 分钟；Phileo Damansara MRT（KG12） 2360 m / 30 分钟；到 Universiti 站 4132 m / 53 分钟

建议：核对 facilities、flags 后决定接受哪些。

## pacific-star

来源：https://www.iproperty.com.my/condo/pacific-star-service-residence-8261（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Pacific Star Service Residence | Pacific Star (Service Residence) | 单源（iProperty） | changed |
| completed | 2016 | 2016 | 单源（iProperty） | same |
| units | 657 | 657 | 单源（iProperty） | same |
| floors | 24–33 层 × 3 栋 | 33 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Island Circle Development | Island Circle Development (M) Sdn. Bhd. | 单源（iProperty） | same |
| address | Jalan 13/6, Seksyen 13, 46200 Petaling Jaya | Jalan 13/6, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.1174481、101.636993 | 3.117448、101.636993 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 11 项 | 单源（iProperty） | changed，新增：咖啡座、围栏、Retail stores，缺少：便利店、餐厅、商务中心、三层门禁 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:50 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 126 m
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Asia Jaya LRT（KJ21） 2389 m / 31 分钟；Phileo Damansara MRT（KG12） 2075 m / 27 分钟；到 Universiti 站 3854 m / 50 分钟

建议：核对 name、facilities 后决定接受哪些。

## pantai-panorama

来源：https://www.iproperty.com.my/condo/pantai-panorama-condominiums-105（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Pantai Panorama Condominiums | Pantai Panorama Condominiums | 单源（iProperty） | same |
| completed | 1996 | 1996 | 单源（iProperty） | same |
| units | 708 | 708 | 单源（iProperty） | same |
| floors | 18 层 × 5 栋 | 18 层 × 5 栋 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | Amcorp Properties | Amcorp Properties Berhad | 单源（iProperty） | same |
| address | Jalan 112H, Kampung Kerinchi, 59200 KL | Jalan 112h, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.109804、101.662215 | 3.109804、101.662215 | 单源（iProperty） | same，相差 0 m |
| 设施 | 14 项 | 14 项 | 单源（iProperty） | changed，新增：Badminton hall、Laundry、Retail stores、Tennis courts，缺少：羽毛球馆、网球场、洗衣店、便利店 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 57 m
- 步行 vs OSM 路网：**conflict**；现有 Universiti LRT（KJ19） 600 m / 7 分钟；路线：Universiti LRT（KJ19） 1034 m / 13 分钟；Kerinchi LRT（KJ18） 1507 m / 19 分钟；到 Universiti 站 1034 m / 13 分钟
- 注：KL Gateway 一带有天桥，OSM 路网可能没画进去，路线距离可能偏长

建议：核对 facilities 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## pj-midtown

来源：https://www.iproperty.com.my/condo/pj-midtown-6911（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | PJ Midtown | PJ Midtown | 单源（iProperty） | same |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 758 | 758 | 单源（iProperty） | same |
| floors | 29–30 层 × 2 栋 | 30 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契（商业地契，水电按商业费率） | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | IOI Properties + Sime Darby Brunsfield | IOI Properties and Sime Darby Brunsfield | 单源（iProperty） | same |
| address | Jalan Kemajuan, Seksyen 13, 46200 Petaling Jaya | 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.11381、101.640488 | 3.11381、101.640488 | 单源（iProperty） | same，相差 0 m |
| 设施 | 15 项 | 12 项 | 单源（iProperty） | changed，新增：有顶停车场、跑道、儿童游乐场、Surau - Male & Female、泳池、Tennis courts，缺少：无边泳池、网球场、慢跑道、日光平台、会议室、图书室、小型影院、幼儿园、祈祷室 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:50 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 24 m
- 步行 vs OSM 路网：**conflict**；现有 Taman Jaya LRT（KJ20） 1000 m / 13 分钟（估）；路线：Asia Jaya LRT（KJ21） 1534 m / 19 分钟；Taman Jaya LRT（KJ20） 2211 m / 27 分钟；到 Universiti 站 3783 m / 49 分钟

建议：核对 facilities 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## pj8

来源：https://www.iproperty.com.my/condo/serviced-residence-pj8-1310（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Serviced Residence @ PJ8 | Serviced Residence @ PJ8 | 单源（iProperty） | same |
| completed | 2008 | 2008 | 单源（iProperty） | same |
| units | 380 | 380 | 单源（iProperty） | same |
| floors | 39 层 | 39 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | IJM Land | IJM Land Berhad | 单源（iProperty） | same |
| address | Jalan Barat, Seksyen 8, 46050 Petaling Jaya | Jalan Barat, 46050, Selangor | 单源（iProperty） | same |
| 坐标 | 3.101428、101.63982 | 3.101428、101.63982 | 单源（iProperty） | same，相差 0 m |
| 设施 | 10 项 | 10 项 | 单源（iProperty） | changed，新增：Landscaped Garden、Laundry，缺少：洗衣房、园林 |
| 设施开关 | | | 单源（iProperty） | changed：jacuzzi |

交叉验证（2026-09-08 11:50 UTC）：

- 坐标 vs OpenStreetMap：**single**（not found）
- 步行 vs OSM 路网：**conflict**；现有 Asia Jaya LRT（KJ21） — m / 5 分钟（估）；路线：Asia Jaya LRT（KJ21） 763 m / 9 分钟；Taman Jaya LRT（KJ20） 1252 m / 16 分钟；到 Universiti 站 3480 m / 48 分钟

建议：核对 facilities、flags 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## ryan-miho

来源：https://www.iproperty.com.my/condo/ryan-miho-9302（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Ryan & Miho | RYAN & MIHO | 单源（iProperty） | same |
| completed | 2021 | 2021 | 单源（iProperty） | same |
| units | 542 | 542 | 单源（iProperty） | same |
| floors | 30 层 × 2 栋 | 30 层 × 2 栋 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | OSK Property | OSK Property Holdings Berhad | 单源（iProperty） | same |
| address | Jalan Professor Diraja Ungku Aziz, Seksyen 13, 46200 Petaling Jaya | 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.118397、101.633049 | 3.118397、101.633049 | 单源（iProperty） | same，相差 0 m |
| 设施 | 16 项 | 17 项 | 单源（iProperty） | changed，新增：Badminton hall、Bus Stop、有顶停车场、Covered Linkways、Multi-Storey Car Park、停车场，缺少：健身房（室内加室外）、羽毛球馆、有顶连廊、门口公交站、多层停车楼 |
| 设施开关 | | | 单源（iProperty） | changed：gym、minimart |

交叉验证（2026-09-08 11:50 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 78 m
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Phileo Damansara MRT（KG12） 2343 m / 31 分钟；Asia Jaya LRT（KJ21） 2580 m / 34 分钟；到 Universiti 站 4172 m / 54 分钟

建议：核对 facilities、flags 后决定接受哪些。

## saville

来源：https://www.iproperty.com.my/condo/saville-the-park-4685（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Saville @ The Park | Saville @ The Park | 单源（iProperty） | same |
| completed | 2015 | 2015 | 单源（iProperty） | same |
| units | 408 | 408 | 单源（iProperty） | same |
| floors | 27 层 × 2 栋 | 27 层 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | MKH（Amona Metro） | MKH Berhad | 单源（iProperty） | same |
| address | Jalan Pantai Murni 8, Bukit Kerinchi, 59200 KL | Jalan Pantai Murni 8, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.102912、101.661941 | 3.102912、101.661941 | 单源（iProperty） | same，相差 0 m |
| 设施 | 13 项 | 12 项 | 单源（iProperty） | changed，新增：Surau - Male & Female、泳池，缺少：无边泳池、游戏室、祈祷室 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 5 m
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Pantai Dalam KTM（KD03） 1973 m / 27 分钟；Universiti LRT（KJ19） 2774 m / 37 分钟；到 Universiti 站 2774 m / 37 分钟

建议：核对 facilities 后决定接受哪些。

## secoya

来源：https://www.iproperty.com.my/condo/secoya-residence-7619（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Secoya Residences @ Pantai Sentral Park | Secoya Residence | 单源（iProperty） | changed |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 243 | 243 | 单源（iProperty） | same |
| floors | 41 层 | 41 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | IJM Land | IJM Land Berhad | 单源（iProperty） | same |
| address | No. 2A Pantai Sentral Park, off Jalan Pantai Murni, 59200 KL | 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.101723、101.66466 | 3.101723、101.66466 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 13 项 | 单源（iProperty） | changed，新增：Landscaped Garden、围栏、泳池，缺少：无边泳池、园林 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 2 m
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Pantai Dalam KTM（KD03） 1755 m / 23 分钟；Universiti LRT（KJ19） 2683 m / 36 分钟；到 Universiti 站 2683 m / 36 分钟

建议：核对 name、facilities 后决定接受哪些。

## seventeen

来源：https://www.iproperty.com.my/condo/seventeen-mall-residences-biji-living-21634（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Seventeen Mall & Residences（Biji Living） | Seventeen Mall & Residences (Biji Living) | 单源（iProperty） | changed |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 425 | 425 | 单源（iProperty） | same |
| floors | 27 层 × 2 栋 | 27 层 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Conlay Construction（Kampung Manis Realty） | Conlay Construction Sdn Bhd | 单源（iProperty） | same |
| address | Jalan 17/29, Seksyen 17, 46400 Petaling Jaya | Jalan 17/29, 46400, Selangor | 单源（iProperty） | same |
| 坐标 | 3.12888、101.634909 | 3.12888024、101.6349092 | 单源（iProperty） | same，相差 0 m |
| 设施 | 11 项 | 4 项 | 单源（iProperty） | changed，新增：多功能厅、停车场、泳池，缺少：33 米泳道池、儿童池、健身房、慢跑道、宴会厅、园林、香草园、楼下商场、三层门禁、24 小时保安 |
| 设施开关 | | | 单源（iProperty） | changed：gym、minimart |

交叉验证（2026-09-08 11:49 UTC）：

- 坐标 vs OpenStreetMap：**single**（not found）
- 步行 vs OSM 路网：**agree**；现有 无步行可达轨道站 — m / — 分钟；路线：Phileo Damansara MRT（KG12） 1588 m / 20 分钟；Asia Jaya LRT（KJ21） 3889 m / 49 分钟；到 Universiti 站 5109 m / 64 分钟

建议：核对 name、facilities、flags 后决定接受哪些。

## south-view

来源：https://www.iproperty.com.my/condo/south-view-6431（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | South View Serviced Apartments | South View | 单源（iProperty） | changed |
| completed | 2017 | 2017 | 单源（iProperty） | same |
| units | 1204 | 1204 | 单源（iProperty） | same |
| floors | 46 层 × 2 栋 | 47 层 | 单源（iProperty） | changed |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | UOA Group（Paramount Properties） | UOA Group | 单源（iProperty） | same |
| address | Jalan Kerinchi Kiri 2, Bangsar South, 59200 KL | Jalan Kerinchi Kiri 2, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.113243、101.6647 | 3.1132404898499844、101.66470066048254 | 单源（iProperty） | same，相差 0 m |
| 设施 | 11 项 | 10 项 | 单源（iProperty） | changed，新增：咖啡座、有顶停车场、Surau - Male & Female，缺少：会议室、户外咖啡座、托儿所、祈祷室 |
| 设施开关 | | | 单源（iProperty） | changed：minimart |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 58 m
- 步行 vs OSM 路网：**agree**；现有 Universiti LRT（KJ19） 450 m / 5 分钟；路线：Universiti LRT（KJ19） 552 m / 7 分钟；Kerinchi LRT（KJ18） 777 m / 11 分钟；到 Universiti 站 552 m / 7 分钟
- 注：KL Gateway 一带有天桥，OSM 路网可能没画进去，路线距离可能偏长

建议：核对 name、floors、facilities、flags 后决定接受哪些。

## southbank

来源：https://www.iproperty.com.my/condo/southbank-residence-6428（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Southbank Residence | Southbank Residence | 单源（iProperty） | same |
| completed | 2017 | 2017 | 单源（iProperty） | same |
| units | 674 | 674 | 单源（iProperty） | same |
| floors | 37 层 | 37 层 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | UOA Group | UOA Group | 单源（iProperty） | same |
| address | Jalan Klang Lama, 58000, Kuala Lumpur | Jalan Klang Lama, 58000, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.100784、101.676301 | 3.100784、101.676301 | 单源（iProperty） | same，相差 0 m |
| 设施 | 9 项 | 9 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:48 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 48 m
- 步行 vs OSM 路网：**conflict**；现有 Pantai Dalam KTM（KD03） 900 m / 12 分钟（估）；路线：Pantai Dalam KTM（KD03） 1306 m / 16 分钟；Seputeh KTM（KB02） 1942 m / 25 分钟；到 Universiti 站 3396 m / 44 分钟

建议：无需动作，发布可只更新核实日期；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## southlink

来源：https://www.iproperty.com.my/condo/southlink-8399（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Southlink Lifestyle Apartments | Southlink | 单源（iProperty） | changed |
| completed | 2022 | 2022 | 单源（iProperty） | same |
| units | 1422 | 1422 | 单源（iProperty） | same |
| floors | 52 层单栋 | 52 层 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | UOA Group | UOA Group | 单源（iProperty） | same |
| address | Jalan Kerinchi / Lebuhraya Persekutuan, Bangsar South, 59200 KL | Lebuhraya Persekutuan, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.113848、101.666596 | 3.113848、101.666596 | 单源（iProperty） | same，相差 0 m |
| 设施 | 8 项 | 9 项 | 单源（iProperty） | changed，新增：围栏、Surau - Male & Female，缺少：祈祷室 |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:47 UTC）：

- 坐标 vs OpenStreetMap：**near**，相差 158 m
- 步行 vs OSM 路网：**agree**；现有 Kerinchi LRT（KJ18） — m / 7 分钟（估）；路线：Kerinchi LRT（KJ18） 664 m / 9 分钟；Universiti LRT（KJ19） 825 m / 11 分钟；到 Universiti 站 825 m / 11 分钟
- 注：KL Gateway 一带有天桥，OSM 路网可能没画进去，路线距离可能偏长

建议：核对 name、facilities 后决定接受哪些。

## tiara-damansara

来源：https://www.iproperty.com.my/condo/tiara-damansara-1319（2026-09-08 11:21 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Tiara Damansara | Tiara Damansara | 单源（iProperty） | same |
| completed | — | — | 单源（iProperty） | none |
| units | 351 | 351 | 单源（iProperty） | same |
| floors | 5 层 × 4 栋 | 5 层 × 4 栋 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 单源（iProperty） | same |
| type | 低层公寓 | 公寓 | 单源（iProperty） | same |
| developer | — | — | 单源（iProperty） | missing |
| address | Jalan 17/1, Seksyen 17, 46400 Petaling Jaya | Jalan 17/1, 46400, Selangor | 单源（iProperty） | same |
| 坐标 | 3.125104、101.639088 | 3.125104、101.639088 | 单源（iProperty） | same，相差 0 m |
| 设施 | 17 项 | 16 项 | 单源（iProperty） | changed，新增：有顶停车场、Laundry、Recreation Lake、Retail stores、Tennis courts，缺少：儿童池、按摩池、网球场、洗衣店、景观湖、零售店 |
| 设施开关 | | | 单源（iProperty） | changed：jacuzzi |

交叉验证（2026-09-08 11:51 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 126 m
- 步行 vs OSM 路网：**conflict**；现有 无步行可达轨道站 — m / — 分钟；路线：Phileo Damansara MRT（KG12） 1105 m / 15 分钟；Asia Jaya LRT（KJ21） 3213 m / 43 分钟；到 Universiti 站 4402 m / 57 分钟

建议：核对 facilities、flags 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## tria-seputeh

来源：https://www.iproperty.com.my/condo/tria-seputeh-in-9-seputeh-kuala-lumpur-9308（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | TRIA Seputeh（9 Seputeh） | TRIA Seputeh in 9 Seputeh, Kuala Lumpur | 单源（iProperty） | changed |
| completed | 2022 | 2022 | 单源（iProperty） | same |
| units | 734 | 734 | 单源（iProperty） | same |
| floors | 38 / N/A 层 × 3 栋 | 38 / N/A 层 × 3 栋 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | MRCB Land | MRCB Land | 单源（iProperty） | same |
| address | No.1, Jalan Telok Datok, Off Jalan Klang Lama, 58100, Kuala Lumpur | No.1, Jalan Telok Datok, Off Jalan Klang Lama, 58100, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.108319、101.676874 | 3.108319、101.676874 | 单源（iProperty） | same，相差 0 m |
| 设施 | 7 项 | 7 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:48 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 27 m
- 步行 vs OSM 路网：**conflict**；现有 Seputeh KTM（KB02） 782 m / 10 分钟（估）；路线：Seputeh KTM（KB02） 1316 m / 16 分钟；Mid Valley KTM（KB01） 1388 m / 18 分钟；到 Universiti 站 2796 m / 39 分钟

建议：核对 name 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

## vivo

来源：https://www.iproperty.com.my/condo/vivo-residential-suites-6797（2026-09-08 11:22 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Vivo Residential Suites（9 Seputeh） | Vivo Residential Suites | 单源（iProperty） | same |
| completed | 2018 | 2018 | 单源（iProperty） | same |
| units | 412 | 412 | 单源（iProperty） | same |
| floors | N/A 层 × 2 栋 | N/A 层 × 2 栋 | 单源（iProperty） | changed |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 单源（iProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | MRCB Land | MRCB Land | 单源（iProperty） | same |
| address | 9 Seputeh, Off Jalan Klang Lama, 58100, Kuala Lumpur | 9 Seputeh, Off Jalan Klang Lama, 58100, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.105212、101.67699 | 3.105212、101.67699 | 单源（iProperty） | same，相差 0 m |
| 设施 | 16 项 | 16 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

交叉验证（2026-09-08 11:51 UTC）：

- 坐标 vs OpenStreetMap：**agree**，相差 107 m
- 步行 vs OSM 路网：**conflict**；现有 Seputeh KTM（KB02） 1063 m / 14 分钟（估）；路线：Seputeh KTM（KB02） 1599 m / 20 分钟；Pantai Dalam KTM（KD03） 1606 m / 20 分钟；到 Universiti 站 2784 m / 36 分钟

建议：核对 floors 后决定接受哪些；步行数据和路线不符，用 --accept=walk 采纳路线值或实地核。

