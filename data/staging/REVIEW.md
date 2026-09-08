# 档案采集审核报告

生成于 2026-09-08T12:45:23.166Z（马来西亚日期 2026-09-08）。只看「有差异」和「新小区」的行；确认后用 `node scripts/publish.mjs <id> --accept 字段,字段 --who 名字 --reason 理由` 发布。

## atwater

来源：https://www.iproperty.com.my/condo/atwater-service-residences-9936（2026-09-08 12:38 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Atwater Service Residences | Atwater : Service Residences | 单源（iProperty） | changed |
| completed | 2024 | 2024 | 单源（iProperty） | same |
| units | 493 | 493 | 单源（iProperty） | same |
| floors | 26 层 | 26 层 × 2 栋 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Paramount Property | Paramount Property. | 单源（iProperty） | same |
| address | Jalan Professor Diraja Ungku Aziz, Seksyen 13, 46200 Petaling Jaya | Jalan Professor Diraja Ungku Aziz, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.117946、101.632404 | 3.117946、101.632404 | 单源（iProperty） | same，相差 0 m |
| 设施 | 16 项 | 5 项 | 单源（iProperty） | changed，新增：有顶停车场、Covered Linkways、Landscaped Garden、停车场，缺少：泳道池、无边池 / 家庭池、儿童池、按摩池、健身房、户外健身区、羽毛球场、篮球场、蒸汽房、烧烤台、儿童游乐场、足底按摩步道、瑜伽亭、迷宫花园、有顶连廊 |
| 设施开关 | | | 单源（iProperty） | changed：pool、gym、steam、jacuzzi、badminton、basketball、bbq |

第二来源 StarProperty（https://www.starproperty.my/selangor/petaling-jaya/atwater/property-insights/8860）：开发商 — · 竣工 — · 地契 L · 栋数 — · 最高层数 — · 户数 — · 面积 — · 设施 0 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2024 | — | single |
| units | 493 | — | single |
| tenure | L | L | agree |
| developer | Paramount Property. | — | single |
| floors | 26 | — | single |
| pool_gym | 无泳池/无健身房 | — | single |

建议：核对 name、facilities、flags 后决定接受哪些。

## avantas

来源：https://www.iproperty.com.my/condo/avantas-residences-6254（2026-09-08 12:41 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Avantas Residences | Avantas Residences | 单源（iProperty） | same |
| completed | 2016 | 2016 | 双源一致（iProperty、StarProperty） | same |
| units | 198 | 198 | 双源一致（iProperty、StarProperty） | same |
| floors | 28 层 | 28 层 | 双源一致（iProperty、StarProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | CPI Development | CPI Development | 双源一致（iProperty、StarProperty） | same |
| address | Old Klang Road, 58100, Kuala Lumpur | Old Klang Road, 58100, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.100352、101.67686 | 3.100352、101.67686 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 12 项 | 单源（iProperty） | same |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/old-klang-road/avantas-residences/property-insights/3955）：开发商 CPI Development · 竣工 Mar 2016 (estimate) · 地契 F · 栋数 — · 最高层数 28 · 户数 198 · 面积 — · 设施 21 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2016 | 2016 | agree |
| units | 198 | 198 | agree |
| tenure | F | F | agree |
| developer | CPI Development | CPI Development | agree |
| floors | 28 | 28 | agree |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：无需动作，发布可只更新核实日期。

## avara

