#!/usr/bin/env bash
# Deploy the canonical CREATE2 deployer (0x4e59b44847b379578588920cA78FbF26c0B4956C)
# to a local/fresh chain so that Permit2 and other CREATE2 deployments work.
#
# Usage:
#   RPC_URL=http://127.0.0.1:8645 ./scripts/deploy-create2-deployer.sh
#   # or with cast in PATH and a funded account:
#   RPC_URL=http://127.0.0.1:8645 PRIVATE_KEY=0xac0974... ./scripts/deploy-create2-deployer.sh
#
# The deployer is deployed by broadcasting a pre-signed transaction. The signer
# address must have ETH for gas. On Anvil, fund it first (see below).

set -e

RPC_URL="${RPC_URL:-http://127.0.0.1:8645}"
# One-time deployment signer (from Arachnid deterministic-deployment-proxy)
DEPLOYER_SIGNER="0x3fab184622dc19b6109349b94811493bf2a45362"
# Pre-signed deployment tx (results in contract at 0x4e59b44847b379578588920cA78FbF26c0B4956C)
RAW_TX="0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222"

echo "RPC: $RPC_URL"
echo "CREATE2 deployer will be at: 0x4e59b44847b379578588920cA78FbF26c0B4956C"
echo ""

# Check if deployer already exists (has code)
CODE=$(cast code 0x4e59b44847b379578588920cA78FbF26c0B4956C --rpc-url "$RPC_URL" 2>/dev/null || true)
if [ -n "$CODE" ] && [ "$CODE" != "0x" ]; then
  echo "CREATE2 deployer already deployed at 0x4e59b44847b379578588920cA78FbF26c0B4956C"
  exit 0
fi

# Fund the one-time signer if we have a private key (e.g. Anvil default account)
if [ -n "$PRIVATE_KEY" ]; then
  echo "Funding deployment signer $DEPLOYER_SIGNER with 0.1 ether..."
  cast send "$DEPLOYER_SIGNER" --value 0.1ether --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" >/dev/null 2>&1 || true
fi

echo "Broadcasting CREATE2 deployer deployment transaction..."
if cast rpc eth_sendRawTransaction "$RAW_TX" --rpc-url "$RPC_URL" 2>/dev/null; then
  echo "CREATE2 deployer deployed successfully."
else
  echo "Broadcast failed (signer may have no ETH). Do this:"
  echo "  1. Fund the one-time signer:"
  echo "     cast send $DEPLOYER_SIGNER --value 0.1ether --private-key <ANVIL_PRIVATE_KEY> --rpc-url $RPC_URL"
  echo "  2. Run this script again, or broadcast manually:"
  echo "     cast rpc eth_sendRawTransaction '$RAW_TX' --rpc-url $RPC_URL"
  exit 1
fi
