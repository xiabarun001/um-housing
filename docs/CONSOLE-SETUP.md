# UMH Console 开通步骤

后台代码已在仓库里（`/console/` 页面 + `/functions/` 接口 + `console-action.yml` 工作流）。代码不含任何密码或密钥，下面四步都在网页控制台完成，做一次就好，约 20 分钟。

## 1. Cloudflare Access：谁能登录

1. 打开 Cloudflare 控制台 → **Zero Trust**（第一次会让你选免费套餐，50 个用户以内免费）。
2. **Access → Applications → Add an application → Self-hosted**。
   - Application name：`UMH Console`
   - Session duration：`24 hours`
   - Application domain：先加 `um-housing.evasuka.com`，Path 填 `console`；点 **Add domain** 再加一条 `um-housing.evasuka.com`，Path 填 `api`。两条都要，页面和接口都受保护。
   - Identity providers：只勾 **One-time PIN**（邮箱验证码，不用密码）。
3. **Policies → Add a policy**：
   - Policy name：`admins`，Action：`Allow`
   - Include → Selector `Emails` → 填管理员邮箱：`xiabarun001@gmail.com`（第二个邮箱定了再加一行）。
4. 保存后进入这个应用的 **Overview**，复制 **Application Audience (AUD) Tag**（一串 64 位的字符）。
5. **Settings → Custom Pages** 里能看到 **Team domain**，形如 `xxx.cloudflareaccess.com`。

## 2. GitHub token：让后台能触发工作流

1. GitHub → Settings → Developer settings → **Personal access tokens → Fine-grained tokens → Generate new token**。
   - Token name：`umh-console`；Expiration：一年（到期前 GitHub 会发邮件）。
   - Repository access：**Only select repositories** → `xiabarun001/um-housing`。
   - Permissions → Repository permissions：**Actions: Read and write**（其余保持 No access）。
2. 生成后复制 token（只显示一次）。

后台只用它触发 `console-action.yml`；改数据、提交都由工作流自带的权限完成。

## 3. Supabase 服务密钥：让后台能处理反馈和意向表

Supabase 控制台 → 项目 `um-housing` → **Project Settings → API Keys** → 复制 **service_role** 密钥。这个密钥能绕过数据库权限，只能放在下一步的 Pages 密钥里，绝不能写进代码或发给别人。

## 4. Pages 环境变量：把三样东西交给 Functions

Cloudflare 控制台 → **Workers & Pages → um-housing → Settings → Variables and Secrets**，Production 环境加以下几项，类型都选 **Secret**：

| 名称 | 值 |
|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | `https://xxx.cloudflareaccess.com`（第 1 步第 5 点，前面加 https://） |
| `CF_ACCESS_AUD` | 第 1 步第 4 点复制的 AUD |
| `GITHUB_TOKEN` | 第 2 步的 token |
| `GITHUB_REPO` | `xiabarun001/um-housing` |
| `SUPABASE_SERVICE_KEY` | 第 3 步的 service_role 密钥 |

保存后 **Deployments → 最新一次 → Retry deployment**（环境变量要重新部署才生效）。

## 5. 验证

1. 打开 https://um-housing.evasuka.com/console/ ，应该先看到 Cloudflare Access 的登录页，输入白名单邮箱，收验证码，进入。
2. 右上角显示你的邮箱；总览页的"配置检查"三项都是绿色。
3. 反馈页能列出记录；总览页点"立即刷新实时信息"，一分钟内 GitHub Actions 里出现 `console: refresh … by 你的邮箱` 的运行记录。

## 平时怎么用

- **总览**：新鲜度、待审核、待处理反馈、告警；一键刷新 / 采集。
- **采集与审核**：选小区，看 iProperty 采集值和现有值的差异、StarProperty 二源结论、坐标和步行的交叉验证；勾选要接受的字段，填一句对外说明，点发布。发布是提交到仓库并自动部署，约一分钟生效。
- **反馈**：读者提交的反馈，标记已处理 / 不改 / 删除。改数据本身请去"采集与审核"发布，这样更新记录里有痕迹。
- **意向表**：查看和删除。
- **日志**：谁、什么时候、改了什么（读者页只显示"改了什么"）。
- **出图**：打开小红书出图页。

## 加管理员 / 撤销

Zero Trust → Access → Applications → UMH Console → Policies → admins → 加或删邮箱。立即生效，不用改代码。

## 密钥泄露怎么办

GitHub token：在 GitHub 里 Revoke，重新生成，更新 Pages 密钥。Supabase：Project Settings → API Keys → 轮换 service_role，更新 Pages 密钥。都不需要改代码。