来源：https://www.iproperty.com.my/condo/avara-10395（2026-09-08 12:41 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Avara Seputeh | Avara | 单源（iProperty） | changed |
| completed | 2020 | 2020 | 单源（iProperty） | same |
| units | 183 | 183 | 单源（iProperty） | same |
| floors | 35 层 × 2 栋 | 35 层 × 2 栋 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Unity Realty Sdn. Bhd. | Unity Realty Sdn. Bhd. | 单源（iProperty） | same |
| address | Jalan Seputeh, 58000, Kuala Lumpur | Jalan Seputeh, 58000, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.11349、101.679127 | 3.11349、101.679127 | 单源（iProperty） | same，相差 0 m |
| 设施 | 15 项 | 15 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/insight/8861/avara-seputeh）：开发商 — · 竣工 — · 地契 F · 栋数 — · 最高层数 — · 户数 — · 面积 — · 设施 0 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2020 | — | single |
| units | 183 | — | single |
| tenure | F | F | agree |
| developer | Unity Realty Sdn. Bhd. | — | single |
| floors | 35 | — | single |
| pool_gym | 泳池/健身房 | — | single |

建议：核对 name 后决定接受哪些。

## centrestage

来源：https://www.iproperty.com.my/condo/centrestage-designer-suite-5546（2026-09-08 12:39 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Centrestage Designer Suite | Centrestage Designer Suite | 单源（iProperty） | same |
| completed | 2014 | 2014 | 双源一致（iProperty、StarProperty） | same |
| units | 352 | — | 只有 StarProperty 有 | missing |
| floors | 14 层（C 座） | N/A 层 × 2 栋 | 只有 StarProperty 有 | changed |
| tenure | Leasehold 租赁地契（商业分层地契） | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式套房（SOHO） | 服务式公寓 | 单源（iProperty） | changed |
| developer | Cherish Springs | Cherish Springs Sdn Bhd | 双源一致（iProperty、StarProperty） | same |
| address | Jalan 13/1, Seksyen 13, 46200 Petaling Jaya | Jalan 13/1, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.111933、101.638931 | 3.111933、101.638931 | 单源（iProperty） | same，相差 0 m |
| 设施 | 13 项 | 4 项 | 单源（iProperty） | changed，缺少：壁球场、网球场、慢跑道、桑拿、烧烤区、儿童游乐场、会所、便利店、四层门禁 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | changed：sauna、squash、tennis、bbq、minimart |

第二来源 StarProperty（https://www.starproperty.my/selangor/petaling-jaya/centrestage/property-insights/2645）：开发商 Cherish Springs · 竣工 Mid 2014 (estimate) · 地契 L · 栋数 3 · 最高层数 14 · 户数 352 · 面积 — · 设施 3 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2014 | 2014 | agree |
| units | — | 352 | second-only |
| tenure | L | L | agree |
| developer | Cherish Springs Sdn Bhd | Cherish Springs | agree |
| floors | — | 14 | second-only |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 floors、type、facilities、flags 后决定接受哪些。

## dvogue

来源：https://www.iproperty.com.my/condo/avenue-d-vogue-5543（2026-09-08 12:40 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Avenue D'Vogue | Avenue D'Vogue | 单源（iProperty） | same |
| completed | 2016 | 2016 | 单源（iProperty） | same |
| units | 360 | 360 | 双源一致（iProperty、StarProperty） | same |
| floors | 单栋 | 10 层 | 冲突（iProperty 与 StarProperty 不同） | changed |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Inspiration Group Malaysia | Inspiration Group Malaysia | 双源一致（iProperty、StarProperty） | same |
| address | Jalan 13/2（Jalan Kemajuan 旁），Seksyen 13, 46200 Petaling Jaya | Jalan 13/2, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.114112、101.6395 | 3.114112、101.6395 | 单源（iProperty） | same，相差 0 m |
| 设施 | 10 项 | 9 项 | 单源（iProperty） | changed，新增：会所，缺少：会所（Best Western 管理）、三层门禁 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/selangor/petaling-jaya/avenue-d-vogue/property-insights/3168）：开发商 Inspiration Group Malaysia · 竣工 — · 地契 L · 栋数 1 · 最高层数 16 · 户数 360 · 面积 366 - 872 sf · 设施 12 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2016 | — | single |
| units | 360 | 360 | agree |
| tenure | L | L | agree |
| developer | Inspiration Group Malaysia | Inspiration Group Malaysia | agree |
| floors | 10 | 16 | conflict |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 floors、facilities 后决定接受哪些。

