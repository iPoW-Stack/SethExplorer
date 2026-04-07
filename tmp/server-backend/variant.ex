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

  @pool_info_cache_key {__MODULE__, :latest_pool_info}
  @pool_offsets_cache_key {__MODULE__, :pool_offsets}
  @default_pool_info_cache_ttl_ms 120_000
  @default_pool_info_refresh_interval_ms 5_000
  @default_pool_offsets_refresh_interval_ms 60_000

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
  def fetch_block_by_number(number, _json_rpc_named_arguments) do
    pool_count = Client.seth_pool_count()

    result =
      if pool_count > 0 do
        case get_latest_pool_infos_with_cache() do
          {:ok, shard_infos} ->
            shard_infos
            |> Enum.flat_map(fn info ->
              synced_heights = synced_heights_from_pools(Map.get(info.payload, "pools", []), pool_count, info.shard_index)

              case find_pool_for_height(synced_heights, number) do
                nil ->
                  []

                %{local_pool_index: local_pool_index, local_height: local_height} ->
                  [
                    %{
                      network: info.network,
                      shard_name: info.name,
                      shard_index: info.shard_index,
                      local_pool_index: local_pool_index,
                      local_height: local_height
                    }
                  ]
              end
            end)
            |> Enum.find_value(fn candidate -> fetch_block_candidate(number, candidate) end)

          _ ->
            nil
        end
      else
        fetch_block_candidate(number, %{
          network: Client.seth_network(),
          shard_name: "single",
          shard_index: 0,
          local_pool_index: Client.seth_pool_index(),
          local_height: number
        })
      end

    case result do
      nil -> {:error, :block_not_found}
      {:ok, block_elixir} -> {:ok, block_elixir}
      {:error, reason} -> {:error, reason}
    end
  end

  @impl true
  def fetch_block_by_hash(_hash, _json_rpc_named_arguments) do
    {:error, :get_blocks_no_hash}
  end

  defp fetch_block_candidate(number, candidate) do
    local_height = Map.get(candidate, :local_height, number)

    with {:ok, decoded} <-
           Client.post_get_blocks_json(
             local_height,
             1,
             candidate.local_pool_index,
             network: candidate.network
           ),
         true <- status_ok?(decoded),
         [block_wrap | _] <- Map.get(decoded, "blocks", []),
         global_pool_index <-
           Client.compose_pool_index(candidate.shard_index, candidate.local_pool_index),
         block_elixir when is_map(block_elixir) <-
           block_from_get_blocks_item(block_wrap, global_pool_index),
         true <- normalize_block_number(Map.get(block_elixir, "number")) == local_height do
      {:ok, Map.put(block_elixir, "number", number)}
    else
      _ -> nil
    end
  end

  defp block_from_get_blocks_item(block_wrap, pool_index \\ nil)
  defp block_from_get_blocks_item(%{"blockInfo" => info, "parentHash" => parent_b64, "qc" => qc}, pool_index)
       when is_map(info) do
    parent_hex = Adapter.base64_hash_to_hex(parent_b64)
    opts = [parent_hash: parent_hex]
    block_hash =
      case qc do
        %{"viewBlockHash" => hash_b64} when is_binary(hash_b64) and hash_b64 != "" ->
          Adapter.base64_hash_to_hex(hash_b64)

        %{"view_block_hash" => hash_b64} when is_binary(hash_b64) and hash_b64 != "" ->
          Adapter.base64_hash_to_hex(hash_b64)

        _ ->
          nil
      end

    opts = if is_binary(block_hash), do: Keyword.put(opts, :block_hash, block_hash), else: opts
    opts = if is_integer(pool_index), do: Keyword.put(opts, :pool_index, pool_index), else: opts
    Adapter.block_to_elixir(Adapter.normalize_keys(info), opts)
  end

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
  # When sharded, use get_latest_pool_info for all configured shards and take global max height.
  def fetch_block_number_by_tag(tag, _json_rpc_named_arguments) when tag in ~w(earliest latest pending safe) do
    case tag do
      "earliest" ->
        get_block_height_by_number(0)

      _ ->
        pool_count = Client.seth_pool_count()
        Logger.info("[seth] fetch_block_number_by_tag latest pool_count=#{pool_count}")

        if pool_count > 0 do
          case get_latest_pool_infos_with_cache() do
            {:ok, shard_infos} ->
              max_h = max_global_height_from_shards(shard_infos, pool_count)

              shard_stats =
                shard_infos
                |> Enum.map(fn info ->
                  pools_count = info.payload |> Map.get("pools", []) |> Enum.take(Client.seth_pool_count()) |> length()
                  "#{info.name}(network=#{info.network},pools=#{pools_count},source=#{info.source})"
                end)
                |> Enum.join(";")

              Logger.info("[seth] fetch_block_number_by_tag get_latest_pool_info shards=#{shard_stats} max_height=#{max_h}")
              if max_h >= 0, do: {:ok, max_h}, else: {:error, :not_found}

            other ->
              Logger.warning("[seth] fetch_block_number_by_tag get_latest_pool_info failed #{inspect(other)}")
              {:error, :not_found}
          end
        else
          try_heights = [999_999, 99_999, 9_999, 999, 99, 9]
          case Enum.find_value(try_heights, fn h ->
            case Client.post_get_blocks_json(h, 1) do
              {:ok, %{"blocks" => [%{"blockInfo" => info} | _]} = decoded} when is_map(info) ->
                if status_ok?(decoded) do
                  height = info["height"] || info[:height]

                  case height do
                    n when is_integer(n) and n >= 0 ->
                      {:ok, n}

                    s when is_binary(s) ->
                      case Integer.parse(s) do
                        {n, _} -> {:ok, n}
                        _ -> nil
                      end

                    _ ->
                      nil
                  end
                else
                  nil
                end

              _ ->
                nil
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

  defp pool_offset_for(shard_index, local_pool_index) do
    global_pool_index = Client.compose_pool_index(shard_index, local_pool_index)
    Map.get(pool_offsets(), global_pool_index, 0)
  end


  defp pool_offsets do
    now_ms = System.monotonic_time(:millisecond)

    case :persistent_term.get(@pool_offsets_cache_key, nil) do
      {saved_at_ms, offsets} when is_integer(saved_at_ms) and is_map(offsets) ->
        if now_ms - saved_at_ms <= pool_offsets_refresh_interval_ms() do
          offsets
        else
          refresh_pool_offsets(now_ms)
        end

      _ ->
        refresh_pool_offsets(now_ms)
    end
  end

  defp refresh_pool_offsets(now_ms) do
    offsets = load_pool_offsets_from_env()
    :persistent_term.put(@pool_offsets_cache_key, {now_ms, offsets})
    offsets
  end

  defp load_pool_offsets_from_env do
    raw = System.get_env("SETH_POOL_OFFSETS")

    cond do
      is_nil(raw) or String.trim(raw) == "" ->
        %{}

      true ->
        case Jason.decode(raw) do
          {:ok, decoded} when is_map(decoded) ->
            normalize_pool_offsets(decoded)

          _ ->
            raw
            |> String.split(",", trim: true)
            |> Enum.reduce(%{}, fn item, acc ->
              case String.split(item, ":", parts: 2) do
                [pool_idx_raw, offset_raw] ->
                  with {pool_idx, ""} <- Integer.parse(String.trim(pool_idx_raw)),
                       {offset, ""} <- Integer.parse(String.trim(offset_raw)) do
                    Map.put(acc, pool_idx, offset)
                  else
                    _ -> acc
                  end

                _ ->
                  acc
              end
            end)
        end
    end
  end

  defp normalize_pool_offsets(map) do
    Enum.reduce(map, %{}, fn {pool_idx, offset}, acc ->
      with {pool_idx_int, ""} <- Integer.parse(to_string(pool_idx)),
           offset_int when is_integer(offset_int) <- normalize_offset_value(offset) do
        Map.put(acc, pool_idx_int, offset_int)
      else
        _ -> acc
      end
    end)
  end

  defp normalize_offset_value(value) when is_integer(value), do: value

  defp normalize_offset_value(value) do
    case Integer.parse(to_string(value)) do
      {offset, ""} -> offset
      _ -> nil
    end
  end

  defp pool_offsets_refresh_interval_ms do
    case System.get_env("SETH_POOL_OFFSETS_REFRESH_MS") do
      nil -> @default_pool_offsets_refresh_interval_ms
      raw ->
        case Integer.parse(raw) do
          {value, ""} when value > 0 -> value
          _ -> @default_pool_offsets_refresh_interval_ms
        end
    end
  end

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

    case Client.post_get_blocks_json(height_param, 1, pool_index, network: Client.seth_network()) do
      {:ok, %{"blocks" => [%{"blockInfo" => info} | _]} = decoded} when is_map(info) ->
        if status_ok?(decoded) do
          height = info["height"] || info[:height]

          n =
            if is_integer(height),
              do: height,
              else:
                (case Integer.parse(to_string(height)) do
                   {num, _} -> num
                   _ -> -1
                 end)

          if n >= 0, do: {:ok, n}, else: {:error, :not_found}
        else
          {:error, :not_found}
        end

      _ ->
        {:error, :not_found}
    end
  end

  defp fetch_blocks_sharded(numbers, json_rpc_named_arguments) do
    Logger.info("[seth] fetch_blocks_sharded numbers=#{inspect(numbers)}")

    case get_latest_pool_infos_with_cache() do
      {:ok, shard_infos} ->
        pool_count = Client.seth_pool_count()
        pairs = build_fetch_pairs(numbers, shard_infos, pool_count)

        shard_stats =
          shard_infos
          |> Enum.map(fn info ->
            pools_count = info.payload |> Map.get("pools", []) |> Enum.take(Client.seth_pool_count()) |> length()
            "#{info.name}(network=#{info.network},pools=#{pools_count},source=#{info.source})"
          end)
          |> Enum.join(";")

        Logger.info(
          "[seth] fetch_blocks_sharded shards=#{shard_stats} pool_count_per_shard=#{pool_count} pairs=#{length(pairs)}"
        )

        acc =
          pairs
          |> Enum.reduce_while({:ok, []}, fn pair, {:ok, acc} ->
            case Client.post_get_blocks(
                   pair.local_height,
                   1,
                   pair.local_pool_index,
                   network: pair.network
                 ) do
              {:ok, raw_body} ->
                case Adapter.parse_block_response(raw_body, []) do
                  {:ok, block_elixir} ->
                    block_elixir =
                      block_elixir
                      |> Map.put("number", pair.height)
                      |> Map.put("pool_index", pair.global_pool_index)
                      |> Map.put("seth_network", pair.network)
                      |> Map.put("seth_shard", pair.shard_name)

                    {:cont, {:ok, [block_elixir | acc]}}

                  {:error, _} ->
                    {:cont, {:ok, acc}}
                end

              {:error, reason} ->
                Logger.warning(
                  "[seth] post_get_blocks failed network=#{pair.network} shard=#{pair.shard_name} local_pool_index=#{pair.local_pool_index} global_height=#{pair.height} local_height=#{pair.local_height} reason=#{inspect(reason)}"
                )

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

        fallback_shard =
          case Client.seth_shards() do
            [first | _] -> first
            _ -> %{network: Client.seth_network(), shard_index: 0, name: "fallback"}
          end

        fallback_pool_index = Client.seth_pool_index()

        fetch_blocks_batch(
          numbers,
          &Client.post_get_blocks(&1, 1, fallback_pool_index, network: fallback_shard.network),
          json_rpc_named_arguments
        )
    end
  end

  defp build_fetch_pairs(numbers, shard_infos, pool_count) do
    numbers
    |> Enum.flat_map(fn height ->
      shard_infos
      |> Enum.flat_map(fn info ->
        synced_heights = synced_heights_from_pools(Map.get(info.payload, "pools", []), pool_count, info.shard_index)

        case find_pool_for_height(synced_heights, height) do
          nil ->
            []

          %{local_pool_index: local_pool_index, local_height: local_height} ->
            [
              %{
                height: height,
                local_height: local_height,
                network: info.network,
                shard_name: info.name,
                local_pool_index: local_pool_index,
                global_pool_index: Client.compose_pool_index(info.shard_index, local_pool_index)
              }
            ]
        end
      end)
    end)
  end

  defp synced_heights_from_pools(pools, pool_count, shard_index) do
    pools
    |> Enum.take(pool_count)
    |> Enum.with_index()
    |> Map.new(fn {p, idx} ->
      local_synced = parse_pool_height(p)
      offset = pool_offset_for(shard_index, idx)

      global_synced =
        if is_integer(local_synced) and local_synced >= 0 do
          local_synced + offset
        else
          -1
        end

      {idx, %{local_synced: local_synced, global_synced: global_synced, offset: offset}}
    end)
  end

  defp find_pool_for_height(synced_heights, height) do
    synced_heights
    |> Enum.filter(fn {_idx, payload} ->
      is_map(payload) and is_integer(payload.global_synced) and payload.global_synced >= height
    end)
    |> Enum.min_by(fn {_idx, payload} -> payload.global_synced end, fn -> nil end)
    |> case do
      nil ->
        nil

      {local_pool_index, payload} ->
        local_height = height - payload.offset

        if local_height >= 0 and payload.local_synced >= local_height do
          %{local_pool_index: local_pool_index, local_height: local_height}
        else
          nil
        end
    end
  end

  defp max_global_height_from_shards(shard_infos, pool_count) do
    shard_infos
    |> Enum.flat_map(fn info ->
      info.payload
      |> Map.get("pools", [])
      |> Enum.take(pool_count)
      |> Enum.with_index()
      |> Enum.map(fn {pool, local_pool_index} ->
        local_height = parse_pool_height(pool)
        offset = pool_offset_for(info.shard_index, local_pool_index)

        if local_height >= 0 do
          local_height + offset
        else
          -1
        end
      end)
    end)
    |> Enum.max(fn -> 0 end)
  end

  defp get_latest_pool_infos_with_cache do
    {ok_infos, errors} =
      Client.seth_shards()
      |> Enum.reduce({[], []}, fn shard, {ok_acc, err_acc} ->
        case get_latest_pool_info_with_cache(shard.network) do
          {:ok, payload, source} ->
            info = %{
              name: shard.name,
              network: shard.network,
              shard_index: shard.shard_index,
              source: source,
              payload: payload
            }

            {[info | ok_acc], err_acc}

          {:error, reason} ->
            {ok_acc, [%{name: shard.name, network: shard.network, reason: reason} | err_acc]}
        end
      end)

    errors
    |> Enum.reverse()
    |> Enum.each(fn error ->
      Logger.warning(
        "[seth] get_latest_pool_info failed shard=#{error.name} network=#{error.network} reason=#{inspect(error.reason)}"
      )
    end)

    case Enum.reverse(ok_infos) do
      [] -> {:error, {:all_shards_failed, Enum.reverse(errors)}}
      infos -> {:ok, infos}
    end
  end

  defp get_latest_pool_info_with_cache(network) do
    case read_cached_pool_info(network, pool_info_refresh_interval_ms()) do
      {:ok, payload, _age_ms} ->
        {:ok, payload, :cache}

      :error ->
        case Client.get_latest_pool_info(network) do
          {:ok, payload} ->
            if pool_payload_usable?(payload) do
              cache_pool_info(network, payload)
              {:ok, payload, :live}
            else
              case read_cached_pool_info(network, pool_info_cache_ttl_ms()) do
                {:ok, cached_payload, age_ms} ->
                  Logger.warning(
                    "[seth] get_latest_pool_info unusable payload network=#{network} using cached pool snapshot age_ms=#{age_ms}"
                  )

                  {:ok, cached_payload, :cache}

                :error ->
                  {:error, {:network, network, {:invalid_payload, payload}}}
              end
            end

          other ->
            case read_cached_pool_info(network, pool_info_cache_ttl_ms()) do
              {:ok, payload, age_ms} ->
                Logger.warning(
                  "[seth] get_latest_pool_info failed network=#{network} #{inspect(other)} using cached pool snapshot age_ms=#{age_ms}"
                )

                {:ok, payload, :cache}

              :error ->
                {:error, {:network, network, other}}
            end
        end
    end
  end

  defp cache_pool_info(network, payload) when is_map(payload) do
    :persistent_term.put(pool_info_cache_key(network), {System.monotonic_time(:millisecond), payload})
  end

  defp read_cached_pool_info(network, max_age_ms) when is_integer(max_age_ms) and max_age_ms > 0 do
    case :persistent_term.get(pool_info_cache_key(network), nil) do
      {saved_at_ms, payload} when is_integer(saved_at_ms) and is_map(payload) ->
        age_ms = System.monotonic_time(:millisecond) - saved_at_ms

        if age_ms <= max_age_ms do
          {:ok, payload, age_ms}
        else
          :error
        end

      _ ->
        :error
    end
  end

  defp pool_payload_usable?(%{"pools" => pools} = payload) when is_list(pools) do
    status_ok?(payload) and
      pools
      |> Enum.take(Client.seth_pool_count())
      |> Enum.any?(fn pool -> parse_pool_height(pool) >= 0 end)
  end

  defp pool_payload_usable?(_), do: false

  defp pool_info_refresh_interval_ms do
    case System.get_env("SETH_POOL_INFO_REFRESH_INTERVAL_MS") do
      nil ->
        @default_pool_info_refresh_interval_ms

      raw ->
        case Integer.parse(raw) do
          {value, ""} when value > 0 -> value
          _ -> @default_pool_info_refresh_interval_ms
        end
    end
  end

  defp pool_info_cache_ttl_ms do
    case System.get_env("SETH_POOL_INFO_CACHE_TTL_MS") do
      nil ->
        @default_pool_info_cache_ttl_ms

      raw ->
        case Integer.parse(raw) do
          {value, ""} when value > 0 -> value
          _ -> @default_pool_info_cache_ttl_ms
        end
    end
  end

  defp pool_info_cache_key(network), do: {@pool_info_cache_key, network}

  defp status_ok?(payload) when is_map(payload) do
    case Map.get(payload, "status") do
      nil -> true
      0 -> true
      "0" -> true
      _ -> false
    end
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
