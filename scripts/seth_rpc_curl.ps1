# Seth RPC 测试脚本 (PowerShell)：调用 get_block_with_gid 和 query_init
# 用法: .\scripts\seth_rpc_curl.ps1  或  $env:SETH_RPC_URL="http://your-host:port"; .\scripts\seth_rpc_curl.ps1

$BaseUrl = if ($env:SETH_RPC_URL) { $env:SETH_RPC_URL.TrimEnd('/') } else { "http://35.197.170.240:23001" }
$headers = @{ "Content-Type" = "application/json" }

Write-Host "=== Seth RPC 测试 (BASE_URL=$BaseUrl) ===" -ForegroundColor Cyan
Write-Host ""

# 1. get_block_with_gid - 按高度获取区块 (height=0 创世块)
Write-Host "--- 1. GET_BLOCK_WITH_GID (height=0) ---" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "$BaseUrl/get_block_with_gid" -Method Post -Headers $headers -Body '{"height":0}'
    $r | ConvertTo-Json -Depth 20
} catch {
    Write-Host "Error: $_"
}
Write-Host ""

# 2. get_block_with_gid - 较大高度
Write-Host "--- 2. GET_BLOCK_WITH_GID (height=999999) ---" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "$BaseUrl/get_block_with_gid" -Method Post -Headers $headers -Body '{"height":999999}'
    $r | ConvertTo-Json -Depth 20
} catch {
    Write-Host "Error: $_"
}
Write-Host ""

# 3. query_init (count=1)
Write-Host "--- 3. QUERY_INIT (count=1) ---" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "$BaseUrl/query_init" -Method Post -Headers $headers -Body '{"count":1}'
    $r | ConvertTo-Json -Depth 20
} catch {
    Write-Host "Error: $_"
}
Write-Host ""

# 4. query_init (empty body)
Write-Host "--- 4. QUERY_INIT (empty body) ---" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "$BaseUrl/query_init" -Method Post -Headers $headers -Body '{}'
    $r | ConvertTo-Json -Depth 20
} catch {
    Write-Host "Error: $_"
}
Write-Host ""
Write-Host "=== 结束 ===" -ForegroundColor Cyan