## inwood

来源：https://www.iproperty.com.my/condo/inwood-residences-6806（2026-09-08 12:40 UTC）

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

建议：核对 name、facilities 后决定接受哪些。

## kl-gateway

来源：https://www.iproperty.com.my/condo/kl-gateway-residences-8093（2026-09-08 12:40 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | KL Gateway Residences | KL Gateway Residences | 单源（iProperty） | same |
| completed | 2017 | 2017 | 双源一致（iProperty、StarProperty） | same |
| units | 714 | 714 | 冲突（iProperty 与 StarProperty 不同） | same |
| floors | 38 层 × 2 栋 | 38 层 | 冲突（iProperty 与 StarProperty 不同） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Suez Capital | Suez Capital Sdn Bhd | 双源一致（iProperty、StarProperty） | same |
| address | Jalan Kerinchi Kiri, Bangsar South, 59200 KL | Jalan Kerinchi Kiri, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.1136467、101.66288 | 3.113646、101.66288 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 12 项 | 单源（iProperty） | changed，新增：围栏、泳池，缺少：无边泳池、泳道池 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | changed：minimart |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/pantai/bangsar-south/kl-gateway/property-insights/6640）：开发商 Suez Domain (a member of Suez capital) · 竣工 2016 (estimate) · 地契 L · 栋数 6 · 最高层数 33 · 户数 357 · 面积 — · 设施 18 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2017 | 2016 | agree |
| units | 714 | 357 | conflict |
| tenure | L | L | agree |
| developer | Suez Capital Sdn Bhd | Suez Domain (a member of Suez capital) | agree |
| floors | 38 | 33 | conflict |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 facilities、flags 后决定接受哪些。

## laurel

来源：https://www.iproperty.com.my/condo/laurel-residence-17871（2026-09-08 12:40 UTC）

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

建议：核对 facilities、flags 后决定接受哪些。

## millerz

来源：https://www.iproperty.com.my/condo/millerz-square-serviced-residence-9658（2026-09-08 12:41 UTC）

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

建议：核对 name 后决定接受哪些。

## novum

来源：https://www.iproperty.com.my/condo/novum-7847（2026-09-08 12:40 UTC）

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

建议：核对 name、facilities 后决定接受哪些。

## pacific-63

来源：https://www.iproperty.com.my/condo/pacific-63-8858（2026-09-08 12:39 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Pacific 63 | Pacific 63 | 单源（iProperty） | same |
| completed | 2014 | 2014 | 双源一致（iProperty、StarProperty） | same |
| units | 260 | 260 | 双源一致（iProperty、StarProperty） | same |
| floors | 21 层单栋 | 21 层 | 双源一致（iProperty、StarProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | SOHO 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Island Circle Development | Island Circle Development (M) Sdn. Bhd. | 双源一致（iProperty、StarProperty） | same |
| address | Jalan 13/6, Seksyen 13, 46200 Petaling Jaya | Jalan 13/6, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.116098、101.634939 | 3.116098、101.634939 | 单源（iProperty） | same，相差 0 m |
| 设施 | 9 项 | 5 项 | 单源（iProperty） | changed，缺少：儿童池、按摩池、蒸汽房、门禁与对讲 |
| 设施开关 | | | 冲突（iProperty 与 StarProperty 不同） | changed：steam、jacuzzi |

第二来源 StarProperty（https://www.starproperty.my/insight/4874/pacific-63）：开发商 Island Circle Development · 竣工 2014 (estimate) · 地契 L · 栋数 1 · 最高层数 21 · 户数 260 · 面积 480 - 1,181 sf · 设施 9 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2014 | 2014 | agree |
| units | 260 | 260 | agree |
| tenure | L | L | agree |
| developer | Island Circle Development (M) Sdn. Bhd. | Island Circle Development | agree |
| floors | 21 | 21 | agree |
| pool_gym | 泳池/健身房 | 泳池/无健身房 | conflict |

