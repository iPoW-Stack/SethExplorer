#!/usr/bin/env bash
# If this script has CRLF, re-exec with LF-only (fixes bash errors on Linux)
_scr="$(echo "${BASH_SOURCE[0]:-$0}" | tr -d '\r')"
_scr_dir="$(cd "$(dirname "$_scr")" && pwd)"
_scr_full="${_scr_dir}/$(basename "$_scr")"
if grep -q $'\r' "$_scr_full" 2>/dev/null; then
  exec bash <(sed 's/\r$//' "$_scr_full")
  exit 1
fi
#
# 将工程目录下所有 TypeScript/JavaScript 源码文件中的 CRLF 转换为 LF。
# 用于在 Ubuntu 上修复因 Windows 换行符导致的 yarn build 报错。
#
# 用法（在工程根目录执行）:
#   chmod +x scripts/crlf-to-lf.sh   # 首次需要可执行权限
#   ./scripts/crlf-to-lf.sh
# 或
#   bash scripts/crlf-to-lf.sh
#

set -e

# 工程根目录（脚本所在目录的上一级）
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 要处理的扩展名
EXTS=("ts" "tsx" "js" "jsx" "mjs" "cjs")
COUNT=0

echo "Converting CRLF to LF under: $ROOT"
echo "Extensions: ${EXTS[*]}"
echo ""

for ext in "${EXTS[@]}"; do
  while IFS= read -r -d '' f; do
    # 只处理包含 \r 的文件（避免无谓写入）
    if grep -q $'\r' "$f" 2>/dev/null; then
      sed -i 's/\r$//' "$f"
      echo "  $f"
      ((COUNT++)) || true
    fi
  done < <(find . -type f -name "*.${ext}" ! -path "./node_modules/*" ! -path "./.git/*" -print0 2>/dev/null)
done

echo ""
echo "Done. Converted $COUNT file(s)."
