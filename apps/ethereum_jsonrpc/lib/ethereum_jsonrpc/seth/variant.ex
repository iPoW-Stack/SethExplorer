defmodule EthereumJSONRPC.Seth.Variant do
  @moduledoc """
  Variant for Seth chain (Seth public chain).

  This variant bridges the non-standard Seth RPC to Blockscout-compatible
  responses by using the Seth adapter layer.
  """

  require Logger

  @behaviour EthereumJSONRPC.Variant

  alias EthereumJSONRPC.{
    Block,
    Blocks,
    FetchedBalances,
    FetchedBeneficiaries,
    Logs,
    Receipts,
    Transaction,
    Transactions,
    Uncles,
    Withdrawals
  }
  alias EthereumJSONRPC.Seth.{Adapter, Client}

  @impl true
  def json_rpc_named_arguments do
    [
      transport: EthereumJSONRPC.HTTP,
      transport_options: [
        http: EthereumJSONRPC.HTTP.Tesla,
        urls: [EthereumJSONRPC.Seth.Client.base_url()],
        http_options: [recv_timeout: 60_000]
      ],
      method_to_url: [],
      variant: EthereumJSONRPC.Seth.Variant
    ]
  end

  @impl true
  def subscribe_named_arguments do
    []
  end

  # Block operations: use /get_blocks (form-encoded) with network, pool_index, height, count.
  # When sharded (pool_count > 0), use get_latest_pool_info and fetch each (height, pool_index) for all pools 0..(pool_count-1).
  @impl true
  def fetch_blocks_by_numbers(numbers, json_rpc_named_arguments, _with_transactions? \\ true) do
    if Client.seth_pool_count() > 0 do
      fetch_blocks_sharded(numbers, json_rpc_named_arguments)
    else
      fetch_blocks_batch(numbers, &Client.post_get_blocks(&1, 1), json_rpc_named_arguments)
    end
  end

  @impl true
  def fetch_blocks_by_hash(hashes, json_rpc_named_arguments, _with_transactions? \\ true) do
    # get_blocks does not support block_hash; get_block_with_gid is by address/nonce. Skip by-hash.
    fetch_blocks_batch(hashes, fn _ -> {:error, :get_blocks_no_hash} end, json_rpc_named_arguments)
  end

  def fetch_blocks_by_range(range, json_rpc_named_arguments) do
    range |> Enum.to_list() |> fetch_blocks_by_numbers(json_rpc_named_arguments, true)
  end

  @impl true
  def fetch_block_by_number(number, json_rpc_named_arguments) do
    pool_index = if Client.seth_pool_count() > 0, do: 0, else: Client.seth_pool_index()
    case Client.post_get_blocks_json(number, 1, pool_index) do
      {:ok, %{"blocks" => [block_wrap | _], "status" => 0}} ->
        case block_from_get_blocks_item(block_wrap, pool_index) do
          nil -> {:error, :invalid_block}
          block_elixir -> {:ok, block_elixir}
        end
      {:ok, %{"blocks" => [], "status" => _}} ->
        {:error, :block_not_found}
      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def fetch_block_by_hash(_hash, _json_rpc_named_arguments) do
    {:error, :get_blocks_no_hash}
  end

  defp block_from_get_blocks_item(block_wrap, pool_index \\ nil)
  defp block_from_get_blocks_item(%{"blockInfo" => info, "parentHash" => parent_b64}, pool_index) when is_map(info) do
    parent_hex = Adapter.base64_hash_to_hex(parent_b64)
    opts = [parent_hash: parent_hex]
    opts = if is_integer(pool_index), do: Keyword.put(opts, :pool_index, pool_index), else: opts
    Adapter.block_to_elixir(Adapter.normalize_keys(info), opts)
  end
  defp block_from_get_blocks_item(_, _pool_index), do: nil

  defp extract_block_from_response(%{"block" => block}), do: block
  defp extract_block_from_response(%{"block_list" => [block | _]}), do: block
  defp extract_block_from_response(decoded) when is_map(decoded), do: decoded

  # Used by indexer to get latest/earliest block number.
  # When sharded, use get_latest_pool_info and take max height across pools; else discover by trying heights.
  def fetch_block_number_by_tag(tag, _json_rpc_named_arguments) when tag in ~w(earliest latest pending safe) do
    case tag do
      "earliest" ->
        get_block_height_by_number(0)

      _ ->
        pool_count = Client.seth_pool_count()
        Logger.info("[seth] fetch_block_number_by_tag latest pool_count=#{pool_count}")

        if pool_count > 0 do
          case Client.get_latest_pool_info() do
            {:ok, %{"pools" => pools, "status" => 0}} when is_list(pools) ->
              max_h =
                pools
                |> Enum.map(fn p -> parse_pool_height(p) end)
                |> Enum.max(fn -> 0 end)
              Logger.info("[seth] fetch_block_number_by_tag get_latest_pool_info ok pools=#{length(pools)} max_height=#{max_h}")
              if max_h >= 0, do: {:ok, max_h}, else: {:error, :not_found}
            other ->
              Logger.warning("[seth] fetch_block_number_by_tag get_latest_pool_info failed #{inspect(other)}")
              {:error, :not_found}
          end
        else
          try_heights = [999_999, 99_999, 9_999, 999, 99, 9]
          case Enum.find_value(try_heights, fn h ->
            case Client.post_get_blocks_json(h, 1) do
              {:ok, %{"blocks" => [%{"blockInfo" => info} | _], "status" => 0}} when is_map(info) ->
                height = info["height"] || info[:height]
                case height do
                  n when is_integer(n) and n >= 0 -> {:ok, n}
                  s when is_binary(s) -> case Integer.parse(s) do
                    {n, _} -> {:ok, n}
                    _ -> nil
                  end
                  _ -> nil
                end
              _ -> nil
            end
          end) do
            nil -> {:error, :not_found}
            result -> result
          end
        end
    end
  end

  defp parse_pool_height(p) when is_map(p) do
    s = p["height"] || p["syncedHeight"] || p[:height] || p[:syncedHeight] || "0"
    case Integer.parse(to_string(s)) do
      {n, _} -> n
      _ -> -1
    end
  end
  defp parse_pool_height(_), do: -1

  defp normalize_block_number(n) when is_integer(n), do: n
  defp normalize_block_number(s) when is_binary(s) do
    case Integer.parse(s) do
      {n, _} -> n
      _ -> -1
    end
  end
  defp normalize_block_number(other), do: normalize_block_number(to_string(other))

  defp get_block_height_by_number(height_param) do
    pool_index = if Client.seth_pool_count() > 0, do: 0, else: Client.seth_pool_index()
    case Client.post_get_blocks_json(height_param, 1, pool_index) do
      {:ok, %{"blocks" => [%{"blockInfo" => info} | _], "status" => _}} when is_map(info) ->
        height = info["height"] || info[:height]
        n = if is_integer(height), do: height, else: (case Integer.parse(to_string(height)) do
          {num, _} -> num
          _ -> -1
        end)
        if n >= 0, do: {:ok, n}, else: {:error, :not_found}
      _ ->
        {:error, :not_found}
    end
  end

  defp fetch_blocks_sharded(numbers, json_rpc_named_arguments) do
    Logger.info("[seth] fetch_blocks_sharded numbers=#{inspect(numbers)}")

    case Client.get_latest_pool_info() do
      {:ok, %{"pools" => pools, "status" => 0}} when is_list(pools) ->
        pool_count = Client.seth_pool_count()
        synced_heights = synced_heights_from_pools(pools, pool_count)
        pairs =
          numbers
          |> Enum.flat_map(fn height ->
            for pool_index <- 0..(pool_count - 1),
                (synced_heights[pool_index] || -1) >= height do
              {height, pool_index}
            end
          end)
        Logger.info("[seth] fetch_blocks_sharded pool_count=#{pool_count} (height,pool_index) pairs=#{length(pairs)} synced_heights=#{inspect(synced_heights)}")

        acc =
          pairs
          |> Enum.reduce_while({:ok, []}, fn {height, pool_index}, {:ok, acc} ->
            case Client.post_get_blocks(height, 1, pool_index, []) do
              {:ok, raw_body} ->
                case Adapter.parse_block_response(raw_body, []) do
                  {:ok, block_elixir} ->
                    block_elixir = Map.put(block_elixir, "pool_index", pool_index)
                    {:cont, {:ok, [block_elixir | acc]}}
                  {:error, _} ->
                    {:cont, {:ok, acc}}
                end
              {:error, _} ->
                {:cont, {:ok, acc}}
            end
          end)

        case acc do
          {:ok, elixir_blocks} ->
            elixir_blocks = Enum.reverse(elixir_blocks)
            Logger.info("[seth] fetch_blocks_sharded collected blocks=#{length(elixir_blocks)}")
            # Report block numbers we did not fetch (no pool synced to that height) as errors
            # so catchup only clears missing_block_ranges for numbers we actually inserted.
            fetched_numbers =
              elixir_blocks
              |> Enum.map(fn b -> normalize_block_number(b["number"]) end)
              |> Enum.uniq()
            skipped_numbers = numbers -- fetched_numbers
            errors =
              Enum.map(skipped_numbers, fn n ->
                %{data: %{number: n}, message: "skipped (no pool synced to height #{n})"}
              end)

            blocks_params =
              elixir_blocks
              |> Blocks.elixir_to_params()
              |> Enum.zip(elixir_blocks)
              |> Enum.map(fn {params, elixir} ->
                # Ensure pool_index is in params so DB uses one_consensus_block_per_height_pool
                # (number, pool_index) instead of one_consensus_block_at_height_when_no_pool (number only).
                Map.put(params, :pool_index, elixir["pool_index"])
              end)
            elixir_transactions = Blocks.elixir_to_transactions(elixir_blocks)
            transactions_params = Transactions.elixir_to_params(elixir_transactions)
            elixir_uncles = Blocks.elixir_to_uncles(elixir_blocks)
            block_second_degree_relations_params = Uncles.elixir_to_params(elixir_uncles)
            elixir_withdrawals = Blocks.elixir_to_withdrawals(elixir_blocks)
            withdrawals_params = Withdrawals.elixir_to_params(elixir_withdrawals)
            receipt_elixirs =
              Enum.map(elixir_transactions, fn tx ->
                %{
                  "cumulativeGasUsed" => tx["gasUsed"],
                  "gasUsed" => tx["gasUsed"],
                  "contractAddress" => nil,
                  "transactionHash" => tx["hash"],
                  "transactionIndex" => tx["transactionIndex"],
                  "status" => Map.get(tx, "status", "0x1")
                }
              end)
            logs_elixir =
              elixir_transactions
              |> Enum.flat_map(fn tx -> tx["logs"] || [] end)
              |> Enum.with_index()
              |> Enum.map(fn {log, idx} -> Map.put(log, "logIndex", idx) end)
            receipts_params = Receipts.elixir_to_params(receipt_elixirs)
            logs_params = Logs.elixir_to_params(logs_elixir)
            {:ok,
             %Blocks{
               blocks_params: blocks_params,
               transactions_params: transactions_params,
               block_second_degree_relations_params: block_second_degree_relations_params,
               withdrawals_params: withdrawals_params,
               errors: errors,
               logs_params: logs_params,
               receipts_params: receipts_params
             }}
          err ->
            err
        end
      other ->
        Logger.warning("[seth] fetch_blocks_sharded get_latest_pool_info failed #{inspect(other)} falling back to single pool")
        fetch_blocks_batch(numbers, &Client.post_get_blocks(&1, 1), json_rpc_named_arguments)
    end
  end

  defp synced_heights_from_pools(pools, pool_count) do
    pools
    |> Enum.take(pool_count)
    |> Enum.with_index()
    |> Map.new(fn {p, idx} -> {idx, parse_pool_height(p)} end)
  end

  def fetch_block_by_tag(tag, json_rpc_named_arguments) when tag in ~w(earliest latest pending safe) do
    with {:ok, number} <- fetch_block_number_by_tag(tag, json_rpc_named_arguments),
         {:ok, block_elixir} <- fetch_block_by_number(number, json_rpc_named_arguments) do
      blocks_params =
        [block_elixir]
        |> Blocks.elixir_to_params()
        |> Enum.map(fn p -> Map.put(p, :pool_index, block_elixir["pool_index"] || 0) end)
      transactions_params = Transactions.elixir_to_params(block_elixir["transactions"] || [])
      {:ok,
       %Blocks{
         blocks_params: blocks_params,
         transactions_params: transactions_params,
         block_second_degree_relations_params: [],
         withdrawals_params: [],
         errors: []
       }}
    end
  end

  @impl true
  def fetch_beneficiaries(block_numbers, _json_rpc_named_arguments) do
    :ignore
  end

  @impl true
  def fetch_internal_transactions(transactions, _json_rpc_named_arguments) do
    :ignore
  end

  @impl true
  def fetch_block_internal_transactions(_block_numbers, _json_rpc_named_arguments) do
    :ignore
  end

  # Transaction operations
  @impl true
  def fetch_transaction_by_hash(hash, json_rpc_named_arguments) do
    case Client.post_json(:transaction, %{tx_hash: hash}) do
      {:ok, seth_tx} ->
        {:ok, Adapter.block_tx_to_transaction_elixir(seth_tx, nil, nil, nil)}
      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def fetch_transaction_by_hash_with_receipt(hash, json_rpc_named_arguments) do
    # Seth doesn't have a separate receipt endpoint, receipts are embedded in blocks
    fetch_transaction_by_hash(hash, json_rpc_named_arguments)
  end

  @impl true
  def fetch_pending_transactions(_json_rpc_named_arguments) do
    {:ok, []}
  end

  # Logs
  @impl true
  def fetch_logs(logs_filter, _json_rpc_named_arguments) do
    :ignore
  end

  # Receipts
  @impl true
  def fetch_receipts(transactions, json_rpc_named_arguments) do
    :ignore
  end

  # Balances: Seth RPC does not support eth_getBalance; return :ignore so caller gets empty balances.
  def fetch_balances(_params_list, _json_rpc_named_arguments) do
    :ignore
  end

  # Helper for batch fetching: request_fn is (id) -> {:ok, raw_body} | {:error, _}
  # Returns {:ok, %Blocks{}} so indexer block fetcher receives the expected format.
  defp fetch_blocks_batch(ids, request_fn, _json_rpc_named_arguments) do
    acc =
      ids
      |> Enum.map(fn id -> {id, request_fn.(id)} end)
      |> Enum.reduce_while({:ok, []}, fn
        {_id, {:ok, raw_body}}, {:ok, acc} ->
          case Adapter.parse_block_response(raw_body, []) do
            {:ok, block_elixir} -> {:cont, {:ok, [block_elixir | acc]}}
            {:error, _} -> {:cont, {:ok, acc}}
          end

        {_id, {:error, _}}, {:ok, acc} ->
          {:cont, {:ok, acc}}
      end)

    case acc do
      {:ok, elixir_blocks} ->
        elixir_blocks = Enum.reverse(elixir_blocks)
        # Fallback batch uses single pool; set pool_index so DB uses (number, pool_index) uniqueness.
        default_pool = Client.seth_pool_index()
        blocks_params =
          elixir_blocks
          |> Blocks.elixir_to_params()
          |> Enum.map(fn p -> Map.put(p, :pool_index, default_pool) end)
        elixir_transactions = Blocks.elixir_to_transactions(elixir_blocks)
        transactions_params = Transactions.elixir_to_params(elixir_transactions)
        elixir_uncles = Blocks.elixir_to_uncles(elixir_blocks)
        block_second_degree_relations_params = Uncles.elixir_to_params(elixir_uncles)
        elixir_withdrawals = Blocks.elixir_to_withdrawals(elixir_blocks)
        withdrawals_params = Withdrawals.elixir_to_params(elixir_withdrawals)

        # Seth txList has no separate receipt RPC; build receipts and logs from block transactions.
        receipt_elixirs =
          Enum.map(elixir_transactions, fn tx ->
            %{
              "cumulativeGasUsed" => tx["gasUsed"],
              "gasUsed" => tx["gasUsed"],
              "contractAddress" => nil,
              "transactionHash" => tx["hash"],
              "transactionIndex" => tx["transactionIndex"],
              "status" => Map.get(tx, "status", "0x1")
            }
          end)

        logs_elixir =
          elixir_transactions
          |> Enum.flat_map(fn tx -> tx["logs"] || [] end)
          |> Enum.with_index()
          |> Enum.map(fn {log, idx} -> Map.put(log, "logIndex", idx) end)

        receipts_params = Receipts.elixir_to_params(receipt_elixirs)
        logs_params = Logs.elixir_to_params(logs_elixir)

        {:ok,
         %Blocks{
           blocks_params: blocks_params,
           transactions_params: transactions_params,
           block_second_degree_relations_params: block_second_degree_relations_params,
           withdrawals_params: withdrawals_params,
           errors: [],
           logs_params: logs_params,
           receipts_params: receipts_params
         }}

      err ->
        err
    end
  end
end