建议：核对 facilities、flags 后决定接受哪些。

## pacific-star

来源：https://www.iproperty.com.my/condo/pacific-star-service-residence-8261（2026-09-08 12:39 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Pacific Star Service Residence | Pacific Star (Service Residence) | 单源（iProperty） | changed |
| completed | 2016 | 2016 | 双源一致（iProperty、StarProperty） | same |
| units | 657 | 657 | 双源一致（iProperty、StarProperty） | same |
| floors | 24–33 层 × 3 栋 | 33 层 | 双源一致（iProperty、StarProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | Island Circle Development | Island Circle Development (M) Sdn. Bhd. | 双源一致（iProperty、StarProperty） | same |
| address | Jalan 13/6, Seksyen 13, 46200 Petaling Jaya | Jalan 13/6, 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.1174481、101.636993 | 3.117448、101.636993 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 11 项 | 单源（iProperty） | changed，新增：咖啡座、围栏、Retail stores，缺少：便利店、餐厅、商务中心、三层门禁 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/insight/4872/pacific-star）：开发商 Island Circle Development · 竣工 Aug 2016 (estimate) · 地契 L · 栋数 5 · 最高层数 33 · 户数 657 · 面积 617 - 802 sf · 设施 10 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2016 | 2016 | agree |
| units | 657 | 657 | agree |
| tenure | L | L | agree |
| developer | Island Circle Development (M) Sdn. Bhd. | Island Circle Development | agree |
| floors | 33 | 33 | agree |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 name、facilities 后决定接受哪些。

## pantai-panorama

来源：https://www.iproperty.com.my/condo/pantai-panorama-condominiums-105（2026-09-08 12:40 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Pantai Panorama Condominiums | Pantai Panorama Condominiums | 单源（iProperty） | same |
| completed | 1996 | 1996 | 双源一致（iProperty、StarProperty） | same |
| units | 708 | 708 | 双源一致（iProperty、StarProperty） | same |
| floors | 18 层 × 5 栋 | 18 层 × 5 栋 | 双源一致（iProperty、StarProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 双源一致（iProperty、StarProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | Amcorp Properties | Amcorp Properties Berhad | 双源一致（iProperty、StarProperty） | same |
| address | Jalan 112H, Kampung Kerinchi, 59200 KL | Jalan 112h, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.109804、101.662215 | 3.109804、101.662215 | 单源（iProperty） | same，相差 0 m |
| 设施 | 14 项 | 14 项 | 单源（iProperty） | changed，新增：Badminton hall、Laundry、Retail stores、Tennis courts，缺少：羽毛球馆、网球场、洗衣店、便利店 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/pantai/pantai-panorama/property-insights/383）：开发商 AMDB · 竣工 1996 · 地契 F · 栋数 5 · 最高层数 18 · 户数 708 · 面积 from 750 sf · 设施 8 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 1996 | 1996 | agree |
| units | 708 | 708 | agree |
| tenure | F | F | agree |
| developer | Amcorp Properties Berhad | AMDB | agree |
| floors | 18 | 18 | agree |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 facilities 后决定接受哪些。

## pj-midtown

来源：https://www.iproperty.com.my/condo/pj-midtown-6911（2026-09-08 12:39 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | PJ Midtown | PJ Midtown | 单源（iProperty） | same |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 758 | 758 | 单源（iProperty） | same |
| floors | 29–30 层 × 2 栋 | 30 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契（商业地契，水电按商业费率） | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | IOI Properties + Sime Darby Brunsfield | IOI Properties and Sime Darby Brunsfield | 单源（iProperty） | same |
| address | Jalan Kemajuan, Seksyen 13, 46200 Petaling Jaya | 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.11381、101.640488 | 3.11381、101.640488 | 单源（iProperty） | same，相差 0 m |
| 设施 | 15 项 | 12 项 | 单源（iProperty） | changed，新增：有顶停车场、跑道、儿童游乐场、Surau - Male & Female、泳池、Tennis courts，缺少：无边泳池、网球场、慢跑道、日光平台、会议室、图书室、小型影院、幼儿园、祈祷室 |
| 设施开关 | | | 单源（iProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/insight/8811/pj-midtown）：开发商 — · 竣工 — · 地契 L · 栋数 — · 最高层数 — · 户数 — · 面积 — · 设施 0 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2019 | — | single |
| units | 758 | — | single |
| tenure | L | L | agree |
| developer | IOI Properties and Sime Darby Brunsfield | — | single |
| floors | 30 | — | single |
| pool_gym | 泳池/健身房 | — | single |

