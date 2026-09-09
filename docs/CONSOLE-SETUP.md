# UMH Console 开通步骤

后台代码已在仓库里（`/login/` 登录页 + `/console/` 页面 + `/functions/` 接口 + `console-action.yml` 工作流）。代码不含任何密码、密钥或邮箱，下面几步都在网页控制台完成，做一次就好，约 15 分钟。

## 1. 登录是怎么回事：Supabase 邮箱验证码

没有密码，也不用绑卡。流程是：

1. 顶栏最右边的齿轮 → `/login/` → 填邮箱 → `/api/auth/start` 先拿邮箱比对白名单，**名单外的邮箱一封信都不会发**。
2. 名单内的才让 Supabase 发一封 6 位验证码。
3. 填码 → `/api/auth/verify` 换到 token，写进 `HttpOnly` cookie（浏览器脚本读不到，也不存 localStorage）。
4. 之后每次访问 `/console/*` 和 `/api/*`，Functions 都拿 cookie 找 Supabase 验一次，再比对一次白名单；token 过期会用 refresh token 自动续，平时不用重新登录。

白名单在下一步的 `ADMIN_EMAILS` 里，不写在代码里。这一步本身不用做任何配置。

两个已知的小坑：

- Supabase 自带的邮件服务有频率限制（免费项目每小时几封）。平时登一次能用很久，够用；真嫌少可以在 Supabase → Authentication → Emails 里接一个自己的 SMTP。
- 163 / QQ 这类国内邮箱对境外发信比较严，可能进垃圾箱甚至直接丢掉。收不到就先用 Gmail 那个。

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
| `ADMIN_EMAILS` | 能进后台的邮箱，逗号分隔，例如 `a@gmail.com,b@163.com` |
| `GITHUB_TOKEN` | 第 2 步的 token |
| `GITHUB_REPO` | `xiabarun001/um-housing` |
| `SUPABASE_SERVICE_KEY` | 第 3 步的 service_role 密钥 |

没配 `ADMIN_EMAILS` 的时候后台是关着的（返回 503），不会裸奔。

保存后 **Deployments → 最新一次 → Retry deployment**（环境变量要重新部署才生效）。

## 5. 验证

1. 打开 https://um-housing.evasuka.com/login/ ，填白名单里的邮箱 → 收验证码 → 填码，应该直接进后台。名单外的邮箱会被当场拒掉。
2. 右上角显示你的邮箱；总览页的"配置检查"三项都是绿色。
3. 反馈页能列出记录；总览页点"立即刷新实时信息"，一分钟内 GitHub Actions 里出现 `console: refresh … by 你的邮箱` 的运行记录。

## 平时怎么用

- **总览**：新鲜度、待审核、待处理反馈、告警；一键刷新 / 采集。
- **采集与审核**：选小区，看 iProperty 采集值和现有值的差异、StarProperty 二源结论、坐标和步行的交叉验证；勾选要接受的字段，填一句对外说明，点发布。发布是提交到仓库并自动部署，约一分钟生效。
- **反馈**：读者提交的反馈，标记已处理 / 不改 / 删除。改数据本身请去"采集与审核"发布，这样更新记录里有痕迹。
- **意向表**：查看和删除。
- **日志**：谁、什么时候、改了什么（读者页只显示"改了什么"）。

## 加管理员 / 撤销

Cloudflare → Workers & Pages → um-housing → Settings → Variables and Secrets → 改 `ADMIN_EMAILS`，重新部署一次生效。不用改代码。撤销就是把那个邮箱从这一行里删掉，他手上的 cookie 下一次请求就过不去了。

想再严一点：两个邮箱都登录过一次之后，去 Supabase → Authentication → Sign In / Providers 关掉 **Allow new users to sign up**，这样连 Supabase 那边也不会再冒出别的账号。

## 密钥泄露怎么办

GitHub token：在 GitHub 里 Revoke，重新生成，更新 Pages 密钥。Supabase：Project Settings → API Keys → 轮换 service_role，更新 Pages 密钥。都不需要改代码。
