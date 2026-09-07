# 在自己电脑上跑一次价格刷新并推送到 GitHub（推送后 Cloudflare Pages 自动重新部署）。
# iProperty 拦数据中心 IP（GitHub Actions 会被 403），家用网络能过，所以定时任务放在本机上跑。
# 用法：powershell -ExecutionPolicy Bypass -File scripts\refresh-local.ps1
# 日志：%LOCALAPPDATA%\um-housing\refresh.log
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $env:LOCALAPPDATA 'um-housing'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir 'refresh.log'
function Log($msg) { $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg; Add-Content -Path $log -Value $line -Encoding utf8; Write-Host $line }

Set-Location $repo
Log "---- start"
git pull -q --rebase --autostash origin main
if ($LASTEXITCODE -ne 0) { Log "git pull failed ($LASTEXITCODE)"; exit 1 }

node scripts/refresh.mjs 2>&1 | ForEach-Object { Log $_ }
if ($LASTEXITCODE -ne 0) { Log "refresh failed ($LASTEXITCODE), not committing"; git checkout -q -- data/prices.json data/price-history.json data/refresh-log.json; exit 1 }

git add data/prices.json data/price-history.json data/refresh-log.json
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Log "no changes"; exit 0 }
git -c user.name='um-housing-bot' -c user.email='bot@users.noreply.github.com' commit -q -m ("data: refresh price snapshot " + (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mmZ'))
git push -q origin main
if ($LASTEXITCODE -ne 0) { Log "git push failed ($LASTEXITCODE)"; exit 1 }
Log "pushed"
