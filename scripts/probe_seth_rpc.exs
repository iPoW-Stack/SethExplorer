#!/usr/bin/env elixir
# 探测 Seth 新链 RPC 端点，核对数据结构
# 使用: mix run scripts/probe_seth_rpc.exs
# 或: elixir scripts/probe_seth_rpc.exs (需先 cd 到项目根目录)

# 需要 inets 应用
:inets.start()

host = System.get_env("SETH_RPC_HOST", "35.197.170.240")
port = System.get_env("SETH_RPC_PORT", "23001")
base = "http://#{host}:#{port}"

paths = ["", "/rpc", "/jsonrpc", "/v1", "/eth", "/api"]

body = ~s({"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1})

IO.puts("=== Seth RPC 探测 ===\nBase: #{base}\n")

for path <- paths do
  url = (base <> path) |> String.to_charlist()
  path_display = if path == "", do: "/", else: path
  IO.puts("Path: #{path_display}")
  case :httpc.request(:post, {url, [], 'application/json', body}, [{timeout, 10000}], []) do
    {:ok, {{_, code, _}, _headers, response_body}} ->
      IO.puts("  HTTP #{code}")
      resp_str = if is_binary(response_body), do: response_body, else: to_string(response_body)
      if String.length(resp_str) > 0 do
        IO.puts("  Body: #{String.slice(resp_str, 0, 1000)}")
      end
    {:error, reason} ->
      IO.puts("  Error: #{inspect(reason)}")
  end
  IO.puts("")
end

IO.puts("若所有路径均返回 404，可能原因：")
IO.puts("1. 该端口提供 gRPC/Protobuf 而非 HTTP JSON-RPC")
IO.puts("2. RPC 路径或端口需向链维护方确认")
IO.puts("3. 需在指定网络/VPN 内访问")