建议：核对 facilities 后决定接受哪些。

## pj8

来源：https://www.iproperty.com.my/condo/serviced-residence-pj8-1310（2026-09-08 12:39 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Serviced Residence @ PJ8 | Serviced Residence @ PJ8 | 单源（iProperty） | same |
| completed | 2008 | 2008 | 双源一致（iProperty、StarProperty） | same |
| units | 380 | 380 | 冲突（iProperty 与 StarProperty 不同） | same |
| floors | 39 层 | 39 层 | 双源一致（iProperty、StarProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | IJM Land | IJM Land Berhad | 双源一致（iProperty、StarProperty） | same |
| address | Jalan Barat, Seksyen 8, 46050 Petaling Jaya | Jalan Barat, 46050, Selangor | 单源（iProperty） | same |
| 坐标 | 3.101428、101.63982 | 3.101428、101.63982 | 单源（iProperty） | same，相差 0 m |
| 设施 | 10 项 | 10 项 | 单源（iProperty） | changed，新增：Landscaped Garden、Laundry，缺少：洗衣房、园林 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | changed：jacuzzi |

第二来源 StarProperty（https://www.starproperty.my/insight/741/pj8）：开发商 IJM Land Berhad · 竣工 Office Suite: May 2005 Service Suite: End 2008 · 地契 L · 栋数 4 · 最高层数 38 · 户数 38 · 面积 — · 设施 8 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2008 | 2008 | agree |
| units | 380 | 38 | conflict |
| tenure | L | L | agree |
| developer | IJM Land Berhad | IJM Land Berhad | agree |
| floors | 39 | 38 | agree |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 facilities、flags 后决定接受哪些。

## ryan-miho

来源：https://www.iproperty.com.my/condo/ryan-miho-9302（2026-09-08 12:39 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Ryan & Miho | RYAN & MIHO | 单源（iProperty） | same |
| completed | 2021 | 2021 | 单源（iProperty） | same |
| units | 542 | 542 | 单源（iProperty） | same |
| floors | 30 层 × 2 栋 | 30 层 × 2 栋 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | OSK Property | OSK Property Holdings Berhad | 单源（iProperty） | same |
| address | Jalan Professor Diraja Ungku Aziz, Seksyen 13, 46200 Petaling Jaya | 46200, Selangor | 单源（iProperty） | same |
| 坐标 | 3.118397、101.633049 | 3.118397、101.633049 | 单源（iProperty） | same，相差 0 m |
| 设施 | 16 项 | 17 项 | 单源（iProperty） | changed，新增：Badminton hall、Bus Stop、有顶停车场、Covered Linkways、Multi-Storey Car Park、停车场，缺少：健身房（室内加室外）、羽毛球馆、有顶连廊、门口公交站、多层停车楼 |
| 设施开关 | | | 单源（iProperty） | changed：gym、minimart |

第二来源 StarProperty（https://www.starproperty.my/selangor/petaling-jaya/ryan-miho-by-osk-property/property-insights/8884）：开发商 — · 竣工 — · 地契 L · 栋数 — · 最高层数 — · 户数 — · 面积 — · 设施 0 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2021 | — | single |
| units | 542 | — | single |
| tenure | L | L | agree |
| developer | OSK Property Holdings Berhad | — | single |
| floors | 30 | — | single |
| pool_gym | 泳池/无健身房 | — | single |

