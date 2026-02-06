# 本地运行 BlockScout Indexer + Web，从 http://35.197.170.240:23001 拉取链上数据
# 前置：PostgreSQL 已在本机运行
# 使用：在项目根目录执行 .\scripts\run_indexer_local.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $ProjectRoot "mix.exs"))) {
    $ProjectRoot = (Get-Location).Path
}
Set-Location $ProjectRoot
Write-Host "项目目录: $ProjectRoot"

# 设置环境变量
$env:ETHEREUM_JSONRPC_HTTP_URL = "http://35.197.170.240:23001"
$env:ETHEREUM_JSONRPC_VARIANT = "geth"
$env:DISABLE_MARKET = "true"
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = ""
    Write-Host "DATABASE_URL 未设置，将使用默认：localhost / explorer_dev"
}

Write-Host "=== BlockScout 本地启动（Seth RPC）==="
Write-Host "RPC: $env:ETHEREUM_JSONRPC_HTTP_URL"
Write-Host ""

# 1. 创建数据库（需要本机已安装 PostgreSQL，且可连接）
Write-Host "创建数据库（如已存在会报错可忽略）..."
Push-Location apps/explorer
try {
    mix ecto.create 2>&1
} catch {
    Write-Host "ecto.create 可能因库已存在而报错，继续..."
}
Pop-Location

# 2. 执行迁移
Write-Host "执行数据库迁移..."
Push-Location apps/explorer
mix ecto.migrate
Pop-Location

# 3. 启动 Phoenix 服务器（含 Indexer）
Write-Host "启动 Phoenix 服务器（含 Indexer）..."
mix phx.server
