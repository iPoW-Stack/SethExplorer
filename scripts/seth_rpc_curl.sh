# Seth RPC 测试 (Ubuntu)
# 可选: export SETH_RPC_URL=http://35.197.170.240:23001

# get_block_with_gid - 按高度取块 (height=0)
curl -s -X POST "${SETH_RPC_URL:-http://35.197.170.240:23001}/get_block_with_gid" -H "Content-Type: application/json" -d '{"height": 0}'

# query_init
curl -s -X POST "${SETH_RPC_URL:-http://35.197.170.240:23001}/query_init" -H "Content-Type: application/json" -d '{"count": 1}'