建议：核对 facilities、flags 后决定接受哪些。

## saville

来源：https://www.iproperty.com.my/condo/saville-the-park-4685（2026-09-08 12:40 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Saville @ The Park | Saville @ The Park | 单源（iProperty） | same |
| completed | 2015 | 2015 | 双源一致（iProperty、StarProperty） | same |
| units | 408 | 408 | 双源一致（iProperty、StarProperty） | same |
| floors | 27 层 × 2 栋 | 27 层 | 双源一致（iProperty、StarProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 双源一致（iProperty、StarProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | MKH（Amona Metro） | MKH Berhad | 双源一致（iProperty、StarProperty） | same |
| address | Jalan Pantai Murni 8, Bukit Kerinchi, 59200 KL | Jalan Pantai Murni 8, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.102912、101.661941 | 3.102912、101.661941 | 单源（iProperty） | same，相差 0 m |
| 设施 | 13 项 | 12 项 | 单源（iProperty） | changed，新增：Surau - Male & Female、泳池，缺少：无边泳池、游戏室、祈祷室 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/pantai/saville-the-park/property-insights/3288）：开发商 Amona Metro Development · 竣工 2015 (estimate) · 地契 F · 栋数 — · 最高层数 27 · 户数 408 · 面积 — · 设施 12 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2015 | 2015 | agree |
| units | 408 | 408 | agree |
| tenure | F | F | agree |
| developer | MKH Berhad | Amona Metro Development | agree |
| floors | 27 | 27 | agree |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 facilities 后决定接受哪些。

## secoya

来源：https://www.iproperty.com.my/condo/secoya-residence-7619（2026-09-08 12:40 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Secoya Residences @ Pantai Sentral Park | Secoya Residence | 单源（iProperty） | changed |
| completed | 2019 | 2019 | 单源（iProperty） | same |
| units | 243 | 243 | 单源（iProperty） | same |
| floors | 41 层 | 41 层 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | IJM Land | IJM Land Berhad | 单源（iProperty） | same |
| address | No. 2A Pantai Sentral Park, off Jalan Pantai Murni, 59200 KL | 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.101723、101.66466 | 3.101723、101.66466 | 单源（iProperty） | same，相差 0 m |
| 设施 | 12 项 | 13 项 | 单源（iProperty） | changed，新增：Landscaped Garden、围栏、泳池，缺少：无边泳池、园林 |
| 设施开关 | | | 单源（iProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/pantai/secoya-residences-pantai-sentral-park/property-insights/9632）：开发商 — · 竣工 — · 地契 L · 栋数 — · 最高层数 — · 户数 — · 面积 — · 设施 0 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2019 | — | single |
| units | 243 | — | single |
| tenure | L | L | agree |
| developer | IJM Land Berhad | — | single |
| floors | 41 | — | single |
| pool_gym | 泳池/健身房 | — | single |

建议：核对 name、facilities 后决定接受哪些。

## seventeen

来源：https://www.iproperty.com.my/condo/seventeen-mall-residences-biji-living-21634（2026-09-08 12:38 UTC）

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

建议：核对 name、facilities、flags 后决定接受哪些。

## south-view

