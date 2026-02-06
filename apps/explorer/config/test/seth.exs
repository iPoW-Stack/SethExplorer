import Config

~w(config config_helper.exs)
|> Path.join()
|> Code.eval_file()

seth_rpc_url = System.get_env("SETH_RPC_URL", "http://104.198.109.193:23080")
seth_network = System.get_env("SETH_NETWORK", "3")
seth_pool_index = System.get_env("SETH_POOL_INDEX", "13")
seth_account_address = System.get_env("SETH_ACCOUNT_ADDRESS")

config :ethereum_jsonrpc, :seth_rpc_url, seth_rpc_url
config :ethereum_jsonrpc, :seth_network, String.to_integer(seth_network)
config :ethereum_jsonrpc, :seth_pool_index, String.to_integer(seth_pool_index)
config :ethereum_jsonrpc, :seth_account_address, seth_account_address

config :explorer,
  json_rpc_named_arguments: [
    transport: EthereumJSONRPC.HTTP,
    transport_options: [
      http: EthereumJSONRPC.HTTP.Tesla,
      urls: [seth_rpc_url],
      http_options: ConfigHelper.http_options(1)
    ],
    variant: EthereumJSONRPC.Seth.Variant
  ],
  subscribe_named_arguments: [transport: nil]
