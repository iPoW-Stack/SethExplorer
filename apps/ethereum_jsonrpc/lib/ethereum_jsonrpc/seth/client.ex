defmodule EthereumJSONRPC.Seth.Client do
  @moduledoc """
  HTTP client for Seth chain RPC.

  Base URL: `config :ethereum_jsonrpc, :seth_rpc_url` or env SETH_RPC_URL (default http://104.198.109.193:23080).

  - POST /get_blocks (application/x-www-form-urlencoded): network, pool_index, height, count (all string). Used for block indexing.
  - POST /get_block_with_gid (JSON): block by height/block_hash/account_address (legacy).
  - POST /transaction, /query_account, /query_init: JSON.
  """

  require Logger

  @paths %{
    get_blocks: "/get_blocks",
    get_latest_pool_info: "/get_latest_pool_info",
    get_block_with_gid: "/get_block_with_gid",
    transaction: "/transaction",
    get_seckey_and_encrypt_data: "/get_seckey_and_encrypt_data",
    proxy_decrypt: "/proxy_decrypt",
    query_contract: "/query_contract",
    abi_query_contract: "/abi_query_contract",
    query_account: "/query_account",
    query_init: "/query_init",
    get_proxy_reenc_info: "/get_proxy_reenc_info",
    ars_create_sec_keys: "/ars_create_sec_keys",
    accounts_valid: "/accounts_valid",
    commit_gid_valid: "/commit_gid_valid",
    prepayment_valid: "/prepayment_valid"
  }

  @doc """
  POST to a Seth RPC path with JSON body.

  For :get_block_with_gid and :query_init, if config :ethereum_jsonrpc, :seth_account_address
  (or env SETH_ACCOUNT_ADDRESS) is set, it is merged in as "account_address" so the server
  returns block/init data instead of "addr not exists." or plain "ok".

  ## Options
  - :base_url - override base URL (default from config/env)
  - :timeout  - request timeout in ms (default 15_000)

  ## Returns
  - `{:ok, body}` - body is raw string (may be JSON or text/plain)
  - `{:error, reason}` - request failed

  ## Examples
      Seth.Client.post(:get_block_with_gid, %{height: 0})
      Seth.Client.post(:query_account, %{address: "0x..."})
  """
  @spec post(atom(), map(), keyword()) :: {:ok, String.t()} | {:error, term()}
  def post(path_key, body, opts \\ []) when is_atom(path_key) and is_map(body) do
    path = Map.fetch!(@paths, path_key)
    base = opts[:base_url] || base_url()
    url = base |> String.trim_trailing("/") |> Kernel.<>(path)
    timeout = Keyword.get(opts, :timeout, 15_000)

    body = maybe_merge_account_address(path_key, body)
    json_body = Jason.encode!(body)
    headers = [{"Content-Type", "application/json"}]

    case http_client().post(url, json_body, headers, timeout) do
      {:ok, %{status_code: 200, body: resp_body}} -> {:ok, resp_body}
      {:ok, %{status_code: code, body: resp_body}} -> {:error, {:http, code, resp_body}}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "Same as post/3 but returns parsed JSON when body is JSON. Plain-text bodies (e.g. 'addr not exists.', 'ok') return {:error, {:invalid_response, raw}}."
  @spec post_json(atom(), map(), keyword()) :: {:ok, map() | list()} | {:error, term()}
  def post_json(path_key, body, opts \\ []) do
    case post(path_key, body, opts) do
      {:ok, raw} when is_binary(raw) ->
        case Jason.decode(raw) do
          {:ok, decoded} when is_map(decoded) or is_list(decoded) -> {:ok, decoded}
          _ -> {:error, {:invalid_response, raw}}
        end
      err -> err
    end
  end

  # Transient connection errors that are worth retrying with a fresh connection.
  @transient_errors [:closed, :econnreset, :timeout, :econnrefused]

  @doc """
  POST to /get_latest_pool_info with application/x-www-form-urlencoded body (network=<network>).
  Returns all pools' latest block height/hash/syncedHeight/timestamp.
  Used for sharded Seth to know per-pool tip and to scan blocks by (height, pool_index).
  Retries up to 2 times on transient errors (:closed, :econnreset, :timeout).
  """
  @spec get_latest_pool_info(non_neg_integer() | nil, keyword()) :: {:ok, map()} | {:error, term()}
  def get_latest_pool_info(network \\ nil, opts \\ []) do
    path = Map.fetch!(@paths, :get_latest_pool_info)
    base = opts[:base_url] || base_url()
    url = base |> String.trim_trailing("/") |> Kernel.<>(path)
    timeout = Keyword.get(opts, :timeout, 15_000)
    network = network || seth_network()

    params = %{"network" => to_string(network)}
    body = params |> Enum.map(fn {k, v} -> "#{URI.encode(k)}=#{URI.encode(v)}" end) |> Enum.join("&")
    headers = [{"Content-Type", "application/x-www-form-urlencoded"}]

    try_get_latest_pool_info(url, body, headers, timeout, 3)
  end

  defp try_get_latest_pool_info(_url, _body, _headers, _timeout, 0), do: {:error, :max_retries_exceeded}

  defp try_get_latest_pool_info(url, body, headers, timeout, attempts_left) do
    case http_client().post(url, body, headers, timeout) do
      {:ok, %{status_code: 200, body: resp_body}} ->
        case Jason.decode(resp_body) do
          {:ok, decoded} when is_map(decoded) ->
            pools_count = length(Map.get(decoded, "pools", []))
            Logger.debug("[seth] get_latest_pool_info ok, pools=#{pools_count}, status=#{decoded["status"]}")
            {:ok, decoded}
          _ ->
            Logger.warning("[seth] get_latest_pool_info invalid_response body_len=#{byte_size(resp_body)}")
            {:error, {:invalid_response, resp_body}}
        end
      {:ok, %{status_code: code, body: resp_body}} ->
        Logger.warning("[seth] get_latest_pool_info http error code=#{code}")
        {:error, {:http, code, resp_body}}
      {:error, reason} when reason in @transient_errors ->
        Logger.warning("[seth] get_latest_pool_info error #{inspect(reason)}, retries_left=#{attempts_left - 1}")
        if attempts_left > 1 do
          Process.sleep(100)
          try_get_latest_pool_info(url, body, headers, timeout, attempts_left - 1)
        else
          {:error, reason}
        end
      {:error, reason} ->
        Logger.warning("[seth] get_latest_pool_info error #{inspect(reason)}")
        {:error, reason}
    end
  end

  @doc """
  POST to /get_blocks with application/x-www-form-urlencoded body.
  Params: network, pool_index, height, count (all sent as strings).
  When sharded (pool_count > 0), pass explicit pool_index 0..(pool_count-1); otherwise uses config seth_pool_index.
  """
  @spec post_get_blocks(non_neg_integer(), pos_integer(), keyword()) :: {:ok, String.t()} | {:error, term()}
  def post_get_blocks(height, count \\ 1, opts \\ []) do
    post_get_blocks(height, count, seth_pool_index(), opts)
  end

  @spec post_get_blocks(non_neg_integer(), pos_integer(), non_neg_integer(), keyword()) :: {:ok, String.t()} | {:error, term()}
  def post_get_blocks(height, count, pool_index, opts) when is_integer(pool_index) do
    path = Map.fetch!(@paths, :get_blocks)
    base = opts[:base_url] || base_url()
    url = base |> String.trim_trailing("/") |> Kernel.<>(path)
    timeout = Keyword.get(opts, :timeout, 15_000)

    params =
      %{}
      |> Map.put("network", to_string(seth_network()))
      |> Map.put("pool_index", to_string(pool_index))
      |> Map.put("height", to_string(height))
      |> Map.put("count", to_string(count))

    body = params |> Enum.map(fn {k, v} -> "#{URI.encode(k)}=#{URI.encode(v)}" end) |> Enum.join("&")
    headers = [{"Content-Type", "application/x-www-form-urlencoded"}]

    case http_client().post(url, body, headers, timeout) do
      {:ok, %{status_code: 200, body: resp_body}} ->
        Logger.debug("[seth] post_get_blocks height=#{height} pool_index=#{pool_index} ok")
        {:ok, resp_body}
      {:ok, %{status_code: code, body: resp_body}} ->
        Logger.debug("[seth] post_get_blocks height=#{height} pool_index=#{pool_index} http=#{code}")
        {:error, {:http, code, resp_body}}
      {:error, reason} ->
        Logger.debug("[seth] post_get_blocks height=#{height} pool_index=#{pool_index} error=#{inspect(reason)}")
        {:error, reason}
    end
  end

  # 3-arg form (height, count, pool_index) — must come before 2-arg clause so (h, 1, 0) is not matched as opts
  @spec post_get_blocks_json(non_neg_integer(), pos_integer(), non_neg_integer()) :: {:ok, map()} | {:error, term()}
  def post_get_blocks_json(height, count, pool_index) when is_integer(pool_index) do
    post_get_blocks_json(height, count, pool_index, [])
  end

  @spec post_get_blocks_json(non_neg_integer(), pos_integer(), keyword()) :: {:ok, map()} | {:error, term()}
  def post_get_blocks_json(height, count \\ 1, opts \\ []) do
    post_get_blocks_json(height, count, seth_pool_index(), opts)
  end

  @spec post_get_blocks_json(non_neg_integer(), pos_integer(), non_neg_integer(), keyword()) :: {:ok, map()} | {:error, term()}
  def post_get_blocks_json(height, count, pool_index, opts) do
    case post_get_blocks(height, count, pool_index, opts) do
      {:ok, raw} when is_binary(raw) ->
        case Jason.decode(raw) do
          {:ok, decoded} when is_map(decoded) -> {:ok, decoded}
          _ -> {:error, {:invalid_response, raw}}
        end
      err -> err
    end
  end

  def base_url do
    Application.get_env(:ethereum_jsonrpc, :seth_rpc_url) ||
      System.get_env("SETH_RPC_URL") ||
      "http://104.198.109.193:23080"
  end

  defp seth_network do
    Application.get_env(:ethereum_jsonrpc, :seth_network) ||
      (case System.get_env("SETH_NETWORK") do
         nil -> 3
         s -> String.to_integer(s)
       end)
  end

  defp seth_pool_index do
    Application.get_env(:ethereum_jsonrpc, :seth_pool_index) ||
      (case System.get_env("SETH_POOL_INDEX") do
         nil -> 13
         s -> String.to_integer(s)
       end)
  end

  @doc "Number of shard pools (0..pool_count-1). When > 0, fetch_blocks iterates all pools. Default 33."
  def seth_pool_count do
    Application.get_env(:ethereum_jsonrpc, :seth_pool_count) ||
      (case System.get_env("SETH_POOL_COUNT") do
         nil -> 33
         s -> String.to_integer(s)
       end)
  end

  # Seth server returns "addr not exists." or plain "ok" when account_address is missing.
  # Merge configured indexer account so get_block_with_gid / query_init return JSON.
  defp maybe_merge_account_address(:get_block_with_gid, body),
    do: put_account_address(body)
  defp maybe_merge_account_address(:query_init, body),
    do: put_account_address(body)
  defp maybe_merge_account_address(_path_key, body),
    do: body

  defp put_account_address(body) do
    case seth_account_address() do
      nil -> body
      addr ->
        body
        |> Map.put("account_address", addr)
        |> Map.put("addr", addr)
    end
  end

  defp seth_account_address do
    Application.get_env(:ethereum_jsonrpc, :seth_account_address) ||
      System.get_env("SETH_ACCOUNT_ADDRESS")
  end

  defp http_client do
    Application.get_env(:ethereum_jsonrpc, :seth_http_client, EthereumJSONRPC.Seth.HTTP.HTTPoison)
  end
end