来源：https://www.iproperty.com.my/condo/south-view-6431（2026-09-08 12:40 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | South View Serviced Apartments | South View | 单源（iProperty） | changed |
| completed | 2017 | 2017 | 双源一致（iProperty、StarProperty） | same |
| units | 1204 | 1204 | 冲突（iProperty 与 StarProperty 不同） | same |
| floors | 46 层 × 2 栋 | 47 层 | 双源一致（iProperty、StarProperty） | changed |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | UOA Group（Paramount Properties） | UOA Group | 双源一致（iProperty、StarProperty） | same |
| address | Jalan Kerinchi Kiri 2, Bangsar South, 59200 KL | Jalan Kerinchi Kiri 2, 59200, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.113243、101.6647 | 3.1132404898499844、101.66470066048254 | 单源（iProperty） | same，相差 0 m |
| 设施 | 11 项 | 10 项 | 单源（iProperty） | changed，新增：咖啡座、有顶停车场、Surau - Male & Female，缺少：会议室、户外咖啡座、托儿所、祈祷室 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | changed：minimart |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/pantai/bangsar-south/south-view/property-insights/6693）：开发商 UOA Group · 竣工 2017 (estimate) · 地契 F · 栋数 2 · 最高层数 46 · 户数 1400 · 面积 621 – 1,121 sf · 设施 11 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2017 | 2017 | agree |
| units | 1204 | 1400 | conflict |
| tenure | F | F | agree |
| developer | UOA Group | UOA Group | agree |
| floors | 47 | 46 | agree |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 name、floors、facilities、flags 后决定接受哪些。

## southbank

来源：https://www.iproperty.com.my/condo/southbank-residence-6428（2026-09-08 12:41 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Southbank Residence | Southbank Residence | 单源（iProperty） | same |
| completed | 2017 | 2017 | 双源一致（iProperty、StarProperty） | same |
| units | 674 | 674 | 双源一致（iProperty、StarProperty） | same |
| floors | 37 层 | 37 层 | 双源一致（iProperty、StarProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 双源一致（iProperty、StarProperty） | same |
| type | 服务式公寓 | 服务式公寓 | 单源（iProperty） | same |
| developer | UOA Group | UOA Group | 双源一致（iProperty、StarProperty） | same |
| address | Jalan Klang Lama, 58000, Kuala Lumpur | Jalan Klang Lama, 58000, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.100784、101.676301 | 3.100784、101.676301 | 单源（iProperty） | same，相差 0 m |
| 设施 | 9 项 | 9 项 | 单源（iProperty） | same |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/old-klang-road/southbank-residence/property-insights/7306）：开发商 UOA Group · 竣工 2017 (estimate) · 地契 F · 栋数 2 · 最高层数 37 · 户数 674 · 面积 779 - 978 sf · 设施 22 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2017 | 2017 | agree |
| units | 674 | 674 | agree |
| tenure | F | F | agree |
| developer | UOA Group | UOA Group | agree |
| floors | 37 | 37 | agree |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：无需动作，发布可只更新核实日期。

## southlink

来源：https://www.iproperty.com.my/condo/southlink-8399（2026-09-08 12:40 UTC）

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

建议：核对 name、facilities 后决定接受哪些。

## tiara-damansara

来源：https://www.iproperty.com.my/condo/tiara-damansara-1319（2026-09-08 12:39 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Tiara Damansara | Tiara Damansara | 单源（iProperty） | same |
| completed | — | — | 两边都无 | none |
| units | 351 | 351 | 双源一致（iProperty、StarProperty） | same |
| floors | 5 层 × 4 栋 | 5 层 × 4 栋 | 单源（iProperty） | same |
| tenure | Freehold 永久地契 | Freehold 永久地契 | 双源一致（iProperty、StarProperty） | same |
| type | 低层公寓 | 公寓 | 单源（iProperty） | same |
| developer | — | — | 两边都无 | missing |
| address | Jalan 17/1, Seksyen 17, 46400 Petaling Jaya | Jalan 17/1, 46400, Selangor | 单源（iProperty） | same |
| 坐标 | 3.125104、101.639088 | 3.125104、101.639088 | 单源（iProperty） | same，相差 0 m |
| 设施 | 17 项 | 16 项 | 单源（iProperty） | changed，新增：有顶停车场、Laundry、Recreation Lake、Retail stores、Tennis courts，缺少：儿童池、按摩池、网球场、洗衣店、景观湖、零售店 |
| 设施开关 | | | 双源一致（iProperty、StarProperty） | changed：jacuzzi |

第二来源 StarProperty（https://www.starproperty.my/insight/1432/tiara-damansara）：开发商 — · 竣工 — · 地契 F · 栋数 4 · 最高层数 — · 户数 351 · 面积 1,300 - 1,700 sf · 设施 10 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | — | — | none |
| units | 351 | 351 | agree |
| tenure | F | F | agree |
| developer | — | — | none |
| floors | 5 | — | single |
| pool_gym | 泳池/健身房 | 泳池/健身房 | agree |

建议：核对 facilities、flags 后决定接受哪些。

## tria-seputeh

来源：https://www.iproperty.com.my/condo/tria-seputeh-in-9-seputeh-kuala-lumpur-9308（2026-09-08 12:41 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | TRIA Seputeh（9 Seputeh） | TRIA Seputeh in 9 Seputeh, Kuala Lumpur | 单源（iProperty） | changed |
| completed | 2022 | 2022 | 单源（iProperty） | same |
| units | 734 | 734 | 单源（iProperty） | same |
| floors | 38 / N/A 层 × 3 栋 | 38 / N/A 层 × 3 栋 | 单源（iProperty） | same |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | MRCB Land | MRCB Land | 单源（iProperty） | same |
| address | No.1, Jalan Telok Datok, Off Jalan Klang Lama, 58100, Kuala Lumpur | No.1, Jalan Telok Datok, Off Jalan Klang Lama, 58100, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.108319、101.676874 | 3.108319、101.676874 | 单源（iProperty） | same，相差 0 m |
| 设施 | 7 项 | 7 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/kuala-lumpur/old-klang-road/tria-seputeh/property-insights/9850）：开发商 — · 竣工 — · 地契 L · 栋数 — · 最高层数 — · 户数 — · 面积 — · 设施 0 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2022 | — | single |
| units | 734 | — | single |
| tenure | L | L | agree |
| developer | MRCB Land | — | single |
| floors | 38 | — | single |
| pool_gym | 泳池/无健身房 | — | single |

建议：核对 name 后决定接受哪些。

## vivo

来源：https://www.iproperty.com.my/condo/vivo-residential-suites-6797（2026-09-08 12:45 UTC）

| 字段 | 现有 | 采集到 | 评估 | 状态 |
|---|---|---|---|---|
| name | Vivo Residential Suites（9 Seputeh） | Vivo Residential Suites | 单源（iProperty） | same |
| completed | 2018 | 2018 | 单源（iProperty） | same |
| units | 412 | 412 | 单源（iProperty） | same |
| floors | N/A 层 × 2 栋 | N/A 层 × 2 栋 | 两边都无 | changed |
| tenure | Leasehold 租赁地契 | Leasehold 租赁地契 | 双源一致（iProperty、StarProperty） | same |
| type | 公寓 | 公寓 | 单源（iProperty） | same |
| developer | MRCB Land | MRCB Land | 单源（iProperty） | same |
| address | 9 Seputeh, Off Jalan Klang Lama, 58100, Kuala Lumpur | 9 Seputeh, Off Jalan Klang Lama, 58100, Kuala Lumpur | 单源（iProperty） | same |
| 坐标 | 3.105212、101.67699 | 3.105212、101.67699 | 单源（iProperty） | same，相差 0 m |
| 设施 | 16 项 | 16 项 | 单源（iProperty） | same |
| 设施开关 | | | 单源（iProperty） | same |

第二来源 StarProperty（https://www.starproperty.my/insight/9477/vivo-residential-suites-9-seputeh）：开发商 — · 竣工 — · 地契 L · 栋数 — · 最高层数 — · 户数 — · 面积 — · 设施 0 项

| 字段 | iProperty | StarProperty | 结论 |
|---|---|---|---|
| completed | 2018 | — | single |
| units | 412 | — | single |
| tenure | L | L | agree |
| developer | MRCB Land | — | single |
| floors | — | — | none |
| pool_gym | 泳池/健身房 | — | single |

建议：核对 floors 后决定接受哪些。

